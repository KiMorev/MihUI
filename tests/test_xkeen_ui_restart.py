import json
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server


class XkeenUiRestartTests(unittest.TestCase):
    def setUp(self):
        self.saved_state = mihui_server.snapshot_component_action_state()
        mihui_server.update_component_action_state(running=False, ok=None, output="")

    def tearDown(self):
        mihui_server.update_component_action_state(**self.saved_state)
        mihui_server.invalidate_component_release_cache()

    def test_detection_checks_only_supported_init_scripts_in_priority_order(self):
        scripts = mihui_server.XKEEN_UI_INIT_SCRIPTS
        for installed, expected in ((set(scripts), scripts[0]), ({scripts[1]}, scripts[1]), (set(), "")):
            with self.subTest(installed=installed), mock.patch.object(
                    Path, "is_file", autospec=True, side_effect=lambda path: str(path).replace("\\", "/") in installed):
                self.assertEqual(mihui_server.find_xkeen_ui_init_script(), expected)

    def test_status_exposes_presence_without_adding_an_update(self):
        for script in ("", mihui_server.XKEEN_UI_INIT_SCRIPTS[0]):
            with self.subTest(script=script), tempfile.TemporaryDirectory() as directory, \
                    mock.patch.object(mihui_server, "get_component_release_catalog", return_value=({}, 123)), \
                    mock.patch.object(mihui_server, "get_xkeen_version_info", return_value={}), \
                    mock.patch.object(mihui_server, "read_mihomo_binary_version", return_value={}), \
                    mock.patch.object(mihui_server, "find_xkeen_ui_init_script", return_value=script):
                status = mihui_server.get_components_status(Path(directory))
                self.assertEqual(status["components"]["xkeen-ui"], {
                    "installed": bool(script), "updateAvailable": False})
                self.assertEqual(status["updateCount"], 0)

    def test_validation_allows_only_restart_with_an_installed_service(self):
        with mock.patch.object(mihui_server, "find_xkeen_ui_init_script", return_value="init"):
            self.assertEqual(mihui_server.validate_component_action(Path("."), {
                "component": "xkeen-ui", "action": "restart"}), {
                "component": "xkeen-ui", "action": "restart", "target": ""})
            for action, target in (("update", ""), ("geo-update", ""), ("stop", ""), ("restart", "/tmp/init")):
                with self.subTest(action=action, target=target), self.assertRaises(ValueError):
                    mihui_server.validate_component_action(Path("."), {
                        "component": "xkeen-ui", "action": action, "target": target})
        with mock.patch.object(mihui_server, "find_xkeen_ui_init_script", return_value=""), \
                self.assertRaisesRegex(ValueError, "не найдена"):
            mihui_server.validate_component_action(Path("."), {"component": "xkeen-ui", "action": "restart"})

    def test_restart_uses_init_then_verifies_running_status_without_suspending_dns(self):
        for script in mihui_server.XKEEN_UI_INIT_SCRIPTS:
            with self.subTest(script=script), \
                    mock.patch.object(mihui_server, "find_xkeen_ui_init_script", return_value=script), \
                    mock.patch.object(mihui_server, "suspend_dns_capture") as suspend, \
                    mock.patch.object(mihui_server.subprocess, "run", side_effect=[
                        subprocess.CompletedProcess([], 0, stdout=None),
                        subprocess.CompletedProcess([], 0, stdout="Xkeen Web UI запущен, PID 123.\n".encode())]) as run:
                mihui_server.run_component_action(Path("."), {"component": "xkeen-ui", "action": "restart"})
                self.assertEqual([call.args[0] for call in run.call_args_list], [[script, "restart"], [script, "status"]])
                self.assertEqual(run.call_args_list[0].kwargs["stdout"], subprocess.DEVNULL)
                self.assertEqual(run.call_args_list[1].kwargs["stdout"], subprocess.PIPE)
                self.assertTrue(mihui_server.snapshot_component_action_state()["ok"])
                suspend.assert_not_called()

    def test_restart_reports_missing_service_command_failure_timeout_and_stopped_status(self):
        script = mihui_server.XKEEN_UI_INIT_SCRIPTS[0]
        for detected, results in (("", []), (script, [subprocess.CompletedProcess([], 3, stdout=None)]),
                (script, [subprocess.TimeoutExpired([script, "restart"], 180)]),
                (script, [subprocess.CompletedProcess([], 0, stdout=None),
                          subprocess.CompletedProcess([], 0, stdout="Xkeen Web UI не запущен.\n".encode())]),
                (script, [subprocess.CompletedProcess([], 0, stdout=None),
                          subprocess.CompletedProcess([], 1, stdout=b"status failed\n")])):
            with self.subTest(detected=detected, results=results), \
                    mock.patch.object(mihui_server, "find_xkeen_ui_init_script", return_value=detected), \
                    mock.patch.object(mihui_server.subprocess, "run", side_effect=results) as run:
                mihui_server.run_component_action(Path("."), {"component": "xkeen-ui", "action": "restart"})
                job = mihui_server.snapshot_component_action_state()
                self.assertFalse(job["running"])
                self.assertFalse(job["ok"])
                self.assertEqual(job["phase"], "failed")
                if not detected:
                    run.assert_not_called()

    def test_restart_does_not_wait_for_background_output_to_close(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            ready, release, done = (folder / name for name in ("ready", "release", "done"))
            child = (
                "import sys,time; from pathlib import Path; folder=Path(sys.argv[1]); "
                "(folder/'ready').write_text('ready'); deadline=time.monotonic()+4\n"
                "while not (folder/'release').exists() and time.monotonic()<deadline:\n"
                " print('daemon running',flush=True); time.sleep(0.02)\n"
                "(folder/'done').write_text('done')\n")
            parent = (
                "import subprocess,sys,time; from pathlib import Path; "
                f"subprocess.Popen([sys.executable,'-c',{child!r},sys.argv[1]],stdout=sys.stdout,stderr=sys.stderr,"
                "creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)); ready=Path(sys.argv[1])/'ready'\n"
                "while not ready.exists(): time.sleep(0.01)\n")
            real_run = subprocess.run
            try:
                with mock.patch.object(mihui_server.subprocess, "run", side_effect=lambda command, **kwargs:
                        real_run([sys.executable, "-c", parent, directory], **kwargs)):
                    self.assertEqual(mihui_server.run_component_command(
                        [mihui_server.XKEEN_UI_INIT_SCRIPTS[0], "restart"], timeout=1), (0, ""))
                self.assertTrue(ready.exists())
                self.assertFalse(done.exists())
            finally:
                release.write_text("release")
                deadline = time.monotonic() + 5
                while ready.exists() and not done.exists() and time.monotonic() < deadline:
                    time.sleep(0.02)
            self.assertTrue(done.exists())

    def test_endpoint_requires_header_and_accepts_installed_ui_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            app_dir = Path(directory)
            handler = lambda *args, **kwargs: mihui_server.MihuiHandler(*args, directory=directory, **kwargs)
            mihui_server.MihuiHandler.app_dir = app_dir
            server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            restarted = threading.Event()
            try:
                with mock.patch.object(mihui_server, "find_xkeen_ui_init_script", return_value="init"), \
                        mock.patch.object(mihui_server, "run_xkeen_ui_restart", side_effect=restarted.set) as restart:
                    for confirmed, expected in ((False, 403), (True, 202)):
                        headers = {"Content-Type": "application/json"}
                        if confirmed:
                            headers["X-Mihui-Action"] = "components"
                        request = urllib.request.Request(
                            f"http://127.0.0.1:{server.server_address[1]}/api/components/action",
                            data=json.dumps({"component": "xkeen-ui", "action": "restart"}).encode(), headers=headers)
                        try:
                            response = urllib.request.urlopen(request, timeout=3)
                        except urllib.error.HTTPError as error:
                            response = error
                        with response:
                            self.assertEqual(response.status, expected)
                            self.assertEqual(json.loads(response.read())["ok"], confirmed)
                        if not confirmed:
                            restart.assert_not_called()
                    self.assertTrue(restarted.wait(2))
                    restart.assert_called_once_with()
            finally:
                server.shutdown()
                thread.join(timeout=2)
                server.server_close()


if __name__ == "__main__":
    unittest.main()
