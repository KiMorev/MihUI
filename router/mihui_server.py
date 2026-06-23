#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DEFAULT_CONFIG_PATH = "/opt/etc/mihomo/config.yaml"
DEFAULT_GITHUB_REPO = "KiMorev/MihUI"


update_lock = threading.Lock()
update_state = {
    "running": False,
    "ok": None,
    "message": "idle",
    "startedAt": None,
    "finishedAt": None,
    "output": "",
}


class MihuiHandler(SimpleHTTPRequestHandler):
    app_dir: Path

    def do_GET(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/config":
            self.handle_config_get()
            return
        if route == "/api/backups":
            self.handle_backups_get()
            return
        if route == "/api/router/uis":
            self.handle_router_uis_get()
            return
        if route == "/api/update/check":
            self.handle_update_check()
            return
        if route == "/api/update/status":
            self.send_json(HTTPStatus.OK, snapshot_update_state())
            return

        super().do_GET()

    def do_POST(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/config/save":
            self.handle_config_save()
            return
        if route == "/api/backups/restore":
            self.handle_backup_restore()
            return
        if route == "/api/update/start":
            self.handle_update_start()
            return
        if route == "/cgi-bin/mihui-update":
            self.handle_legacy_update()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def handle_config_get(self):
        config_path = get_config_path(self.app_dir)
        if not config_path.is_file():
            self.send_json(
                HTTPStatus.NOT_FOUND,
                {"ok": False, "path": str(config_path), "message": "config not found"},
            )
            return

        text = config_path.read_text(encoding="utf-8", errors="replace")
        self.send_json(HTTPStatus.OK, {"ok": True, "path": str(config_path), "text": text})

    def handle_config_save(self):
        payload = self.read_json_body()
        text = payload.get("text")
        if not isinstance(text, str):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "text is required"})
            return

        config_path = get_config_path(self.app_dir)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        backup = create_backup(self.app_dir, config_path)
        write_text_atomic(config_path, text)
        prune_backups(self.app_dir)
        reload_result = reload_mihomo(self.app_dir, config_path)
        self.send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": str(config_path),
                "backup": backup.name if backup else None,
                "reload": reload_result,
            },
        )

    def handle_backups_get(self):
        self.send_json(HTTPStatus.OK, {"ok": True, "backups": list_backups(self.app_dir)})

    def handle_backup_restore(self):
        payload = self.read_json_body()
        name = str(payload.get("name") or "")
        backup = backup_path_by_name(self.app_dir, name)
        if not backup:
            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "message": "backup not found"})
            return

        config_path = get_config_path(self.app_dir)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        current_backup = create_backup(self.app_dir, config_path)
        shutil.copyfile(str(backup), str(config_path))
        prune_backups(self.app_dir)
        reload_result = reload_mihomo(self.app_dir, config_path)
        self.send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": str(config_path),
                "restored": backup.name,
                "backup": current_backup.name if current_backup else None,
                "reload": reload_result,
            },
        )

    def handle_router_uis_get(self):
        self.send_json(HTTPStatus.OK, {"ok": True, "items": detect_router_uis(self.app_dir, self.headers.get("Host", ""))})

    def handle_update_check(self):
        version = read_version(self.app_dir)
        latest = fetch_latest_release(get_env(self.app_dir).get("MIHUI_GITHUB_REPO", DEFAULT_GITHUB_REPO))
        self.send_json(
            HTTPStatus.OK,
            {
                "ok": latest["ok"],
                "version": version,
                "latest": latest.get("tag"),
                "updateAvailable": bool(latest.get("tag") and is_newer_version(latest["tag"], version)),
                "message": latest.get("message", ""),
            },
        )

    def handle_update_start(self):
        with update_lock:
            if update_state["running"]:
                self.send_json(HTTPStatus.CONFLICT, dict(update_state))
                return
            update_state.update(
                {
                    "running": True,
                    "ok": None,
                    "message": "starting",
                    "startedAt": int(time.time()),
                    "finishedAt": None,
                    "output": "",
                }
            )

        thread = threading.Thread(target=run_update_script, args=(self.app_dir,), daemon=True)
        thread.start()
        self.send_json(HTTPStatus.ACCEPTED, snapshot_update_state())

    def handle_legacy_update(self):
        status, headers, body, returncode = run_cgi_script(self.app_dir)
        if returncode != 0 and status == HTTPStatus.OK:
            status = HTTPStatus.INTERNAL_SERVER_ERROR
        self.send_raw_response(status, headers, body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_raw_response(self, status, headers, body):
        self.send_response(status)
        for name, value in headers:
            if name.lower() not in {"status", "connection", "transfer-encoding"}:
                self.send_header(name, value)
        if not any(name.lower() == "content-type" for name, _ in headers):
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def get_env(app_dir):
    env = {}
    env_file = app_dir / "mihui.env"
    if not env_file.is_file():
        return env

    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def get_config_path(app_dir):
    return Path(get_env(app_dir).get("MIHUI_CONFIG_PATH", DEFAULT_CONFIG_PATH))


def get_backup_dir(app_dir):
    return Path(get_env(app_dir).get("MIHUI_BACKUP_DIR", str(app_dir / "backups")))


def create_backup(app_dir, config_path):
    if not config_path.is_file():
        return None
    backup_dir = get_backup_dir(app_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup = backup_dir / f"config-{stamp}.yaml"
    shutil.copyfile(str(config_path), str(backup))
    return backup


def list_backups(app_dir):
    backup_dir = get_backup_dir(app_dir)
    if not backup_dir.is_dir():
        return []
    files = sorted(backup_dir.glob("config-*.yaml"), key=lambda path: path.stat().st_mtime, reverse=True)
    return [
        {
            "name": path.name,
            "size": path.stat().st_size,
            "mtime": int(path.stat().st_mtime),
        }
        for path in files[:5]
    ]


def prune_backups(app_dir):
    backup_dir = get_backup_dir(app_dir)
    if not backup_dir.is_dir():
        return
    files = sorted(backup_dir.glob("config-*.yaml"), key=lambda path: path.stat().st_mtime, reverse=True)
    for path in files[5:]:
        path.unlink(missing_ok=True)


def backup_path_by_name(app_dir, name):
    if "/" in name or "\\" in name or not name.startswith("config-") or not name.endswith(".yaml"):
        return None
    path = get_backup_dir(app_dir) / name
    if not path.is_file():
        return None
    return path


def write_text_atomic(path, text):
    tmp = path.with_name(f".{path.name}.mihui.tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(str(tmp), str(path))


def reload_mihomo(app_dir, config_path):
    env = get_env(app_dir)
    api = env.get("MIHUI_MIHOMO_API", "http://127.0.0.1:9090").rstrip("/")
    secret = env.get("MIHUI_MIHOMO_SECRET", "")
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    try:
        current_path = str(config_path)
        get_req = urllib.request.Request(f"{api}/configs", headers=headers, method="GET")
        with urllib.request.urlopen(get_req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            current_path = data.get("path") or current_path

        body = json.dumps({"path": current_path}).encode("utf-8")
        put_req = urllib.request.Request(f"{api}/configs?force=true", data=body, headers=headers, method="PUT")
        with urllib.request.urlopen(put_req, timeout=10) as response:
            response.read()
        return {"ok": True, "method": "mihomo-api", "path": current_path}
    except Exception as error:
        return {"ok": False, "method": "mihomo-api", "message": str(error)}


def detect_router_uis(app_dir, host):
    host_name = host.split(":", 1)[0] or "192.168.1.1"
    env = get_env(app_dir)
    port = env.get("MIHUI_PORT", "")
    items = [
        {
            "name": "MihUI",
            "localUrl": f"http://{host}/" if host else "",
            "githubUrl": "https://github.com/KiMorev/MihUI",
        }
    ]

    xkeen_dir = Path("/opt/etc/xkeen-ui")
    if xkeen_dir.is_dir():
        xkeen_port = read_key_from_files("XKEEN_UI_PORT", [xkeen_dir / "devtools.env"]) or "8088"
        items.append(
            {
                "name": "Xkeen-UI",
                "localUrl": f"http://{host_name}:{xkeen_port}/",
                "githubUrl": "https://github.com/umarcheh001/Xkeen-UI",
            }
        )

    config_path = get_config_path(app_dir)
    config_text = config_path.read_text(encoding="utf-8", errors="replace") if config_path.is_file() else ""
    controller_port = find_external_controller_port(config_text)
    if "external-ui:" in config_text and controller_port:
        items.append(
            {
                "name": "Mihomo external-ui",
                "localUrl": f"http://{host_name}:{controller_port}/ui/",
                "githubUrl": find_external_ui_github(config_text) or "",
            }
        )

    if port and not items[0]["localUrl"]:
        items[0]["localUrl"] = f"http://{host_name}:{port}/"
    return items


def read_key_from_files(key, files):
    prefix = f"{key}="
    for path in files:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith(prefix):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def find_external_controller_port(config_text):
    for line in config_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("external-controller:"):
            value = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            if ":" in value:
                return value.rsplit(":", 1)[1]
            if value.isdigit():
                return value
    return ""


def find_external_ui_github(config_text):
    for line in config_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("external-ui-url:") and "github.com/" in stripped:
            value = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            return value.split("/releases/", 1)[0]
    return ""


def read_version(app_dir):
    version_file = app_dir / "VERSION"
    if version_file.is_file():
        return version_file.read_text(encoding="utf-8", errors="replace").strip() or "dev"
    return "dev"


def fetch_latest_release(repo):
    try:
        request = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/releases/latest",
            headers={"Accept": "application/vnd.github+json", "User-Agent": "MihUI"},
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
        return {"ok": True, "tag": data.get("tag_name") or ""}
    except Exception as error:
        return {"ok": False, "tag": "", "message": str(error)}


def is_newer_version(latest, current):
    if current in {"", "dev"}:
        return bool(latest)
    return normalize_version(latest) > normalize_version(current)


def normalize_version(version):
    value = version.strip().lstrip("v")
    parts = []
    for item in value.split("."):
        try:
            parts.append(int(item))
        except ValueError:
            parts.append(0)
    return tuple(parts + [0] * (4 - len(parts)))


def run_update_script(app_dir):
    with update_lock:
        update_state["message"] = "downloading"

    status, headers, body, returncode = run_cgi_script(app_dir)
    message = body.decode("utf-8", "replace").strip()

    with update_lock:
        update_state.update(
            {
                "running": False,
                "ok": returncode == 0 and 200 <= int(status) < 300,
                "message": message or ("updated" if returncode == 0 else "failed"),
                "finishedAt": int(time.time()),
                "output": message,
            }
        )


def run_cgi_script(app_dir):
    script = app_dir / "www" / "cgi-bin" / "mihui-update"
    if not script.is_file():
        body = b'{"ok":false,"message":"update script not found"}\n'
        return HTTPStatus.INTERNAL_SERVER_ERROR, [("Content-Type", "application/json")], body, 1

    env = os.environ.copy()
    env["REQUEST_METHOD"] = "POST"
    env["MIHUI_DIR"] = str(app_dir)
    result = subprocess.run(
        ["/bin/sh", str(script)],
        cwd=str(app_dir),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=300,
        check=False,
    )
    status, headers, body = parse_cgi_response(result.stdout)
    return status, headers, body, result.returncode


def parse_cgi_response(raw):
    separator = b"\r\n\r\n" if b"\r\n\r\n" in raw else b"\n\n"
    if separator in raw:
        header_bytes, body = raw.split(separator, 1)
    else:
        return HTTPStatus.OK, [("Content-Type", "application/json")], raw

    status = HTTPStatus.OK
    headers = []
    for line in header_bytes.decode("iso-8859-1", "replace").splitlines():
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        name = name.strip()
        value = value.strip()
        if name.lower() == "status":
            try:
                status = int(value.split()[0])
            except (ValueError, IndexError):
                status = HTTPStatus.INTERNAL_SERVER_ERROR
        else:
            headers.append((name, value))
    return status, headers, body


def snapshot_update_state():
    with update_lock:
        return dict(update_state)


def initialize_update_state(app_dir):
    version_file = app_dir / "VERSION"
    try:
        modified_at = int(version_file.stat().st_mtime)
    except OSError:
        return

    if int(time.time()) - modified_at > 180:
        return

    version = read_version(app_dir)
    message = f"MihUI updated to {version}" if version else "MihUI updated"
    with update_lock:
        update_state.update(
            {
                "running": False,
                "ok": True,
                "message": message,
                "startedAt": None,
                "finishedAt": modified_at,
                "output": message,
            }
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--app-dir", required=True)
    args = parser.parse_args()

    app_dir = Path(args.app_dir).resolve()
    www_dir = app_dir / "www"
    initialize_update_state(app_dir)

    handler = lambda *handler_args, **handler_kwargs: MihuiHandler(
        *handler_args,
        directory=str(www_dir),
        **handler_kwargs,
    )
    MihuiHandler.app_dir = app_dir

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"MihUI listening on {args.host}:{args.port}, app_dir={app_dir}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
