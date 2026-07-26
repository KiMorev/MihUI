#!/usr/bin/env python3
import argparse
import base64
import hashlib
import html
import io
import ipaddress
import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DEFAULT_CONFIG_PATH = "/opt/etc/mihomo/config.yaml"
DEFAULT_GITHUB_REPO = "KiMorev/MihUI"
DEFAULT_XKEEN_GITHUB_REPO = "jameszeroX/XKeen"
DEFAULT_MIHOMO_GITHUB_REPO = "MetaCubeX/mihomo"
DEFAULT_XKEEN_DIR = "/opt/etc/xkeen"
XKEEN_STATUS_TIMEOUT = 8
XKEEN_FILES_MAX_BYTES = 512 * 1024
XKEEN_BETA_ARCHIVE_MAX_BYTES = 2 * 1024 * 1024
COMPONENT_RELEASE_CACHE_TTL = 6 * 60 * 60
COMPONENT_ACTION_TIMEOUT = 10 * 60
PROVIDER_ADAPTER_PATH = "/mihomo/provider.yaml"
PROVIDER_ADAPTER_HWID_PATH = "/mihomo/hwid/provider.yaml"
PROVIDER_ADAPTER_MAX_BYTES = 20 * 1024 * 1024
PROVIDER_ADAPTER_BLOCKED_HEADERS = {
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "accept-encoding",
}
DEFAULT_HAPP_FALLBACK_USER_AGENT = "Happ/1.0"
RESOURCE_MONITOR_LOG_MAX_BYTES = 512 * 1024
RESOURCE_MONITOR_EVENT_LIMIT = 200
RESOURCE_MONITOR_SLOW_CHECK_THRESHOLD = 2
RESOURCE_MONITOR_PRIORITY_RECOVERY_THRESHOLD = 2
RESOURCE_MONITOR_MIN_LATENCY_IMPROVEMENT_RATIO = 0.25
RESOURCE_MONITOR_STARTUP_WARMUP_SECONDS = 15
RESOURCE_MONITOR_FAILOVER_TIMEOUT_MS = 3000
RESOURCE_MONITOR_GROUP_TYPES = {
    "selector",
    "select",
    "urltest",
    "url-test",
    "fallback",
    "loadbalance",
    "load-balance",
    "relay",
}
RESOURCE_MONITOR_BUILTINS = {
    "DIRECT",
    "REJECT",
    "REJECT-DROP",
    "PASS",
    "COMPATIBLE",
    "GLOBAL",
}
RESOURCE_MONITOR_SERVICES = {
    "youtube": {
        "title": "YouTube",
        "group": "YOUTUBE",
        "endpoints": [{"url": "https://www.youtube.com/generate_204", "expected": 204}],
    },
    "telegram": {
        "title": "Telegram",
        "group": "TELEGRAM",
        "endpoints": [{"url": "https://telegram.org/", "expected": 200}],
    },
    "whatsapp": {
        "title": "WhatsApp",
        "group": "WHATSAPP",
        "endpoints": [{"url": "https://www.whatsapp.com/", "expected": 200}],
    },
    "ai": {
        "title": "AI",
        "group": "AI",
        "endpoints": [
            {"url": "https://chatgpt.com/cdn-cgi/trace", "expected": 200},
            {"url": "https://claude.ai/cdn-cgi/trace", "expected": 200},
        ],
    },
}
WHITELIST_MONITOR_LOG_MAX_BYTES = 256 * 1024
WHITELIST_MONITOR_EVENT_LIMIT = 200
WHITELIST_MONITOR_ENDPOINT_LIMIT = 10
WHITELIST_MONITOR_POSITIVE_ENDPOINTS = [
    {"id": "allowed-ya", "name": "Яндекс", "url": "https://ya.ru/", "enabled": True},
    {"id": "allowed-gosuslugi", "name": "Госуслуги", "url": "https://www.gosuslugi.ru/", "enabled": True},
]
WHITELIST_MONITOR_CONTROL_ENDPOINTS = [
    {
        "id": "control-truenetwork",
        "name": "TrueNetwork mirror",
        "url": "https://mirror.truenetwork.ru/robots.txt",
        "enabled": True,
    },
    {
        "id": "control-neftm",
        "name": "Neftm mirror",
        "url": "https://mirror.neftm.ru/debian/project/trace/mirror.neftm.ru",
        "enabled": True,
    },
    {
        "id": "control-selectel",
        "name": "Selectel Speedtest",
        "url": "https://speedtest.selectel.ru/robots.txt",
        "enabled": True,
    },
]


update_lock = threading.Lock()
config_write_lock = threading.Lock()
update_state = {
    "running": False,
    "ok": None,
    "message": "idle",
    "startedAt": None,
    "finishedAt": None,
    "output": "",
}
component_action_lock = threading.Lock()
component_state_lock = threading.Lock()
component_action_state = {
    "running": False,
    "ok": None,
    "component": "",
    "action": "",
    "target": "",
    "phase": "idle",
    "message": "",
    "startedAt": None,
    "finishedAt": None,
    "output": "",
}
component_release_cache_lock = threading.Lock()
component_release_cache = {"checkedAt": 0, "catalog": {}}
xkeen_files_lock = threading.Lock()
resource_monitor_lock = threading.Lock()
resource_monitor_state_lock = threading.Lock()
resource_monitor_job_state = {
    "running": False,
    "services": [],
    "startedAt": None,
    "finishedAt": None,
}
whitelist_monitor_lock = threading.Lock()
whitelist_monitor_state_lock = threading.Lock()
whitelist_monitor_job_state = {
    "running": False,
    "startedAt": None,
    "finishedAt": None,
}
UI_ASSET_NO_CACHE_PATHS = {"/", "/index.html", "/app.js", "/styles.css", "/mihomo-editor.html"}


class MihuiHandler(SimpleHTTPRequestHandler):
    app_dir: Path

    def end_headers(self):
        route = self.path.split("?", 1)[0]
        if route in UI_ASSET_NO_CACHE_PATHS:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

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
        if route == "/api/services/status":
            self.send_json(HTTPStatus.OK, get_services_status(self.app_dir))
            return
        if route == "/api/components/status":
            force = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get("force", [""])[0]
            self.send_json(
                HTTPStatus.OK,
                get_components_status(self.app_dir, force=str(force).lower() in {"1", "true", "yes"}),
            )
            return
        if route == "/api/components/job":
            self.send_json(HTTPStatus.OK, {"ok": True, "job": snapshot_component_action_state()})
            return
        if route == "/api/xkeen/network-files":
            self.handle_xkeen_network_files_get()
            return
        if route == "/api/providers/status":
            self.handle_providers_status()
            return
        if route == "/api/nodes":
            self.handle_nodes_get()
            return
        if route == "/api/resource-monitor":
            self.handle_resource_monitor_get()
            return
        if route == "/api/whitelist-monitor":
            self.handle_whitelist_monitor_get()
            return
        if route in {PROVIDER_ADAPTER_PATH, PROVIDER_ADAPTER_HWID_PATH}:
            self.handle_provider_adapter_get(append_hwid=route == PROVIDER_ADAPTER_HWID_PATH)
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
        if route == "/api/components/action":
            self.handle_component_action()
            return
        if route == "/api/xkeen/network-files":
            self.handle_xkeen_network_files_save()
            return
        if route == "/api/config/check":
            self.handle_config_check()
            return
        if route == "/api/providers/update":
            self.handle_provider_update()
            return
        if route == "/api/groups/select":
            self.handle_group_select()
            return
        if route == "/api/resource-monitor/settings":
            self.handle_resource_monitor_settings()
            return
        if route == "/api/resource-monitor/check":
            self.handle_resource_monitor_check()
            return
        if route == "/api/whitelist-monitor/settings":
            self.handle_whitelist_monitor_settings()
            return
        if route == "/api/whitelist-monitor/check":
            self.handle_whitelist_monitor_check()
            return
        if route == "/api/whitelist-monitor/proxy-check":
            self.handle_whitelist_monitor_proxy_check()
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
        self.send_json(
            HTTPStatus.OK,
            {"ok": True, "path": str(config_path), "text": text, "revision": config_revision(text)},
        )

    def handle_config_save(self):
        payload = self.read_json_body()
        text = payload.get("text")
        expected_revision = payload.get("expectedRevision")
        if not isinstance(text, str):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "text is required"})
            return
        if expected_revision is not None and not isinstance(expected_revision, str):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "expectedRevision must be a string"})
            return

        result = save_checked_config(self.app_dir, text, expected_revision=expected_revision)
        if not result["ok"]:
            if result.get("stage") == "conflict":
                status = HTTPStatus.CONFLICT
            elif result.get("stage") == "check":
                status = HTTPStatus.UNPROCESSABLE_ENTITY
            else:
                status = HTTPStatus.BAD_GATEWAY
            self.send_json(status, result)
            return

        self.send_json(
            HTTPStatus.OK,
            result,
        )

    def handle_backups_get(self):
        self.send_json(HTTPStatus.OK, {"ok": True, "backups": list_backups(self.app_dir)})

    def handle_backup_restore(self):
        payload = self.read_json_body()
        name = str(payload.get("name") or "")
        expected_revision = payload.get("expectedRevision")
        if expected_revision is not None and not isinstance(expected_revision, str):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "expectedRevision must be a string"})
            return
        backup = backup_path_by_name(self.app_dir, name)
        if not backup:
            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "message": "backup not found"})
            return

        result = restore_checked_backup(self.app_dir, backup, expected_revision=expected_revision)
        if result["ok"]:
            status = HTTPStatus.OK
        elif result.get("stage") == "conflict":
            status = HTTPStatus.CONFLICT
        elif result.get("stage") == "check":
            status = HTTPStatus.UNPROCESSABLE_ENTITY
        else:
            status = HTTPStatus.BAD_GATEWAY
        self.send_json(status, result)

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

    def handle_component_action(self):
        if self.headers.get("X-Mihui-Action") != "components":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        try:
            payload = self.read_json_body()
            request_data = validate_component_action(self.app_dir, payload)
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(error)})
            return

        with component_state_lock:
            if component_action_state["running"]:
                self.send_json(HTTPStatus.CONFLICT, {"ok": False, "message": "component action already running"})
                return
            component_action_state.update(
                {
                    "running": True,
                    "ok": None,
                    "component": request_data["component"],
                    "action": request_data["action"],
                    "target": request_data.get("target", ""),
                    "phase": "starting",
                    "message": "Подготовка операции",
                    "startedAt": int(time.time()),
                    "finishedAt": None,
                    "output": "",
                }
            )

        thread = threading.Thread(
            target=run_component_action,
            args=(self.app_dir, request_data),
            daemon=True,
        )
        thread.start()
        self.send_json(HTTPStatus.ACCEPTED, {"ok": True, "job": snapshot_component_action_state()})

    def handle_config_check(self):
        payload = self.read_json_body()
        text = payload.get("text")
        if not isinstance(text, str):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "text is required"})
            return

        result = check_mihomo_config(self.app_dir, text)
        self.send_json(HTTPStatus.OK if result["ok"] else HTTPStatus.UNPROCESSABLE_ENTITY, result)

    def handle_xkeen_network_files_get(self):
        try:
            result = get_xkeen_network_files(self.app_dir)
        except Exception as error:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "message": str(error)})
            return
        self.send_json(HTTPStatus.OK, result)

    def handle_xkeen_network_files_save(self):
        if self.headers.get("X-Mihui-Action") != "xkeen-network-files":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        try:
            payload = self.read_json_body()
            changes, restart = validate_xkeen_network_files_request(payload)
        except (TypeError, ValueError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(error)})
            return

        with xkeen_files_lock:
            result = save_xkeen_network_files(self.app_dir, changes, restart=restart)
        if result["ok"]:
            status = HTTPStatus.OK
        elif result.get("errors"):
            status = HTTPStatus.UNPROCESSABLE_ENTITY
        else:
            status = HTTPStatus.BAD_GATEWAY
        self.send_json(status, result)

    def handle_providers_status(self):
        result = get_proxy_provider_statuses(self.app_dir)
        self.send_json(HTTPStatus.OK if result["ok"] else HTTPStatus.BAD_GATEWAY, result)

    def handle_nodes_get(self):
        result = get_current_nodes(self.app_dir)
        self.send_json(HTTPStatus.OK if result["ok"] else HTTPStatus.BAD_GATEWAY, result)

    def handle_provider_update(self):
        payload = self.read_json_body()
        name = str(payload.get("name") or "")
        if not name:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "name is required"})
            return

        result = update_proxy_provider(self.app_dir, name)
        self.send_json(HTTPStatus.OK if result["ok"] else HTTPStatus.BAD_GATEWAY, result)

    def handle_group_select(self):
        payload = self.read_json_body()
        group = str(payload.get("group") or "").strip()
        name = str(payload.get("name") or "").strip()
        if not group or not name:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "group and name are required"})
            return

        result = select_proxy_group(self.app_dir, group, name)
        if result["ok"]:
            status = HTTPStatus.OK
        elif result.get("unavailable") or result.get("uncertain"):
            status = HTTPStatus.BAD_GATEWAY
        else:
            status = HTTPStatus.UNPROCESSABLE_ENTITY
        self.send_json(status, result)

    def handle_resource_monitor_get(self):
        self.send_json(HTTPStatus.OK, get_resource_monitor_status(self.app_dir))

    def handle_resource_monitor_settings(self):
        if self.headers.get("X-Mihui-Action") != "resource-monitor":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        try:
            settings = validate_resource_monitor_settings(self.read_json_body())
        except (TypeError, ValueError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(error)})
            return

        if settings["enabled"]:
            readiness = get_resource_monitor_readiness(self.app_dir, settings)
            if not readiness["ready"]:
                self.send_json(
                    HTTPStatus.UNPROCESSABLE_ENTITY,
                    {"ok": False, "message": "resource groups are not ready", "readiness": readiness},
                )
                return

            proxies = load_resource_monitor_proxies(self.app_dir)
            selection = select_resource_monitor_fastest_nodes(self.app_dir, settings, proxies)
            if not selection["ok"]:
                self.send_json(
                    HTTPStatus.BAD_GATEWAY,
                    {
                        "ok": False,
                        "message": "Mihomo did not apply the fastest resource nodes",
                        "selection": selection,
                    },
                )
                return

        save_resource_monitor_settings(self.app_dir, settings)
        self.send_json(HTTPStatus.OK, get_resource_monitor_status(self.app_dir))

    def handle_resource_monitor_check(self):
        if self.headers.get("X-Mihui-Action") != "resource-monitor":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        payload = self.read_json_body()
        service = str(payload.get("service") or "").strip().casefold()
        if service and service not in RESOURCE_MONITOR_SERVICES:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "unknown service"})
            return

        result = start_resource_monitor_check(self.app_dir, [service] if service else None)
        self.send_json(HTTPStatus.ACCEPTED if result["ok"] else HTTPStatus.CONFLICT, result)

    def handle_whitelist_monitor_get(self):
        self.send_json(HTTPStatus.OK, get_whitelist_monitor_status(self.app_dir))

    def handle_whitelist_monitor_settings(self):
        if self.headers.get("X-Mihui-Action") != "whitelist-monitor":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        try:
            settings = validate_whitelist_monitor_settings(self.read_json_body())
        except (TypeError, ValueError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": str(error)})
            return

        previous = load_whitelist_monitor_settings(self.app_dir)
        save_whitelist_monitor_settings(self.app_dir, settings)
        if previous["enabled"] != settings["enabled"]:
            append_whitelist_monitor_event(
                self.app_dir,
                "enabled" if settings["enabled"] else "disabled",
                "Наблюдение включено" if settings["enabled"] else "Наблюдение выключено",
            )
        self.send_json(HTTPStatus.OK, get_whitelist_monitor_status(self.app_dir))

    def handle_whitelist_monitor_check(self):
        if self.headers.get("X-Mihui-Action") != "whitelist-monitor":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        result = start_whitelist_monitor_check(self.app_dir)
        if result["ok"]:
            status = HTTPStatus.ACCEPTED
        elif result.get("disabled"):
            status = HTTPStatus.UNPROCESSABLE_ENTITY
        else:
            status = HTTPStatus.CONFLICT
        self.send_json(status, result)

    def handle_whitelist_monitor_proxy_check(self):
        if self.headers.get("X-Mihui-Action") != "whitelist-monitor":
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "message": "action header required"})
            return

        endpoint_id = str(self.read_json_body().get("endpointId") or "").strip()
        settings = load_whitelist_monitor_settings(self.app_dir)
        endpoint = next(
            (
                item
                for item in settings["controlEndpoints"]
                if item["id"] == endpoint_id and item["enabled"]
            ),
            None,
        )
        if endpoint is None:
            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "message": "control endpoint not found"})
            return

        result = probe_whitelist_monitor_endpoint(
            self.app_dir,
            settings["proxyGroup"],
            endpoint,
            settings["timeoutMs"],
        )
        self.send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "endpointId": endpoint_id,
                "proxyGroup": settings["proxyGroup"],
                "result": result,
            },
        )

    def handle_provider_adapter_get(self, append_hwid=False):
        if not is_loopback_address(self.client_address[0]):
            self.send_plain(HTTPStatus.FORBIDDEN, "provider adapter is loopback-only")
            return

        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        source_url = (query.get("url") or [""])[0]
        try:
            body, content_type = fetch_provider_payload(
                source_url,
                build_provider_request_headers(self.headers),
                append_hwid=append_hwid,
                app_dir=self.app_dir,
            )
        except ValueError as error:
            self.send_plain(HTTPStatus.BAD_REQUEST, str(error))
            return
        except Exception as error:
            self.send_plain(HTTPStatus.BAD_GATEWAY, str(error))
            return

        self.send_provider_payload(body, content_type)

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

    def send_plain(self, status, text):
        body = (text.rstrip() + "\n").encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_provider_payload(self, body, content_type):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or "text/yaml; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def get_env(app_dir):
    env = {}
    env_file = get_env_path(app_dir)
    if not env_file.is_file():
        return env

    for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def get_env_path(app_dir):
    return Path(app_dir) / "mihui.env"


