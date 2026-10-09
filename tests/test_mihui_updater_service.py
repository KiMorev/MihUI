import os
from pathlib import Path
import shutil
import shlex
import subprocess
import tarfile
import tempfile
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]
UPDATER = ROOT / "router" / "cgi-bin" / "mihui-update"
SH = shutil.which("sh")
if not SH and os.name == "nt":
    candidate = Path("C:/Program Files/Git/bin/sh.exe")
    SH = str(candidate) if candidate.is_file() else None


def shell_path(path):
    value = path.resolve().as_posix()
    if os.name == "nt":
        return f"/{value[0].lower()}{value[2:]}"
    return value


@unittest.skipUnless(SH, "POSIX shell is required for updater fixture tests")
class MihuiUpdaterServiceTests(unittest.TestCase):
    def run_update(self, directory, template, owned=True, init_from_env=False):
        # Keep quotes and shell metacharacters in the actual install path.
        app_dir = directory / "mihui 'quoted' $(literal) &"
        app_dir.mkdir()
        (app_dir / "www").mkdir()
        (app_dir / "www" / "index.html").write_text("old interface", encoding="utf-8")
        init_script = directory / "S99mihui"
        old_script = '#!/bin/sh\nMIHUI_INIT_OWNER="KiMorev/MihUI"\nexit 99\n'
        if not owned:
            old_script = "#!/bin/sh\n# Unrelated service\nexit 99\n"
        init_script.write_text(old_script, encoding="utf-8")
        init_script.chmod(0o755)
        env_text = "MIHUI_PORT=9893\nMIHUI_PYTHON_BIN=/custom/python3\n"
        initial_init = init_script
        if init_from_env:
            initial_init = directory / "S99mihui-default"
            initial_init.write_text("#!/bin/sh\n# Unrelated default service\n", encoding="utf-8")
            env_text += f"MIHUI_INIT_SCRIPT={shlex.quote(shell_path(init_script))}\n"
        (app_dir / "mihui.env").write_text(env_text, encoding="utf-8")

        package = directory / "package"
        (package / "www").mkdir(parents=True)
        (package / "cgi-bin").mkdir()
        (package / "www" / "index.html").write_text("new interface", encoding="utf-8")
        (package / "cgi-bin" / "mihui-update").write_text("#!/bin/sh\n", encoding="utf-8")
        (package / "cgi-bin" / "mihui-service").write_text(template, encoding="utf-8")
        (package / "mihui_server.py").write_text("# new server\n", encoding="utf-8")
        archive = directory / "release.tar.gz"
        with tarfile.open(archive, "w:gz") as handle:
            handle.add(package, arcname="package")

        # Run the real extraction/replacement flow; only download is replaced
        # with a fixture archive, so this test never accesses the network.
        source = UPDATER.read_text(encoding="utf-8")
        before, main = source.split('if [ "${REQUEST_METHOD:-POST}" != "POST" ]; then', 1)
        runner = directory / "update.sh"
        runner.write_text(
            before
            + '\ndownload_package_archive() { DOWNLOADED_ARCHIVE="$MIHUI_FIXTURE_ARCHIVE"; }\n'
            + 'if [ "${REQUEST_METHOD:-POST}" != "POST" ]; then'
            + main,
            encoding="utf-8",
            newline="\n",
        )
        env = os.environ.copy()
        env.update(
            MIHUI_DIR=shell_path(app_dir),
            MIHUI_INIT_SCRIPT=shell_path(initial_init),
            MIHUI_FIXTURE_ARCHIVE=shell_path(archive),
            TMPDIR=shell_path(directory),
        )
        result = subprocess.run(
            [SH, shell_path(runner)],
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((app_dir / "mihui.env").read_text(encoding="utf-8"), env_text)
        self.assertFalse(list(directory.glob("S99mihui.new.*")))
        return app_dir, init_script, old_script, result.stdout

    def test_update_installs_service_before_restart_and_preserves_settings(self):
        template = (
            '#!/bin/sh\nMIHUI_INIT_OWNER="KiMorev/MihUI"\n'
            'APP_DIR=__MIHUI_APP_DIR__\n'
            '. "$APP_DIR/mihui.env"\n'
            'printf "%s:%s\\n" "$1" "$MIHUI_PORT" >> "$APP_DIR/restart.log"\n'
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, init_script, old_script, output = self.run_update(
                Path(temp_dir), template, init_from_env=True
            )
            self.assertIn('"ok":true', output)
            self.assertEqual(
                (Path(temp_dir) / "S99mihui-default").read_text(encoding="utf-8"),
                "#!/bin/sh\n# Unrelated default service\n",
            )
            self.assertNotIn("__MIHUI_APP_DIR__", init_script.read_text(encoding="utf-8"))
            backups = list((app_dir / "backups").glob("S99mihui-*.bak"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_text(encoding="utf-8"), old_script)
            restart_log = app_dir / "restart.log"
            deadline = time.monotonic() + 5
            while not restart_log.is_file() and time.monotonic() < deadline:
                time.sleep(0.05)
            self.assertEqual(restart_log.read_text(encoding="utf-8"), "restart:9893\n")
            self.assertEqual((app_dir / "www" / "index.html").read_text(), "new interface")

    def test_update_refuses_to_replace_unrelated_service(self):
        template = '#!/bin/sh\nMIHUI_INIT_OWNER="KiMorev/MihUI"\nAPP_DIR=__MIHUI_APP_DIR__\n'
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, init_script, old_script, output = self.run_update(
                Path(temp_dir), template, owned=False
            )
            self.assertIn('"ok":false', output)
            self.assertEqual(init_script.read_text(encoding="utf-8"), old_script)
            self.assertEqual((app_dir / "www" / "index.html").read_text(), "old interface")
            self.assertFalse((app_dir / "backups").exists())

    def test_update_rejects_invalid_service_template_before_replacing_files(self):
        templates = [
            "#!/bin/sh\nAPP_DIR=__MIHUI_APP_DIR__\n",
            '#!/bin/sh\nMIHUI_INIT_OWNER="KiMorev/MihUI"\nAPP_DIR=/wrong/path\n',
            '#!/bin/sh\nMIHUI_INIT_OWNER="KiMorev/MihUI"\nAPP_DIR=__MIHUI_APP_DIR__\nif\n',
        ]
        for template in templates:
            with self.subTest(template=template), tempfile.TemporaryDirectory() as temp_dir:
                app_dir, init_script, old_script, output = self.run_update(Path(temp_dir), template)
                self.assertIn('"ok":false', output)
                self.assertEqual(init_script.read_text(encoding="utf-8"), old_script)
                self.assertEqual((app_dir / "www" / "index.html").read_text(), "old interface")
                self.assertFalse((app_dir / "backups").exists())


if __name__ == "__main__":
    unittest.main()
