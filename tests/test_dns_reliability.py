import contextlib
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


class DnsReliabilityTests(unittest.TestCase):
    def active_runtime(self, folder):
        config = folder / "config.yaml"
        text = server.prepare_dns_protection_text("mixed-port: 7890\n", "PROXY", False)
        config.write_text(text, encoding="utf-8")
        (folder / "mihui.env").write_text(f"MIHUI_CONFIG_PATH={config}\n", encoding="utf-8")
        runtime = {**server.default_dns_protection_runtime(), "requestedMode": "active",
                   "lanInterfaces": ["br0"], "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
                   "managedBlockRevision": server.dns_managed_block_revision(text)}
        server.save_dns_protection_runtime(folder, runtime)
        return runtime

    def suspension_mocks(self, events, fallback=True, lease=None):
        stack = contextlib.ExitStack()
        lan = {"ok": True, "interfaces": ["br0"], "ipv4": ["192.168.1.1"], "ipv6": [],
               "bindings": [{"address": "192.168.1.1", "interface": "br0"}]}
        stack.enter_context(mock.patch.object(server, "discover_dns_lan_addresses", return_value=lan))
        stack.enter_context(mock.patch.object(server, "probe_system_dns_fallback",
                           side_effect=lambda *_: events.append("fallback") or {"ok": fallback}))
        stack.enter_context(mock.patch.object(server, "remove_dns_firewall",
                           side_effect=lambda *_: events.append("remove") or {"ok": True}))
        stack.enter_context(mock.patch.object(server, "dns_capture_lease_state",
                           side_effect=lambda *_: events.append("verify") or
                           (lease if lease is not None else {"known": True, "active": False, "complete": False})))
        return stack

    def test_component_update_suspends_capture_before_install_and_blocks_renewal(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.active_runtime(folder)
            events = []

            def install(*_args, **_kwargs):
                events.append("install")
                self.assertTrue(server.load_dns_protection_runtime(folder)["fallbackPending"])
                self.assertFalse(server.dns_protection_lock.acquire(blocking=False))

            with self.suspension_mocks(events), mock.patch.object(server, "run_mihomo_component_update", side_effect=install):
                server.run_component_action(folder, {"component": "mihomo", "action": "core",
                                                   "core": "prizrak", "target": "v1.19.32-r1"})
            self.assertEqual(events, ["fallback", "remove", "verify", "install"])
            self.assertEqual(server.load_dns_protection_runtime(folder)["requestedMode"], "active")
            self.assertTrue(server.dns_protection_lock.acquire(blocking=False))
            server.dns_protection_lock.release()

    def test_explicit_stop_keeps_capture_disabled_after_operation(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            runtime = self.active_runtime(folder)
            with self.suspension_mocks([]):
                with server.suspend_dns_capture(folder, resume=False):
                    self.assertEqual(server.load_dns_protection_runtime(folder)["requestedMode"], "test")
                server.run_dns_protection_lease_cycle(folder)
            self.assertFalse(server.load_dns_protection_runtime(folder)["fallbackPending"])
            self.assertEqual(server.load_dns_protection_runtime(folder)["requestedMode"], "test")
            self.assertEqual(server.dns_managed_block_revision((folder / "config.yaml").read_text()),
                             runtime["managedBlockRevision"])

    def test_restart_is_cancelled_when_fallback_or_capture_release_is_unknown(self):
        for fallback, lease in [(False, None), (True, {"known": False, "active": None}),
                                (True, {"known": True, "active": True})]:
            with self.subTest(fallback=fallback, lease=lease), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                self.active_runtime(folder)
                events = []
                with self.suspension_mocks(events, fallback, lease), mock.patch.object(server.subprocess, "run") as run:
                    result = server.run_xkeen_restart(folder, "xkeen")
                self.assertFalse(result["ok"])
                run.assert_not_called()
                self.assertEqual(events, ["fallback", "remove", "verify"] if fallback else ["fallback"])

    def test_unconfigured_dns_does_not_block_service_restart(self):
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(server.subprocess, "run",
                return_value=subprocess.CompletedProcess([], 0, stdout=b"ok")), \
                mock.patch.object(server, "get_xkeen_service_status", return_value={"state": "ok"}), \
                mock.patch.object(server, "remove_dns_firewall") as remove:
            self.assertTrue(server.run_xkeen_restart(Path(directory), "xkeen")["ok"])
            remove.assert_not_called()

    def test_operation_result_is_saved_and_replayed_without_a_second_apply(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            request = {"operationId": "test-operation", "action": "activate", "expectedRevision": "a" * 64}
            result = {"ok": True, "mode": "active"}

            def apply(*_):
                self.assertTrue(server.get_dns_operation(folder, request["operationId"])["running"])
                return result

            with mock.patch.object(server, "apply_dns_protection_action", side_effect=apply) as action:
                self.assertEqual(server.run_dns_protection_operation(folder, request), result)
                self.assertEqual(server.run_dns_protection_operation(folder, request), result)
                mismatch = server.run_dns_protection_operation(folder, {**request, "action": "system"})
                self.assertEqual(mismatch["stage"], "conflict")
            action.assert_called_once()
            operation = server.get_dns_operation(folder, request["operationId"])
            self.assertFalse(operation["running"])
            self.assertEqual(operation["body"], result)
            self.assertIsNone(server.get_dns_operation(folder, "another-operation"))

    def test_in_progress_operation_cannot_be_executed_twice_or_replaced(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            request = {"operationId": "first-operation", "action": "activate"}

            def apply(*_):
                self.assertTrue(server.run_dns_protection_operation(folder, request)["pending"])
                self.assertEqual(server.run_dns_protection_operation(folder,
                                 {**request, "operationId": "second-operation"})["stage"], "conflict")
                return {"ok": True}

            with mock.patch.object(server, "apply_dns_protection_action", side_effect=apply) as action:
                server.run_dns_protection_operation(folder, request)
            action.assert_called_once()

    def test_handler_keeps_result_when_sending_the_http_response_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            request = {"operationId": "test-operation", "action": "activate", "expectedRevision": "a" * 64}
            handler = mock.Mock(app_dir=folder, headers={"X-Mihui-Action": "dns"})
            handler.read_json_body.return_value = request
            handler.send_json.side_effect = BrokenPipeError("connection lost")
            result = {"ok": True, "mode": "active"}
            with mock.patch.object(server, "apply_dns_protection_action", return_value=result), self.assertRaises(BrokenPipeError):
                server.MihuiHandler.handle_dns_action(handler)
            self.assertEqual(server.get_dns_operation(folder, request["operationId"])["body"], result)

    def test_apply_exception_and_panel_restart_report_an_uncertain_outcome(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            request = {"operationId": "test-operation", "action": "activate"}
            with mock.patch.object(server, "apply_dns_protection_action", side_effect=OSError("lost response")):
                result = server.run_dns_protection_operation(folder, request)
            self.assertTrue(result["uncertain"])
            self.assertFalse(server.get_dns_operation(folder)["running"])
            server.write_json_atomic(server.dns_operation_path(folder), {"id": "test-operation", "running": True})
            with mock.patch.object(server.threading, "Thread"):
                server.initialize_dns_protection(folder)
            self.assertTrue(server.get_dns_operation(folder)["body"]["uncertain"])
            self.assertFalse(server.get_dns_operation(folder)["running"])

    def test_operation_id_is_bounded_and_does_not_accept_paths(self):
        for identifier in [None, 12, "short", "../operation", "x" * 65]:
            with self.subTest(identifier=identifier), self.assertRaises(ValueError):
                server.validate_dns_protection_request({"operationId": identifier})

    def test_proxy_route_follows_selected_groups_and_checks_automatic_choices(self):
        nodes = {"node": {"type": "Vless"}, "other": {"type": "Trojan"}, "DIRECT": {"type": "Direct"}}
        cases = [
            ({"type": "Selector", "all": ["node", "DIRECT"], "now": "node"}, True),
            ({"type": "Selector", "all": ["node", "DIRECT"], "now": "DIRECT"}, False),
            ({"type": "Selector", "all": ["node"], "now": "missing"}, False),
            ({"type": "Fallback", "all": ["node", "DIRECT"], "now": "node"}, False),
            ({"type": "URLTest", "all": ["node", "other"], "now": "node"}, True),
            ({"type": "LoadBalance", "all": ["node", "other"]}, True),
            ({"type": "Smart", "all": ["node", "DIRECT"]}, False),
            ({"type": "Selector", "all": [], "emptyFallback": "DIRECT"}, False),
            ({"type": "Selector", "all": [], "emptyFallback": "node"}, True),
            ({"type": "FutureGroup", "all": ["node"], "now": "node"}, False),
        ]
        for item, expected in cases:
            with self.subTest(item=item):
                proxies = {**nodes, "inner": item, "PROXY": {"type": "Selector", "all": ["inner"], "now": "inner"}}
                self.assertEqual(server.check_dns_proxy_route(proxies, "PROXY")["ok"], expected)
        cycle = {"PROXY": {"type": "Selector", "all": ["PROXY"], "now": "PROXY"}}
        self.assertFalse(server.check_dns_proxy_route(cycle, "PROXY")["ok"])
        self.assertFalse(server.check_dns_proxy_route({}, "PROXY")["ok"])

    def test_proxy_route_resolves_provider_nodes_missing_from_proxies(self):
        for node_type, expected in [("Vless", True), ("Direct", False), (None, False)]:
            with self.subTest(node_type=node_type):
                def request(_app_dir, path, **_kwargs):
                    if path == "/proxies":
                        return {"proxies": {"PROXY": {
                            "type": "Selector", "all": ["provider-node"], "now": "provider-node",
                        }}}
                    if path == "/providers/proxies":
                        if node_type is None:
                            raise RuntimeError("providers unavailable")
                        return {"providers": {"main": {"proxies": [
                            {"name": "provider-node", "type": node_type},
                        ]}}}
                    raise AssertionError(path)

                with mock.patch.object(server, "mihomo_api_request", side_effect=request) as api:
                    groups = server.get_dns_proxy_groups(Path("."))
                self.assertTrue(groups["ok"])
                self.assertEqual(groups["groups"], ["PROXY"])
                self.assertEqual(server.check_dns_proxy_route(groups["proxies"], "PROXY")["ok"], expected)
                self.assertEqual([call.args[1] for call in api.call_args_list],
                                 ["/proxies", "/providers/proxies"])

    def test_direct_route_stops_lease_renewal_without_rewriting_config(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.active_runtime(folder)
            original = (folder / "config.yaml").read_bytes()
            groups = {"ok": True, "proxies": {"PROXY": {"type": "Selector", "all": ["DIRECT"], "now": "DIRECT"},
                                                "DIRECT": {"type": "Direct"}}}
            with self.suspension_mocks([]), mock.patch.object(server, "get_dns_proxy_groups", return_value=groups), \
                    mock.patch.object(server, "refresh_dns_firewall_lease") as renew, \
                    mock.patch.object(server, "probe_mihomo_dns_listener") as probe:
                server.run_dns_protection_lease_cycle(folder)
            renew.assert_not_called()
            probe.assert_not_called()
            self.assertIn("DIRECT", server.dns_protection_health["message"])
            self.assertEqual((folder / "config.yaml").read_bytes(), original)


class AtomicWriteTests(unittest.TestCase):
    def test_simultaneous_writes_never_publish_partial_content(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "state.json"
            values = [str(index) * 20000 for index in range(8)]
            barrier = threading.Barrier(len(values))

            def write(value):
                barrier.wait(timeout=5)
                server.write_text_atomic(target, value)

            with ThreadPoolExecutor(max_workers=len(values)) as pool:
                list(pool.map(write, values))
            self.assertIn(target.read_text(encoding="utf-8"), values)
            self.assertEqual(list(Path(directory).glob("*.tmp")), [])

    def test_failed_file_sync_preserves_previous_config_and_cleans_temp_file(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "config.yaml"
            target.write_text("old", encoding="utf-8")
            with mock.patch.object(server.os, "fsync", side_effect=OSError("disk error")), self.assertRaises(OSError):
                server.write_text_atomic(target, "new")
            self.assertEqual(target.read_text(), "old")
            self.assertEqual(list(Path(directory).glob("*.tmp")), [])

    def test_content_is_synced_before_replace_and_existing_permissions_are_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "config.yaml"
            target.write_text("old", encoding="utf-8")
            permissions = target.stat().st_mode & 0o777
            events = []
            replace = os.replace

            def record_replace(source, destination):
                events.append("replace")
                return replace(source, destination)

            with mock.patch.object(server.os, "fsync", side_effect=lambda *_: events.append("sync")), \
                    mock.patch.object(server.os, "replace", side_effect=record_replace):
                server.write_text_atomic(target, "new")
            self.assertEqual(events[:2], ["sync", "replace"])
            self.assertEqual(target.stat().st_mode & 0o777, permissions)


if __name__ == "__main__":
    unittest.main()
