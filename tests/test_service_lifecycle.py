import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SH = os.environ.get("MIHUI_TEST_SH") or shutil.which("sh")
if not SH and os.name == "nt":
    candidate = Path("C:/Program Files/Git/usr/bin/sh.exe")
    SH = str(candidate) if candidate.is_file() else None


@unittest.skipUnless(SH, "POSIX shell is required")
class ServiceLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="mihui-service-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.proc = self.base / "proc"
        self.run = self.base / "run"
        self.proc.mkdir()
        self.run.mkdir()
        self.script = self.base / "S99mihui"
        self.server = (self.base / "mihui_server.py").as_posix()
        self.log = self.base / "signals"

    def process(self, pid, arguments):
        folder = self.proc / str(pid)
        folder.mkdir(exist_ok=True)
        (folder / "cmdline").write_bytes(b"\0".join(arg.encode() for arg in arguments) + b"\0")
        (folder / "alive").touch()

    def stop(self, hook=""):
        source = (ROOT / "router/cgi-bin/mihui-service").read_text(encoding="utf-8")
        functions = source[source.index("pid_matches() ("):source.index('case "${1:-start}"')]
        functions = functions.replace("/proc/", self.proc.as_posix() + "/")
        variables = {
            "SERVER_PY": self.server,
            "PYTHON_BIN": "/opt/bin/python3",
            "SERVICE_SCRIPT": "S99mihui",
            "PID_FILE": (self.run / "mihui.pid").as_posix(),
            "CHILD_PID_FILE": (self.run / "mihui-server.pid").as_posix(),
            "FIXTURE_PROC": self.proc.as_posix(),
            "SIGNAL_LOG": self.log.as_posix(),
        }
        assignments = "\n".join(f"{key}={shlex.quote(value)}" for key, value in variables.items())
        stubs = r'''
kill() {
  signal=TERM
  if [ "$1" = "-0" ]; then [ -f "$FIXTURE_PROC/$2/alive" ]; return; fi
  if [ "$1" = "-9" ]; then signal=KILL; shift; fi
  [ -f "$FIXTURE_PROC/$1/alive" ] || return 1
  printf '%s %s\n' "$signal" "$1" >> "$SIGNAL_LOG"
  [ "$signal" != KILL ] || rm -f "$FIXTURE_PROC/$1/alive"
}
sleep() {
  :
'''
        self.script.write_text("PATH=/usr/bin:/bin:$PATH\n" + assignments + "\n" + functions + stubs + hook + "\n}\nstop\n", encoding="utf-8")
        result = subprocess.run([SH, self.script.as_posix()], capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        return self.log.read_text().splitlines() if self.log.exists() else []

    def test_stop_finds_server_when_child_pid_is_missing_or_dead(self):
        for recorded in (None, "999999"):
            with self.subTest(recorded=recorded):
                self.process(101, ["/opt/bin/python3", self.server, "--port", "9878"])
                if recorded:
                    (self.run / "mihui-server.pid").write_text(recorded)
                self.assertEqual(self.stop(), ["TERM 101", "KILL 101"])
                self.log.unlink()
                self.assertFalse((self.run / "mihui-server.pid").exists())

    def test_stop_preserves_unrelated_python_and_path_substrings(self):
        self.process(101, ["/opt/bin/python3", self.server])
        self.process(102, ["/opt/bin/python3", "/opt/etc/xkeen-ui/run_server.py"])
        self.process(103, ["/opt/bin/python3", self.server + "-other"])
        self.process(104, ["sh", "-c", "echo " + self.server])
        self.process(105, ["/opt/bin/python3", "/another/mihui_server.py"])
        (self.run / "mihui-server.pid").write_text("102")
        self.assertEqual(self.stop(), ["TERM 101", "KILL 101"])
        for pid in range(102, 106):
            self.assertTrue((self.proc / str(pid) / "alive").exists())

    def test_stop_discovers_untracked_supervisor_before_late_child(self):
        self.process(100, ["sh", self.script.as_posix(), "supervise"])
        self.process(102, ["sh", "/another/S99mihui", "supervise"])
        child_dir = self.proc / "101"
        child_dir.mkdir()
        (child_dir / "cmdline").write_bytes(b"/opt/bin/python3\0" + self.server.encode() + b"\0")
        hook = 'if [ -f "$FIXTURE_PROC/100/alive" ]; then touch "$FIXTURE_PROC/101/alive"; fi'
        self.assertEqual(self.stop(hook), ["TERM 100", "KILL 100", "TERM 101", "KILL 101"])
        self.assertTrue((self.proc / "102/alive").exists())

    def test_stop_rechecks_identity_before_forcing_termination(self):
        self.process(101, ["/opt/bin/python3", self.server])
        hook = r'''printf '/opt/bin/python3\000/opt/etc/xkeen-ui/run_server.py\000' > "$FIXTURE_PROC/101/cmdline"'''
        self.assertEqual(self.stop(hook), ["TERM 101"])
        self.assertTrue((self.proc / "101/alive").exists())

    def test_installer_generates_the_same_service_lifecycle(self):
        installer = (ROOT / "router/install.sh").read_text(encoding="utf-8")
        function = installer[installer.index("write_init_script() {"):installer.index("show_service_log() {")]
        generated = self.base / "generated-service"
        render = self.base / "render.sh"
        render.write_text(
            f"PATH=/usr/bin:/bin:$PATH\nINIT_SCRIPT={shlex.quote(generated.as_posix())}\n" + function + "\nwrite_init_script\n",
            encoding="utf-8",
        )
        result = subprocess.run([SH, render.as_posix()], capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        template = (ROOT / "router/cgi-bin/mihui-service").read_text(encoding="utf-8")
        rendered = generated.read_text(encoding="utf-8")
        self.assertEqual(rendered[rendered.index("pid_matches() ("):], template[template.index("pid_matches() ("):])
        for script in (generated, ROOT / "router/cgi-bin/mihui-service", ROOT / "router/install.sh"):
            result = subprocess.run([SH, "-n", script.as_posix()], capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
