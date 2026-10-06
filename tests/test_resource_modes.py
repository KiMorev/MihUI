import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server


class ResourceModeTests(unittest.TestCase):
    def settings(self):
        settings = mihui_server.default_resource_monitor_settings()
        settings["enabled"] = True
        for item in settings["services"].values():
            item.update(enabled=False, mode="off")
        settings["services"]["youtube"].update(enabled=True, mode="prizrak")
        return settings

    def test_modes_automatically_enable_and_disable_management(self):
        settings = self.settings()
        settings["enabled"] = False
        normalized = mihui_server.validate_resource_monitor_settings(settings)
        self.assertTrue(normalized["enabled"])
        self.assertEqual(normalized["services"]["youtube"]["mode"], "prizrak")
        settings["services"]["youtube"].update(enabled=False, mode="off")
        settings["enabled"] = True
        self.assertFalse(mihui_server.validate_resource_monitor_settings(settings)["enabled"])
        settings["services"]["youtube"]["mode"] = "invalid"
        with self.assertRaises(ValueError):
            mihui_server.validate_resource_monitor_settings(settings)

    def test_legacy_settings_and_new_modes_survive_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            legacy = mihui_server.default_resource_monitor_settings()
            legacy["enabled"] = True
            legacy["services"]["youtube"]["enabled"] = False
            mihui_server.write_json_atomic(mihui_server.resource_monitor_settings_path(folder), legacy)
            loaded = mihui_server.load_resource_monitor_settings(folder)
            self.assertEqual(loaded["services"]["youtube"]["mode"], "off")
            self.assertEqual(loaded["services"]["telegram"]["mode"], "mihui")
            expected = mihui_server.validate_resource_monitor_settings(self.settings())
            mihui_server.save_resource_monitor_settings(folder, expected)
            self.assertEqual(mihui_server.load_resource_monitor_settings(folder), expected)

    def test_smart_resources_never_probe_or_select_nodes(self):
        settings = self.settings()
        proxies = {"YOUTUBE": {"type": "Smart", "now": "a", "all": ["a"]}, "a": {"type": "Vless"}}
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            mihui_server.save_resource_monitor_settings(folder, settings)
            with mock.patch.object(mihui_server, "probe_resource_node") as probe, \
                    mock.patch.object(mihui_server, "select_proxy_group") as select, \
                    mock.patch.object(mihui_server, "mihomo_api_request") as api:
                runtime = mihui_server.default_resource_monitor_runtime()
                before = dict(runtime["services"]["youtube"])
                mihui_server.run_resource_monitor_service(folder, settings, runtime, "youtube", proxies, force_switch=True)
                self.assertEqual(mihui_server.select_resource_monitor_fastest_nodes(folder, settings, proxies)["services"], {})
                self.assertEqual(mihui_server.refresh_resource_monitor_provider_delays(folder, settings, proxies, providers={}), [])
                mihui_server.refresh_resource_monitor_reserve(folder)
                mihui_server.run_resource_monitor_startup_cycle(folder)
                self.assertFalse(mihui_server.start_resource_monitor_check(folder, ["youtube"])["ok"])
                probe.assert_not_called()
                select.assert_not_called()
                api.assert_not_called()
                self.assertEqual(runtime["services"]["youtube"], before)

    def test_stale_mihui_settings_cannot_control_smart(self):
        settings = self.settings()
        settings["services"]["youtube"]["mode"] = "mihui"
        proxies = {"YOUTUBE": {"type": "Smart", "now": "a", "all": ["a"]}}
        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(mihui_server, "probe_resource_node") as probe, \
                mock.patch.object(mihui_server, "select_proxy_group") as select:
            folder = Path(directory)
            mihui_server.run_resource_monitor_service(folder, settings, mihui_server.default_resource_monitor_runtime(), "youtube", proxies)
            self.assertEqual(mihui_server.select_resource_monitor_fastest_nodes(folder, settings, proxies)["services"], {})
            probe.assert_not_called()
            select.assert_not_called()

    def test_mixed_readiness_requires_correct_group_types(self):
        settings = self.settings()
        settings["services"]["telegram"].update(enabled=True, mode="mihui")
        proxies = {
            "YOUTUBE": {"type": "Smart", "all": ["a"], "now": "a"},
            "TELEGRAM": {"type": "Selector", "all": ["b"], "now": "b"},
            "a": {"type": "Vless"}, "b": {"type": "Vless"},
        }
        with mock.patch.object(mihui_server, "mihomo_api_request", return_value={"proxies": proxies}):
            self.assertTrue(mihui_server.get_resource_monitor_readiness(Path("."), settings)["ready"])
            proxies["YOUTUBE"]["type"] = "Selector"
            self.assertFalse(mihui_server.get_resource_monitor_readiness(Path("."), settings)["ready"])

    def test_status_detects_existing_smart_without_changing_settings_or_starting_monitor(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            settings = self.settings()
            settings["services"]["youtube"].update(mode="off", enabled=False)
            settings["enabled"] = False
            mihui_server.save_resource_monitor_settings(folder, settings)
            before = mihui_server.resource_monitor_settings_path(folder).read_bytes()
            proxies = {"YOUTUBE": {"type": "Smart", "all": ["a"]}, "a": {"type": "Vless"},
                       "TELEGRAM": {"type": "Selector", "all": ["a"]}}
            with mock.patch.object(mihui_server, "mihomo_api_request", return_value={"proxies": proxies}), \
                    mock.patch.object(mihui_server, "get_resource_smart_support", return_value={"supported": True}), \
                    mock.patch.object(mihui_server, "start_resource_monitor_check") as start:
                status = mihui_server.get_resource_monitor_status(folder)
            self.assertTrue(status["config"]["enabled"])
            self.assertEqual(status["config"]["services"]["youtube"]["mode"], "prizrak")
            self.assertTrue(status["readiness"]["services"]["youtube"]["ready"])
            self.assertEqual(status["config"]["services"]["telegram"]["mode"], "off")
            self.assertEqual(mihui_server.resource_monitor_settings_path(folder).read_bytes(), before)
            start.assert_not_called()

    def test_settings_validation_keeps_requested_mihui_mode_for_a_smart_group_unready(self):
        settings = self.settings()
        settings["services"]["youtube"]["mode"] = "mihui"
        proxies = {"YOUTUBE": {"type": "Smart", "all": ["a"]}, "a": {"type": "Vless"}}
        with mock.patch.object(mihui_server, "mihomo_api_request", return_value={"proxies": proxies}):
            self.assertFalse(mihui_server.get_resource_monitor_readiness(Path("."), settings)["ready"])
            self.assertEqual(settings["services"]["youtube"]["mode"], "mihui")

    def test_capability_probe_is_isolated_and_follows_binary_changes(self):
        mihui_server.resource_smart_support_cache.clear()
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            binary = folder / "mihomo"
            binary.write_bytes(b"one")

            def run(command, **kwargs):
                probe = Path(command[-1])
                self.assertNotEqual(probe.parent, folder)
                self.assertIn("uselightgbm: false", probe.read_text(encoding="utf-8"))
                return subprocess.CompletedProcess(command, 0, stdout=b"ok")

            with mock.patch.object(mihui_server, "find_mihomo_binary", return_value=str(binary)), \
                    mock.patch.object(mihui_server.subprocess, "run", side_effect=run) as check:
                self.assertTrue(mihui_server.get_resource_smart_support(folder)["supported"])
                self.assertTrue(mihui_server.get_resource_smart_support(folder)["supported"])
                check.assert_called_once()
                binary.write_bytes(b"changed")
                self.assertTrue(mihui_server.get_resource_smart_support(folder)["supported"])
                self.assertEqual(check.call_count, 2)
        mihui_server.resource_smart_support_cache.clear()

    def test_smart_detection_ignores_comments_and_other_sections(self):
        for text in (
            "proxy-groups:\n  - name: A\n    type: smart\n",
            'proxy-groups:\n  - {name: A, type: "smart", proxies: [DIRECT]}\n',
            "proxy-groups: [{name: A, type: smart, proxies: [DIRECT]}]\n",
        ):
            self.assertTrue(mihui_server.has_config_smart_groups(text))
        self.assertFalse(mihui_server.has_config_smart_groups(
            "proxy-groups:\n  - name: A\n    type: select # type: smart\nproxies:\n  - name: B\n    type: smart\n"))

    def test_return_to_mihomo_is_blocked_before_download(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            mihui_server.save_mihomo_core(folder, "prizrak")
            with mock.patch.object(mihui_server, "read_config_text", return_value="proxy-groups:\n  - name: A\n    type: smart\n"), \
                    mock.patch.object(mihui_server, "fetch_component_releases") as fetch:
                with self.assertRaisesRegex(ValueError, "Smart"):
                    mihui_server.validate_component_action(folder, {"component": "mihomo", "action": "core", "target": "mihomo"})
                with self.assertRaisesRegex(RuntimeError, "Smart"):
                    mihui_server.run_mihomo_component_update(folder, "v1.19.32", "mihomo")
                fetch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