def get_config_path(app_dir):
    return Path(get_env(app_dir).get("MIHUI_CONFIG_PATH", DEFAULT_CONFIG_PATH))


def config_revision(text):
    return hashlib.sha256(str(text or "").encode("utf-8")).hexdigest()


def read_config_text(config_path):
    if not config_path.is_file():
        return ""
    return config_path.read_text(encoding="utf-8", errors="replace")


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


XKEEN_NETWORK_FILE_DEFS = {
    "portProxying": {
        "name": "port_proxying.lst",
        "env": "XKEEN_PORT_PROXYING_FILE",
        "default": "",
    },
    "portExclude": {
        "name": "port_exclude.lst",
        "env": "XKEEN_PORT_EXCLUDE_FILE",
        "default": "",
    },
    "ipExclude": {
        "name": "ip_exclude.lst",
        "env": "XKEEN_IP_EXCLUDE_FILE",
        "default": "",
    },
    "xkeenConfig": {
        "name": "xkeen.json",
        "env": "XKEEN_CONFIG_FILE",
        "default": "{}\n",
    },
}


def get_xkeen_network_file_paths(app_dir):
    env = get_env(app_dir)
    base_dir = Path(env.get("MIHUI_XKEEN_DIR", DEFAULT_XKEEN_DIR))
    paths = {}
    for key, definition in XKEEN_NETWORK_FILE_DEFS.items():
        configured = env.get(definition["env"], "")
        paths[key] = Path(configured) if configured else base_dir / definition["name"]

    if base_dir == Path(DEFAULT_XKEEN_DIR) and not env.get(XKEEN_NETWORK_FILE_DEFS["ipExclude"]["env"]):
        current = paths["ipExclude"]
        legacy = Path("/opt/etc/xkeen_exclude.lst")
        if not current.exists() and legacy.exists():
            paths["ipExclude"] = legacy
    return paths


def read_xkeen_network_file(path, default=""):
    if not path.is_file():
        return default, False
    if path.stat().st_size > XKEEN_FILES_MAX_BYTES:
        raise ValueError(f"{path.name} is too large")
    return path.read_text(encoding="utf-8", errors="replace"), True


def get_xkeen_network_files(app_dir):
    paths = get_xkeen_network_file_paths(app_dir)
    contents = {}
    files = {}
    for key, definition in XKEEN_NETWORK_FILE_DEFS.items():
        text, exists = read_xkeen_network_file(paths[key], definition["default"])
        contents[key] = text
        files[key] = {
            "name": definition["name"],
            "path": str(paths[key]),
            "text": text,
            "exists": exists,
        }

    validation = validate_xkeen_network_files(contents)
    return {
        "ok": True,
        "available": bool(find_xkeen_binary(app_dir)),
        "directory": str(paths["portProxying"].parent),
        "files": files,
        "validation": validation,
    }


def validate_xkeen_network_files_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("JSON object is required")
    files = payload.get("files")
    if not isinstance(files, dict) or not files:
        raise ValueError("files are required")
    unknown = set(files) - set(XKEEN_NETWORK_FILE_DEFS)
    if unknown:
        raise ValueError("unknown file key")

    changes = {}
    for key, text in files.items():
        if not isinstance(text, str):
            raise ValueError(f"{key} text is required")
        if len(text.encode("utf-8")) > XKEEN_FILES_MAX_BYTES:
            raise ValueError(f"{XKEEN_NETWORK_FILE_DEFS[key]['name']} is too large")
        changes[key] = text

    restart = payload.get("restart", True)
    if not isinstance(restart, bool):
        raise ValueError("restart must be boolean")
    return changes, restart


def active_xkeen_lines(text):
    return [line.strip() for line in str(text or "").splitlines() if line.strip() and not line.lstrip().startswith("#")]


def validate_xkeen_port_file(key, text):
    errors = []
    active_count = 0
    for line_number, raw in enumerate(str(text or "").splitlines(), start=1):
        value = raw.strip()
        if not value or value.startswith("#"):
            continue
        active_count += 1
        match = re.fullmatch(r"(\d+)(?:\s*[:-]\s*(\d+))?", value)
        if not match:
            errors.append({"file": key, "line": line_number, "message": "Ожидается порт или диапазон портов"})
            continue
        start = int(match.group(1))
        end = int(match.group(2) or start)
        if start < 1 or start > 65535 or end < 1 or end > 65535:
            errors.append({"file": key, "line": line_number, "message": "Порт должен быть в диапазоне 1–65535"})
        elif start > end:
            errors.append({"file": key, "line": line_number, "message": "Начало диапазона больше конца"})
    return errors, active_count


def validate_xkeen_ip_file(text):
    errors = []
    active_count = 0
    for line_number, raw in enumerate(str(text or "").splitlines(), start=1):
        value = raw.strip()
        if not value or value.startswith("#"):
            continue
        active_count += 1
        try:
            ipaddress.ip_network(value, strict=False)
        except ValueError:
            errors.append({"file": "ipExclude", "line": line_number, "message": "Ожидается IPv4/IPv6 адрес или подсеть"})
    return errors, active_count


def strip_json_comments(text):
    result = []
    index = 0
    in_string = False
    escaped = False
    source = str(text or "")
    while index < len(source):
        char = source[index]
        next_char = source[index + 1] if index + 1 < len(source) else ""
        if in_string:
            result.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            index += 1
            continue
        if char == '"':
            in_string = True
            result.append(char)
            index += 1
            continue
        if char == "/" and next_char == "/":
            result.extend("  ")
            index += 2
            while index < len(source) and source[index] not in "\r\n":
                result.append(" ")
                index += 1
            continue
        if char == "/" and next_char == "*":
            result.extend("  ")
            index += 2
            while index < len(source):
                if source[index] == "*" and index + 1 < len(source) and source[index + 1] == "/":
                    result.extend("  ")
                    index += 2
                    break
                result.append("\n" if source[index] == "\n" else " ")
                index += 1
            continue
        result.append(char)
        index += 1
    return "".join(result)


def validate_xkeen_json(text):
    errors = []
    policy_count = 0
    try:
        data = json.loads(strip_json_comments(text))
    except json.JSONDecodeError as error:
        return ([{"file": "xkeenConfig", "line": error.lineno, "message": f"Некорректный JSON: {error.msg}"}], policy_count)
    if not isinstance(data, dict):
        return ([{"file": "xkeenConfig", "line": 1, "message": "Корнем xkeen.json должен быть объект"}], policy_count)

    xkeen = data.get("xkeen")
    if xkeen is not None and not isinstance(xkeen, dict):
        errors.append({"file": "xkeenConfig", "line": 1, "message": "Поле xkeen должно быть объектом"})
        return errors, policy_count
    policies = xkeen.get("policy") if isinstance(xkeen, dict) else None
    if policies is not None and not isinstance(policies, list):
        errors.append({"file": "xkeenConfig", "line": 1, "message": "Поле xkeen.policy должно быть массивом"})
        return errors, policy_count
    if isinstance(policies, list):
        policy_count = len(policies)
        for index, policy in enumerate(policies, start=1):
            if not isinstance(policy, dict) or not str(policy.get("name") or "").strip():
                errors.append({"file": "xkeenConfig", "line": 1, "message": f"У политики {index} отсутствует имя"})
    return errors, policy_count


def validate_xkeen_network_files(contents):
    errors = []
    counts = {}
    for key in ("portProxying", "portExclude"):
        file_errors, counts[key] = validate_xkeen_port_file(key, contents.get(key, ""))
        errors.extend(file_errors)
    file_errors, counts["ipExclude"] = validate_xkeen_ip_file(contents.get("ipExclude", ""))
    errors.extend(file_errors)
    file_errors, counts["xkeenConfig"] = validate_xkeen_json(contents.get("xkeenConfig", ""))
    errors.extend(file_errors)

    warnings = []
    if active_xkeen_lines(contents.get("portProxying", "")) and active_xkeen_lines(contents.get("portExclude", "")):
        warnings.append({
            "code": "port-priority",
            "message": "Порты проксирования имеют приоритет: список исключений не будет применён.",
        })
    return {"ok": not errors, "errors": errors, "warnings": warnings, "counts": counts}


