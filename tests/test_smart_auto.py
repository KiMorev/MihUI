import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server


SMART_CONFIG = "proxy-groups:\n  - name: YOUTUBE\n    type: smart\n    proxies: [DIRECT]\nrules:\n  - MATCH,YOUTUBE\n"


class SmartAutoTests(unittest.TestCase):
    def write_config(self, folder, text=SMART_CONFIG):
        config = folder / "config.yaml"
        config.write_text(text, encoding="utf-8")
        (folder / "mihui.env").write_text(f'MIHUI_CONFIG_PATH="{config}"\n', encoding="utf-8")
        return config

    def test_reset_encodes_group_and_clears_cache_even_when_already_unfixed(self):
        folder = Path(".")
        group = "Ютуб / 🇳🇴"
        path = "/proxies/%D0%AE%D1%82%D1%83%D0%B1%20%2F%20%F0%9F%87%B3%F0%9F%87%B4"
        for fixed in ("node-a", ""):
            with self.subTest(fixed=fixed), mock.patch.object(mihui_server, "mihomo_api_request", side_effect=[
                {"type": "Smart", "fixed": fixed, "now": fixed or "Smart - Select"},
                {},
                {"type": "Smart", "fixed": "", "now": "Smart - Select"},
            ]) as api:
                result = mihui_server.reset_smart_proxy_group(folder, group)
                self.assertTrue(result["ok"])
                self.assertEqual(result["changed"], bool(fixed))
                self.assertEqual(result["fixed"], "")
                self.assertEqual(api.call_args_list, [mock.call(folder, path),
                    mock.call(folder, path, method="DELETE"), mock.call(folder, path)])

    def test_reset_rejects_non_smart_and_unknown_fixed_state_without_mutation(self):
        for proxy in ({"type": "Selector", "fixed": "a"}, {"type": "Smart"}, {"type": "Smart", "fixed": None}):
            with self.subTest(proxy=proxy), mock.patch.object(mihui_server, "mihomo_api_request", return_value=proxy) as api:
                self.assertFalse(mihui_server.reset_smart_proxy_group(Path("."), "YOUTUBE")["ok"])
                api.assert_called_once_with(Path("."), "/proxies/YOUTUBE")

    def test_reset_reports_unavailable_or_unconfirmed_results(self):
        smart = {"type": "Smart", "fixed": "a"}
        for responses, expected_flag in (
            ([TimeoutError("read failed")], "unavailable"),
            ([smart, TimeoutError("delete failed")], "uncertain"),
            ([smart, {}, TimeoutError("verification failed")], "uncertain"),
            ([smart, {}, {"type": "Smart", "fixed": "a"}], "uncertain"),
            ([smart, {}, {"type": "Smart"}], "uncertain"),
            ([smart, {}, {"type": "Selector", "fixed": ""}], "uncertain"),
        ):
            with self.subTest(responses=responses), mock.patch.object(mihui_server, "mihomo_api_request", side_effect=responses):
                result = mihui_server.reset_smart_proxy_group(Path("."), "YOUTUBE")
                self.assertFalse(result["ok"])
                self.assertTrue(result[expected_flag])

    def test_reload_resets_only_runtime_selector_to_smart_transitions(self):
        before = {"YOUTUBE": {"type": "Selector", "now": "old"},
                  "EMPTY": {"type": "Selector", "now": "gone"},
                  "KEEP": {"type": "Smart", "fixed": "intentional"},
                  "SELECT": {"type": "Selector", "now": "chosen"}}
        after = {"YOUTUBE": {"type": "Smart", "fixed": "old"},
                 "EMPTY": {"type": "Smart", "fixed": ""},
                 "KEEP": {"type": "Smart", "fixed": "intentional"},
                 "SELECT": {"type": "Selector", "now": "chosen"}}
        applied = False
        deletes = []
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            config = self.write_config(folder)

            def request(_folder, path, method="GET", **_kwargs):
                nonlocal applied
                if path == "/configs?force=true":
                    applied = True
                    return {}
                if path == "/configs":
                    return {"path": str(config)}
                if path == "/version":
                    return {"version": "v1.19.32-r2"}
                if path == "/proxies":
                    return {"proxies": after if applied else before}
                group = path.removeprefix("/proxies/")
                if method == "DELETE":
                    deletes.append(group)
                    after[group]["fixed"] = ""
                    return {}
                return dict(after[group])

            with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=request) as api:
                result = mihui_server.reload_mihomo(folder, config)
            self.assertTrue(result["ok"])
            self.assertTrue(result["smartReset"]["ok"])
            self.assertEqual(deletes, ["EMPTY", "YOUTUBE"])
            self.assertEqual(result["smartReset"]["groups"], deletes)
            self.assertEqual(after["KEEP"]["fixed"], "intentional")
            self.assertEqual(after["SELECT"]["now"], "chosen")
            calls = api.call_args_list
            first_delete = next(i for i, call in enumerate(calls) if call.kwargs.get("method") == "DELETE")
            self.assertLess(calls.index(mock.call(folder, "/version", timeout=5)), first_delete)

    def test_failed_or_unconfirmed_reload_never_resets_selection(self):
        for failure in ("rejected", "timeout", "verify", "different_path"):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                config = self.write_config(folder)
                snapshots = {"proxies": {"YOUTUBE": {"type": "Selector", "now": "a"}}}
                responses = [{"path": str(config)}, snapshots]
                if failure == "rejected":
                    responses.append(urllib.error.HTTPError("http://core/configs", 400, "rejected", {}, None))
                elif failure == "timeout":
                    responses.append(TimeoutError("apply timed out"))
                else:
                    responses.extend([{}, TimeoutError("verify timed out")] if failure == "verify"
                                     else [{}, {"version": "r2"}, {"path": str(folder / "other.yaml")}])
                with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=responses) as api:
                    result = mihui_server.reload_mihomo(folder, config)
                self.assertFalse(result["ok"])
                self.assertFalse(any(call.kwargs.get("method") == "DELETE" for call in api.call_args_list))

    def test_missing_previous_snapshot_prevents_apply(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            config = self.write_config(folder)
            with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=[
                {"path": str(config)}, TimeoutError("snapshot unavailable"),
            ]) as api:
                result = mihui_server.reload_mihomo(folder, config)
            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "prepare")
            self.assertFalse(any(call.kwargs.get("method") in {"PUT", "DELETE"} for call in api.call_args_list))

    def test_save_keeps_applied_config_and_backup_when_reset_fails(self):
        original = "proxy-groups:\n  - name: YOUTUBE\n    type: select\n    proxies: [DIRECT]\n"
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            config = self.write_config(folder, original)
            smart = {"type": "Smart", "fixed": "a"}
            responses = [{"path": str(config)}, {"proxies": {"YOUTUBE": {"type": "Selector"}}}, {},
                         {"version": "r2"}, {"path": str(config)}, {"proxies": {"YOUTUBE": smart}},
                         smart, TimeoutError("delete failed")]
            with mock.patch.object(mihui_server, "check_mihomo_config", return_value={"ok": True}), \
                    mock.patch.object(mihui_server, "mihomo_api_request", side_effect=responses) as api:
                result = mihui_server.save_checked_config(folder, SMART_CONFIG)
            self.assertTrue(result["ok"])
            self.assertTrue(result["saved"])
            self.assertTrue(result["applied"])
            self.assertFalse(result["reload"]["smartReset"]["ok"])
            self.assertIn("Включить автовыбор", result["reload"]["smartReset"]["message"])
            self.assertEqual(config.read_text(encoding="utf-8"), SMART_CONFIG)
            self.assertEqual((folder / "backups" / result["backup"]).read_text(encoding="utf-8"), original)
            self.assertEqual(sum(call.kwargs.get("method") == "PUT" for call in api.call_args_list), 1)

    def test_inventory_exposes_only_explicit_smart_fixed_metadata(self):
        groups = mihui_server.normalize_current_group_selections({
            "SMART": {"type": "Smart", "all": ["a"], "now": "a", "fixed": "a"},
            "AUTO": {"type": "Smart", "all": ["a"], "now": "Smart - Select", "fixed": ""},
            "UNKNOWN": {"type": "Smart", "all": ["a"], "now": "a"},
            "SELECT": {"type": "Selector", "all": ["a"], "now": "a", "fixed": "a"},
        })
        items = {group["name"]: group for group in groups}
        self.assertEqual(items["SMART"]["fixed"], "a")
        self.assertEqual(items["AUTO"]["fixed"], "")
        self.assertNotIn("fixed", items["UNKNOWN"])
        self.assertNotIn("fixed", items["SELECT"])

    def test_auto_endpoint_validates_input_and_returns_confirmed_status(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            handler = lambda *args, **kwargs: mihui_server.MihuiHandler(*args, directory=str(folder), **kwargs)
            with mock.patch.object(mihui_server.MihuiHandler, "app_dir", folder, create=True):
                server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
                thread = threading.Thread(target=lambda: server.serve_forever(poll_interval=0.05), daemon=True)
                thread.start()
                try:
                    for payload, responses, status in (
                        ({}, [], 400),
                        ({"group": 7}, [], 400),
                        ({"group": ""}, [], 400),
                        ({"group": "YOUTUBE"}, [{"type": "Selector"}], 422),
                        ({"group": "YOUTUBE"}, [{"type": "Smart", "fixed": "a"}, {},
                                                 {"type": "Smart", "fixed": "", "now": "Smart - Select"}], 200),
                    ):
                        with self.subTest(payload=payload, status=status), \
                                mock.patch.object(mihui_server, "mihomo_api_request", side_effect=responses) as api:
                            request = urllib.request.Request(
                                f"http://127.0.0.1:{server.server_address[1]}/api/groups/auto",
                                data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
                            try:
                                response = urllib.request.urlopen(request, timeout=3)
                            except urllib.error.HTTPError as error:
                                response = error
                            with response:
                                self.assertEqual(response.code, status)
                                result = json.loads(response.read())
                            self.assertEqual(result["ok"], status == 200)
                            if status == 400:
                                api.assert_not_called()
                            if status == 200:
                                self.assertEqual(result["fixed"], "")
                finally:
                    server.shutdown()
                    thread.join(timeout=2)
                    server.server_close()


if __name__ == "__main__":
    unittest.main()
