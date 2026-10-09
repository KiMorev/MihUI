import gzip
import hashlib
import json
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server


class CoreUpdateTests(unittest.TestCase):
    def tearDown(self):
        mihui_server.invalidate_component_release_cache()

    def test_prizrak_revision_is_detected_and_compared(self):
        with mock.patch.object(mihui_server, "find_mihomo_binary", return_value="mihomo"), \
                mock.patch.object(mihui_server.subprocess, "run", return_value=subprocess.CompletedProcess(
                    [], 0, stdout=b"Mihomo Meta v1.19.32-r1 linux arm64 with go1.26\n")):
            self.assertEqual(mihui_server.read_mihomo_binary_version(Path("."))["version"], "1.19.32-r1")
        self.assertTrue(mihui_server.component_update_available("1.19.32-r1", "v1.19.32-r2"))
        self.assertFalse(mihui_server.component_update_available("1.19.32-r2", "v1.19.32-r1"))

    def test_release_cache_follows_saved_core_and_survives_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            app_dir = Path(directory)
            mihui_server.invalidate_component_release_cache()
            with mock.patch.object(mihui_server, "fetch_component_releases", side_effect=lambda repo:
                    ["v1.19.32-r1"] if repo == mihui_server.PRIZRAK_GITHUB_REPO else ["v1.19.32"]) as fetch, \
                    mock.patch.object(mihui_server, "fetch_xkeen_beta_build", return_value={
                        "version": "2.1.0", "buildTimestamp": "2026-10-05 12:00:00 MSK"}):
                first, _ = mihui_server.get_component_release_catalog(app_dir)
                self.assertEqual(first["mihomo"]["repo"], "MetaCubeX/mihomo")
                mihui_server.save_mihomo_core(app_dir, "prizrak")
                second, _ = mihui_server.get_component_release_catalog(app_dir)
                self.assertEqual(second["mihomo"]["latest"], "v1.19.32-r1")
                self.assertEqual(second["mihomo"]["repo"], mihui_server.PRIZRAK_GITHUB_REPO)
                self.assertEqual(fetch.call_count, 4)
                mihui_server.get_component_release_catalog(app_dir)
                self.assertEqual(fetch.call_count, 4)
            self.assertEqual(mihui_server.get_mihomo_core(app_dir), "prizrak")
            mihui_server.save_mihomo_core(app_dir, "mihomo")
            self.assertEqual(mihui_server.get_mihomo_core_repo(app_dir), "MetaCubeX/mihomo")

    def test_switch_validates_core_and_uses_latest_stable_release(self):
        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(mihui_server, "fetch_component_releases", return_value=["v1.19.32-r1"]) as fetch:
            app_dir = Path(directory)
            result = mihui_server.validate_component_action(app_dir, {
                "component": "mihomo", "action": "core", "target": "prizrak"})
            self.assertEqual(result["core"], "prizrak")
            self.assertEqual(result["target"], "v1.19.32-r1")
            fetch.assert_called_once_with(mihui_server.PRIZRAK_GITHUB_REPO)
            for target in ("shell", "mihomo", "https://example.com"):
                with self.subTest(target=target), self.assertRaises(ValueError):
                    mihui_server.validate_component_action(app_dir, {
                        "component": "mihomo", "action": "core", "target": target})

    def test_switch_reports_release_lookup_failure(self):
        with mock.patch.object(mihui_server, "fetch_component_releases", side_effect=OSError("offline")):
            with self.assertRaisesRegex(ValueError, "Не удалось проверить релизы"):
                mihui_server.validate_component_action(Path("."), {
                    "component": "mihomo", "action": "core", "target": "prizrak"})

    def test_status_reports_selected_core_and_revision_update(self):
        with tempfile.TemporaryDirectory() as directory:
            app_dir = Path(directory)
            mihui_server.save_mihomo_core(app_dir, "prizrak")
            catalog = {"mihomo": {"latest": "v1.19.32-r2", "versions": ["v1.19.32-r2"], "error": ""}}
            with mock.patch.object(mihui_server, "get_component_release_catalog", return_value=(catalog, 123)), \
                    mock.patch.object(mihui_server, "get_xkeen_version_info", return_value={}), \
                    mock.patch.object(mihui_server, "read_mihomo_binary_version", return_value={
                        "installed": True, "version": "1.19.32-r1"}):
                status = mihui_server.get_components_status(app_dir)
            self.assertEqual(status["components"]["mihomo"]["core"], "prizrak")
            self.assertTrue(status["capabilities"]["mihomoCoreSwitch"])
            self.assertEqual(status["components"]["mihomo"]["repo"], mihui_server.PRIZRAK_GITHUB_REPO)
            self.assertEqual(status["updateCount"], 1)

    def test_action_dispatches_core_switch_to_installer(self):
        with mock.patch.object(mihui_server, "run_mihomo_component_update") as install:
            mihui_server.run_component_action(Path("."), {
                "component": "mihomo", "action": "core", "core": "prizrak", "target": "v1.19.32-r1"})
            install.assert_called_once_with(Path("."), "v1.19.32-r1", core="prizrak")
            self.assertTrue(mihui_server.snapshot_component_action_state()["ok"])

    def test_xkeen_service_commands_run_in_foreground_and_report_failure(self):
        for flag in ("-start", "-stop", "-restart"):
            with self.subTest(flag=flag), \
                    mock.patch.dict(mihui_server.os.environ, {"XKEEN_FOREGROUND": ""}), \
                    mock.patch.object(mihui_server.subprocess, "run", return_value=subprocess.CompletedProcess(
                        [], 7, stdout=b"service failed\n")) as run:
                result = mihui_server.run_component_command(["/opt/sbin/xkeen", flag], timeout=180)
                self.assertEqual(result, (7, "service failed\n" if flag == "-stop" else ""))
                self.assertEqual(run.call_args.kwargs["env"]["XKEEN_FOREGROUND"], "1")
                self.assertEqual(run.call_args.kwargs["timeout"], 180)

    def test_xkeen_update_handles_confirmation_and_zero_exit_cancellation(self):
        real_run = subprocess.run
        script = (
            "import sys; from pathlib import Path\n"
            "flag, mode, directory = sys.argv[1:4]\n"
            "folder = Path(directory)\n"
            "if flag == '-uk':\n"
            " if mode == 'cancelled' or (mode == 'legacy' and sys.stdin.readline().strip() != '1'):\n"
            "  print('Проверка обновлений XKeen \\x1b[31mотменена\\x1b[0m'); sys.exit(0)\n"
            " if mode == 'auto' and sys.argv[4:] != ['auto']: sys.exit(3)\n"
            " (folder / 'updated').write_text('2.1.1')\n"
            " print('Обновление XKeen выполнено')\n"
            "elif flag == '-kbr' and sys.stdin.readline().strip() == '1':\n"
            " (folder / 'restored').write_text('2.0.1')\n"
        )
        for mode in ("legacy", "auto", "cancelled"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)

                def run(command, **kwargs):
                    return real_run([sys.executable, "-X", "utf8", "-c", script,
                                     command[1], mode, directory, *command[2:]], **kwargs)

                def version_info(_):
                    return {"version": "2.1.1" if (folder / "updated").exists() else "2.0.1", "channel": "Beta"}

                with mock.patch.object(mihui_server, "find_xkeen_binary", return_value="xkeen"), \
                        mock.patch.object(mihui_server, "get_xkeen_service_status", return_value={"state": "stopped"}), \
                        mock.patch.object(mihui_server, "get_xkeen_version_info", side_effect=version_info), \
                        mock.patch.object(mihui_server.subprocess, "run", side_effect=run):
                    mihui_server.update_component_action_state(output="", running=True, ok=None)
                    mihui_server.run_component_action(folder, {"component": "xkeen", "action": "update"})

                job = mihui_server.snapshot_component_action_state()
                self.assertFalse(job["running"])
                if mode == "cancelled":
                    self.assertFalse((folder / "updated").exists())
                    self.assertTrue((folder / "restored").exists())
                    self.assertFalse(job["ok"])
                    self.assertEqual(job["phase"], "failed")
                    self.assertEqual(job["message"], "Обновление XKeen отменено")
                else:
                    self.assertTrue((folder / "updated").exists())
                    self.assertFalse((folder / "restored").exists())
                    self.assertTrue(job["ok"])

    def test_xkeen_start_does_not_wait_for_daemon_output_to_close(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            ready, release, done = (folder / name for name in ("ready", "release", "done"))
            child = (
                "import sys,time; from pathlib import Path; "
                "folder=Path(sys.argv[1]); (folder/'ready').write_text('ready'); deadline=time.monotonic()+4\n"
                "while not (folder/'release').exists() and time.monotonic()<deadline:\n"
                " print('daemon running', flush=True); time.sleep(0.02)\n"
                "(folder/'done').write_text('done')\n"
            )
            parent = (
                "import subprocess,sys,time; from pathlib import Path; "
                f"subprocess.Popen([sys.executable,'-c',{child!r},sys.argv[1]], "
                "stdout=sys.stdout,stderr=sys.stderr,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)); "
                "ready=Path(sys.argv[1])/'ready'\n"
                "while not ready.exists(): time.sleep(0.01)\n"
                "print('started', flush=True)\n"
            )
            real_run = subprocess.run
            def run(command, **kwargs):
                return real_run([sys.executable, "-c", parent, directory], **kwargs)
            try:
                with mock.patch.object(mihui_server.subprocess, "run", side_effect=run):
                    self.assertEqual(mihui_server.run_component_command(["xkeen", "-start"], timeout=1), (0, ""))
                self.assertTrue(ready.exists())
                self.assertFalse(done.exists())
            finally:
                release.write_text("release")
                deadline = time.monotonic() + 5
                while ready.exists() and not done.exists() and time.monotonic() < deadline:
                    time.sleep(0.02)
            self.assertTrue(done.exists())

    def test_download_selects_router_asset_and_checks_checksum(self):
        for elf_class, byte_order, machine, architecture in (
                (1, 1, 8, "mipsle-softfloat"), (1, 2, 8, "mips-softfloat"),
                (2, 1, 183, "arm64"), (2, 1, 62, "amd64-v1"), (1, 1, 40, "armv7")):
            with self.subTest(architecture=architecture), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                header = bytearray(20)
                header[:6] = b"\x7fELF" + bytes([elf_class, byte_order])
                header[18:20] = machine.to_bytes(2, "little" if byte_order == 1 else "big")
                binary = folder / "mihomo"
                binary.write_bytes(header)
                payload = gzip.compress(b"new-binary")
                name = f"prizrak-core-linux-{architecture}-v1.19.32-r1.gz"
                release = json.dumps({"assets": [{"name": name,
                    "digest": "sha256:" + hashlib.sha256(payload).hexdigest()}]}).encode()

                def download(command, **kwargs):
                    Path(command[command.index("--output") + 1]).write_bytes(payload)
                    self.assertTrue(command[-1].endswith("/" + name))
                    return 0, ""

                with mock.patch.object(mihui_server, "fetch_component_metadata", return_value=release), \
                        mock.patch.object(mihui_server, "run_component_command", side_effect=download), \
                        mock.patch.object(mihui_server.os, "uname", return_value=SimpleNamespace(machine="armv7l"), create=True):
                    candidate = mihui_server.download_prizrak_binary(binary, "v1.19.32-r1", folder)
                    self.assertEqual(candidate.read_bytes(), b"new-binary")
                    bad = json.dumps({"assets": [{"name": name, "digest": "sha256:" + "0" * 64}]}).encode()
                    with mock.patch.object(mihui_server, "fetch_component_metadata", return_value=bad):
                        with self.assertRaisesRegex(RuntimeError, "Контрольная сумма"):
                            mihui_server.download_prizrak_binary(binary, "v1.19.32-r1", folder)

    def test_switch_install_update_and_failure_preserve_config_and_core(self):
        for scenario in ("switch", "update", "config-error", "download-error", "startup-error", "old-runtime", "rollback-error"):
            with self.subTest(scenario=scenario), tempfile.TemporaryDirectory() as directory:
                app_dir = Path(directory)
                binary = app_dir / "mihomo"
                binary.write_bytes(b"old-binary")
                config = app_dir / "config.yaml"
                config.write_text("mixed-port: 7890\n", encoding="utf-8")
                (app_dir / "mihui.env").write_text(f'MIHUI_CONFIG_PATH="{config}"\n', encoding="utf-8")
                if scenario == "update":
                    mihui_server.save_mihomo_core(app_dir, "prizrak")
                versions = [{"binary": str(binary), "version": "1.19.32"},
                            {"binary": str(binary), "version": "1.19.32-r1"}]

                def download(old, target, folder):
                    if scenario == "download-error":
                        raise RuntimeError("download failed")
                    candidate = folder / "prizrak"
                    candidate.write_bytes(b"new-binary")
                    return candidate

                def command(args, **kwargs):
                    if args[0] == "xkeen" and args[1] not in {"-stop", "-start"}:
                        return 1, f"Unknown key: {args[1]}"
                    if args[-1] == "-v":
                        return 0, "Mihomo Meta v1.19.32-r1 linux arm64"
                    if "-t" in args and scenario == "config-error":
                        return 1, "invalid config"
                    if "-start" in args and scenario == "rollback-error":
                        return 1, "start failed"
                    return 0, ""

                states = [{"state": "ok", "detail": "1.19.32"}]
                if scenario in {"startup-error", "old-runtime"}:
                    states += ([{"state": "error"}] if scenario == "startup-error" else
                               [{"state": "ok", "detail": "1.19.32"}]) * 10
                    states += [{"state": "ok", "detail": "1.19.32"}]
                elif scenario in {"config-error", "download-error"}:
                    states += [{"state": "ok", "detail": "1.19.32"}]
                else:
                    states += [{"state": "ok", "detail": "1.19.32-r1"}]
                with mock.patch.object(mihui_server, "find_xkeen_binary", return_value="xkeen"), \
                        mock.patch.object(mihui_server, "read_mihomo_binary_version", side_effect=versions), \
                        mock.patch.object(mihui_server, "get_mihomo_service_status", side_effect=states), \
                        mock.patch.object(mihui_server, "download_prizrak_binary", side_effect=download), \
                        mock.patch.object(mihui_server, "run_component_command", side_effect=command) as run, \
                        mock.patch.object(mihui_server.time, "sleep"):
                    if scenario in {"switch", "update"}:
                        mihui_server.run_mihomo_component_update(app_dir, "v1.19.32-r1",
                            core="prizrak" if scenario == "switch" else None)
                        self.assertEqual(binary.read_bytes(), b"new-binary")
                        self.assertEqual(mihui_server.get_mihomo_core(app_dir), "prizrak")
                        self.assertEqual([call.args[0][1] for call in run.call_args_list
                                          if call.args[0][0] == "xkeen"], ["-stop", "-start"])
                    else:
                        with self.assertRaises(RuntimeError) as error:
                            mihui_server.run_mihomo_component_update(app_dir, "v1.19.32-r1", core="prizrak")
                        if scenario == "rollback-error":
                            self.assertIn("Резервная копия:", str(error.exception))
                        self.assertEqual(binary.read_bytes(), b"old-binary")
                        self.assertEqual(mihui_server.get_mihomo_core(app_dir), "mihomo")
                        if scenario in {"config-error", "download-error"}:
                            self.assertFalse(any(call.args[0][0] == "xkeen" for call in run.call_args_list))
                    self.assertFalse(any("-um" in call.args[0] for call in run.call_args_list))
                    self.assertFalse(any("-rrm" in call.args[0] for call in run.call_args_list))
                self.assertEqual(config.read_text(encoding="utf-8"), "mixed-port: 7890\n")
                backups = list(app_dir.glob("mihui-mihomo-update-*"))
                if scenario == "rollback-error":
                    self.assertEqual(len(backups), 1)
                    self.assertEqual((backups[0] / "mihomo").read_bytes(), b"old-binary")
                else:
                    self.assertFalse(backups)

    def test_switch_back_installs_mihomo_and_updates_source_after_success(self):
        with tempfile.TemporaryDirectory() as directory:
            app_dir = Path(directory)
            binary = app_dir / "mihomo"
            binary.write_bytes(b"prizrak")
            mihui_server.save_mihomo_core(app_dir, "prizrak")
            versions = [{"binary": str(binary), "version": "1.19.32-r1"},
                        {"binary": str(binary), "version": "1.19.32"}]
            with mock.patch.object(mihui_server, "find_xkeen_binary", return_value="xkeen"), \
                    mock.patch.object(mihui_server, "read_mihomo_binary_version", side_effect=versions), \
                    mock.patch.object(mihui_server, "get_mihomo_service_status", return_value={"state": "error"}), \
                    mock.patch.object(mihui_server, "run_component_command", return_value=(0, "")) as run:
                mihui_server.run_mihomo_component_update(app_dir, "v1.19.32", core="mihomo")
            run.assert_called_once_with(["xkeen", "-um"], input_text="9\nv1.19.32\n")
            self.assertEqual(mihui_server.get_mihomo_core(app_dir), "mihomo")


if __name__ == "__main__":
    unittest.main()
