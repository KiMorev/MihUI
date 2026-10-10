import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


CONFIG = """mixed-port: 7890
proxy-providers:
  main:
    type: file
    path: ./main.yaml
proxy-groups:
  - name: FASTEST
    type: url-test
    use: [main]
    filter: 'Europe'
    exclude-filter: 'expired'
    exclude-type: 'ss'
    url: https://www.gstatic.com/generate_204
    interval: 300
  - name: PROXY
    type: select
    proxies: [FASTEST]
rules:
  - MATCH,PROXY
dns:
  enable: false
"""


class DnsSmartGroupTests(unittest.TestCase):
    def setUp(self):
        self.proxies = {
            "FASTEST": {"type": "URLTest", "all": ["node"]},
            "PROXY": {"type": "Selector", "all": ["FASTEST"], "now": "FASTEST"},
            "node": {"type": "Vless", "_mihui_provider": "main"},
            "DIRECT": {"type": "Direct"},
        }
        self.core = self.patch("get_mihomo_core", return_value="prizrak")
        self.support = self.patch("get_resource_smart_support", return_value={"supported": True, "message": "Smart поддержан"})
        self.patch("get_dns_proxy_groups", side_effect=lambda *_: {
            "ok": True, "groups": [name for name, item in self.proxies.items() if "all" in item],
            "proxies": self.proxies, "message": "",
        })
        self.check = self.patch("check_mihomo_config", return_value={"ok": True, "available": True})
        self.reload = self.patch("reload_mihomo", return_value={"ok": True})

    def patch(self, name, **kwargs):
        patcher = mock.patch.object(server, name, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def make_app(self, directory, text=CONFIG):
        folder = Path(directory)
        path = folder / "config.yaml"
        path.write_text(text, encoding="utf-8")
        (folder / "mihui.env").write_text(f'MIHUI_CONFIG_PATH="{path}"\n', encoding="utf-8")
        return folder, path

    def request(self, text=CONFIG, source="FASTEST"):
        return {"sourceGroup": source, "expectedRevision": server.config_revision(text)}

    def test_only_installed_prizrak_with_confirmed_smart_can_create(self):
        for core, supported in (("mihomo", True), ("prizrak", False)):
            with self.subTest(core=core, supported=supported), tempfile.TemporaryDirectory() as directory:
                folder, path = self.make_app(directory)
                self.core.return_value = core
                self.support.return_value = {"supported": supported, "message": "Smart не подтверждён"}
                result = server.create_dns_smart_group(folder, self.request())
                self.assertFalse(result["ok"])
                self.assertEqual(result["stage"], "unsupported")
                self.assertFalse(server.get_dns_smart_group_status(folder)["available"])
                self.assertEqual(path.read_text(encoding="utf-8"), CONFIG)
        self.check.assert_not_called()
        self.reload.assert_not_called()

    def test_creation_preserves_dynamic_provider_filters_and_dns_without_switching(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory)
            result = server.create_dns_smart_group(folder, self.request())
            self.assertTrue(result["ok"])
            self.assertTrue(result["applied"])
            self.assertEqual(result["group"], "DNS-SMART")
            self.assertEqual(path.read_text(encoding="utf-8"), result["text"])
            block = """  - name: DNS-SMART
    type: smart
    uselightgbm: true
    collectdata: false
    use: [main]
    filter: 'Europe'
    exclude-filter: 'expired'
    exclude-type: 'ss'
"""
            self.assertIn(block, result["text"])
            self.assertEqual(result["text"].replace(block, ""), CONFIG)
            self.assertEqual(result["revision"], server.config_revision(result["text"]))
            self.assertNotIn("proxies: [node]", result["text"])
            self.assertNotIn("lgbm-auto-update", result["text"])
            self.assertFalse(server.dns_protection_runtime_path(folder).exists())
            self.check.assert_called_once_with(folder, result["text"])
            self.reload.assert_called_once()

    def test_nested_selector_flattens_to_provider_pool(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, _ = self.make_app(directory)
            status = server.get_dns_smart_group_status(folder)
            self.assertEqual(status["sources"], ["FASTEST", "PROXY"])
            result = server.create_dns_smart_group(folder, self.request(source="PROXY"))
            self.assertTrue(result["ok"])
            block = result["text"].split("  - name: DNS-SMART\n", 1)[1].split("rules:\n", 1)[0]
            self.assertIn("use: [main]", block)
            self.assertIn("filter: 'Europe'", block)
            self.assertNotIn("FASTEST", block)
            self.assertNotIn("url:", block)
            self.assertNotIn("interval:", block)

    def test_different_nested_filters_require_a_concrete_source(self):
        text = CONFIG.replace("proxies: [FASTEST]", "proxies: [FASTEST, FALLBACK]").replace(
            "rules:\n", "  - name: FALLBACK\n    type: fallback\n    use: [main]\n    filter: 'America'\nrules:\n")
        self.proxies["FALLBACK"] = {"type": "Fallback", "all": ["node"]}
        self.proxies["PROXY"]["all"].append("FALLBACK")
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory, text)
            self.assertEqual(server.get_dns_smart_group_status(folder)["sources"], ["FASTEST", "FALLBACK"])
            result = server.create_dns_smart_group(folder, self.request(text, "PROXY"))
            self.assertFalse(result["ok"])
            self.assertIn("разные источники или фильтры", result["message"])
            self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.check.assert_not_called()

    def test_creation_preserves_group_list_indentation(self):
        prefix, section = CONFIG.split("proxy-groups:\n", 1)
        groups, suffix = section.split("rules:\n", 1)
        text = prefix + "proxy-groups:\n" + "\n".join("  " + line for line in groups.splitlines()) + "\nrules:\n" + suffix
        with tempfile.TemporaryDirectory() as directory:
            folder, _ = self.make_app(directory, text)
            result = server.create_dns_smart_group(folder, self.request(text))
            self.assertTrue(result["ok"])
            self.assertIn("    - name: DNS-SMART\n      type: smart\n", result["text"])
            self.assertIn("      use: [main]\n", result["text"])

    def test_neighbor_with_type_before_name_does_not_replace_source_provider(self):
        text = CONFIG.replace("rules:\n", "  - type: select\n    name: OTHER\n    use: [backup]\nrules:\n")
        with tempfile.TemporaryDirectory() as directory:
            folder, _ = self.make_app(directory, text)
            result = server.create_dns_smart_group(folder, self.request(text))
            self.assertTrue(result["ok"])
            block = result["text"].split("  - name: DNS-SMART\n", 1)[1].split("rules:\n", 1)[0]
            self.assertIn("use: [main]", block)
            self.assertNotIn("backup", block)

    def test_selector_direct_candidate_is_rejected_even_when_proxy_is_selected(self):
        self.proxies["PROXY"]["all"].append("DIRECT")
        text = CONFIG.replace("proxies: [FASTEST]", "proxies: [FASTEST, DIRECT]")
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory, text)
            self.assertEqual(server.get_dns_smart_group_status(folder)["sources"], ["FASTEST"])
            result = server.create_dns_smart_group(folder, self.request(text, "PROXY"))
            self.assertFalse(result["ok"])
            self.assertIn("DIRECT", result["message"])
            self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.check.assert_not_called()

    def test_saved_direct_candidate_is_rejected_when_live_group_is_stale(self):
        text = CONFIG.replace("proxies: [FASTEST]", "proxies: [FASTEST, DIRECT]")
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory, text)
            result = server.create_dns_smart_group(folder, self.request(text, "PROXY"))
            self.assertFalse(result["ok"])
            self.assertIn("DIRECT", result["message"])
            self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.check.assert_not_called()

    def test_existing_group_name_is_never_overwritten(self):
        text = CONFIG.replace("rules:\n", "  - name: DNS-SMART\n    type: select\n    proxies: [DIRECT]\nrules:\n")
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory, text)
            self.assertTrue(server.get_dns_smart_group_status(folder)["exists"])
            result = server.create_dns_smart_group(folder, self.request(text))
            self.assertEqual(result["stage"], "conflict")
            self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.check.assert_not_called()

    def test_existing_group_with_type_before_name_is_not_overwritten(self):
        text = CONFIG.replace("rules:\n", "  - type: select\n    name: DNS-SMART\n    proxies: [DIRECT]\nrules:\n")
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory, text)
            self.assertTrue(server.get_dns_smart_group_status(folder)["exists"])
            result = server.create_dns_smart_group(folder, self.request(text))
            self.assertEqual(result["stage"], "conflict")
            self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.check.assert_not_called()

    def test_stale_revision_cannot_save(self):
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory, CONFIG + "# external change\n")
            result = server.create_dns_smart_group(folder, self.request())
            self.assertEqual(result["stage"], "conflict")
            self.assertNotIn("DNS-SMART", path.read_text(encoding="utf-8"))
        self.support.assert_not_called()
        self.check.assert_not_called()

    def test_active_test_or_pending_fallback_must_return_to_system_first(self):
        for mode, pending in (("active", False), ("test", False), ("system", True)):
            with self.subTest(mode=mode, pending=pending), tempfile.TemporaryDirectory() as directory:
                folder, path = self.make_app(directory)
                runtime = {**server.default_dns_protection_runtime(), "requestedMode": mode, "fallbackPending": pending}
                server.save_dns_protection_runtime(folder, runtime)
                result = server.create_dns_smart_group(folder, self.request())
                self.assertEqual(result["stage"], "preflight")
                self.assertEqual(path.read_text(encoding="utf-8"), CONFIG)
                self.assertEqual(server.load_dns_protection_runtime(folder), runtime)
        self.check.assert_not_called()

    def test_failed_apply_uses_existing_rollback(self):
        self.reload.side_effect = [{"ok": False}, {"ok": True}]
        with tempfile.TemporaryDirectory() as directory:
            folder, path = self.make_app(directory)
            result = server.create_dns_smart_group(folder, self.request())
            self.assertFalse(result["ok"])
            self.assertTrue(result["rolledBack"])
            self.assertNotIn("text", result)
            self.assertEqual(path.read_text(encoding="utf-8"), CONFIG)

    def test_request_and_handler_require_dns_action_header(self):
        handler = object.__new__(server.MihuiHandler)
        handler.headers = {}
        handler.send_json = mock.Mock()
        handler.read_json_body = mock.Mock()
        handler.handle_dns_smart_group()
        self.assertEqual(handler.send_json.call_args.args[0], 403)
        handler.read_json_body.assert_not_called()
        for payload in ({"sourceGroup": "FASTEST"}, {**self.request(), "text": CONFIG}, {**self.request(), "sourceGroup": "a#DIRECT"}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                server.validate_dns_smart_group_request(payload)


if __name__ == "__main__":
    unittest.main()
