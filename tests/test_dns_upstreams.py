import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import test_dns_group_switch as fixtures

server = fixtures.server
CUSTOM_UPSTREAMS = ["https://dns.example/dns-query?key=Example", "tls://dns.other.example:853"]


class DnsUpstreamsTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.DnsGroupSwitchTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)

    def custom_app(self, directory, mode="test", whitelist=False):
        folder, path, original, runtime = self.fixture.active_app(directory, whitelist=whitelist)
        text = server.prepare_dns_protection_text(
            original, "FASTEST", False, True, ["allowed.test"] if whitelist else None, CUSTOM_UPSTREAMS
        )
        path.write_text(text, encoding="utf-8")
        runtime.update({"requestedMode": mode, "upstreams": CUSTOM_UPSTREAMS,
                        "managedRevision": server.config_revision(text),
                        "managedBlockRevision": server.dns_managed_block_revision(text)})
        server.save_dns_protection_runtime(folder, runtime)
        self.fixture.capture_active = mode == "active"
        return folder, path, text, runtime

    def request(self, text, action=None, upstreams=None, **extra):
        payload = {"proxyGroup": "FASTEST", **extra}
        if action:
            payload.update(action=action, expectedRevision=server.config_revision(text))
        if upstreams is not None:
            payload["upstreams"] = upstreams
        return server.validate_dns_protection_request(payload, require_action=bool(action))

    def test_accepts_doh_paths_queries_and_dot_ipv6_without_changing_bootstrap(self):
        values = ["https://DNS.Example:443/custom/path?key=AbC&profile=family", "tls://[2606:4700:4700::1111]:853"]
        normalized = server.validate_dns_protection_request({"upstreams": values})["upstreams"]
        self.assertEqual(normalized, [values[0].replace("DNS.Example", "dns.example"), values[1]])
        text = server.build_dns_protection_block("FASTEST", False, True, ["allowed.test"], normalized)
        for value in normalized:
            self.assertIn(server.yaml_single_quote(value + "#FASTEST"), text)
        self.assertIn(server.DNS_PROTECTION_PROXY_RESOLVER, text)
        self.assertIn("udp://127.0.0.1:41100", text)
        for value in server.DNS_PROTECTION_BOOTSTRAP + server.DNS_WHITELIST_SERVERS:
            self.assertIn(value, text)

    def test_rejects_empty_plaintext_credentials_routes_and_tls_bypasses(self):
        invalid = [None, [], "https://dns.example/query", [""], [123], ["tls://dns.example"] * 5,
                   ["https://dns.example", "HTTPS://DNS.EXAMPLE"],
                   *[[value] for value in (
                       "http://dns.example/query", "udp://1.1.1.1", "dns.example", "https://",
                       "https://user:secret@dns.example/query", "https://dns.example/query#DIRECT",
                       "https://dns.example/query#FASTEST&skip-cert-verify=true", "tls://dns.example#",
                       "https://dns.example/query?skip-cert-verify=true", "https://dns.example/query?skip_cert_verify=true",
                       "https://dns.example/query?%69nsecure=true", "https://dns.example/query?proxy=DIRECT",
                       "https://dns.example/query?interface=eth0", "tls://dns.example/query", "tls://dns.example?x=1",
                       "https://dns.example:0/query", "https://dns.example:65536/query", "tls://dns.example:",
                       "https://dns.example/query\n", "https://dns.example/query\x7f", "https://dns.example\\@evil.example/query",
                   )]]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                server.validate_dns_protection_request({"upstreams": value})

    def test_legacy_runtime_and_omitted_request_keep_default_resolvers(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            server.dns_protection_runtime_path(folder).write_text(json.dumps({"requestedMode": "system"}), encoding="utf-8")
            self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], list(server.DNS_PROTECTION_UPSTREAMS))
            request = server.validate_dns_protection_request({})
            self.assertIsNone(request["upstreams"])
            self.assertEqual(server.dns_protection_request_upstreams(folder, request), list(server.DNS_PROTECTION_UPSTREAMS))

    def test_preview_status_test_activation_and_system_return_keep_custom_resolvers(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, _ = self.custom_app(directory)
            preview = server.preview_dns_protection(folder, self.request(text), record_event=False)
            self.assertEqual(preview["upstreams"], CUSTOM_UPSTREAMS)
            self.assertEqual(preview["plan"]["upstreams"], CUSTOM_UPSTREAMS)
            self.assertEqual(server.get_dns_protection_status(folder)["upstreams"], CUSTOM_UPSTREAMS)
            for action in ("test", "activate", "system", "test"):
                text = path.read_text(encoding="utf-8")
                result = server.apply_dns_protection_action(folder, self.request(text, action))
                self.assertTrue(result["ok"], result)
                self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], CUSTOM_UPSTREAMS)
                if action == "system":
                    self.assertEqual(result["runtime"]["requestedMode"], "system")
                    self.assertEqual(result["upstreams"], CUSTOM_UPSTREAMS)
                    self.assertNotIn(server.DNS_PROTECTION_MARKER_BEGIN, path.read_text(encoding="utf-8"))
                else:
                    self.assertEqual(result["upstreams"], CUSTOM_UPSTREAMS)
                    for value in CUSTOM_UPSTREAMS:
                        self.assertIn(value + "#FASTEST", path.read_text(encoding="utf-8"))
            self.assertEqual(self.fixture.wait.call_count, 3)

    def test_new_resolvers_are_checked_and_live_probed_before_capture(self):
        replacement = ["tls://new.example"]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.custom_app(directory)
            self.fixture.wait.return_value = {"ok": False, "probes": []}
            result = server.apply_dns_protection_action(folder, self.request(text, "test", replacement))
            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "probe")
            self.assertTrue(result["rollback"]["ok"])
            self.assertEqual(path.read_text(encoding="utf-8"), text)
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
            self.assertTrue(any("tls://new.example#FASTEST" in call.args[1] for call in self.fixture.check.call_args_list))
            self.fixture.wait.assert_called_once_with(False)
            self.fixture.ensure.assert_not_called()
            self.fixture.refresh.assert_not_called()

    def test_invalid_new_configuration_cannot_replace_old_test_or_install_capture(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.custom_app(directory)
            self.fixture.check.return_value = {"ok": False, "available": True, "message": "invalid"}
            result = server.apply_dns_protection_action(folder, self.request(text, "test", ["tls://new.example"]))
            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "preflight")
            self.assertEqual(path.read_text(encoding="utf-8"), text)
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
            self.fixture.wait.assert_not_called()
            self.fixture.ensure.assert_not_called()

    def test_changed_resolvers_invalidate_activation_until_the_new_list_is_tested(self):
        replacement = ["tls://new.example"]
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.custom_app(directory)
            preview = server.preview_dns_protection(folder, self.request(text, upstreams=replacement), record_event=False)
            self.assertTrue(preview["canTest"])
            self.assertFalse(preview["canActivate"])
            with mock.patch.object(server, "save_checked_config") as save:
                rejected = server.apply_dns_protection_action(folder, self.request(text, "activate", replacement))
            self.assertFalse(rejected["ok"])
            self.assertEqual(rejected["stage"], "preflight")
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
            save.assert_not_called()
            self.fixture.ensure.assert_not_called()
            checked = server.apply_dns_protection_action(folder, self.request(text, "test", replacement))
            self.assertTrue(checked["ok"], checked)
            self.assertTrue(checked["canActivate"])
            self.assertNotIn("upstreams-test-required", [item["code"] for item in checked["warnings"]])
            changed = path.read_text(encoding="utf-8")
            self.assertNotEqual(server.dns_managed_block_revision(changed), runtime["managedBlockRevision"])
            preview = server.preview_dns_protection(folder, self.request(changed, upstreams=replacement), record_event=False)
            self.assertTrue(preview["canActivate"])
            active = server.apply_dns_protection_action(folder, self.request(changed, "activate", replacement))
            self.assertTrue(active["ok"], active)
            self.assertEqual(active["runtime"]["upstreams"], replacement)

    def test_explicit_resolvers_cannot_activate_from_system_without_a_test(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, _, text, _ = self.custom_app(directory, mode="system")
            preview = server.preview_dns_protection(folder, self.request(text, upstreams=CUSTOM_UPSTREAMS), record_event=False)
            self.assertFalse(preview["canActivate"])
            result = server.apply_dns_protection_action(folder, self.request(text, "activate", CUSTOM_UPSTREAMS))
            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "preflight")
            self.fixture.wait.assert_not_called()
            self.fixture.ensure.assert_not_called()

    def test_active_resolver_change_requires_system_mode_before_any_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.custom_app(directory, mode="active")
            for action in ("test", "activate"):
                result = server.apply_dns_protection_action(folder, self.request(text, action, ["tls://new.example"]))
                self.assertEqual(result["stage"], "preflight")
            self.assertEqual(path.read_text(encoding="utf-8"), text)
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
            self.fixture.check.assert_not_called()
            self.fixture.remove.assert_not_called()

    def test_group_switch_and_smart_creation_preserve_custom_dns_block(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, _ = self.custom_app(directory, mode="active", whitelist=True)
            result = server.create_dns_smart_group(folder, {"sourceGroup": "FASTEST", "expectedRevision": server.config_revision(text)})
            self.assertTrue(result["ok"], result)
            self.assertEqual(server.dns_managed_block_revision(result["text"]), server.dns_managed_block_revision(text))
            self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], CUSTOM_UPSTREAMS)
            current = path.read_text(encoding="utf-8")
            switched = server.apply_dns_protection_action(folder, self.fixture.switch_request(current))
            self.assertTrue(switched["ok"], switched)
            self.assertEqual(path.read_text(encoding="utf-8"), current.replace("#FASTEST", "#NEXT"))
            self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], CUSTOM_UPSTREAMS)

    def test_whitelist_policy_update_preserves_custom_upstreams(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, _ = self.custom_app(directory, whitelist=True)
            result = server.save_whitelist_config_with_dns(folder, text, text, allowed_hosts=["next.example"])
            self.assertTrue(result["ok"], result)
            updated = path.read_text(encoding="utf-8")
            self.assertIn("+.next.example", updated)
            self.assertNotIn("+.allowed.test", updated)
            for value in CUSTOM_UPSTREAMS:
                self.assertIn(value + "#FASTEST", updated)
            self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], CUSTOM_UPSTREAMS)

    def test_suspension_and_recovery_preserve_custom_upstreams(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path, text, runtime = self.custom_app(directory, mode="active")
            lan = {"ok": True, "interfaces": ["br0"], "ipv4": ["192.168.1.1"], "ipv6": [],
                   "bindings": [{"address": "192.168.1.1", "interface": "br0"}]}
            with mock.patch.object(server, "discover_dns_lan_addresses", return_value=lan), mock.patch.object(
                server, "probe_system_dns_fallback", return_value={"ok": True}
            ):
                with server.suspend_dns_capture(folder):
                    self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], CUSTOM_UPSTREAMS)
                restored = server.restore_active_dns_after_change(folder, text, runtime, server.config_revision(text), config_applied=True)
            self.assertTrue(restored["ok"], restored)
            self.assertEqual(server.load_dns_protection_runtime(folder)["upstreams"], CUSTOM_UPSTREAMS)
            self.assertEqual(path.read_text(encoding="utf-8"), text)


if __name__ == "__main__":
    unittest.main()
