import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server
import test_dns_smart_group as fixtures


class DnsGroupSwitchTests(unittest.TestCase):
    def setUp(self):
        self.capture_active = True
        self.proxies = {
            "FASTEST": {"type": "URLTest", "all": ["node"]},
            "NEXT": {"type": "Fallback", "all": ["node"]},
            "PROXY": {"type": "Selector", "all": ["FASTEST"], "now": "FASTEST"},
            "node": {"type": "Vless"}, "DIRECT": {"type": "Direct"},
        }
        self.patch("get_mihomo_core", return_value="prizrak")
        self.patch("get_resource_smart_support", return_value={"supported": True, "message": "Smart поддержан"})
        self.patch("get_dns_proxy_groups", side_effect=lambda *_: {
            "ok": True, "groups": [name for name, item in self.proxies.items() if "all" in item], "proxies": self.proxies, "message": "",
        })
        self.check = self.patch("check_mihomo_config", return_value={"ok": True, "available": True})
        self.reload = self.patch("reload_mihomo", side_effect=self.reload_config)
        self.remove = self.patch("remove_dns_firewall", side_effect=self.remove_capture)
        self.ensure = self.patch("ensure_dns_firewall", return_value={"ok": True})
        self.refresh = self.patch("refresh_dns_firewall_lease", side_effect=self.refresh_capture)
        self.patch("dns_capture_lease_state", side_effect=lambda *_: {
            "known": True, "active": self.capture_active, "complete": self.capture_active,
        })
        self.patch("dns_firewall_installed", return_value={"ok": True})
        self.probe = self.patch("probe_mihomo_dns_listener", return_value={"ok": True})
        self.wait = self.patch("wait_for_mihomo_dns", return_value={"ok": True})
        self.local_resolver_ok = True
        self.ipv6_flag_override = None
        self.lan_addresses = {"ipv4": ["192.168.1.1"], "ipv6": []}
        self.capabilities_mock = self.patch("collect_dns_protection_capabilities", side_effect=self.capabilities)
        self.whitelist = self.patch("get_dns_whitelist_domains", return_value=["allowed.test"])

    def patch(self, name, **kwargs):
        patcher = mock.patch.object(server, name, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def remove_capture(self, *_):
        self.capture_active = False
        return {"ok": True}

    def refresh_capture(self, *_):
        self.capture_active = True
        return {"ok": True}

    def reload_config(self, *_):
        self.assertFalse(self.capture_active, "Config reload must run with capture suspended")
        return {"ok": True}

    def capabilities(self, _folder, group="FASTEST", lan_interfaces=None):
        route = server.check_dns_proxy_route(self.proxies, group)
        return {
            "activationReady": route["ok"], "testReady": route["ok"], "checks": [], "selectedProxyGroup": group,
            "proxyGroups": ["FASTEST", "NEXT", "PROXY"], "proxyRoute": route,
            "lanInterfaces": ["br0"], "addresses": self.lan_addresses,
            "ipv6ClientDns": bool(self.lan_addresses["ipv6"]) if self.ipv6_flag_override is None else self.ipv6_flag_override,
            "localResolver": {"ok": self.local_resolver_ok, "tcpDiagnosticOk": True},
            "systemFallback": {"ok": True, "state": "ready", "message": "Резерв отвечает", "tcpDiagnosticOk": True},
            "routerDns": {"provider": {}, "transit": {}},
        }

    def active_app(self, directory, whitelist=False, ipv6=False):
        folder = Path(directory)
        base = fixtures.CONFIG.replace("dns:\n  enable: false\n", "").replace(
            "rules:\n", "  - name: NEXT\n    type: fallback\n    use: [main]\nrules:\n")
        self.lan_addresses = {"ipv4": ["192.168.1.1"], "ipv6": ["fd00::1"] if ipv6 else []}
        text = server.prepare_dns_protection_text(base, "FASTEST", ipv6, local_resolver=True,
                                                  whitelist_domains=["allowed.test"] if whitelist else None)
        path = folder / "config.yaml"
        path.write_text(text, encoding="utf-8")
        (folder / "mihui.env").write_text(f'MIHUI_CONFIG_PATH="{path}"\n', encoding="utf-8")
        runtime = {**server.default_dns_protection_runtime(), "requestedMode": "active", "proxyGroup": "FASTEST",
                   "managedRevision": server.config_revision(text), "managedBlockRevision": server.dns_managed_block_revision(text),
                   "lanInterfaces": ["br0"], "addresses": {"ipv4": ["192.168.1.1"], "ipv6": ["fd00::1"] if ipv6 else []},
                   "ipv6": ipv6, "updatedAt": 1,
                   "whitelistDns": whitelist, "whitelistDnsCount": 1 if whitelist else 0,
                   "whitelistDnsHash": server.dns_whitelist_metadata(["allowed.test"])["hash"] if whitelist else ""}
        server.save_dns_protection_runtime(folder, runtime)
        return folder, path, text, runtime

    def switch_request(self, text, group="NEXT", operation_id=None):
        payload = {"action": "switch", "proxyGroup": group, "expectedRevision": server.config_revision(text)}
        if operation_id:
            payload["operationId"] = operation_id
        return server.validate_dns_protection_request(payload, require_action=True)

    def assert_old_active(self, folder, path, text, runtime, result):
        self.assertFalse(result["ok"])
        self.assertTrue(result["restoration"]["ok"])
        self.assertEqual(result["mode"], "active")
        self.assertEqual(result["proxyGroup"], "FASTEST")
        self.assertEqual(result["text"], text)
        self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.assertTrue(self.capture_active)
        saved = server.load_dns_protection_runtime(folder)
        for key in ("requestedMode", "profile", "proxyGroup", "whitelistDns", "whitelistDnsHash", "managedBlockRevision", "lanInterfaces", "addresses", "ipv6"):
            self.assertEqual(saved[key], runtime[key])

    def test_switch_changes_only_group_and_preserves_actual_dns_settings(self):
        self.local_resolver_ok = False
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory, whitelist=True)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assertTrue(result["ok"])
            self.assertEqual(result["mode"], "active")
            self.assertEqual(result["proxyGroup"], "NEXT")
            self.assertEqual(result["text"], text.replace("#FASTEST", "#NEXT"))
            self.assertEqual(result["revision"], server.config_revision(result["text"]))
            self.assertEqual(path.read_text(encoding="utf-8"), result["text"])
            saved = server.load_dns_protection_runtime(folder)
            for key in ("requestedMode", "profile", "whitelistDns", "whitelistDnsHash", "whitelistDnsCount", "lanInterfaces", "addresses", "ipv6"):
                self.assertEqual(saved[key], runtime[key])
            self.assertEqual(saved["proxyGroup"], "NEXT")
            self.assertTrue(self.capture_active)

    def test_switch_operation_retry_does_not_reload_again(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, _, text, _ = self.active_app(directory)
            request = self.switch_request(text, operation_id="switch-operation")
            first = server.run_dns_protection_operation(folder, request)
            second = server.run_dns_protection_operation(folder, request)
            self.assertEqual(first, second)
            self.assertTrue(second["ok"])
            self.reload.assert_called_once()

    def test_switch_keeps_original_ipv6_capture_and_probe(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, _, text, runtime = self.active_app(directory, ipv6=True)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assertTrue(result["ok"])
            self.assertTrue(result["runtime"]["ipv6"])
            self.assertEqual(result["runtime"]["addresses"], runtime["addresses"])
            self.wait.assert_called_once_with(True)
            self.assertTrue(self.ensure.call_args.args[1]["ipv6ClientDns"])

    def test_ipv6_scope_drift_during_switch_restores_prior_active_scope(self):
        calls = [0]
        def capabilities(*args, **kwargs):
            calls[0] += 1
            result = self.capabilities(*args, **kwargs)
            if calls[0] == 3:
                result["ipv6ClientDns"] = False
            return result
        self.capabilities_mock.side_effect = capabilities
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory, ipv6=True)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)
            self.assertTrue(result["runtime"]["ipv6"])

    def test_whitelist_drift_during_switch_restores_exact_previous_policy(self):
        self.whitelist.side_effect = [["allowed.test"], ["allowed.test"], ["other.test"]]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory, whitelist=True)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)
            self.assertIn("+.allowed.test", result["text"])
            self.assertNotIn("+.other.test", result["text"])

    def test_switch_rejects_other_settings_and_system_mode(self):
        for field, value in (("profile", "strict"), ("whitelistDns", False), ("lanInterfaces", ["br1"])):
            with self.subTest(field=field), self.assertRaises(ValueError):
                server.validate_dns_protection_request({"action": "switch", "proxyGroup": "NEXT", "expectedRevision": "a" * 64, field: value}, require_action=True)
        with tempfile.TemporaryDirectory() as directory:
            folder, _, text, runtime = self.active_app(directory)
            server.save_dns_protection_runtime(folder, {**runtime, "requestedMode": "system"})
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "preflight")
        self.remove.assert_not_called()

    def test_stale_ownership_topology_and_whitelist_reject_before_suspension(self):
        for drift in ("ownership", "topology", "whitelist"):
            with self.subTest(drift=drift), tempfile.TemporaryDirectory() as directory:
                folder, path, text, runtime = self.active_app(directory, whitelist=drift == "whitelist")
                if drift == "ownership":
                    text = text.replace("use-hosts: true", "use-hosts: false")
                    path.write_text(text, encoding="utf-8")
                elif drift == "topology":
                    self.lan_addresses = {"ipv4": ["192.168.2.1"], "ipv6": []}
                else:
                    self.whitelist.return_value = ["other.test"]
                result = server.apply_dns_protection_action(folder, self.switch_request(text))
                self.assertFalse(result["ok"])
                self.assertEqual(result["stage"], "preflight")
                self.assertEqual(path.read_text(encoding="utf-8"), text)
                self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
                self.assertTrue(self.capture_active)
                self.lan_addresses = {"ipv4": ["192.168.1.1"], "ipv6": []}
        self.remove.assert_not_called()
        self.reload.assert_not_called()

    def test_unsafe_new_route_fails_preflight_without_changing_old_route(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text, "DIRECT"))
            self.assertFalse(result["ok"])
            self.assertEqual(path.read_text(encoding="utf-8"), text)
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
            self.assertTrue(self.capture_active)
        self.remove.assert_not_called()

    def test_failed_new_dns_probe_restores_old_config_and_active_capture(self):
        self.wait.side_effect = [{"ok": False}, {"ok": True}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)

    def test_failed_reload_restores_old_config_and_active_capture(self):
        self.reload.side_effect = [{"ok": False}, {"ok": True}, {"ok": True}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)

    def test_restoration_reapplies_old_config_when_rollback_reload_was_not_verified(self):
        calls = [0]
        applied = ["FASTEST"]
        def reload(*_):
            self.assertFalse(self.capture_active)
            calls[0] += 1
            if calls[0] == 1:
                applied[0] = "NEXT"
                return {"ok": False}
            if calls[0] == 2:
                return {"ok": False}
            applied[0] = "FASTEST"
            return {"ok": True}
        self.reload.side_effect = reload
        def probe(*_):
            self.assertEqual(applied[0], "FASTEST")
            return {"ok": True}
        self.wait.side_effect = probe
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)
            self.assertEqual(calls[0], 3)

    def test_failed_new_firewall_or_lease_restores_old_active_capture(self):
        for failing in ("firewall", "lease"):
            with self.subTest(failing=failing), tempfile.TemporaryDirectory() as directory:
                folder, path, text, runtime = self.active_app(directory)
                self.capture_active = True
                if failing == "firewall":
                    self.ensure.side_effect = [{"ok": False, "message": "Firewall error"}, {"ok": True}]
                else:
                    calls = [False, True]
                    def refresh(*_):
                        okay = calls.pop(0)
                        self.capture_active = okay
                        return {"ok": okay, "message": "Lease result"}
                    self.refresh.side_effect = refresh
                result = server.apply_dns_protection_action(folder, self.switch_request(text))
                self.assert_old_active(folder, path, text, runtime, result)
                self.ensure.side_effect = None
                self.refresh.side_effect = self.refresh_capture

    def test_exception_after_suspend_enters_active_restoration(self):
        self.wait.side_effect = [RuntimeError("probe interrupted"), {"ok": True}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)

    def test_exception_during_suspend_enters_active_restoration(self):
        calls = [0]
        def remove(*args):
            calls[0] += 1
            if calls[0] == 1:
                raise RuntimeError("remove interrupted")
            return self.remove_capture(*args)
        self.remove.side_effect = remove
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assert_old_active(folder, path, text, runtime, result)

    def test_unhealthy_old_dns_remains_on_verified_system_fallback(self):
        self.wait.side_effect = [{"ok": False}, {"ok": False}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, _ = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assertFalse(result["ok"])
            self.assertFalse(result["restoration"]["ok"])
            self.assertEqual(result["mode"], "system")
            self.assertEqual(result["text"], text)
            self.assertEqual(path.read_text(encoding="utf-8"), text)
            self.assertFalse(self.capture_active)
            runtime = server.load_dns_protection_runtime(folder)
            self.assertEqual(runtime["requestedMode"], "system")
            self.assertFalse(runtime["fallbackPending"])

    def test_unconfirmed_cleanup_does_not_claim_old_protection_is_restored(self):
        unknown = [False]
        def failed_probe(*_):
            unknown[0] = True
            return {"ok": False}
        self.wait.side_effect = failed_probe
        self.patch("dns_capture_lease_state", side_effect=lambda *_: {
            "known": not unknown[0], "active": self.capture_active if not unknown[0] else None,
            "complete": self.capture_active if not unknown[0] else False,
        })
        with tempfile.TemporaryDirectory() as directory:
            folder, _, text, _ = self.active_app(directory)
            result = server.apply_dns_protection_action(folder, self.switch_request(text))
            self.assertFalse(result["ok"])
            self.assertFalse(result["restoration"]["ok"])
            self.assertEqual(result["mode"], "fallback")
            self.assertTrue(result["runtime"]["fallbackPending"])
            self.assertNotEqual(result["runtime"]["requestedMode"], "active")

    def test_active_smart_creation_resumes_original_route_without_switching(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.create_dns_smart_group(folder, {"sourceGroup": "FASTEST", "expectedRevision": server.config_revision(text)})
            self.assertTrue(result["ok"])
            self.assertTrue(result["restoration"]["ok"])
            self.assertEqual(result["mode"], "active")
            self.assertEqual(result["proxyGroup"], "FASTEST")
            self.assertIn("  - name: DNS-SMART\n", result["text"])
            self.assertEqual(server.dns_managed_block_revision(result["text"]), runtime["managedBlockRevision"])
            self.assertEqual(path.read_text(encoding="utf-8"), result["text"])
            self.assertEqual(server.load_dns_protection_runtime(folder)["proxyGroup"], "FASTEST")
            self.assertTrue(self.capture_active)

    def test_active_smart_invalid_config_is_rejected_before_suspension(self):
        self.check.return_value = {"ok": False, "available": True, "message": "Invalid Smart config"}
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.create_dns_smart_group(folder, {"sourceGroup": "FASTEST", "expectedRevision": server.config_revision(text)})
            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "check")
            self.assertEqual(path.read_text(encoding="utf-8"), text)
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
            self.assertTrue(self.capture_active)
        self.remove.assert_not_called()
        self.reload.assert_not_called()

    def test_failed_active_smart_creation_restores_original_active_route(self):
        self.reload.side_effect = [{"ok": False}, {"ok": True}, {"ok": True}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.create_dns_smart_group(folder, {"sourceGroup": "FASTEST", "expectedRevision": server.config_revision(text)})
            self.assert_old_active(folder, path, text, runtime, result)

    def test_failed_smart_resume_rolls_back_group_and_recovers_old_route(self):
        self.wait.side_effect = [{"ok": False}, {"ok": True}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.active_app(directory)
            result = server.create_dns_smart_group(folder, {"sourceGroup": "FASTEST", "expectedRevision": server.config_revision(text)})
            self.assert_old_active(folder, path, text, runtime, result)
            self.assertNotIn("name: DNS-SMART", result["text"])


if __name__ == "__main__":
    unittest.main()
