import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


class DnsWhitelistRouteTests(unittest.TestCase):
    def setup_dns(self, folder, yandex=False):
        config = folder / "config.yaml"
        text = server.prepare_dns_protection_text(
            "mixed-port: 7890\nrules:\n  - MATCH,PROXY\n", "FASTEST", False,
            whitelist_domains=["old.example"] if yandex else None)
        config.write_text(text, encoding="utf-8")
        (folder / "mihui.env").write_text(f"MIHUI_CONFIG_PATH={config}\n", encoding="utf-8")
        runtime = {**server.default_dns_protection_runtime(), "requestedMode": "active",
                   "proxyGroup": "FASTEST", "whitelistDns": yandex,
                   "managedRevision": server.config_revision(text),
                   "managedBlockRevision": server.dns_managed_block_revision(text),
                   "lanInterfaces": ["br0"], "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []}}
        server.save_dns_protection_runtime(folder, runtime)
        return text, runtime

    def proxies(self):
        return {"ok": True, "proxies": {
            "FASTEST": {"type": "URLTest", "all": ["ordinary"]},
            "WHITE-RU": {"type": "URLTest", "all": ["white"]},
            "ordinary": {"type": "Vless"}, "white": {"type": "Vless"}}}

    def test_entering_and_leaving_whitelist_switches_dns_in_the_same_save(self):
        for yandex in (False, True):
            with self.subTest(yandex=yandex), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                original, _ = self.setup_dns(folder, yandex)
                config = folder / "config.yaml"
                saved_texts = []

                def save(_folder, text, expected_revision):
                    self.assertEqual(expected_revision, server.config_revision(config.read_text(encoding="utf-8")))
                    saved_texts.append(text)
                    config.write_text(text, encoding="utf-8")
                    return {"ok": True, "applied": True, "revision": server.config_revision(text)}

                temporary = server.prepare_whitelist_fallback_text(original, {"proxyGroup": "WHITE-RU"}, ["allowed.example"])
                with mock.patch.object(server, "get_dns_proxy_groups", return_value=self.proxies()), \
                        mock.patch.object(server, "save_checked_config", side_effect=save):
                    result = server.save_whitelist_config_with_dns(folder, original, temporary, ["allowed.example"])
                    self.assertTrue(result["applied"])
                    active = saved_texts[-1]
                    self.assertIn("MATCH,WHITE-RU", active)
                    self.assertIn("https://1.1.1.1/dns-query#WHITE-RU", active)
                    self.assertNotIn("https://1.1.1.1/dns-query#FASTEST", active)
                    runtime = server.load_dns_protection_runtime(folder)
                    self.assertEqual(runtime["proxyGroup"], "FASTEST")
                    self.assertEqual(runtime["managedBlockRevision"], server.dns_managed_block_revision(active))
                    if yandex:
                        self.assertIn("+.allowed.example", active)
                    restored = server.remove_whitelist_fallback_text(active)
                    server.save_whitelist_config_with_dns(folder, active, restored)
                    self.assertEqual(len(saved_texts), 2)
                    self.assertIn("https://1.1.1.1/dns-query#FASTEST", saved_texts[-1])
                    self.assertFalse(server.has_whitelist_fallback_config(saved_texts[-1]))
                    self.assertEqual(server.load_dns_protection_runtime(folder)["managedBlockRevision"],
                                     server.dns_managed_block_revision(saved_texts[-1]))

    def test_effective_route_uses_applied_rule_not_new_monitor_preferences(self):
        text = server.prepare_whitelist_fallback_text("rules: []\n", {"proxyGroup": "CUSTOM-RU"}, ["allowed.example"])
        self.assertEqual(server.effective_dns_proxy_group(text, "FASTEST"), "CUSTOM-RU")
        self.assertEqual(server.effective_dns_proxy_group(server.remove_whitelist_fallback_text(text), "FASTEST"), "FASTEST")

    def test_preview_during_whitelist_uses_white_group_but_retains_normal_choice(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            text, _ = self.setup_dns(folder)
            text = server.prepare_whitelist_fallback_text(text, {"proxyGroup": "WHITE-RU"}, ["allowed.example"])
            (folder / "config.yaml").write_text(text, encoding="utf-8")
            capabilities = {"ready": True, "testReady": True, "activationReady": True,
                            "selectedProxyGroup": "FASTEST", "effectiveProxyGroup": "WHITE-RU",
                            "ipv6ClientDns": False, "checks": [], "localResolver": {"ok": False},
                            "systemFallback": {"ok": True, "tcpDiagnosticOk": True},
                            "routerDns": {"provider": {}, "transit": {}}}
            request = server.validate_dns_protection_request({"proxyGroup": "FASTEST"})
            with mock.patch.object(server, "collect_dns_protection_capabilities", return_value=capabilities), \
                    mock.patch.object(server, "check_mihomo_config", return_value={"ok": True, "available": True}) as check:
                result = server.preview_dns_protection(folder, request, record_event=False)
            self.assertEqual(result["proxyGroup"], "FASTEST")
            self.assertEqual(result["effectiveProxyGroup"], "WHITE-RU")
            self.assertEqual(result["plan"]["upstreamRoute"], "WHITE-RU")
            self.assertIn("https://1.1.1.1/dns-query#WHITE-RU", check.call_args.args[1])
            self.assertNotIn("https://1.1.1.1/dns-query#FASTEST", check.call_args.args[1])

    def test_failed_save_does_not_advance_dns_ownership_or_normal_group(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            text, runtime = self.setup_dns(folder)
            temporary = server.prepare_whitelist_fallback_text(text, {"proxyGroup": "WHITE-RU"}, ["allowed.example"])
            with mock.patch.object(server, "get_dns_proxy_groups", return_value=self.proxies()), \
                    mock.patch.object(server, "save_checked_config", return_value={"ok": False, "applied": False}):
                self.assertFalse(server.save_whitelist_config_with_dns(folder, text, temporary)["ok"])
            self.assertEqual(server.load_dns_protection_runtime(folder), runtime)

    def test_unsafe_white_group_or_manually_edited_dns_is_rejected_before_save(self):
        for manual in (False, True):
            with self.subTest(manual=manual), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                text, _ = self.setup_dns(folder)
                if manual:
                    text = text.replace("#FASTEST", "#MANUAL")
                temporary = server.prepare_whitelist_fallback_text(text, {"proxyGroup": "WHITE-RU"}, ["allowed.example"])
                proxies = self.proxies()
                proxies["proxies"]["white"] = {"type": "Direct"}
                with mock.patch.object(server, "get_dns_proxy_groups", return_value=proxies), \
                        mock.patch.object(server, "save_checked_config") as save:
                    with self.assertRaises(ValueError):
                        server.save_whitelist_config_with_dns(folder, text, temporary)
                    save.assert_not_called()

    def test_watchdog_checks_effective_white_route_and_keeps_normal_preference(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            text, runtime = self.setup_dns(folder)
            white = server.prepare_whitelist_fallback_text(text, {"proxyGroup": "WHITE-RU"}, ["allowed.example"])
            white = server.prepare_dns_group_switch_text(white, "FASTEST", "WHITE-RU")
            (folder / "config.yaml").write_text(white, encoding="utf-8")
            runtime["managedBlockRevision"] = server.dns_managed_block_revision(white)
            server.save_dns_protection_runtime(folder, runtime)
            with mock.patch.object(server, "discover_dns_lan_addresses", return_value={
                    "ok": True, "interfaces": ["br0"], "ipv4": ["192.168.1.1"], "ipv6": []}), \
                    mock.patch.object(server, "get_dns_proxy_groups", return_value=self.proxies()), \
                    mock.patch.object(server, "check_dns_proxy_route", wraps=server.check_dns_proxy_route) as route, \
                    mock.patch.object(server, "probe_mihomo_dns_listener", return_value={"ok": True}), \
                    mock.patch.object(server, "dns_firewall_installed", return_value={"ok": True}), \
                    mock.patch.object(server, "refresh_dns_firewall_lease", return_value={"ok": True}):
                server.run_dns_protection_lease_cycle(folder)
                self.assertEqual(route.call_args.args[1], "WHITE-RU")
            self.assertEqual(server.load_dns_protection_runtime(folder)["proxyGroup"], "FASTEST")


if __name__ == "__main__":
    unittest.main()
