import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server


class SimpleModeTests(unittest.TestCase):
    def proxies(self, kind="Selector"):
        return {"SERVICE": {"type": kind, "all": ["a", "b", "c", "DIRECT"], "now": "a", "fixed": "",
                            "testUrl": "https://service.example/check"},
                "a": {"type": "Vless", "history": [{"delay": 30}]},
                "b": {"type": "Vless", "history": [{"delay": 10}]},
                "c": {"type": "Vless", "history": [{"delay": 20}]}}

    def connection(self, connection_id, destination="*.service.example", node="a", group="SERVICE", block="normal"):
        return {"id": connection_id, "chains": [node, group],
                "metadata": {"smartBlock": block, "smartTarget": "RULESET:service", "wildcardTarget": destination}}

    def test_inventory_is_live_independent_of_providers_config_and_monitor(self):
        proxies = self.proxies()
        proxies.update({"GLOBAL": {"type": "Selector", "all": ["SERVICE"], "now": "SERVICE"},
                        "SMART": {"type": "Smart", "all": ["a"], "fixed": "", "hidden": True},
                        "FASTEST": {"type": "URLTest", "all": ["a", "b"]}})
        with mock.patch.object(mihui_server, "mihomo_api_request", return_value={"proxies": proxies}) as api, \
                mock.patch.object(mihui_server, "get_config_path", side_effect=AssertionError("config read")), \
                mock.patch.object(mihui_server, "load_resource_monitor_settings", side_effect=AssertionError("monitor read")):
            result = mihui_server.get_runtime_groups(Path("."))
        self.assertTrue(result["ok"])
        self.assertEqual([group["name"] for group in result["groups"]], ["SERVICE", "GLOBAL", "SMART"])
        self.assertEqual(api.call_args_list, [mock.call(Path("."), "/proxies", timeout=5)])

    def test_inventory_failure_has_clear_message_without_controller_details(self):
        with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=RuntimeError("Bearer secret")):
            result = mihui_server.get_runtime_groups(Path("."))
        self.assertFalse(result["ok"])
        self.assertEqual(result["groups"], [])
        self.assertNotIn("secret", json.dumps(result))

    def selector_api(self, proxies, delays, calls):
        def request(app_dir, path, method="GET", payload=None, **kwargs):
            calls.append((path, method, payload))
            route = urllib.parse.urlsplit(path).path
            if route == "/proxies":
                return {"proxies": proxies}
            if route == "/proxies/SERVICE":
                if method == "PUT":
                    proxies["SERVICE"]["now"] = payload["name"]
                return proxies["SERVICE"]
            if route.endswith("/delay"):
                name = urllib.parse.unquote(route.split("/")[2])
                value = delays[name]
                if isinstance(value, Exception):
                    raise value
                return {"delay": value}
            raise AssertionError(path)
        return request

    def test_generic_selector_chooses_fastest_successful_other_member_and_confirms(self):
        proxies, calls = self.proxies(), []
        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(mihui_server, "mihomo_api_request",
                                  side_effect=self.selector_api(proxies, {"b": 20, "c": 7}, calls)):
            result = mihui_server.replace_runtime_group(Path(directory), "SERVICE")
        self.assertTrue(result["ok"])
        self.assertTrue(result["changed"])
        self.assertEqual(result["now"], "c")
        delay_paths = [path for path, _, _ in calls if "/delay?" in path]
        self.assertEqual(len(delay_paths), 2)
        for path in delay_paths:
            self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)["url"], ["https://service.example/check"])
        self.assertFalse(any(path.startswith("/group/") or method == "DELETE" for path, method, _ in calls))
        self.assertEqual([call for call in calls if call[1] == "PUT"], [("/proxies/SERVICE", "PUT", {"name": "c"})])
        self.assertEqual(calls[-1], ("/proxies/SERVICE", "GET", None))

    def test_generic_selector_no_working_alternative_does_not_select(self):
        proxies, calls = self.proxies(), []
        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(mihui_server, "mihomo_api_request",
                                  side_effect=self.selector_api(proxies, {"b": TimeoutError(), "c": 0}, calls)):
            result = mihui_server.replace_runtime_group(Path(directory), "SERVICE")
        self.assertFalse(result["ok"])
        self.assertFalse(any(method == "PUT" for _, method, _ in calls))

    def test_generic_selector_drift_during_probes_never_overwrites_new_state(self):
        for change in ({"now": "b"}, {"now": "c"}, {"type": "Smart"}, {"all": ["a", "b"]}):
            with self.subTest(change=change):
                proxies, calls = self.proxies(), []
                handler = self.selector_api(proxies, {"b": 7, "c": 20}, calls)

                def request(app_dir, path, **kwargs):
                    if "/b/delay?" in path:
                        proxies["SERVICE"].update(change)
                    return handler(app_dir, path, **kwargs)

                with tempfile.TemporaryDirectory() as directory, \
                        mock.patch.object(mihui_server, "mihomo_api_request", side_effect=request):
                    result = mihui_server.replace_runtime_group(Path(directory), "SERVICE")
                self.assertFalse(result["ok"])
                self.assertIn("Состояние группы изменилось", result["message"])
                self.assertFalse(any(method == "PUT" for _, method, _ in calls))

    def test_generic_selector_unchanged_selection_is_not_reported_as_success(self):
        proxies, calls = self.proxies(), []
        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(mihui_server, "mihomo_api_request", side_effect=self.selector_api(proxies, {"b": 7, "c": 20}, calls)), \
                mock.patch.object(mihui_server, "select_proxy_group", return_value={"ok": True, "changed": False, "now": "b"}):
            result = mihui_server.replace_runtime_group(Path(directory), "SERVICE")
        self.assertFalse(result["ok"])
        self.assertIn("Состояние группы изменилось", result["message"])

    def test_managed_selector_reuses_force_switch_and_existing_quarantine(self):
        proxies, calls = self.proxies(), []
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            settings = mihui_server.default_resource_monitor_settings()
            settings["enabled"] = True
            for item in settings["services"].values():
                item.update(enabled=False, mode="off")
            settings["services"]["telegram"].update(enabled=True, mode="mihui", group="SERVICE")
            mihui_server.save_resource_monitor_settings(folder, settings)
            with mock.patch.object(mihui_server, "mihomo_api_request",
                                   side_effect=self.selector_api(proxies, {"b": 20, "c": 7}, calls)), \
                    mock.patch.object(mihui_server, "load_resource_monitor_proxies", return_value=proxies), \
                    mock.patch.object(mihui_server, "start_resource_monitor_reserve_refresh"), \
                    mock.patch.object(mihui_server, "run_resource_monitor_cycle", wraps=mihui_server.run_resource_monitor_cycle) as cycle:
                result = mihui_server.replace_runtime_group(folder, "SERVICE")
            runtime = mihui_server.load_resource_monitor_runtime(folder)
        cycle.assert_called_once_with(folder, ["telegram"], force_switch=True, expected_group="SERVICE")
        self.assertTrue(result["ok"])
        self.assertEqual(result["now"], "b")
        item = runtime["services"]["telegram"]
        self.assertGreater(item["quarantine"]["a"], item["checkedAt"])
        self.assertEqual(item["lastSwitch"]["from"], "a")
        self.assertEqual(item["lastSwitch"]["to"], "b")
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(next(path for path, _, _ in calls if "/delay?" in path)).query)
        self.assertEqual(query["url"], ["https://telegram.org/"])

    def test_managed_remap_while_waiting_for_lock_never_switches_the_new_group(self):
        settings = mihui_server.default_resource_monitor_settings()
        settings["enabled"] = True
        settings["services"]["telegram"].update(mode="mihui", group="SERVICE")
        remapped = json.loads(json.dumps(settings))
        remapped["services"]["telegram"]["group"] = "OTHER"
        reads = 0

        def load_settings(app_dir):
            nonlocal reads
            reads += 1
            if reads == 1:
                return settings
            self.assertTrue(mihui_server.resource_monitor_lock.locked())
            return remapped

        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(mihui_server, "load_resource_monitor_settings", side_effect=load_settings), \
                mock.patch.object(mihui_server, "mihomo_api_request", return_value={"proxies": self.proxies()}) as api, \
                mock.patch.object(mihui_server, "run_resource_monitor_service") as run_service, \
                mock.patch.object(mihui_server, "save_resource_monitor_runtime") as save_runtime:
            result = mihui_server.replace_runtime_group(Path(directory), "SERVICE")
        self.assertFalse(result["ok"])
        self.assertIn("Состояние группы изменилось", result["message"])
        self.assertEqual(reads, 2)
        run_service.assert_not_called()
        save_runtime.assert_not_called()
        self.assertEqual([call.args[1] for call in api.call_args_list], ["/proxies"])

    def smart_api(self, proxies, connections, calls, close=True, fail_id=None):
        def request(app_dir, path, method="GET", **kwargs):
            calls.append((path, method))
            if path == "/proxies":
                return {"proxies": proxies}
            if path == "/connections":
                return {"connections": list(connections)}
            if path == "/proxies/SERVICE":
                if method == "DELETE":
                    proxies["SERVICE"]["fixed"] = ""
                return proxies["SERVICE"]
            if path.startswith("/connections/smart/"):
                connection_id = urllib.parse.unquote(path.rsplit("/", 1)[-1])
                if connection_id == fail_id:
                    raise TimeoutError()
                if close:
                    connections[:] = [item for item in connections if item["id"] != connection_id]
                return {}
            raise AssertionError(path)
        return request

    def test_smart_complaints_are_deduplicated_and_limited_to_requested_group(self):
        proxies, calls = self.proxies("Smart"), []
        proxies["OTHER"] = {"type": "Smart", "all": ["a"], "fixed": ""}
        connections = [self.connection("first / 🇳🇴"), self.connection("same-route"),
                       self.connection("other-site", "*.second.example"), self.connection("untouched", group="OTHER"),
                       self.connection("already-blocked", "*.third.example", block="blocked")]
        with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=self.smart_api(proxies, connections, calls)):
            result = mihui_server.replace_runtime_group(Path("."), "SERVICE")
        self.assertTrue(result["ok"])
        self.assertFalse(result["changed"])
        self.assertTrue(result["requestAccepted"])
        self.assertEqual(result["routeCount"], 2)
        self.assertEqual([call for call in calls if call[1] == "DELETE"],
                         [("/connections/smart/first%20%2F%20%F0%9F%87%B3%F0%9F%87%B4", "DELETE"),
                          ("/connections/smart/other-site", "DELETE")])
        self.assertIn("untouched", [item["id"] for item in connections])

    def test_smart_manual_pin_is_cleared_before_complaint(self):
        proxies, calls = self.proxies("Smart"), []
        proxies["SERVICE"]["fixed"] = "a"
        with mock.patch.object(mihui_server, "mihomo_api_request",
                               side_effect=self.smart_api(proxies, [self.connection("one")], calls)):
            result = mihui_server.replace_runtime_group(Path("."), "SERVICE")
        self.assertTrue(result["ok"])
        self.assertEqual([call for call in calls if call[1] == "DELETE"],
                         [("/proxies/SERVICE", "DELETE"), ("/connections/smart/one", "DELETE")])

    def test_smart_missing_routes_or_capability_never_mutates(self):
        for fixed, connections in ((None, [self.connection("one")]), ("a", []), ("", [self.connection("one", block="")])):
            with self.subTest(fixed=fixed, connections=connections):
                proxies, calls = self.proxies("Smart"), []
                proxies["SERVICE"]["fixed"] = fixed
                with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=self.smart_api(proxies, connections, calls)):
                    result = mihui_server.replace_runtime_group(Path("."), "SERVICE")
                self.assertFalse(result["ok"])
                self.assertFalse(any(method == "DELETE" for _, method in calls))

    def test_smart_nested_group_rejected_before_clearing_pin_or_complaining(self):
        proxies, calls = self.proxies("Smart"), []
        proxies["SERVICE"]["fixed"] = "OTHER"
        proxies["SERVICE"]["all"].append("OTHER")
        proxies["OTHER"] = {"type": "Smart", "all": ["a"], "fixed": ""}
        connection = self.connection("one")
        connection["chains"] = ["a", "OTHER", "SERVICE"]
        with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=self.smart_api(proxies, [connection], calls)):
            result = mihui_server.replace_runtime_group(Path("."), "SERVICE")
        self.assertFalse(result["ok"])
        self.assertIn("вложенных", result["message"])
        self.assertFalse(any(method == "DELETE" for _, method in calls))

    def test_smart_vanished_route_is_not_reported_as_success(self):
        proxies, calls = self.proxies("Smart"), []
        handler = self.smart_api(proxies, [], calls)
        initial = True

        def request(app_dir, path, **kwargs):
            nonlocal initial
            if path == "/connections" and initial:
                initial = False
                return {"connections": [self.connection("one")]}
            return handler(app_dir, path, **kwargs)

        with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=request):
            result = mihui_server.replace_runtime_group(Path("."), "SERVICE")
        self.assertFalse(result["ok"])
        self.assertFalse(any(method == "DELETE" for _, method in calls))

    def test_smart_unconfirmed_delete_and_partial_failure_are_uncertain(self):
        for close, fail_id in ((False, None), (True, "two")):
            with self.subTest(close=close, fail_id=fail_id):
                proxies, calls = self.proxies("Smart"), []
                connections = [self.connection("one"), self.connection("two", "*.second.example")]
                with mock.patch.object(mihui_server, "mihomo_api_request",
                                       side_effect=self.smart_api(proxies, connections, calls, close, fail_id)):
                    result = mihui_server.replace_runtime_group(Path("."), "SERVICE")
                self.assertFalse(result["ok"])
                self.assertTrue(result["uncertain"])

    def test_endpoints_validate_action_and_return_inventory_and_outcome(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            handler = lambda *args, **kwargs: mihui_server.MihuiHandler(*args, directory=str(folder), **kwargs)
            with mock.patch.object(mihui_server.MihuiHandler, "app_dir", folder, create=True), \
                    mock.patch.object(mihui_server, "get_runtime_groups", return_value={"ok": True, "groups": [{"name": "SERVICE"}]}) as inventory, \
                    mock.patch.object(mihui_server, "replace_runtime_group", return_value={"ok": True, "message": "Сервер сменён"}) as replace:
                server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
                thread = threading.Thread(target=lambda: server.serve_forever(poll_interval=0.05), daemon=True)
                thread.start()
                try:
                    base = f"http://127.0.0.1:{server.server_address[1]}"
                    with urllib.request.urlopen(f"{base}/api/groups", timeout=3) as response:
                        self.assertEqual(json.loads(response.read())["groups"], [{"name": "SERVICE"}])
                    inventory.assert_called_once_with(folder)
                    for payload, action, expected in (({"group": "SERVICE"}, "", 403), ({}, "group-replace", 400),
                                                      ({"group": 5}, "group-replace", 400), ({"group": " SERVICE "}, "group-replace", 200)):
                        request = urllib.request.Request(f"{base}/api/groups/replace", data=json.dumps(payload).encode(),
                                                         headers={"Content-Type": "application/json", "X-Mihui-Action": action}, method="POST")
                        try:
                            response = urllib.request.urlopen(request, timeout=3)
                        except urllib.error.HTTPError as error:
                            response = error
                        with response:
                            self.assertEqual(response.code, expected)
                    replace.assert_called_once_with(folder, " SERVICE ")
                finally:
                    server.shutdown()
                    thread.join(timeout=2)
                    server.server_close()


if __name__ == "__main__":
    unittest.main()