def run_xkeen_restart(app_dir, binary):
    try:
        result = subprocess.run(
            [binary, "-restart"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=180,
            check=False,
        )
        output = result.stdout.decode("utf-8", "replace").strip()
    except subprocess.TimeoutExpired:
        return {"ok": False, "message": "Перезапуск XKeen превысил время ожидания", "output": ""}
    except Exception as error:
        return {"ok": False, "message": str(error), "output": ""}
    if result.returncode != 0:
        return {"ok": False, "message": output or "Не удалось перезапустить XKeen", "output": output}
    health = get_xkeen_service_status(app_dir)
    return {
        "ok": health.get("state") == "ok",
        "message": health.get("message") or ("XKeen перезапущен" if health.get("state") == "ok" else "XKeen не запустился"),
        "output": output,
        "health": health,
    }


def restore_xkeen_network_files(originals):
    errors = []
    for original in originals.values():
        path = original["path"]
        try:
            if original["exists"]:
                path.parent.mkdir(parents=True, exist_ok=True)
                write_text_atomic(path, original["text"])
            else:
                path.unlink(missing_ok=True)
        except Exception as error:
            errors.append(str(error))
    return errors


def save_xkeen_network_files(app_dir, changes, restart=True):
    current = get_xkeen_network_files(app_dir)
    if not current["available"]:
        return {"ok": False, "message": "XKeen не найден"}

    contents = {key: item["text"] for key, item in current["files"].items()}
    contents.update(changes)
    validation = validate_xkeen_network_files(contents)
    if not validation["ok"]:
        return {
            "ok": False,
            "message": "Исправьте ошибки перед сохранением",
            "errors": validation["errors"],
            "warnings": validation["warnings"],
        }

    changed_keys = [key for key in changes if changes[key] != current["files"][key]["text"]]
    if not changed_keys:
        return {"ok": True, "changed": [], "restarted": False, "validation": validation}

    paths = get_xkeen_network_file_paths(app_dir)
    originals = {
        key: {
            "path": paths[key],
            "text": current["files"][key]["text"],
            "exists": current["files"][key]["exists"],
        }
        for key in changed_keys
    }
    try:
        for key in changed_keys:
            paths[key].parent.mkdir(parents=True, exist_ok=True)
            write_text_atomic(paths[key], changes[key])
    except Exception as error:
        restore_xkeen_network_files(originals)
        return {"ok": False, "message": f"Не удалось сохранить файлы: {error}"}

    restart_result = None
    if restart:
        binary = find_xkeen_binary(app_dir)
        restart_result = run_xkeen_restart(app_dir, binary)
        if not restart_result["ok"]:
            rollback_errors = restore_xkeen_network_files(originals)
            rollback_restart = run_xkeen_restart(app_dir, binary)
            details = [restart_result.get("message", "Не удалось перезапустить XKeen")]
            details.extend(rollback_errors)
            if not rollback_restart["ok"]:
                details.append("Исходная конфигурация восстановлена, но повторный запуск XKeen не удался")
            return {
                "ok": False,
                "message": "Изменения отменены: " + "; ".join(filter(None, details)),
                "rolledBack": not rollback_errors,
                "restart": restart_result,
            }

    return {
        "ok": True,
        "changed": changed_keys,
        "restarted": bool(restart),
        "restart": restart_result,
        "validation": validation,
    }


def save_checked_config(app_dir, text, expected_revision=None):
    with config_write_lock:
        config_path = get_config_path(app_dir)
        current_revision = config_revision(read_config_text(config_path))
        if expected_revision is not None and expected_revision != current_revision:
            return {
                "ok": False,
                "saved": False,
                "stage": "conflict",
                "path": str(config_path),
                "currentRevision": current_revision,
                "message": "config changed on disk after it was loaded",
            }

        check = check_mihomo_config(app_dir, text)
        if not check["ok"]:
            return {
                "ok": False,
                "stage": "check",
                "message": check.get("message", "config check failed"),
                "check": check,
            }

        config_path.parent.mkdir(parents=True, exist_ok=True)
        backup = create_backup(app_dir, config_path)
        write_text_atomic(config_path, text)
        next_revision = config_revision(text)
        reload_result = reload_mihomo(app_dir, config_path)
        if reload_result["ok"]:
            prune_backups(app_dir)
            return {
                "ok": True,
                "saved": True,
                "applied": True,
                "path": str(config_path),
                "revision": next_revision,
                "backup": backup.name if backup else None,
                "check": check,
                "reload": reload_result,
            }

        if reload_result.get("uncertain"):
            prune_backups(app_dir)
            return {
                "ok": False,
                "saved": True,
                "applied": False,
                "uncertain": True,
                "path": str(config_path),
                "revision": next_revision,
                "backup": backup.name if backup else None,
                "check": check,
                "reload": reload_result,
                "message": "config saved, but Mihomo apply status could not be confirmed",
            }

        rollback = restore_config_backup(config_path, backup)
        rollback_reload = reload_mihomo(app_dir, config_path) if rollback["ok"] and backup else None
        restored_revision = config_revision(read_config_text(config_path))
        prune_backups(app_dir)
        return {
            "ok": False,
            "saved": False,
            "applied": False,
            "rolledBack": rollback["ok"],
            "path": str(config_path),
            "revision": restored_revision,
            "backup": backup.name if backup else None,
            "check": check,
            "reload": reload_result,
            "rollback": {**rollback, "reload": rollback_reload},
            "message": (
                "Mihomo did not apply the config; previous config restored"
                if rollback["ok"]
                else "Mihomo did not apply the config and rollback failed"
            ),
        }


def restore_checked_backup(app_dir, backup, expected_revision=None):
    with config_write_lock:
        config_path = get_config_path(app_dir)
        current_revision = config_revision(read_config_text(config_path))
        if expected_revision is not None and expected_revision != current_revision:
            return {
                "ok": False,
                "restored": False,
                "stage": "conflict",
                "path": str(config_path),
                "currentRevision": current_revision,
                "message": "config changed on disk after it was loaded",
            }

        backup_text = backup.read_text(encoding="utf-8", errors="replace")
        check = check_mihomo_config(app_dir, backup_text)
        if not check["ok"]:
            return {
                "ok": False,
                "restored": False,
                "stage": "check",
                "message": check.get("message", "backup config check failed"),
                "check": check,
            }

        config_path.parent.mkdir(parents=True, exist_ok=True)
        current_backup = create_backup(app_dir, config_path)
        write_text_atomic(config_path, backup_text)
        restored_revision = config_revision(backup_text)
        reload_result = reload_mihomo(app_dir, config_path)
        if reload_result["ok"]:
            prune_backups(app_dir)
            return {
                "ok": True,
                "restored": True,
                "applied": True,
                "path": str(config_path),
                "revision": restored_revision,
                "restoredBackup": backup.name,
                "backup": current_backup.name if current_backup else None,
                "check": check,
                "reload": reload_result,
            }

        if reload_result.get("uncertain"):
            prune_backups(app_dir)
            return {
                "ok": False,
                "restored": True,
                "applied": False,
                "uncertain": True,
                "path": str(config_path),
                "revision": restored_revision,
                "restoredBackup": backup.name,
                "backup": current_backup.name if current_backup else None,
                "check": check,
                "reload": reload_result,
                "message": "backup restored, but Mihomo apply status could not be confirmed",
            }

        rollback = restore_config_backup(config_path, current_backup)
        rollback_reload = reload_mihomo(app_dir, config_path) if rollback["ok"] and current_backup else None
        rollback_revision = config_revision(read_config_text(config_path))
        prune_backups(app_dir)
        return {
            "ok": False,
            "restored": False,
            "applied": False,
            "rolledBack": rollback["ok"],
            "stage": "apply",
            "path": str(config_path),
            "revision": rollback_revision,
            "restoredBackup": backup.name,
            "backup": current_backup.name if current_backup else None,
            "check": check,
            "reload": reload_result,
            "rollback": {**rollback, "reload": rollback_reload},
            "message": (
                "Mihomo did not apply the backup; previous config restored"
                if rollback["ok"]
                else "Mihomo did not apply the backup and rollback failed"
            ),
        }


def restore_config_backup(config_path, backup):
    try:
        if backup:
            write_text_atomic(config_path, backup.read_text(encoding="utf-8", errors="replace"))
        else:
            config_path.unlink(missing_ok=True)
        return {"ok": True}
    except Exception as error:
        return {"ok": False, "message": str(error)}


def check_mihomo_config(app_dir, text):
    binary = find_mihomo_binary(app_dir)
    if not binary:
        return {
            "ok": True,
            "available": False,
            "message": "mihomo binary not found; config check skipped",
        }

    tmp_path = None
    try:
        tmp_path = write_temp_config_for_check(app_dir, text)
        result = subprocess.run(
            [binary, "-t", "-d", str(tmp_path.parent), "-f", str(tmp_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=45,
            check=False,
        )
        output = result.stdout.decode("utf-8", "replace").strip()
        return {
            "ok": result.returncode == 0,
            "available": True,
            "message": output or ("config is valid" if result.returncode == 0 else "config check failed"),
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "available": True, "message": "config check timed out"}
    except Exception as error:
        return {"ok": False, "available": True, "message": str(error)}
    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass


def find_mihomo_binary(app_dir):
    env = get_env(app_dir)
    candidates = [
        env.get("MIHUI_MIHOMO_BIN", ""),
        "/opt/sbin/mihomo",
        "/opt/bin/mihomo",
        "/usr/bin/mihomo",
        shutil.which("mihomo") or "",
        shutil.which("clash-meta") or "",
    ]
    for candidate in candidates:
        if not candidate:
            continue
        if Path(candidate).is_file():
            return candidate
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    return ""


def write_temp_config_for_check(app_dir, text):
    config_path = get_config_path(app_dir)
    directories = [config_path.parent, Path(tempfile.gettempdir())]
    last_error = None

    for directory in directories:
        try:
            directory.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                prefix=".mihui-check-",
                suffix=".yaml",
                dir=str(directory),
                delete=False,
            ) as handle:
                handle.write(text)
                return Path(handle.name)
        except Exception as error:
            last_error = error

    raise last_error or RuntimeError("cannot create temporary config")


def mihomo_api_request(app_dir, path, method="GET", payload=None, timeout=10):
    env = get_env(app_dir)
    api = env.get("MIHUI_MIHOMO_API", "http://127.0.0.1:9090").rstrip("/")
    secret = env.get("MIHUI_MIHOMO_SECRET", "")
    headers = {}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    if secret:
        headers["Authorization"] = f"Bearer {secret}"

    request = urllib.request.Request(f"{api}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8", "replace")
    if not raw.strip():
        return {}
    return json.loads(raw)


def get_services_status(app_dir):
    return {
        "ok": True,
        "checkedAt": int(time.time()),
        "services": {
            "xkeen": get_xkeen_service_status(app_dir),
            "mihomo": get_mihomo_service_status(app_dir),
        },
    }


def get_mihomo_service_status(app_dir):
    try:
        data = mihomo_api_request(app_dir, "/version", timeout=3)
        version = str(data.get("version") or "").strip() if isinstance(data, dict) else ""
        return {
            "state": "ok",
            "message": "Mihomo отвечает",
            "detail": version,
        }
    except Exception as error:
        return {
            "state": "error",
            "message": "Mihomo не отвечает",
            "detail": str(error),
        }


def find_xkeen_binary(app_dir):
    env = get_env(app_dir)
    candidates = [
        env.get("MIHUI_XKEEN_BIN", ""),
        "/opt/bin/xkeen",
        "/opt/sbin/xkeen",
        "/usr/bin/xkeen",
        shutil.which("xkeen") or "",
    ]
    for candidate in candidates:
        if not candidate:
            continue
        if Path(candidate).is_file():
            return candidate
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    return ""


def get_xkeen_service_status(app_dir):
    binary = find_xkeen_binary(app_dir)
    if not binary:
        return {
            "state": "unavailable",
            "message": "XKeen не найден",
            "detail": "",
        }

    try:
        result = subprocess.run(
            [binary, "-status"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=XKEEN_STATUS_TIMEOUT,
            check=False,
        )
        output = result.stdout.decode("utf-8", "replace").strip()
        return {
            "state": "ok" if result.returncode == 0 else "error",
            "message": "XKeen работает" if result.returncode == 0 else "XKeen остановлен или неисправен",
            "detail": output,
        }
    except subprocess.TimeoutExpired:
        return {
            "state": "error",
            "message": "XKeen не ответил вовремя",
            "detail": "",
        }
    except Exception as error:
        return {
            "state": "error",
            "message": "Не удалось проверить XKeen",
            "detail": str(error),
        }


COMPONENT_VERSION_PATTERN = re.compile(r"^v?\d+(?:\.\d+){1,3}(?:[-._][0-9A-Za-z.-]+)?$")
ANSI_ESCAPE_PATTERN = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def strip_ansi(value):
    return ANSI_ESCAPE_PATTERN.sub("", str(value or ""))


def component_version_key(value):
    match = re.search(r"v?(\d+(?:\.\d+){1,3})", str(value or ""), re.IGNORECASE)
    if not match:
        return ()
    parts = [int(item) for item in match.group(1).split(".")]
    return tuple(parts + [0] * (4 - len(parts)))


def component_update_available(current, latest):
    current_key = component_version_key(current)
    latest_key = component_version_key(latest)
    return bool(current_key and latest_key and latest_key > current_key)


def get_xkeen_version_info(app_dir):
    binary = find_xkeen_binary(app_dir)
    if not binary:
        return {"installed": False, "version": "", "channel": "", "buildTimestamp": "", "output": ""}
    try:
        result = subprocess.run(
            [binary, "-v"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=XKEEN_STATUS_TIMEOUT,
            check=False,
        )
        output = strip_ansi(result.stdout.decode("utf-8", "replace")).strip()
    except Exception as error:
        return {"installed": True, "version": "", "channel": "", "buildTimestamp": "", "output": str(error)}

    match = re.search(
        r"\bXKeen\s+v?([0-9]+(?:\.[0-9]+){1,3})(?:\s+(Stable|Dev|Beta))?\b",
        output,
        re.IGNORECASE,
    )
    build_timestamp = normalize_xkeen_build_timestamp(output)
    return {
        "installed": True,
        "version": match.group(1) if match else "",
        "channel": match.group(2) if match and match.group(2) else "",
        "buildTimestamp": build_timestamp,
        "output": output,
    }


def normalize_xkeen_channel(value):
    channel = str(value or "").strip().lower()
    if channel == "stable":
        return "stable"
    if channel in {"beta", "dev"}:
        return "beta"
    return ""


def normalize_xkeen_build_timestamp(value):
    match = re.search(
        r"\b(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+MSK)\b",
        str(value or ""),
        re.IGNORECASE,
    )
    if not match:
        return ""
    timestamp = re.sub(r"\s+", " ", match.group(1).upper()).strip()
    try:
        datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S MSK")
    except ValueError:
        return ""
    return timestamp


def xkeen_beta_update_available(current_timestamp, latest_timestamp):
    current = normalize_xkeen_build_timestamp(current_timestamp)
    latest = normalize_xkeen_build_timestamp(latest_timestamp)
    if not latest:
        return False
    if not current:
        return True
    return latest > current


def read_mihomo_binary_version(app_dir):
    binary = find_mihomo_binary(app_dir)
    if not binary:
        return {"installed": False, "version": "", "binary": "", "output": ""}
    try:
        result = subprocess.run(
            [binary, "-v"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=5,
            check=False,
        )
        output = strip_ansi(result.stdout.decode("utf-8", "replace")).strip()
    except Exception as error:
        return {"installed": True, "version": "", "binary": binary, "output": str(error)}
    match = re.search(r"\bv?(\d+(?:\.\d+){2,3})\b", output)
    return {
        "installed": True,
        "version": match.group(1) if match else "",
        "binary": binary,
        "output": output,
    }


def fetch_component_releases(repo, limit=10):
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases?per_page={int(limit)}",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "MihUI"},
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        data = json.loads(response.read().decode("utf-8"))
    versions = []
    for item in data if isinstance(data, list) else []:
        if not isinstance(item, dict) or item.get("draft") or item.get("prerelease"):
            continue
        tag = str(item.get("tag_name") or "").strip()
        if not COMPONENT_VERSION_PATTERN.fullmatch(tag):
            continue
        versions.append(tag)
        if len(versions) >= limit:
            break
    return versions


def parse_xkeen_beta_archive(body):
    if not body or len(body) > XKEEN_BETA_ARCHIVE_MAX_BYTES:
        raise ValueError("XKeen Beta archive has an invalid size")
    try:
        archive = tarfile.open(fileobj=io.BytesIO(body), mode="r:gz")
    except tarfile.TarError as error:
        raise ValueError("XKeen Beta archive is invalid") from error

    with archive:
        member = next(
            (
                item
                for item in archive.getmembers()
                if (item.name[2:] if item.name.startswith("./") else item.name)
                == "_xkeen/01_info/01_info_variable.sh"
            ),
            None,
        )
        if not member or not member.isfile() or member.size > 64 * 1024:
            raise ValueError("XKeen Beta build metadata is missing")
        source = archive.extractfile(member)
        if source is None:
            raise ValueError("XKeen Beta build metadata is unreadable")
        text = source.read(64 * 1024 + 1).decode("utf-8", "replace")

    def assignment(name):
        match = re.search(rf"^{re.escape(name)}=[\"']([^\"']*)[\"']\s*$", text, re.MULTILINE)
        return match.group(1).strip() if match else ""

    version = assignment("xkeen_current_version")
    channel = normalize_xkeen_channel(assignment("xkeen_build"))
    build_timestamp = normalize_xkeen_build_timestamp(assignment("build_timestamp"))
    if not COMPONENT_VERSION_PATTERN.fullmatch(version) or channel != "beta" or not build_timestamp:
        raise ValueError("XKeen Beta build metadata is invalid")
    return {"version": version, "buildTimestamp": build_timestamp}


def fetch_xkeen_beta_build(repo):
    if not re.fullmatch(r"[0-9A-Za-z_.-]+/[0-9A-Za-z_.-]+", str(repo or "")):
        raise ValueError("invalid XKeen GitHub repository")
    request = urllib.request.Request(
        f"https://raw.githubusercontent.com/{repo}/main/test/xkeen.tar.gz",
        headers={"Accept": "application/octet-stream", "User-Agent": "MihUI"},
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        body = response.read(XKEEN_BETA_ARCHIVE_MAX_BYTES + 1)
    return parse_xkeen_beta_archive(body)


def get_component_release_catalog(app_dir, force=False):
    now = int(time.time())
    with component_release_cache_lock:
        checked_at = int(component_release_cache.get("checkedAt") or 0)
        if not force and checked_at and now - checked_at < COMPONENT_RELEASE_CACHE_TTL:
            return dict(component_release_cache.get("catalog") or {}), checked_at

    env = get_env(app_dir)
    repositories = {
        "xkeen": env.get("MIHUI_XKEEN_GITHUB_REPO", DEFAULT_XKEEN_GITHUB_REPO),
        "mihomo": env.get("MIHUI_MIHOMO_GITHUB_REPO", DEFAULT_MIHOMO_GITHUB_REPO),
    }

    with ThreadPoolExecutor(max_workers=3) as executor:
        release_futures = {
            name: executor.submit(fetch_component_releases, repo)
            for name, repo in repositories.items()
        }
        beta_future = executor.submit(fetch_xkeen_beta_build, repositories["xkeen"])
        catalog = {}
        for name, repo in repositories.items():
            result = {"repo": repo, "versions": [], "latest": "", "error": ""}
            try:
                versions = release_futures[name].result()
                result.update({"versions": versions, "latest": versions[0] if versions else ""})
            except Exception as error:
                result["error"] = str(error)
            catalog[name] = result
        try:
            beta = beta_future.result()
            catalog["xkeen"].update(
                {
                    "betaVersion": beta["version"],
                    "betaBuildTimestamp": beta["buildTimestamp"],
                    "betaError": "",
                }
            )
        except Exception as error:
            catalog["xkeen"].update(
                {"betaVersion": "", "betaBuildTimestamp": "", "betaError": str(error)}
            )

    with component_release_cache_lock:
        component_release_cache.update({"checkedAt": now, "catalog": catalog})
    return catalog, now


def invalidate_component_release_cache():
    with component_release_cache_lock:
        component_release_cache.update({"checkedAt": 0, "catalog": {}})


def get_components_status(app_dir, force=False):
    catalog, checked_at = get_component_release_catalog(app_dir, force=force)
    xkeen = get_xkeen_version_info(app_dir)
    mihomo = read_mihomo_binary_version(app_dir)
    xkeen_release = catalog.get("xkeen") or {}
    mihomo_release = catalog.get("mihomo") or {}
    xkeen_channel = normalize_xkeen_channel(xkeen.get("channel"))
    if xkeen_channel == "beta":
        xkeen_latest = xkeen_release.get("betaVersion") or ""
        xkeen_latest_build = xkeen_release.get("betaBuildTimestamp") or ""
        xkeen_error = xkeen_release.get("betaError") or ""
        xkeen_update = bool(
            xkeen.get("installed")
            and xkeen_beta_update_available(xkeen.get("buildTimestamp"), xkeen_latest_build)
        )
    else:
        xkeen_latest = xkeen_release.get("latest") or ""
        xkeen_latest_build = ""
        xkeen_error = xkeen_release.get("error") or ""
        xkeen_update = bool(
            xkeen.get("installed")
            and component_update_available(xkeen.get("version"), xkeen_latest)
        )
    mihomo_update = bool(
        mihomo.get("installed")
        and component_update_available(mihomo.get("version"), mihomo_release.get("latest"))
    )
    components = {
        "xkeen": {
            "installed": bool(xkeen.get("installed")),
            "current": xkeen.get("version") or "",
            "channel": "Beta" if xkeen_channel == "beta" else "Stable" if xkeen_channel == "stable" else xkeen.get("channel") or "",
            "latest": xkeen_latest,
            "buildTimestamp": xkeen.get("buildTimestamp") or "",
            "latestBuildTimestamp": xkeen_latest_build,
            "versions": xkeen_release.get("versions") or [],
            "updateAvailable": xkeen_update,
            "error": xkeen_error,
        },
        "mihomo": {
            "installed": bool(mihomo.get("installed")),
            "current": mihomo.get("version") or "",
            "channel": "",
            "latest": mihomo_release.get("latest") or "",
            "versions": mihomo_release.get("versions") or [],
            "updateAvailable": mihomo_update,
            "error": mihomo_release.get("error") or "",
        },
    }
    return {
        "ok": True,
        "checkedAt": checked_at,
        "components": components,
        "updateCount": sum(1 for item in components.values() if item["updateAvailable"]),
        "job": snapshot_component_action_state(),
    }


def validate_component_action(app_dir, payload):
    component = str((payload or {}).get("component") or "").strip().lower()
    action = str((payload or {}).get("action") or "").strip().lower()
    target = str((payload or {}).get("target") or "").strip()
    if component == "all":
        if action != "update" or target:
            raise ValueError("unsupported all-components action")
        status = get_components_status(app_dir, force=True)
        updates = []
        xkeen = status["components"]["xkeen"]
        mihomo = status["components"]["mihomo"]
        if xkeen.get("updateAvailable"):
            updates.append({"component": "xkeen", "target": ""})
        if mihomo.get("updateAvailable") and mihomo.get("latest"):
            updates.append({"component": "mihomo", "target": mihomo["latest"]})
        if not updates:
            raise ValueError("no component updates available")
        return {"component": component, "action": action, "target": "", "updates": updates}
    if component not in {"xkeen", "mihomo"}:
        raise ValueError("unsupported component")
    if component == "xkeen" and action not in {"update", "rollback", "channel", "restart", "geo-update"}:
        raise ValueError("unsupported XKeen action")
    if component == "mihomo" and action not in {"update", "restart", "geo-update"}:
        raise ValueError("unsupported Mihomo action")
    if component == "xkeen" and action == "channel":
        target = target.lower()
        if target not in {"stable", "beta"}:
            raise ValueError("invalid XKeen channel")
    elif component == "xkeen" and target:
        raise ValueError("XKeen target version is not supported")
    if component == "mihomo" and action != "update" and target:
        raise ValueError("Mihomo target is not supported for this action")
    if component == "mihomo" and action == "update":
        status = get_components_status(app_dir)
        versions = status["components"]["mihomo"].get("versions") or []
        if not target:
            target = status["components"]["mihomo"].get("latest") or ""
        if not COMPONENT_VERSION_PATTERN.fullmatch(target):
            raise ValueError("invalid Mihomo version")
        normalized_target = target.lstrip("v")
        allowed = {str(version).lstrip("v") for version in versions}
        if normalized_target not in allowed:
            raise ValueError("Mihomo version is not in the checked release list")
        target = f"v{normalized_target}"
    return {"component": component, "action": action, "target": target}


def snapshot_component_action_state():
    with component_state_lock:
        return dict(component_action_state)


def update_component_action_state(**changes):
    with component_state_lock:
        component_action_state.update(changes)


def append_component_action_output(output):
    clean = strip_ansi(output).strip()
    if not clean:
        return
    with component_state_lock:
        current = str(component_action_state.get("output") or "")
        combined = f"{current}\n{clean}".strip()
        component_action_state["output"] = combined[-12000:]


def run_component_command(command, input_text=None, timeout=COMPONENT_ACTION_TIMEOUT):
    result = subprocess.run(
        command,
        input=input_text.encode("utf-8") if input_text is not None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    output = result.stdout.decode("utf-8", "replace")
    append_component_action_output(output)
    return result.returncode, output


def require_component_command(command, message, input_text=None, timeout=COMPONENT_ACTION_TIMEOUT):
    returncode, output = run_component_command(command, input_text=input_text, timeout=timeout)
    if returncode != 0:
        detail = strip_ansi(output).strip().splitlines()
        raise RuntimeError(detail[-1] if detail else message)
    return output


def run_component_action(app_dir, request_data):
    with component_action_lock:
        try:
            component = request_data["component"]
            action = request_data["action"]
            if component == "all":
                run_all_component_updates(app_dir, request_data["updates"])
            elif component == "xkeen" and action in {"update", "rollback", "channel"}:
                run_xkeen_component_action(app_dir, action, request_data.get("target", ""))
            elif component == "xkeen":
                run_xkeen_maintenance_action(app_dir, action)
            elif action == "update":
                run_mihomo_component_update(app_dir, request_data["target"])
            else:
                run_mihomo_maintenance_action(app_dir, action)
            update_component_action_state(
                running=False,
                ok=True,
                phase="complete",
                message="Операция завершена",
                finishedAt=int(time.time()),
            )
        except Exception as error:
            append_component_action_output(str(error))
            update_component_action_state(
                running=False,
                ok=False,
                phase="failed",
                message=str(error),
                finishedAt=int(time.time()),
            )
        finally:
            invalidate_component_release_cache()


def run_all_component_updates(app_dir, updates):
    total = len(updates)
    for index, item in enumerate(updates, start=1):
        component = item["component"]
        label = "XKeen" if component == "xkeen" else "Mihomo"
        append_component_action_output(f"=== {label} ({index}/{total}) ===")
        update_component_action_state(
            phase="install",
            message=f"Обновляем {label} ({index} из {total})",
        )
        if component == "xkeen":
            run_xkeen_component_action(app_dir, "update")
        else:
            run_mihomo_component_update(app_dir, item["target"])


def run_xkeen_component_action(app_dir, action, target=""):
    binary = find_xkeen_binary(app_dir)
    if not binary:
        raise RuntimeError("XKeen не найден")
    was_running = get_xkeen_service_status(app_dir).get("state") == "ok"

    if action == "rollback":
        update_component_action_state(phase="rollback", message="Восстанавливаем последнюю копию XKeen")
        require_component_command([binary, "-kbr"], "Не удалось восстановить XKeen")
        run_component_command([binary, "-rrk"], timeout=180)
        if was_running:
            run_component_command([binary, "-start"], timeout=180)
        if not get_xkeen_version_info(app_dir).get("version"):
            raise RuntimeError("Не удалось проверить XKeen после восстановления")
        return

    current_channel = normalize_xkeen_channel(get_xkeen_version_info(app_dir).get("channel"))
    if action == "channel" and target == current_channel:
        raise RuntimeError("Выбранный канал XKeen уже активен")

    update_component_action_state(phase="backup", message="Создаём резервную копию XKeen")
    require_component_command([binary, "-kb"], "Не удалось создать резервную копию XKeen", timeout=180)
    try:
        if action == "channel":
            channel_label = "Stable" if target == "stable" else "Beta"
            update_component_action_state(phase="channel", message=f"Переключаем XKeen на канал {channel_label}")
            require_component_command(
                [binary, "-channel"],
                "Не удалось переключить канал XKeen",
                input_text="1\n",
                timeout=180,
            )
        update_component_action_state(phase="install", message="Обновляем XKeen")
        require_component_command([binary, "-uk"], "Не удалось обновить XKeen")
        update_component_action_state(phase="verify", message="Проверяем XKeen")
        version_info = get_xkeen_version_info(app_dir)
        if not version_info.get("version"):
            raise RuntimeError("Не удалось проверить версию XKeen")
        if action == "channel" and normalize_xkeen_channel(version_info.get("channel")) != target:
            raise RuntimeError("XKeen не переключился на выбранный канал")
        if was_running and get_xkeen_service_status(app_dir).get("state") != "ok":
            raise RuntimeError("XKeen не запустился после обновления")
    except Exception as error:
        update_component_action_state(phase="rollback", message="Обновление не удалось, восстанавливаем XKeen")
        rollback_code, _ = run_component_command([binary, "-kbr"], timeout=180)
        run_component_command([binary, "-rrk"], timeout=180)
        if was_running:
            run_component_command([binary, "-start"], timeout=180)
        if rollback_code != 0:
            raise RuntimeError(f"{error}; автоматическое восстановление XKeen не удалось") from error
        raise


def run_xkeen_maintenance_action(app_dir, action):
    binary = find_xkeen_binary(app_dir)
    if not binary:
        raise RuntimeError("XKeen не найден")
    was_running = get_xkeen_service_status(app_dir).get("state") == "ok"
    if action == "restart":
        update_component_action_state(phase="restart", message="Перезапускаем XKeen")
        require_component_command([binary, "-restart"], "Не удалось перезапустить XKeen", timeout=180)
    elif action == "geo-update":
        update_component_action_state(phase="geo-update", message="Обновляем GeoFile/GeoIPSET XKeen")
        require_component_command([binary, "-ug"], "Не удалось обновить GeoFile/GeoIPSET", timeout=600)
    else:
        raise RuntimeError("Неподдерживаемая операция XKeen")
    if was_running and get_xkeen_service_status(app_dir).get("state") != "ok":
        raise RuntimeError("XKeen не работает после операции")


def wait_for_mihomo_service(app_dir, attempts=10):
    for attempt in range(attempts):
        if get_mihomo_service_status(app_dir).get("state") == "ok":
            return True
        if attempt + 1 < attempts:
            time.sleep(1)
    return False


def run_mihomo_maintenance_action(app_dir, action):
    if not find_mihomo_binary(app_dir):
        raise RuntimeError("Mihomo не найден")
    payload = {"path": "", "payload": ""}
    if action == "restart":
        update_component_action_state(phase="restart", message="Перезапускаем ядро Mihomo")
        mihomo_api_request(app_dir, "/restart", method="POST", payload=payload, timeout=30)
        if not wait_for_mihomo_service(app_dir):
            raise RuntimeError("Mihomo не запустился после перезапуска")
        return
    if action == "geo-update":
        update_component_action_state(phase="geo-update", message="Обновляем GEO-базы Mihomo")
        try:
            mihomo_api_request(app_dir, "/upgrade/geo", method="POST", payload=payload, timeout=180)
        except urllib.error.HTTPError as error:
            status = error.code
            error.close()
            if status != HTTPStatus.NOT_FOUND:
                raise
            mihomo_api_request(app_dir, "/configs/geo", method="POST", payload=payload, timeout=180)
        if get_mihomo_service_status(app_dir).get("state") != "ok":
            raise RuntimeError("Mihomo не отвечает после обновления GEO-баз")
        return
    raise RuntimeError("Неподдерживаемая операция Mihomo")


def restore_mihomo_binary(app_dir, xkeen_binary, binary_path, backup_path, was_running):
    update_component_action_state(phase="rollback", message="Восстанавливаем предыдущую версию Mihomo")
    run_component_command([xkeen_binary, "-stop"], timeout=180)
    replacement = Path(f"{binary_path}.mihui-restore")
    shutil.copy2(backup_path, replacement)
    os.replace(replacement, binary_path)
    run_component_command([xkeen_binary, "-rrm"], timeout=180)
    if was_running:
        run_component_command([xkeen_binary, "-start"], timeout=180)


def run_mihomo_component_update(app_dir, target):
    xkeen_binary = find_xkeen_binary(app_dir)
    mihomo = read_mihomo_binary_version(app_dir)
    binary_path = Path(mihomo.get("binary") or "")
    if not xkeen_binary:
        raise RuntimeError("XKeen не найден")
    if not binary_path.is_file():
        raise RuntimeError("Mihomo не найден")

    was_running = get_mihomo_service_status(app_dir).get("state") == "ok"
    Path(app_dir).mkdir(parents=True, exist_ok=True)
    backup_dir = Path(tempfile.mkdtemp(prefix="mihui-mihomo-update-", dir=str(app_dir)))
    backup_path = backup_dir / "mihomo"
    shutil.copy2(binary_path, backup_path)

    try:
        update_component_action_state(phase="backup", message="Сохраняем текущую версию Mihomo")
        update_component_action_state(phase="install", message=f"Устанавливаем Mihomo {target}")
        returncode, output = run_component_command(
            [xkeen_binary, "-um"],
            input_text=f"9\n{target}\n",
        )
        if returncode != 0:
            detail = strip_ansi(output).strip().splitlines()
            raise RuntimeError(detail[-1] if detail else "Не удалось установить Mihomo")

        update_component_action_state(phase="verify", message="Проверяем версию и запуск Mihomo")
        installed = read_mihomo_binary_version(app_dir).get("version") or ""
        if component_version_key(installed) != component_version_key(target):
            raise RuntimeError(f"Установлена неожиданная версия Mihomo: {installed or 'не определена'}")
        if was_running:
            service_ok = False
            for _ in range(10):
                if get_mihomo_service_status(app_dir).get("state") == "ok":
                    service_ok = True
                    break
                time.sleep(1)
            if not service_ok:
                raise RuntimeError("Mihomo не запустился после обновления")
    except Exception:
        restore_mihomo_binary(app_dir, xkeen_binary, binary_path, backup_path, was_running)
        raise
    finally:
        shutil.rmtree(backup_dir, ignore_errors=True)


def fetch_provider_payload(source_url, headers=None, timeout=20, append_hwid=False, depth=0, app_dir=None):
    if depth > 3:
        raise ValueError("provider landing redirect depth exceeded")

    source_url = str(source_url or "").strip()
    if not source_url:
        raise ValueError("url query parameter is required")

    parsed = urllib.parse.urlsplit(source_url)
    if parsed.scheme == "incy":
        import_payload = extract_incy_import_payload(source_url)
        if not import_payload:
            raise ValueError("incy://import does not contain a supported URL")
        kind, value = import_payload
        if kind == "body":
            return value, "text/yaml; charset=utf-8"
        return fetch_provider_payload(
            value,
            headers,
            timeout,
            append_hwid=append_hwid,
            depth=depth + 1,
            app_dir=app_dir,
        )

    if parsed.scheme not in {"http", "https"}:
        raise ValueError("provider adapter supports only http/https and incy://import URLs")
    if not parsed.netloc:
        raise ValueError("provider URL host is required")

    if append_hwid:
        source_url = append_hwid_query(source_url, headers or {})

    return fetch_http_provider_payload(
        source_url,
        headers or {},
        timeout,
        append_hwid=append_hwid,
        depth=depth,
        app_dir=app_dir,
    )


def fetch_http_provider_payload(source_url, headers, timeout, append_hwid=False, depth=0, app_dir=None):
    body, content_type = request_provider_payload_once(source_url, headers, timeout)

    landing_url = extract_landing_provider_url(body, content_type, source_url)
    if landing_url:
        return fetch_provider_payload(
            landing_url,
            headers,
            timeout,
            append_hwid=append_hwid,
            depth=depth + 1,
            app_dir=app_dir,
        )

    happ_payload = fetch_happ_landing_provider_payload(
        source_url,
        body,
        content_type,
        headers,
        timeout,
        append_hwid=append_hwid,
        depth=depth,
        app_dir=app_dir,
    )
    if happ_payload:
        return happ_payload

    return body, content_type


def request_provider_payload_once(source_url, headers, timeout):
    request = urllib.request.Request(source_url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read(PROVIDER_ADAPTER_MAX_BYTES + 1)
        content_type = response.headers.get("Content-Type") or "text/yaml; charset=utf-8"

    if len(body) > PROVIDER_ADAPTER_MAX_BYTES:
        raise ValueError("provider payload is too large")
    return body, content_type


def fetch_happ_landing_provider_payload(source_url, body, content_type, headers, timeout, append_hwid=False, depth=0, app_dir=None):
    text = body[:262144].decode("utf-8", "replace")
    if not looks_like_happ_landing_page(text, content_type):
        return None

    happ_headers = build_happ_fallback_headers(headers or {})
    happ_url = append_hwid_query(source_url, happ_headers)
    if happ_url == source_url and same_header_values(happ_headers, headers or {}):
        return None

    fallback_body, fallback_content_type = request_provider_payload_once(happ_url, happ_headers, timeout)
    landing_url = extract_landing_provider_url(fallback_body, fallback_content_type, happ_url)
    if landing_url:
        return fetch_provider_payload(
            landing_url,
            happ_headers,
            timeout,
            append_hwid=append_hwid,
            depth=depth + 1,
            app_dir=app_dir,
        )

    fallback_text = fallback_body[:262144].decode("utf-8", "replace")
    if not looks_like_landing_page(fallback_text, fallback_content_type) and (
        looks_like_provider_payload(fallback_text) or looks_like_provider_content_type(fallback_content_type)
    ):
        return fallback_body, fallback_content_type

    decoded = normalize_happ_transport_payload(fallback_body, fallback_content_type, happ_url)
    if decoded:
        kind, value = decoded
        if kind == "url":
            return fetch_provider_payload(
                value,
                happ_headers,
                timeout,
                append_hwid=append_hwid,
                depth=depth + 1,
                app_dir=app_dir,
            )
        return value, "text/yaml; charset=utf-8"

    if not looks_like_landing_page(fallback_text, fallback_content_type):
        return fallback_body, fallback_content_type
    return None


def normalize_happ_transport_result(text):
    raw = str(text or "").strip()
    if not raw:
        return None

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = None

    if isinstance(data, dict):
        for key in ("url", "uri", "link", "decryptedUrl", "decrypted_url", "subscription"):
            value = str(data.get(key) or "").strip()
            if normalize_landing_url(value, ""):
                return "url", value
        for key in ("payload", "content", "yaml", "data", "text", "body", "result", "output", "decrypted"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                nested = normalize_happ_transport_result(value)
                if nested:
                    return nested
                return "body", value.encode("utf-8")
    elif isinstance(data, str) and data.strip():
        nested = normalize_happ_transport_result(data)
        if nested:
            return nested

    result_block = extract_happ_transport_result_block(raw)
    if result_block and result_block != raw:
        nested = normalize_happ_transport_result(result_block)
        if nested:
            return nested

    lines = [line.strip() for line in raw.replace("\r", "\n").split("\n") if line.strip()]
    if len(lines) == 1:
        line = lines[0]
        if line.lower().startswith("incy://import/"):
            return "url", line
        if normalize_landing_url(line, ""):
            return "url", line

    return None


def extract_happ_transport_result_block(text):
    lines = str(text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    for index, line in enumerate(lines):
        if not re.match(r"(?i)^result\s*:?\s*$", line.strip()):
            continue
        collected = []
        for candidate in lines[index + 1:]:
            if not candidate.strip():
                if collected:
                    break
                continue
            if collected and not candidate.startswith((" ", "\t")):
                break
            collected.append(candidate.strip())
        if collected:
            return "\n".join(collected).strip()
    return ""


def append_hwid_query(source_url, headers):
    hwid = find_header_value(headers, "x-hwid")
    if not hwid:
        return source_url

    parts = urllib.parse.urlsplit(source_url)
    query = urllib.parse.parse_qs(parts.query, keep_blank_values=True)
    if "hwid" in query:
        return source_url

    query["hwid"] = [hwid]
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query, doseq=True), parts.fragment)
    )


def build_happ_fallback_headers(headers):
    result = dict(headers or {})
    user_agent = find_header_value(result, "User-Agent")
    if not user_agent.lower().startswith("happ/"):
        set_header_value(result, "User-Agent", DEFAULT_HAPP_FALLBACK_USER_AGENT)
    return result


def find_header_value(headers, name):
    expected = name.lower()
    for header_name, value in headers.items():
        if header_name.lower() == expected:
            return str(value or "")
    return ""


def set_header_value(headers, name, value):
    expected = name.lower()
    for header_name in list(headers.keys()):
        if header_name.lower() == expected:
            headers[header_name] = value
            return
    headers[name] = value


def same_header_values(left, right):
    return normalize_header_map(left) == normalize_header_map(right)


def normalize_header_map(headers):
    return {str(name).lower(): str(value or "") for name, value in (headers or {}).items()}


def extract_incy_import_payload(source_url):
    parsed = urllib.parse.urlsplit(source_url)
    query = urllib.parse.parse_qs(parsed.query)
    for key in ("url", "uri", "target", "link", "sub", "subscription"):
        value = (query.get(key) or [""])[0]
        result = normalize_happ_transport_text(value, "")
        if result:
            return result

    return normalize_happ_transport_text(urllib.parse.unquote(parsed.path.lstrip("/")), "")


def extract_incy_import_url(source_url):
    payload = extract_incy_import_payload(source_url)
    if payload and payload[0] == "url":
        return payload[1]
    return ""


def normalize_happ_transport_payload(body, content_type, base_url):
    text = body.decode("utf-8", "replace").strip()
    if not text:
        return None
    return normalize_happ_transport_text(text, base_url)


def normalize_happ_transport_text(text, base_url):
    for candidate in build_happ_transport_candidates(text):
        parsed = normalize_happ_transport_result(candidate)
        if parsed:
            return parsed

        url = normalize_landing_url(candidate, base_url)
        if url:
            return "url", url

        if looks_like_provider_payload(candidate):
            return "body", (candidate.rstrip() + "\n").encode("utf-8")
    return None


def build_happ_transport_candidates(text):
    candidates = []
    seen = set()

    def add(value):
        candidate = str(value or "").strip()
        if candidate and candidate not in seen:
            seen.add(candidate)
            candidates.append(candidate)

    add(text)
    unquoted = urllib.parse.unquote_plus(str(text or "").strip())
    add(unquoted)
    for candidate in list(candidates):
        decoded = decode_base64_text(candidate)
        if decoded:
            add(decoded)
            add(urllib.parse.unquote_plus(decoded))
    return candidates


def decode_base64_text(text):
    compact = re.sub(r"\s+", "", str(text or ""))
    if len(compact) < 8 or not re.fullmatch(r"[A-Za-z0-9_\-+/=]+", compact):
        return ""
    padded = compact + ("=" * (-len(compact) % 4))
    try:
        data = base64.urlsafe_b64decode(padded.encode("ascii"))
    except Exception:
        return ""
    if not data:
        return ""
    decoded = data.decode("utf-8", "replace").strip()
    if "\ufffd" in decoded:
        return ""
    return decoded


def looks_like_provider_payload(text):
    sample = str(text or "").lstrip()
    return bool(
        re.match(r"(?is)^(proxies|proxy-providers|payload|mixed-port|port|rules)\s*:", sample)
        or sample.startswith("{")
        or sample.startswith("[")
    )


def looks_like_provider_content_type(content_type):
    lower_type = str(content_type or "").lower()
    return "yaml" in lower_type or "json" in lower_type


def extract_landing_provider_url(body, content_type, base_url):
    text = body[:262144].decode("utf-8", "replace")
    if not looks_like_landing_page(text, content_type):
        return ""

    unescaped = html.unescape(text)
    patterns = [
        r"(?:href|data-url|data-href|url)\s*=\s*['\"]([^'\"]+)['\"]",
        r"(happ://crypt[^\s'\"<>]+|incy://import[^\s'\"<>]+)",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, unescaped, flags=re.IGNORECASE):
            candidate = normalize_landing_url(match.group(1), base_url)
            if candidate:
                return candidate
    return ""


def looks_like_landing_page(text, content_type):
    lower_type = str(content_type or "").lower()
    sample = text.lstrip().lower()
    return (
        "html" in lower_type
        or sample.startswith("<!doctype")
        or sample.startswith("<html")
        or "happ://crypt" in sample
        or "incy://import" in sample
    )


def looks_like_happ_landing_page(text, content_type):
    if not looks_like_landing_page(text, content_type):
        return False
    sample = str(text or "").lower()
    return (
        "happ" in sample
        or "incy://import" in sample
        or "happ://crypt" in sample
    )


def normalize_landing_url(value, base_url):
    candidate = urllib.parse.unquote(html.unescape(str(value or "").strip()))
    if not candidate:
        return ""
    if re.match(r"^(https?|incy)://", candidate, flags=re.IGNORECASE) or is_happ_crypt_url(candidate):
        return candidate
    if base_url and candidate.startswith(("/", "./", "../")):
        return urllib.parse.urljoin(base_url, candidate)
    return ""


def is_happ_crypt_url(value):
    return str(value or "").strip().lower().startswith("happ://crypt")


def build_provider_request_headers(incoming_headers):
    headers = {}
    for name, value in incoming_headers.items():
        lower_name = name.lower()
        if lower_name in PROVIDER_ADAPTER_BLOCKED_HEADERS or lower_name.startswith("proxy-"):
            continue
        headers[name] = value
    return headers


def is_loopback_address(value):
    host = str(value or "").strip().lower()
    return host in {"127.0.0.1", "::1", "localhost"} or host.startswith("127.")


def get_proxy_provider_statuses(app_dir):
    try:
        data = mihomo_api_request(app_dir, "/providers/proxies")
        providers = data.get("providers", data)
        if not isinstance(providers, dict):
            providers = {}
        return {
            "ok": True,
            "providers": [normalize_provider_status(name, item) for name, item in providers.items()],
        }
    except Exception as error:
        return {"ok": False, "message": str(error), "providers": []}


def update_proxy_provider(app_dir, name):
    try:
        encoded_name = urllib.parse.quote(name, safe="")
        mihomo_api_request(app_dir, f"/providers/proxies/{encoded_name}", method="PUT", timeout=30)
        return {"ok": True, "message": "provider update started"}
    except Exception as error:
        return {"ok": False, "message": str(error)}


def select_proxy_group(app_dir, group, name):
    encoded_group = urllib.parse.quote(group, safe="")
    path = f"/proxies/{encoded_group}"
    try:
        current = mihomo_api_request(app_dir, path)
    except Exception as error:
        return {"ok": False, "unavailable": True, "message": str(error)}

    group_type = str(current.get("type") or "").strip().casefold() if isinstance(current, dict) else ""
    if group_type not in {"select", "selector"}:
        return {"ok": False, "message": "group is not selectable"}

    options = current.get("all") if isinstance(current, dict) else None
    if not isinstance(options, list) or name not in options:
        return {"ok": False, "message": "proxy is not available in this group"}

    if str(current.get("now") or "") == name:
        return {"ok": True, "changed": False, "group": group, "now": name}

    try:
        mihomo_api_request(app_dir, path, method="PUT", payload={"name": name})
    except urllib.error.HTTPError as error:
        return {"ok": False, "message": str(error)}
    except Exception as error:
        return {"ok": False, "uncertain": True, "message": str(error)}

    try:
        confirmed = mihomo_api_request(app_dir, path)
    except Exception as error:
        return {"ok": False, "uncertain": True, "message": str(error)}

    confirmed_name = str(confirmed.get("now") or "") if isinstance(confirmed, dict) else ""
    if confirmed_name != name:
        return {"ok": False, "uncertain": True, "message": "Mihomo did not confirm the selected proxy"}
    return {"ok": True, "changed": True, "group": group, "now": confirmed_name}


def get_current_nodes(app_dir):
    try:
        data = mihomo_api_request(app_dir, "/providers/proxies")
        providers = data.get("providers", data)
        if not isinstance(providers, dict):
            providers = {}
        configured_names = get_config_proxy_provider_names(app_dir)
        groups = []
        groups_error = ""
        try:
            proxies_data = mihomo_api_request(app_dir, "/proxies")
            proxies = proxies_data.get("proxies", proxies_data)
            groups = normalize_current_group_selections(proxies)
        except Exception as error:
            groups_error = str(error)

        nodes = []
        provider_items = []
        for provider_name, item in providers.items():
            if not isinstance(item, dict):
                continue
            if configured_names and not is_config_proxy_provider(configured_names, provider_name, item):
                continue
            proxies = item.get("proxies")
            if not isinstance(proxies, list):
                proxies = []
            provider_items.append({"name": item.get("name") or provider_name, "nodeCount": len(proxies)})
            for proxy in proxies:
                nodes.append(normalize_current_node(item.get("name") or provider_name, proxy))

        return {"ok": True, "nodes": nodes, "providers": provider_items, "groups": groups, "groupsError": groups_error}
    except Exception as error:
        return {"ok": False, "message": str(error), "nodes": [], "providers": [], "groups": [], "groupsError": ""}


def default_resource_monitor_settings():
    return {
        "enabled": False,
        "intervalSeconds": 300,
        "failureThreshold": 2,
        "latencyThresholdMs": 400,
        "proactiveSwitchEnabled": True,
        "proactiveLatencyThresholdMs": 250,
        "minimumLatencyImprovementMs": 100,
        "quarantineSeconds": 1800,
        "maxAlternatives": 3,
        "timeoutMs": 8000,
        "services": {
            key: {"enabled": True, "group": definition["group"], "sources": []}
            for key, definition in RESOURCE_MONITOR_SERVICES.items()
        },
    }


def resource_monitor_settings_path(app_dir):
    env = get_env(app_dir)
    return Path(env.get("MIHUI_MONITOR_SETTINGS_PATH", str(Path(app_dir) / "resource-monitor.json")))


def resource_monitor_runtime_path(app_dir):
    env = get_env(app_dir)
    return Path(env.get("MIHUI_MONITOR_RUNTIME_PATH", str(Path(app_dir) / "resource-monitor-runtime.json")))


def resource_monitor_log_path(app_dir):
    env = get_env(app_dir)
    return Path(env.get("MIHUI_MONITOR_LOG_PATH", str(Path(app_dir) / "resource-monitor.jsonl")))


def read_json_file(path, fallback):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return fallback
    return data if isinstance(data, dict) else fallback


def write_json_atomic(path, payload):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(str(temporary), str(target))


def load_resource_monitor_settings(app_dir):
    defaults = default_resource_monitor_settings()
    saved = read_json_file(resource_monitor_settings_path(app_dir), {})
    merged = dict(defaults)
    for key in (
        "enabled",
        "intervalSeconds",
        "failureThreshold",
        "latencyThresholdMs",
        "proactiveSwitchEnabled",
        "proactiveLatencyThresholdMs",
        "minimumLatencyImprovementMs",
        "quarantineSeconds",
        "maxAlternatives",
        "timeoutMs",
    ):
        if key in saved:
            merged[key] = saved[key]

    saved_services = saved.get("services")
    if isinstance(saved_services, dict):
        services = {}
        for key, service_defaults in defaults["services"].items():
            item = saved_services.get(key)
            services[key] = dict(service_defaults)
            if isinstance(item, dict):
                if "enabled" in item:
                    services[key]["enabled"] = item["enabled"]
                if "group" in item:
                    services[key]["group"] = item["group"]
                if "sources" in item:
                    services[key]["sources"] = item["sources"]
        merged["services"] = services

    try:
        return validate_resource_monitor_settings(merged)
    except (TypeError, ValueError):
        return defaults


def validate_resource_monitor_settings(payload):
    if not isinstance(payload, dict):
        raise TypeError("settings must be an object")

    ranges = {
        "intervalSeconds": (60, 3600),
        "failureThreshold": (1, 5),
        "latencyThresholdMs": (100, 5000),
        "proactiveLatencyThresholdMs": (100, 4999),
        "minimumLatencyImprovementMs": (25, 2000),
        "quarantineSeconds": (60, 86400),
        "maxAlternatives": (1, 5),
        "timeoutMs": (1000, 30000),
    }
    result = {
        "enabled": bool(payload.get("enabled", False)),
        "proactiveSwitchEnabled": bool(payload.get("proactiveSwitchEnabled", True)),
    }
    for key, (minimum, maximum) in ranges.items():
        value = payload.get(key)
        if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
            raise ValueError(f"{key} must be between {minimum} and {maximum}")
        result[key] = value

    if result["proactiveLatencyThresholdMs"] >= result["latencyThresholdMs"]:
        raise ValueError("proactiveLatencyThresholdMs must be below latencyThresholdMs")

    services = payload.get("services")
    if not isinstance(services, dict):
        raise ValueError("services must be an object")
    unknown = set(services) - set(RESOURCE_MONITOR_SERVICES)
    if unknown:
        raise ValueError("unknown services: " + ", ".join(sorted(unknown)))

    normalized_services = {}
    for key, definition in RESOURCE_MONITOR_SERVICES.items():
        item = services.get(key)
        if not isinstance(item, dict):
            raise ValueError(f"service {key} is required")
        group = str(item.get("group") or "").strip()
        if not group:
            raise ValueError(f"group is required for {key}")
        sources = item.get("sources", [])
        if not isinstance(sources, list):
            raise ValueError(f"sources must be an array for {key}")
        normalized_sources = []
        for source in sources:
            if not isinstance(source, str):
                raise ValueError(f"source names must be strings for {key}")
            name = source.strip()
            if not name:
                raise ValueError(f"source names must not be empty for {key}")
            if name not in normalized_sources:
                normalized_sources.append(name)
        normalized_services[key] = {
            "enabled": bool(item.get("enabled", True)),
            "group": group,
            "sources": normalized_sources,
        }
    if result["enabled"] and not any(item["enabled"] for item in normalized_services.values()):
        raise ValueError("at least one service must be enabled")
    result["services"] = normalized_services
    return result


def save_resource_monitor_settings(app_dir, settings):
    write_json_atomic(resource_monitor_settings_path(app_dir), settings)


def default_resource_monitor_runtime():
    return {
        "lastCycleAt": None,
        "services": {
            key: {
                "state": "idle",
                "currentNode": "",
                "checkedAt": None,
                "delay": None,
                "consecutiveFailures": 0,
                "consecutiveSlowChecks": 0,
                "priorityRecoveryCandidate": "",
                "priorityRecoveryChecks": 0,
                "message": "Проверка ещё не выполнялась",
                "lastSwitch": None,
                "quarantine": {},
            }
            for key in RESOURCE_MONITOR_SERVICES
        },
    }


def load_resource_monitor_runtime(app_dir):
    defaults = default_resource_monitor_runtime()
    saved = read_json_file(resource_monitor_runtime_path(app_dir), {})
    runtime = {"lastCycleAt": saved.get("lastCycleAt"), "services": {}}
    saved_services = saved.get("services")
    if not isinstance(saved_services, dict):
        saved_services = {}
    for key, service_defaults in defaults["services"].items():
        item = saved_services.get(key)
        runtime["services"][key] = dict(service_defaults)
        if isinstance(item, dict):
            for field in service_defaults:
                if field in item:
                    runtime["services"][key][field] = item[field]
        if not isinstance(runtime["services"][key].get("quarantine"), dict):
            runtime["services"][key]["quarantine"] = {}
    return runtime


def save_resource_monitor_runtime(app_dir, runtime):
    write_json_atomic(resource_monitor_runtime_path(app_dir), runtime)


def read_resource_monitor_events(app_dir, limit=RESOURCE_MONITOR_EVENT_LIMIT):
    path = resource_monitor_log_path(app_dir)
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []

    events = []
    for line in lines[-max(1, int(limit)):]:
        try:
            event = json.loads(line)
        except (TypeError, ValueError):
            continue
        if isinstance(event, dict):
            events.append(event)
    return events


def append_resource_monitor_event(app_dir, service, event_type, message, **details):
    path = resource_monitor_log_path(app_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    event = {
        "at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "timestamp": int(time.time()),
        "service": service,
        "type": event_type,
        "message": message,
    }
    event.update(details)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")

    try:
        if path.stat().st_size > RESOURCE_MONITOR_LOG_MAX_BYTES:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            path.write_text("\n".join(lines[-RESOURCE_MONITOR_EVENT_LIMIT:]) + "\n", encoding="utf-8")
    except OSError:
        pass


def snapshot_resource_monitor_job():
    with resource_monitor_state_lock:
        return dict(resource_monitor_job_state)


def get_resource_monitor_readiness(app_dir, settings=None):
    config = settings or load_resource_monitor_settings(app_dir)
    items = {}
    try:
        data = mihomo_api_request(app_dir, "/proxies", timeout=4)
        proxies = data.get("proxies", data)
        if not isinstance(proxies, dict):
            proxies = {}
    except Exception as error:
        return {
            "ready": False,
            "message": str(error),
            "services": {
                key: {"ready": False, "group": item["group"], "message": "Mihomo недоступен"}
                for key, item in config["services"].items()
                if item["enabled"]
            },
        }

    ready = True
    for key, item in config["services"].items():
        if not item["enabled"]:
            continue
        group_name = item["group"]
        group = proxies.get(group_name)
        group_type = str(group.get("type") or "").strip().casefold() if isinstance(group, dict) else ""
        options = group.get("all") if isinstance(group, dict) else None
        allowed = resource_monitor_source_nodes(item, proxies)
        item_ready = (
            group_type in {"select", "selector"}
            and isinstance(options, list)
            and any(
                is_resource_monitor_node_candidate(option, proxies)
                and (allowed is None or str(option or "") in allowed)
                for option in options
            )
        )
        if not item_ready:
            ready = False
        items[key] = {
            "ready": item_ready,
            "group": group_name,
            "message": "" if item_ready else "Нужна непустая группа select",
        }
    return {"ready": ready, "message": "" if ready else "Не все группы готовы", "services": items}


def get_resource_monitor_status(app_dir):
    config = load_resource_monitor_settings(app_dir)
    return {
        "ok": True,
        "config": config,
        "runtime": load_resource_monitor_runtime(app_dir),
        "events": read_resource_monitor_events(app_dir),
        "readiness": get_resource_monitor_readiness(app_dir, config),
        "job": snapshot_resource_monitor_job(),
    }


def load_resource_monitor_proxies(app_dir):
    data = mihomo_api_request(app_dir, "/proxies", timeout=5)
    proxies = data.get("proxies", data)
    if not isinstance(proxies, dict):
        raise RuntimeError("Mihomo returned an invalid proxy list")
    proxies = dict(proxies)

    try:
        provider_data = mihomo_api_request(app_dir, "/providers/proxies", timeout=5)
        providers = provider_data.get("providers", provider_data)
        if not isinstance(providers, dict):
            return proxies
        for provider_name, provider in providers.items():
            provider_proxies = provider.get("proxies") if isinstance(provider, dict) else None
            if not isinstance(provider_proxies, list):
                continue
            for proxy in provider_proxies:
                if not isinstance(proxy, dict):
                    continue
                name = str(proxy.get("name") or "")
                if name and name not in proxies:
                    proxies[name] = {**proxy, "_mihui_provider": str(provider_name)}
                elif name and isinstance(proxies.get(name), dict):
                    proxy_type = str(proxies[name].get("type") or "").strip().casefold()
                    if proxy_type in RESOURCE_MONITOR_GROUP_TYPES:
                        continue
                    merged = {**proxies[name], "_mihui_provider": str(provider_name)}
                    provider_delay = get_proxy_delay(proxy)
                    if provider_delay is not None:
                        merged["delay"] = provider_delay
                    proxies[name] = merged
    except Exception:
        pass

    return proxies


def resource_monitor_delay(app_dir, node, endpoint, timeout_ms, proxy=None):
    encoded_node = urllib.parse.quote(node, safe="")
    provider = str(proxy.get("_mihui_provider") or "") if isinstance(proxy, dict) else ""
    query_params = {"url": endpoint["url"], "timeout": timeout_ms}
    if provider:
        encoded_provider = urllib.parse.quote(provider, safe="")
        path = f"/providers/proxies/{encoded_provider}/{encoded_node}/healthcheck"
    else:
        query_params["expected"] = endpoint["expected"]
        path = f"/proxies/{encoded_node}/delay"
    query = urllib.parse.urlencode(query_params)
    data = mihomo_api_request(
        app_dir,
        f"{path}?{query}",
        timeout=max(2, int(timeout_ms / 1000) + 2),
    )
    delay = data.get("delay") if isinstance(data, dict) else None
    if isinstance(delay, bool) or not isinstance(delay, (int, float)) or delay < 0:
        raise RuntimeError("Mihomo did not return a valid delay")
    return int(delay)


def probe_resource_node(app_dir, service, node, timeout_ms, proxies=None):
    delays = []
    proxy = proxies.get(node) if isinstance(proxies, dict) else None
    for endpoint in RESOURCE_MONITOR_SERVICES[service]["endpoints"]:
        try:
            delays.append(resource_monitor_delay(app_dir, node, endpoint, timeout_ms, proxy))
        except Exception as error:
            return {
                "ok": False,
                "delay": None,
                "message": f"{urllib.parse.urlsplit(endpoint['url']).hostname}: {error}",
            }
    return {"ok": True, "delay": max(delays) if delays else None, "message": ""}


def resource_monitor_group_leaf_nodes(group_name, proxies, visiting=None):
    name = str(group_name or "")
    if not name:
        return []
    path = set(visiting or ())
    if name in path:
        return []
    path.add(name)
    proxy = proxies.get(name)
    proxy_type = str(proxy.get("type") or "").strip().casefold() if isinstance(proxy, dict) else ""
    if proxy_type not in RESOURCE_MONITOR_GROUP_TYPES:
        return [name] if is_resource_monitor_node_candidate(name, proxies) else []
    options = proxy.get("all") if isinstance(proxy, dict) else None
    if not isinstance(options, list):
        return []
    nodes = []
    for option in options:
        option_name = str(option or "")
        for node in resource_monitor_group_leaf_nodes(option_name, proxies, path):
            if node not in nodes:
                nodes.append(node)
    return nodes


def resource_monitor_source_tiers(service_settings, proxies):
    source_names = service_settings.get("sources") if isinstance(service_settings, dict) else None
    if not isinstance(source_names, list) or not source_names:
        return None
    tiers = []
    assigned = set()
    for source_name in source_names:
        normalized_source = str(source_name or "")
        source = proxies.get(normalized_source)
        options = source.get("all") if isinstance(source, dict) else None
        nested = (
            isinstance(options, list)
            and any(
                str((proxies.get(str(option or "")) or {}).get("type") or "").strip().casefold()
                in RESOURCE_MONITOR_GROUP_TYPES
                for option in options
                if isinstance(proxies.get(str(option or "")), dict)
            )
        )
        entries = options if nested and isinstance(options, list) else [normalized_source]
        for entry in entries:
            tier_name = str(entry or "")
            nodes = [
                node
                for node in resource_monitor_group_leaf_nodes(tier_name, proxies)
                if node not in assigned
            ]
            if not nodes:
                continue
            assigned.update(nodes)
            tiers.append({"name": tier_name, "nodes": set(nodes)})
    return tiers


def resource_monitor_source_nodes(service_settings, proxies):
    tiers = resource_monitor_source_tiers(service_settings, proxies)
    if tiers is None:
        return None
    allowed = set()
    for tier in tiers:
        allowed.update(tier["nodes"])
    return allowed


def resource_monitor_node_tier_index(node, tiers):
    if tiers is None:
        return 0
    for index, tier in enumerate(tiers):
        if node in tier["nodes"]:
            return index
    return None


def resource_monitor_candidate_tiers(group, proxies, current, quarantine, limit, tiers):
    if tiers is None:
        return [
            {
                "name": "",
                "nodes": None,
                "candidates": resource_monitor_candidates(
                    group,
                    proxies,
                    current,
                    quarantine,
                    limit,
                ),
            }
        ]
    return [
        {
            "name": tier["name"],
            "nodes": tier["nodes"],
            "candidates": resource_monitor_candidates(
                group,
                proxies,
                current,
                quarantine,
                limit,
                tier["nodes"],
            ),
        }
        for tier in tiers
    ]


def resource_monitor_candidates(group, proxies, current, quarantine, limit, allowed=None):
    now = int(time.time())
    candidates = []
    options = group.get("all") if isinstance(group, dict) else []
    if not isinstance(options, list):
        return []
    for order, option in enumerate(options):
        name = str(option or "")
        if not name or name == current or name.upper() in RESOURCE_MONITOR_BUILTINS:
            continue
        until = quarantine.get(name)
        if isinstance(until, (int, float)) and int(until) > now:
            continue
        if not is_resource_monitor_node_candidate(name, proxies):
            continue
        if allowed is not None and name not in allowed:
            continue
        proxy = proxies.get(name, {})
        known_delay = get_proxy_delay(proxy)
        candidates.append((known_delay if known_delay is not None else 10**9, order, name))
    candidates.sort()
    return [name for _, _, name in candidates[:limit]]


def select_resource_monitor_fastest_nodes(app_dir, settings, proxies):
    results = {}
    ok = True
    for service, service_settings in settings["services"].items():
        if not service_settings["enabled"]:
            continue
        group_name = service_settings["group"]
        group = proxies.get(group_name)
        options = group.get("all") if isinstance(group, dict) else []
        tiers = resource_monitor_source_tiers(service_settings, proxies)
        candidate_tiers = resource_monitor_candidate_tiers(
            group,
            proxies,
            "",
            {},
            len(options) if isinstance(options, list) else 0,
            tiers,
        )
        candidates = next(
            (tier["candidates"] for tier in candidate_tiers if tier["candidates"]),
            [],
        )
        selected = candidates[0] if candidates else ""
        selected_proxy = proxies.get(selected)
        current = str(group.get("now") or "") if isinstance(group, dict) else ""
        selected_delay = get_proxy_delay(selected_proxy) if isinstance(selected_proxy, dict) else None
        allowed = resource_monitor_source_nodes(service_settings, proxies)
        current_allowed = allowed is None or current in allowed
        if not selected or (selected_delay is None and current_allowed):
            results[service] = {"ok": True, "changed": False, "now": current}
            continue
        if current == selected:
            results[service] = {"ok": True, "changed": False, "now": selected}
            continue

        result = select_proxy_group(app_dir, group_name, selected)
        results[service] = result
        if result["ok"]:
            group["now"] = selected
        else:
            ok = False
    return {"ok": ok, "services": results}


def refresh_resource_monitor_provider_delays(app_dir, settings, proxies, services=None):
    selected_services = set(services or settings["services"])
    monitored_nodes = set()
    for service, service_settings in settings["services"].items():
        if service not in selected_services or not service_settings["enabled"]:
            continue
        group = proxies.get(service_settings["group"])
        options = group.get("all") if isinstance(group, dict) else None
        allowed = resource_monitor_source_nodes(service_settings, proxies)
        if isinstance(options, list):
            monitored_nodes.update(
                str(option or "")
                for option in options
                if allowed is None or str(option or "") in allowed
            )

    data = mihomo_api_request(app_dir, "/providers/proxies", timeout=5)
    providers = data.get("providers", data)
    if not isinstance(providers, dict):
        raise RuntimeError("Mihomo returned an invalid provider list")

    checked = []
    timeout = max(10, int(settings["timeoutMs"] / 1000) + 10)
    for provider_name, provider in providers.items():
        provider_nodes = provider.get("proxies") if isinstance(provider, dict) else None
        if not isinstance(provider_nodes, list):
            continue
        names = {
            str(proxy.get("name") or "")
            for proxy in provider_nodes
            if isinstance(proxy, dict)
        }
        if not monitored_nodes.intersection(names):
            continue
        encoded_provider = urllib.parse.quote(str(provider_name), safe="")
        try:
            mihomo_api_request(
                app_dir,
                f"/providers/proxies/{encoded_provider}/healthcheck",
                timeout=timeout,
            )
        except Exception:
            continue
        checked.append(str(provider_name))
    return checked


def run_resource_monitor_startup_cycle(app_dir):
    settings = load_resource_monitor_settings(app_dir)
    if not settings["enabled"]:
        return {"ok": True, "selection": {"ok": True, "services": {}}, "runtime": None}

    proxies = load_resource_monitor_proxies(app_dir)
    try:
        refresh_resource_monitor_provider_delays(app_dir, settings, proxies)
    except Exception:
        pass
    proxies = load_resource_monitor_proxies(app_dir)
    selection = select_resource_monitor_fastest_nodes(app_dir, settings, proxies)
    runtime = run_resource_monitor_cycle(app_dir, proxies=proxies)
    return {"ok": selection["ok"], "selection": selection, "runtime": runtime}


def is_resource_monitor_node_candidate(name, proxies):
    normalized_name = str(name or "")
    if not normalized_name or normalized_name.upper() in RESOURCE_MONITOR_BUILTINS:
        return False
    proxy = proxies.get(normalized_name)
    if proxy is None:
        return True
    if not isinstance(proxy, dict):
        return False
    proxy_type = str(proxy.get("type") or "").strip().casefold()
    return proxy_type not in RESOURCE_MONITOR_GROUP_TYPES and proxy.get("alive") is not False


def mark_resource_monitor_drift(app_dir, runtime, service, group_name, message):
    item = runtime["services"][service]
    if item.get("state") != "needs_sync" or item.get("message") != message:
        append_resource_monitor_event(
            app_dir,
            service,
            "config_drift",
            message,
            group=group_name,
        )
    item.update(
        {
            "state": "needs_sync",
            "checkedAt": int(time.time()),
            "delay": None,
            "message": message,
        }
    )


def switch_resource_monitor_node(
    app_dir,
    settings,
    item,
    service,
    group_name,
    current,
    selected,
    delay,
    reason,
    quarantine,
    previous_delay=None,
    threshold=None,
    quarantine_current=True,
):
    selection = select_proxy_group(app_dir, group_name, selected)
    if not selection["ok"]:
        item["message"] = selection.get("message") or "Mihomo не подтвердил переключение"
        append_resource_monitor_event(
            app_dir,
            service,
            "switch_failed",
            item["message"],
            node=current,
            target=selected,
        )
        return False

    switched_at = int(time.time())
    if quarantine_current:
        quarantine[current] = switched_at + settings["quarantineSeconds"]
    item.update(
        {
            "state": "available",
            "currentNode": selected,
            "delay": delay,
            "consecutiveFailures": 0,
            "consecutiveSlowChecks": 0,
            "priorityRecoveryCandidate": "",
            "priorityRecoveryChecks": 0,
            "message": "Ресурс доступен",
            "lastSwitch": {
                "at": switched_at,
                "from": current,
                "to": selected,
                "reason": reason,
            },
            "quarantine": quarantine,
        }
    )
    event = {
        "node": selected,
        "previousNode": current,
        "delay": delay,
        "previousDelay": previous_delay,
        "threshold": threshold,
        "reason": reason,
    }
    if quarantine_current:
        event["quarantineUntil"] = quarantine[current]
    append_resource_monitor_event(
        app_dir,
        service,
        "switch",
        f"Нода переключена: {current} → {selected}",
        **event,
    )
    return True


def run_resource_monitor_service(app_dir, settings, runtime, service, proxies):
    service_settings = settings["services"][service]
    group_name = service_settings["group"]
    group = proxies.get(group_name)
    group_type = str(group.get("type") or "").strip().casefold() if isinstance(group, dict) else ""
    options = group.get("all") if isinstance(group, dict) else None
    tiers = resource_monitor_source_tiers(service_settings, proxies)
    allowed = resource_monitor_source_nodes(service_settings, proxies)
    if (
        group_type not in {"select", "selector"}
        or not isinstance(options, list)
        or not any(
            is_resource_monitor_node_candidate(option, proxies)
            and (allowed is None or str(option or "") in allowed)
            for option in options
        )
    ):
        mark_resource_monitor_drift(
            app_dir,
            runtime,
            service,
            group_name,
            f"Группа {group_name} отсутствует или не готова",
        )
        return

    item = runtime["services"][service]
    now = int(time.time())
    quarantine = {
        name: int(until)
        for name, until in item.get("quarantine", {}).items()
        if isinstance(until, (int, float)) and int(until) > now
    }
    item["quarantine"] = quarantine
    current = str(group.get("now") or "")
    current_tier_index = resource_monitor_node_tier_index(current, tiers)
    item["currentNode"] = current
    item["checkedAt"] = now
    if not current:
        mark_resource_monitor_drift(app_dir, runtime, service, group_name, f"В группе {group_name} не выбрана нода")
        return

    previous_state = item.get("state")
    previous_slow_checks = int(item.get("consecutiveSlowChecks") or 0)
    result = (
        probe_resource_node(app_dir, service, current, settings["timeoutMs"], proxies)
        if allowed is None or current in allowed
        else {
            "ok": False,
            "delay": None,
            "message": "Текущая нода не входит в выбранные группы-источники",
        }
    )
    failover_timeout_ms = min(settings["timeoutMs"], RESOURCE_MONITOR_FAILOVER_TIMEOUT_MS)
    failures = int(item.get("consecutiveFailures") or 0)
    while not result["ok"]:
        item["consecutiveSlowChecks"] = 0
        failures = min(settings["failureThreshold"], failures + 1)
        item.update(
            {
                "state": "warning" if failures < settings["failureThreshold"] else "error",
                "delay": None,
                "consecutiveFailures": failures,
                "message": result["message"],
            }
        )
        append_resource_monitor_event(
            app_dir,
            service,
            "failure",
            f"Проверка не пройдена ({failures}/{settings['failureThreshold']})",
            node=current,
            detail=result["message"],
        )
        if failures >= settings["failureThreshold"]:
            break
        result = probe_resource_node(app_dir, service, current, failover_timeout_ms, proxies)

    latency_switch = False
    proactive_switch = False
    latency_threshold = None
    switch_reason = result["message"]
    if result["ok"]:
        current_delay = int(result["delay"])
        if tiers is not None and isinstance(current_tier_index, int) and current_tier_index > 0:
            preferred_tiers = resource_monitor_candidate_tiers(
                group,
                proxies,
                current,
                quarantine,
                settings["maxAlternatives"],
                tiers[:current_tier_index],
            )
            preferred = None
            for tier in preferred_tiers:
                for candidate in tier["candidates"]:
                    candidate_result = probe_resource_node(
                        app_dir,
                        service,
                        candidate,
                        settings["timeoutMs"],
                        proxies,
                    )
                    if candidate_result["ok"]:
                        preferred = (
                            tier["name"],
                            candidate,
                            int(candidate_result["delay"]),
                        )
                        break
                if preferred:
                    break

            if preferred:
                preferred_group, preferred_node, preferred_delay = preferred
                recovery_key = f"{preferred_group}\n{preferred_node}"
                recovery_checks = (
                    int(item.get("priorityRecoveryChecks") or 0) + 1
                    if item.get("priorityRecoveryCandidate") == recovery_key
                    else 1
                )
                item["priorityRecoveryCandidate"] = recovery_key
                item["priorityRecoveryChecks"] = recovery_checks
                if recovery_checks < RESOURCE_MONITOR_PRIORITY_RECOVERY_THRESHOLD:
                    item.update(
                        {
                            "state": "available",
                            "delay": current_delay,
                            "consecutiveFailures": 0,
                            "consecutiveSlowChecks": 0,
                            "message": (
                                f"Проверяется возврат к {preferred_group} "
                                f"({recovery_checks}/{RESOURCE_MONITOR_PRIORITY_RECOVERY_THRESHOLD})"
                            ),
                        }
                    )
                    if previous_slow_checks > 0:
                        append_resource_monitor_event(
                            app_dir,
                            service,
                            "latency_recovered",
                            f"{RESOURCE_MONITOR_SERVICES[service]['title']}: задержка нормализовалась",
                            node=current,
                            delay=current_delay,
                        )
                    elif previous_state in {"warning", "error", "needs_sync"}:
                        append_resource_monitor_event(
                            app_dir,
                            service,
                            "recovered",
                            f"{RESOURCE_MONITOR_SERVICES[service]['title']} снова доступен",
                            node=current,
                            delay=current_delay,
                        )
                    return
                switch_resource_monitor_node(
                    app_dir,
                    settings,
                    item,
                    service,
                    group_name,
                    current,
                    preferred_node,
                    preferred_delay,
                    f"Возврат к приоритетной группе {preferred_group}",
                    quarantine,
                    previous_delay=current_delay,
                    quarantine_current=False,
                )
                return

            item["priorityRecoveryCandidate"] = ""
            item["priorityRecoveryChecks"] = 0
        else:
            item["priorityRecoveryCandidate"] = ""
            item["priorityRecoveryChecks"] = 0

        critical_latency = current_delay > settings["latencyThresholdMs"]
        last_switch = item.get("lastSwitch")
        proactive_cooldown = (
            isinstance(last_switch, dict)
            and isinstance(last_switch.get("at"), (int, float))
            and int(last_switch["at"]) + settings["quarantineSeconds"] > now
        )
        proactive_latency = (
            settings["proactiveSwitchEnabled"]
            and not proactive_cooldown
            and settings["proactiveLatencyThresholdMs"] <= current_delay
            and not critical_latency
        )
        if not critical_latency and not proactive_latency:
            item.update(
                {
                    "state": "available",
                    "delay": current_delay,
                    "consecutiveFailures": 0,
                    "consecutiveSlowChecks": 0,
                    "message": "Ресурс доступен",
                }
            )
            if previous_slow_checks > 0:
                append_resource_monitor_event(
                    app_dir,
                    service,
                    "latency_recovered",
                    f"{RESOURCE_MONITOR_SERVICES[service]['title']}: задержка нормализовалась",
                    node=current,
                    delay=current_delay,
                )
            elif previous_state in {"warning", "error", "needs_sync"}:
                append_resource_monitor_event(
                    app_dir,
                    service,
                    "recovered",
                    f"{RESOURCE_MONITOR_SERVICES[service]['title']} снова доступен",
                    node=current,
                    delay=current_delay,
                )
            return

        slow_checks = previous_slow_checks + 1
        latency_label = "Высокая задержка" if critical_latency else "Повышенная задержка"
        latency_threshold = (
            settings["latencyThresholdMs"]
            if critical_latency
            else settings["proactiveLatencyThresholdMs"]
        )
        item.update(
            {
                "state": "warning",
                "delay": current_delay,
                "consecutiveFailures": 0,
                "consecutiveSlowChecks": slow_checks,
                "message": f"{latency_label}: {current_delay} мс",
            }
        )
        append_resource_monitor_event(
            app_dir,
            service,
            "high_latency",
            f"{latency_label}: {current_delay} мс ({slow_checks}/{RESOURCE_MONITOR_SLOW_CHECK_THRESHOLD})",
            node=current,
            delay=current_delay,
            threshold=latency_threshold,
        )
        if slow_checks < RESOURCE_MONITOR_SLOW_CHECK_THRESHOLD:
            return
        latency_switch = True
        proactive_switch = proactive_latency
        switch_reason = (
            f"Упреждающая замена: {current_delay} мс"
            if proactive_switch
            else f"Высокая задержка: {current_delay} мс"
        )

    if not result["ok"]:
        try:
            refresh_resource_monitor_provider_delays(
                app_dir,
                settings,
                proxies,
                services=[service],
            )
            refreshed_proxies = load_resource_monitor_proxies(app_dir)
            refreshed_group = refreshed_proxies.get(group_name)
            if isinstance(refreshed_group, dict):
                proxies = refreshed_proxies
                group = refreshed_group
                tiers = resource_monitor_source_tiers(service_settings, proxies)
                allowed = resource_monitor_source_nodes(service_settings, proxies)
        except Exception:
            pass

    candidate_tiers = resource_monitor_candidate_tiers(
        group,
        proxies,
        current,
        quarantine,
        settings["maxAlternatives"],
        tiers,
    )
    if latency_switch and tiers is not None:
        refreshed_tier_index = resource_monitor_node_tier_index(current, tiers)
        candidate_tiers = (
            [candidate_tiers[refreshed_tier_index]]
            if isinstance(refreshed_tier_index, int) and refreshed_tier_index < len(candidate_tiers)
            else []
        )
    if proactive_switch:
        for tier in candidate_tiers:
            tier["candidates"] = tier["candidates"][:1]
    candidates = [
        candidate
        for tier in candidate_tiers
        for candidate in tier["candidates"]
    ]
    successful = []
    candidate_timeout_ms = settings["timeoutMs"] if latency_switch else failover_timeout_ms
    for tier in candidate_tiers:
        tier_successful = []
        for candidate in tier["candidates"]:
            candidate_result = probe_resource_node(app_dir, service, candidate, candidate_timeout_ms, proxies)
            if candidate_result["ok"]:
                tier_successful.append((candidate_result["delay"], candidate))
                if not latency_switch:
                    break
        if tier_successful:
            successful = tier_successful
            break

    if latency_switch:
        required_delay = (
            result["delay"] - settings["minimumLatencyImprovementMs"]
            if proactive_switch
            else result["delay"] * (1 - RESOURCE_MONITOR_MIN_LATENCY_IMPROVEMENT_RATIO)
        )
        successful = [candidate for candidate in successful if candidate[0] <= required_delay]
        if not successful:
            item.update(
                {
                    "state": "warning",
                    "consecutiveSlowChecks": 0,
                    "message": "Более быстрая нода не найдена",
                }
            )
            append_resource_monitor_event(
                app_dir,
                service,
                "latency_no_better",
                "Более быстрая нода не найдена",
                node=current,
                delay=result["delay"],
                requiredDelay=int(required_delay),
                alternatives=candidates,
            )
            return
    elif not successful:
        item["message"] = "Подходящая нода не найдена"
        append_resource_monitor_event(
            app_dir,
            service,
            "unavailable",
            "Подходящая нода не найдена",
            node=current,
            alternatives=candidates,
        )
        return

    delay, selected = min(successful)
    switched = switch_resource_monitor_node(
        app_dir,
        settings,
        item,
        service,
        group_name,
        current,
        selected,
        delay,
        switch_reason,
        quarantine,
        previous_delay=result["delay"] if latency_switch else None,
        threshold=latency_threshold,
    )
    if not switched and latency_switch:
        item["consecutiveSlowChecks"] = 0


def run_resource_monitor_cycle(app_dir, services=None, proxies=None):
    with resource_monitor_lock:
        settings = load_resource_monitor_settings(app_dir)
        selected_services = services or [
            key for key, item in settings["services"].items() if item["enabled"]
        ]
        runtime = load_resource_monitor_runtime(app_dir)
        try:
            if proxies is None:
                proxies = load_resource_monitor_proxies(app_dir)
            for service in selected_services:
                if service in RESOURCE_MONITOR_SERVICES and settings["services"][service]["enabled"]:
                    run_resource_monitor_service(app_dir, settings, runtime, service, proxies)
        except Exception as error:
            for service in selected_services:
                if service in RESOURCE_MONITOR_SERVICES:
                    mark_resource_monitor_drift(
                        app_dir,
                        runtime,
                        service,
                        settings["services"][service]["group"],
                        f"Mihomo недоступен: {error}",
                    )
        runtime["lastCycleAt"] = int(time.time())
        save_resource_monitor_runtime(app_dir, runtime)
        return runtime


def run_resource_monitor_job(app_dir, services=None, startup=False):
    try:
        if startup:
            run_resource_monitor_startup_cycle(app_dir)
        else:
            run_resource_monitor_cycle(app_dir, services)
    finally:
        with resource_monitor_state_lock:
            resource_monitor_job_state.update(
                {
                    "running": False,
                    "services": [],
                    "finishedAt": int(time.time()),
                }
            )


def start_resource_monitor_check(app_dir, services=None, startup=False):
    with resource_monitor_state_lock:
        if resource_monitor_job_state["running"]:
            return {"ok": False, "message": "resource check already running", "job": dict(resource_monitor_job_state)}
        resource_monitor_job_state.update(
            {
                "running": True,
                "services": list(services or RESOURCE_MONITOR_SERVICES),
                "startedAt": int(time.time()),
                "finishedAt": None,
            }
        )
    thread = threading.Thread(
        target=run_resource_monitor_job,
        args=(Path(app_dir), services, startup),
        daemon=True,
    )
    thread.start()
    return {"ok": True, "job": snapshot_resource_monitor_job()}


def resource_monitor_worker(app_dir):
    startup_pending = True
    startup_due_at = time.monotonic() + RESOURCE_MONITOR_STARTUP_WARMUP_SECONDS
    while True:
        time.sleep(5)
        settings = load_resource_monitor_settings(app_dir)
        if not settings["enabled"] or snapshot_resource_monitor_job()["running"]:
            continue
        if startup_pending:
            if time.monotonic() < startup_due_at:
                continue
            result = start_resource_monitor_check(app_dir, startup=True)
            if result["ok"]:
                startup_pending = False
            continue
        runtime = load_resource_monitor_runtime(app_dir)
        now = int(time.time())
        due = []
        for service, item in settings["services"].items():
            if not item["enabled"]:
                continue
            checked_at = runtime["services"][service].get("checkedAt")
            if not isinstance(checked_at, (int, float)) or now - int(checked_at) >= settings["intervalSeconds"]:
                due.append(service)
        if due:
            start_resource_monitor_check(app_dir, due)


def initialize_resource_monitor(app_dir):
    thread = threading.Thread(target=resource_monitor_worker, args=(Path(app_dir),), daemon=True)
    thread.start()


def default_whitelist_monitor_settings():
    return {
        "enabled": False,
        "actionMode": "observe",
        "intervalSeconds": 300,
        "confirmationThreshold": 3,
        "controlFailureThreshold": 2,
        "timeoutMs": 5000,
        "proxyGroup": "PROXY",
        "positiveEndpoints": [dict(item) for item in WHITELIST_MONITOR_POSITIVE_ENDPOINTS],
        "controlEndpoints": [dict(item) for item in WHITELIST_MONITOR_CONTROL_ENDPOINTS],
    }


def whitelist_monitor_settings_path(app_dir):
    env = get_env(app_dir)
    return Path(
        env.get(
            "MIHUI_WHITELIST_MONITOR_SETTINGS_PATH",
            str(Path(app_dir) / "whitelist-monitor.json"),
        )
    )


def whitelist_monitor_runtime_path(app_dir):
    env = get_env(app_dir)
    return Path(
        env.get(
            "MIHUI_WHITELIST_MONITOR_RUNTIME_PATH",
            str(Path(app_dir) / "whitelist-monitor-runtime.json"),
        )
    )


def whitelist_monitor_log_path(app_dir):
    env = get_env(app_dir)
    return Path(
        env.get(
            "MIHUI_WHITELIST_MONITOR_LOG_PATH",
            str(Path(app_dir) / "whitelist-monitor.jsonl"),
        )
    )


def validate_whitelist_monitor_endpoint(item, kind, index):
    if not isinstance(item, dict):
        raise ValueError(f"{kind} endpoint {index + 1} must be an object")
    endpoint_id = str(item.get("id") or "").strip()
    name = str(item.get("name") or "").strip()
    url = str(item.get("url") or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", endpoint_id):
        raise ValueError(f"{kind} endpoint {index + 1} has an invalid id")
    if not name or len(name) > 80:
        raise ValueError(f"{kind} endpoint {index + 1} must have a name")
    if len(url) > 2048:
        raise ValueError(f"{kind} endpoint {index + 1} URL is too long")
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme.casefold() != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f"{kind} endpoint {index + 1} must use an HTTPS URL")
    return {
        "id": endpoint_id,
        "name": name,
        "url": url,
        "enabled": bool(item.get("enabled", True)),
    }


def validate_whitelist_monitor_settings(payload):
    if not isinstance(payload, dict):
        raise TypeError("settings must be an object")

    ranges = {
        "intervalSeconds": (60, 3600),
        "confirmationThreshold": (2, 6),
        "controlFailureThreshold": (1, 5),
        "timeoutMs": (1000, 15000),
    }
    result = {"enabled": bool(payload.get("enabled", False))}
    action_mode = str(payload.get("actionMode") or "observe").strip()
    if action_mode not in {"observe", "suggest"}:
        raise ValueError("actionMode must be observe or suggest")
    result["actionMode"] = action_mode
    for key, (minimum, maximum) in ranges.items():
        value = payload.get(key)
        if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
            raise ValueError(f"{key} must be between {minimum} and {maximum}")
        result[key] = value

    proxy_group = str(payload.get("proxyGroup") or "").strip()
    if not proxy_group or len(proxy_group) > 128:
        raise ValueError("proxyGroup is required")
    result["proxyGroup"] = proxy_group

    all_ids = set()
    for source_key, kind in (
        ("positiveEndpoints", "positive"),
        ("controlEndpoints", "control"),
    ):
        items = payload.get(source_key)
        if not isinstance(items, list) or not 1 <= len(items) <= WHITELIST_MONITOR_ENDPOINT_LIMIT:
            raise ValueError(
                f"{source_key} must contain between 1 and {WHITELIST_MONITOR_ENDPOINT_LIMIT} endpoints"
            )
        normalized = []
        for index, item in enumerate(items):
            endpoint = validate_whitelist_monitor_endpoint(item, kind, index)
            if endpoint["id"] in all_ids:
                raise ValueError("endpoint ids must be unique")
            all_ids.add(endpoint["id"])
            normalized.append(endpoint)
        result[source_key] = normalized

    enabled_positive = sum(item["enabled"] for item in result["positiveEndpoints"])
    enabled_controls = sum(item["enabled"] for item in result["controlEndpoints"])
    if enabled_positive < 1:
        raise ValueError("at least one positive endpoint must be enabled")
    if enabled_controls < result["controlFailureThreshold"]:
        raise ValueError("not enough control endpoints are enabled")
    return result


def load_whitelist_monitor_settings(app_dir):
    defaults = default_whitelist_monitor_settings()
    saved = read_json_file(whitelist_monitor_settings_path(app_dir), {})
    merged = dict(defaults)
    for key in (
        "enabled",
        "actionMode",
        "intervalSeconds",
        "confirmationThreshold",
        "controlFailureThreshold",
        "timeoutMs",
        "proxyGroup",
        "positiveEndpoints",
        "controlEndpoints",
    ):
        if key in saved:
            merged[key] = saved[key]
    try:
        return validate_whitelist_monitor_settings(merged)
    except (TypeError, ValueError):
        return defaults


def save_whitelist_monitor_settings(app_dir, settings):
    write_json_atomic(whitelist_monitor_settings_path(app_dir), settings)


def default_whitelist_monitor_runtime():
    return {
        "state": "idle",
        "message": "Проверка ещё не выполнялась",
        "checkedAt": None,
        "consecutiveSuspicions": 0,
        "positiveDirectSuccesses": 0,
        "controlDirectFailures": 0,
        "controlProxyRecoveries": 0,
        "endpoints": {},
    }


def load_whitelist_monitor_runtime(app_dir, settings=None):
    defaults = default_whitelist_monitor_runtime()
    saved = read_json_file(whitelist_monitor_runtime_path(app_dir), {})
    runtime = dict(defaults)
    for field in defaults:
        if field in saved:
            runtime[field] = saved[field]
    if not isinstance(runtime.get("endpoints"), dict):
        runtime["endpoints"] = {}

    config = settings or load_whitelist_monitor_settings(app_dir)
    current_urls = {
        item["id"]: item["url"]
        for item in config["positiveEndpoints"] + config["controlEndpoints"]
    }
    runtime["endpoints"] = {
        endpoint_id: result
        for endpoint_id, result in runtime["endpoints"].items()
        if endpoint_id in current_urls
        and isinstance(result, dict)
        and result.get("url") == current_urls[endpoint_id]
    }
    return runtime


def save_whitelist_monitor_runtime(app_dir, runtime):
    write_json_atomic(whitelist_monitor_runtime_path(app_dir), runtime)


def read_whitelist_monitor_events(app_dir, limit=WHITELIST_MONITOR_EVENT_LIMIT):
    path = whitelist_monitor_log_path(app_dir)
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []

    events = []
    for line in lines[-max(1, int(limit)):]:
        try:
            event = json.loads(line)
        except (TypeError, ValueError):
            continue
        if isinstance(event, dict):
            events.append(event)
    return events


def append_whitelist_monitor_event(app_dir, event_type, message, **details):
    path = whitelist_monitor_log_path(app_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    event = {
        "at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "timestamp": int(time.time()),
        "type": event_type,
        "message": message,
    }
    event.update(details)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")

    try:
        if path.stat().st_size > WHITELIST_MONITOR_LOG_MAX_BYTES:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            path.write_text(
                "\n".join(lines[-WHITELIST_MONITOR_EVENT_LIMIT:]) + "\n",
                encoding="utf-8",
            )
    except OSError:
        pass


def snapshot_whitelist_monitor_job():
    with whitelist_monitor_state_lock:
        return dict(whitelist_monitor_job_state)


def get_whitelist_monitor_status(app_dir):
    config = load_whitelist_monitor_settings(app_dir)
    return {
        "ok": True,
        "config": config,
        "runtime": load_whitelist_monitor_runtime(app_dir, config),
        "events": read_whitelist_monitor_events(app_dir),
        "job": snapshot_whitelist_monitor_job(),
    }


def probe_whitelist_monitor_endpoint(app_dir, route, endpoint, timeout_ms):
    encoded_route = urllib.parse.quote(str(route), safe="")
    query = urllib.parse.urlencode(
        {
            "url": endpoint["url"],
            "timeout": timeout_ms,
            "expected": 200,
        }
    )
    try:
        data = mihomo_api_request(
            app_dir,
            f"/proxies/{encoded_route}/delay?{query}",
            timeout=max(2, int(timeout_ms / 1000) + 2),
        )
        delay = data.get("delay") if isinstance(data, dict) else None
        if isinstance(delay, bool) or not isinstance(delay, (int, float)) or delay < 0:
            raise RuntimeError("Mihomo did not return a valid delay")
        return {"ok": True, "delay": int(delay), "message": ""}
    except Exception as error:
        return {"ok": False, "delay": None, "message": str(error)}


def run_whitelist_probe_batch(app_dir, route, endpoints, timeout_ms):
    results = {}
    if not endpoints:
        return results
    with ThreadPoolExecutor(max_workers=min(3, len(endpoints))) as executor:
        futures = {
            endpoint["id"]: executor.submit(
                probe_whitelist_monitor_endpoint,
                app_dir,
                route,
                endpoint,
                timeout_ms,
            )
            for endpoint in endpoints
        }
        for endpoint_id, future in futures.items():
            try:
                results[endpoint_id] = future.result()
            except Exception as error:
                results[endpoint_id] = {"ok": False, "delay": None, "message": str(error)}
    return results


def classify_whitelist_monitor_results(settings, runtime, positive_results, control_results):
    positive_successes = sum(result.get("ok") is True for result in positive_results.values())
    direct_failures = [
        endpoint_id
        for endpoint_id, result in control_results.items()
        if result.get("direct", {}).get("ok") is not True
    ]
    proxy_recoveries = sum(
        isinstance(result.get("proxy"), dict) and result["proxy"].get("ok") is True
        for endpoint_id, result in control_results.items()
        if endpoint_id in direct_failures
    )
    previous_suspicions = int(runtime.get("consecutiveSuspicions") or 0)

    if positive_successes < 1:
        state = "unknown"
        message = "Не подтверждена прямая доступность разрешённых ресурсов"
        consecutive = 0
    elif len(direct_failures) >= settings["controlFailureThreshold"]:
        if proxy_recoveries >= settings["controlFailureThreshold"]:
            consecutive = previous_suspicions + 1
            if consecutive >= settings["confirmationThreshold"]:
                state = "confirmed"
                message = "Вероятно, оператор включил режим белых списков"
            else:
                state = "suspected"
                message = (
                    "Наблюдается признак белых списков "
                    f"({consecutive}/{settings['confirmationThreshold']})"
                )
        else:
            state = "unknown"
            message = "Сбой контрольных адресов не подтверждён через прокси"
            consecutive = 0
    else:
        state = "normal"
        message = "Признаки режима белых списков не обнаружены"
        consecutive = 0

    return {
        "state": state,
        "message": message,
        "consecutiveSuspicions": consecutive,
        "positiveDirectSuccesses": positive_successes,
        "controlDirectFailures": len(direct_failures),
        "controlProxyRecoveries": proxy_recoveries,
    }


def run_whitelist_monitor_cycle(app_dir):
    with whitelist_monitor_lock:
        settings = load_whitelist_monitor_settings(app_dir)
        runtime = load_whitelist_monitor_runtime(app_dir, settings)
        if not settings["enabled"]:
            return runtime

        positive_endpoints = [item for item in settings["positiveEndpoints"] if item["enabled"]]
        control_endpoints = [item for item in settings["controlEndpoints"] if item["enabled"]]
        positive_results = run_whitelist_probe_batch(
            app_dir,
            "DIRECT",
            positive_endpoints,
            settings["timeoutMs"],
        )
        direct_controls = run_whitelist_probe_batch(
            app_dir,
            "DIRECT",
            control_endpoints,
            settings["timeoutMs"],
        )
        failed_controls = [
            item
            for item in control_endpoints
            if direct_controls.get(item["id"], {}).get("ok") is not True
        ]
        proxy_controls = {}
        if (
            sum(result.get("ok") is True for result in positive_results.values()) >= 1
            and len(failed_controls) >= settings["controlFailureThreshold"]
        ):
            proxy_controls = run_whitelist_probe_batch(
                app_dir,
                settings["proxyGroup"],
                failed_controls,
                settings["timeoutMs"],
            )

        checked_at = int(time.time())
        endpoint_runtime = {}
        for item in positive_endpoints:
            endpoint_runtime[item["id"]] = {
                "url": item["url"],
                "kind": "positive",
                "checkedAt": checked_at,
                "direct": positive_results.get(item["id"]),
                "proxy": None,
            }
        control_results = {}
        for item in control_endpoints:
            result = {
                "direct": direct_controls.get(item["id"]),
                "proxy": proxy_controls.get(item["id"]),
            }
            control_results[item["id"]] = result
            endpoint_runtime[item["id"]] = {
                "url": item["url"],
                "kind": "control",
                "checkedAt": checked_at,
                **result,
            }

        previous_state = runtime.get("state")
        classification = classify_whitelist_monitor_results(
            settings,
            runtime,
            positive_results,
            control_results,
        )
        runtime.update(classification)
        runtime["checkedAt"] = checked_at
        runtime["endpoints"] = endpoint_runtime
        save_whitelist_monitor_runtime(app_dir, runtime)

        if previous_state != runtime["state"]:
            append_whitelist_monitor_event(
                app_dir,
                runtime["state"],
                runtime["message"],
                positiveDirectSuccesses=runtime["positiveDirectSuccesses"],
                controlDirectFailures=runtime["controlDirectFailures"],
                controlProxyRecoveries=runtime["controlProxyRecoveries"],
                consecutiveSuspicions=runtime["consecutiveSuspicions"],
            )
        return runtime


def run_whitelist_monitor_job(app_dir):
    try:
        run_whitelist_monitor_cycle(app_dir)
    finally:
        with whitelist_monitor_state_lock:
            whitelist_monitor_job_state.update(
                {
                    "running": False,
                    "finishedAt": int(time.time()),
                }
            )


def start_whitelist_monitor_check(app_dir):
    settings = load_whitelist_monitor_settings(app_dir)
    if not settings["enabled"]:
        return {
            "ok": False,
            "disabled": True,
            "message": "whitelist monitor is disabled",
            "job": snapshot_whitelist_monitor_job(),
        }
    with whitelist_monitor_state_lock:
        if whitelist_monitor_job_state["running"]:
            return {
                "ok": False,
                "message": "whitelist check already running",
                "job": dict(whitelist_monitor_job_state),
            }
        whitelist_monitor_job_state.update(
            {
                "running": True,
                "startedAt": int(time.time()),
                "finishedAt": None,
            }
        )
    thread = threading.Thread(
        target=run_whitelist_monitor_job,
        args=(Path(app_dir),),
        daemon=True,
    )
    thread.start()
    return {"ok": True, "job": snapshot_whitelist_monitor_job()}


def whitelist_monitor_worker(app_dir):
    while True:
        time.sleep(5)
        settings = load_whitelist_monitor_settings(app_dir)
        if not settings["enabled"] or snapshot_whitelist_monitor_job()["running"]:
            continue
        runtime = load_whitelist_monitor_runtime(app_dir, settings)
        checked_at = runtime.get("checkedAt")
        now = int(time.time())
        if not isinstance(checked_at, (int, float)) or now - int(checked_at) >= settings["intervalSeconds"]:
            start_whitelist_monitor_check(app_dir)


def initialize_whitelist_monitor(app_dir):
    thread = threading.Thread(target=whitelist_monitor_worker, args=(Path(app_dir),), daemon=True)
    thread.start()


def normalize_current_group_selections(proxies):
    if not isinstance(proxies, dict):
        return []

    groups = []
    for proxy_name, item in proxies.items():
        if not isinstance(item, dict):
            continue
        options = item.get("all")
        if not isinstance(options, list) and "now" not in item:
            continue

        now = str(item.get("now") or "")
        selected = proxies.get(now)
        groups.append(
            {
                "name": str(item.get("name") or proxy_name or ""),
                "type": str(item.get("type") or ""),
                "now": now,
                "all": [str(option) for option in options] if isinstance(options, list) else [],
                "selected": normalize_selected_group_proxy(selected),
            }
        )

    return groups


def normalize_selected_group_proxy(proxy):
    if not isinstance(proxy, dict):
        return {}

    return {
        "name": str(proxy.get("name") or ""),
        "type": str(proxy.get("type") or ""),
        "alive": proxy.get("alive") if isinstance(proxy.get("alive"), bool) else None,
        "udp": proxy.get("udp") if isinstance(proxy.get("udp"), bool) else None,
        "delay": get_proxy_delay(proxy),
    }


def get_config_proxy_provider_names(app_dir):
    config_path = get_config_path(app_dir)
    if not config_path.is_file():
        return set()
    text = config_path.read_text(encoding="utf-8", errors="replace")
    return {normalize_provider_name(name) for name in parse_proxy_provider_names(text)}


def parse_proxy_provider_names(text):
    lines = text.splitlines()
    section_indent = None
    child_indent = None
    names = []

    for index, line in enumerate(lines):
        cleaned = strip_yaml_comment(line)
        match = re.match(r"^(\s*)proxy-providers\s*:", cleaned)
        if match:
            section_indent = len(match.group(1))
            start_index = index + 1
            break
    else:
        return names

    for line in lines[start_index:]:
        cleaned = strip_yaml_comment(line)
        if not cleaned.strip():
            continue

        indent = len(cleaned) - len(cleaned.lstrip(" "))
        if indent <= section_indent:
            break
        if child_indent is None:
            child_indent = indent
        if indent != child_indent:
            continue

        match = re.match(r"^\s*([^:\s][^:]*):\s*$", cleaned)
        if match:
            names.append(clean_yaml_key(match.group(1)))

    return [name for name in names if name]


def strip_yaml_comment(line):
    return line.split("#", 1)[0].rstrip()


def clean_yaml_key(value):
    return str(value or "").strip().strip('"').strip("'")


def normalize_provider_name(value):
    return str(value or "").strip().casefold()


def is_config_proxy_provider(configured_names, provider_name, item):
    candidates = [provider_name, item.get("name")]
    return any(normalize_provider_name(candidate) in configured_names for candidate in candidates)


def normalize_current_node(provider_name, proxy):
    if not isinstance(proxy, dict):
        proxy = {"name": str(proxy)}

    return {
        "name": str(proxy.get("name") or ""),
        "provider": str(provider_name or ""),
        "type": str(proxy.get("type") or ""),
        "alive": proxy.get("alive") if isinstance(proxy.get("alive"), bool) else None,
        "udp": proxy.get("udp") if isinstance(proxy.get("udp"), bool) else None,
        "delay": get_proxy_delay(proxy),
    }


def get_proxy_delay(proxy):
    delay = proxy.get("delay")
    if isinstance(delay, (int, float)) and delay > 0:
        return int(delay)

    history = proxy.get("history")
    if isinstance(history, list):
        for item in reversed(history):
            if not isinstance(item, dict):
                continue
            delay = item.get("delay")
            if isinstance(delay, (int, float)) and delay > 0:
                return int(delay)
    return None


def normalize_provider_status(name, item):
    if not isinstance(item, dict):
        item = {}
    proxies = item.get("proxies")
    subscription_info = item.get("subscriptionInfo")
    if not isinstance(subscription_info, dict):
        subscription_info = {}

    return {
        "name": item.get("name") or name,
        "type": item.get("type") or item.get("vehicleType") or "",
        "vehicleType": item.get("vehicleType") or "",
        "updatedAt": item.get("updatedAt") or item.get("updateAt") or "",
        "proxyCount": len(proxies) if isinstance(proxies, list) else None,
        "subscriptionInfo": subscription_info,
    }


def reload_mihomo(app_dir, config_path):
    target_path = str(config_path)
    try:
        current = mihomo_api_request(app_dir, "/configs", timeout=5)
    except Exception as error:
        return {
            "ok": False,
            "method": "mihomo-api",
            "stage": "prepare",
            "uncertain": False,
            "message": str(error),
        }

    current_path = str(current.get("path") or "") if isinstance(current, dict) else ""
    if current_path and not same_config_path(current_path, target_path):
        return {
            "ok": False,
            "method": "mihomo-api",
            "stage": "prepare",
            "uncertain": False,
            "path": current_path,
            "message": f"Mihomo uses a different config path: {current_path}",
        }

    try:
        mihomo_api_request(
            app_dir,
            "/configs?force=true",
            method="PUT",
            payload={"path": target_path},
            timeout=10,
        )
    except urllib.error.HTTPError as error:
        return {
            "ok": False,
            "method": "mihomo-api",
            "stage": "apply",
            "uncertain": False,
            "message": str(error),
        }
    except Exception as error:
        return {
            "ok": False,
            "method": "mihomo-api",
            "stage": "apply",
            "uncertain": True,
            "message": str(error),
        }

    try:
        version = mihomo_api_request(app_dir, "/version", timeout=5)
        confirmed = mihomo_api_request(app_dir, "/configs", timeout=5)
    except Exception as error:
        return {
            "ok": False,
            "method": "mihomo-api",
            "stage": "verify",
            "uncertain": True,
            "message": str(error),
        }

    confirmed_path = str(confirmed.get("path") or "") if isinstance(confirmed, dict) else ""
    if confirmed_path and not same_config_path(confirmed_path, target_path):
        return {
            "ok": False,
            "method": "mihomo-api",
            "stage": "verify",
            "uncertain": True,
            "path": confirmed_path,
            "message": "Mihomo did not confirm the applied config path",
        }

    return {
        "ok": True,
        "verified": True,
        "method": "mihomo-api",
        "path": confirmed_path or target_path,
        "pathConfirmed": bool(confirmed_path),
        "version": str(version.get("version") or "") if isinstance(version, dict) else "",
    }


def same_config_path(left, right):
    return os.path.normcase(os.path.normpath(str(left))) == os.path.normcase(os.path.normpath(str(right)))


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
    initialize_resource_monitor(app_dir)
    initialize_whitelist_monitor(app_dir)

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
