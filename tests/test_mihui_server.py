import base64
import io
import json
import os
import sys
import tarfile
import tempfile
import threading
import time
import unittest
import urllib.parse
import urllib.error
import urllib.request
from unittest import mock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "router"))

import mihui_server  # noqa: E402


class ProviderPayloadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.server.request_count = getattr(self.server, "request_count", 0) + 1
        parsed = urllib.parse.urlsplit(self.path)
        self.server.received_user_agent = self.headers.get("User-Agent")
        self.server.received_hwid = self.headers.get("x-hwid")
        self.server.received_hwid_query = urllib.parse.parse_qs(parsed.query).get("hwid", [""])[0]
        if parsed.path == "/landing.html":
            target_url = f"http://127.0.0.1:{self.server.server_address[1]}/target.yaml"
            body = f'<html><body><a href="{target_url}">import</a></body></html>'.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if parsed.path == "/happ-required":
            if (
                str(self.headers.get("User-Agent") or "").startswith("Happ/")
                and self.headers.get("x-hwid") == "ABC123"
                and urllib.parse.parse_qs(parsed.query).get("hwid", [""])[0] == "ABC123"
            ):
                body = b"proxies:\n  - name: happ\n    type: direct\n"
                self.send_response(200)
                self.send_header("Content-Type", "text/yaml")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            body = b"<html><body>Open this subscription in Happ.</body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if parsed.path == "/happ-base64":
            if str(self.headers.get("User-Agent") or "").startswith("Happ/"):
                payload = b"proxies:\n  - name: encoded\n    type: direct\n"
                body = base64.urlsafe_b64encode(payload).rstrip(b"=")
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            body = b"<html><body>Open this subscription in Happ.</body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if parsed.path == "/plain-html":
            body = b"<html><body>No subscription here.</body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        body = b"proxies:\n  - name: local\n    type: direct\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/yaml")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        return


class ProviderAdapterTests(unittest.TestCase):
    def start_provider_server(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), ProviderPayloadHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server, thread

    def stop_provider_server(self, server, thread):
        server.shutdown()
        thread.join(timeout=2)
        server.server_close()

    def start_mihui_server(self, app_dir):
        www_dir = Path(app_dir) / "www"
        www_dir.mkdir(parents=True, exist_ok=True)
        handler = lambda *args, **kwargs: mihui_server.MihuiHandler(
            *args, directory=str(www_dir), **kwargs
        )
        mihui_server.MihuiHandler.app_dir = Path(app_dir)
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server, thread

    def post_json(self, server, path, payload, headers=None):
        request_headers = {"Content-Type": "application/json"}
        request_headers.update(headers or {})
        request = urllib.request.Request(
            f"http://127.0.0.1:{server.server_address[1]}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers=request_headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            try:
                return error.code, json.loads(error.read().decode("utf-8"))
            finally:
                error.close()

    def get_json(self, server, path):
        with urllib.request.urlopen(
            f"http://127.0.0.1:{server.server_address[1]}{path}", timeout=3
        ) as response:
            return response.status, json.loads(response.read().decode("utf-8"))

    def test_fetch_provider_payload_forwards_headers(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/sub.yaml"
            body, content_type = mihui_server.fetch_provider_payload(
                url,
                {"User-Agent": "MihomoTest/1.0", "x-hwid": "ABC123"},
            )
        finally:
            self.stop_provider_server(server, thread)

        self.assertIn(b"name: local", body)
        self.assertEqual(content_type, "text/yaml")
        self.assertEqual(server.received_user_agent, "MihomoTest/1.0")
        self.assertEqual(server.received_hwid, "ABC123")

    def test_fetch_provider_payload_follows_landing_link(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/landing.html"
            body, content_type = mihui_server.fetch_provider_payload(url, {})
        finally:
            self.stop_provider_server(server, thread)

        self.assertIn(b"name: local", body)
        self.assertEqual(content_type, "text/yaml")

    def test_fetch_provider_payload_resolves_incy_import_url(self):
        server, thread = self.start_provider_server()
        try:
            target_url = f"http://127.0.0.1:{server.server_address[1]}/target.yaml"
            source_url = f"incy://import?url={urllib.parse.quote(target_url, safe='')}"
            body, content_type = mihui_server.fetch_provider_payload(source_url, {})
        finally:
            self.stop_provider_server(server, thread)

        self.assertIn(b"name: local", body)
        self.assertEqual(content_type, "text/yaml")

    def test_fetch_provider_payload_decodes_incy_import_base64_payload(self):
        payload = b"proxies:\n  - name: incy\n    type: direct\n"
        encoded = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
        source_url = f"incy://import/{encoded}"

        body, content_type = mihui_server.fetch_provider_payload(source_url, {})

        self.assertEqual(content_type, "text/yaml; charset=utf-8")
        self.assertIn(b"name: incy", body)

    def test_fetch_provider_payload_retries_happ_landing_with_happ_headers(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/happ-required"
            body, content_type = mihui_server.fetch_provider_payload(
                url,
                {"User-Agent": "MihomoTest/1.0", "x-hwid": "ABC123"},
            )
        finally:
            self.stop_provider_server(server, thread)

        self.assertEqual(content_type, "text/yaml")
        self.assertIn(b"name: happ", body)
        self.assertEqual(server.received_user_agent, "Happ/1.0")
        self.assertEqual(server.received_hwid, "ABC123")
        self.assertEqual(server.received_hwid_query, "ABC123")

    def test_fetch_provider_payload_decodes_happ_landing_base64_payload(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/happ-base64"
            body, content_type = mihui_server.fetch_provider_payload(url, {})
        finally:
            self.stop_provider_server(server, thread)

        self.assertEqual(content_type, "text/yaml; charset=utf-8")
        self.assertIn(b"name: encoded", body)

    def test_fetch_provider_payload_does_not_retry_plain_html_landing(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/plain-html"
            body, content_type = mihui_server.fetch_provider_payload(
                url,
                {"User-Agent": "MihomoTest/1.0"},
            )
        finally:
            self.stop_provider_server(server, thread)

        self.assertEqual(content_type, "text/html; charset=utf-8")
        self.assertIn(b"No subscription here", body)
        self.assertEqual(server.request_count, 1)
        self.assertEqual(server.received_user_agent, "MihomoTest/1.0")

    def test_fetch_provider_payload_appends_hwid_when_requested(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/target.yaml"
            mihui_server.fetch_provider_payload(url, {"x-hwid": "ABC123"}, append_hwid=True)
        finally:
            self.stop_provider_server(server, thread)

        self.assertEqual(server.received_hwid_query, "ABC123")

    def test_fetch_provider_payload_rejects_happ_crypt_url(self):
        with self.assertRaisesRegex(ValueError, "only http/https and incy"):
            mihui_server.fetch_provider_payload("happ://crypt/example")

    def test_build_provider_request_headers_drops_hop_by_hop_headers(self):
        headers = mihui_server.build_provider_request_headers(
            {
                "Host": "127.0.0.1",
                "Connection": "keep-alive",
                "Content-Length": "10",
                "User-Agent": "MihomoTest/1.0",
                "x-hwid": "ABC123",
            }
        )

        self.assertEqual(headers, {"User-Agent": "MihomoTest/1.0", "x-hwid": "ABC123"})

    def test_mihomo_service_status_reports_version(self):
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            return_value={"version": "1.19.9"},
        ):
            result = mihui_server.get_mihomo_service_status(Path("."))

        self.assertEqual(result["state"], "ok")
        self.assertEqual(result["detail"], "1.19.9")

    def test_mihomo_service_status_reports_api_error(self):
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            side_effect=RuntimeError("connection refused"),
        ):
            result = mihui_server.get_mihomo_service_status(Path("."))

        self.assertEqual(result["state"], "error")
        self.assertIn("connection refused", result["detail"])

    def test_xkeen_service_status_reports_missing_binary(self):
        with mock.patch.object(mihui_server, "find_xkeen_binary", return_value=""):
            result = mihui_server.get_xkeen_service_status(Path("."))

        self.assertEqual(result["state"], "unavailable")

    def test_xkeen_service_status_uses_status_command(self):
        completed = mihui_server.subprocess.CompletedProcess(
            ["/opt/bin/xkeen", "-status"], 0, stdout="running\n".encode()
        )
        with mock.patch.object(
            mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"
        ), mock.patch.object(mihui_server.subprocess, "run", return_value=completed) as run:
            result = mihui_server.get_xkeen_service_status(Path("."))

        self.assertEqual(result["state"], "ok")
        self.assertEqual(result["detail"], "running")
        run.assert_called_once_with(
            ["/opt/bin/xkeen", "-status"],
            stdout=mihui_server.subprocess.PIPE,
            stderr=mihui_server.subprocess.STDOUT,
            timeout=mihui_server.XKEEN_STATUS_TIMEOUT,
            check=False,
        )

    def test_xkeen_network_validation_reports_invalid_lines_and_port_priority(self):
        result = mihui_server.validate_xkeen_network_files(
            {
                "portProxying": "80\n70000\n",
                "portExclude": "443\n",
                "ipExclude": "not-an-ip\n",
                "xkeenConfig": '{\n  // comment\n  "xkeen": {"policy": [{}]}\n}\n',
            }
        )

        self.assertFalse(result["ok"])
        self.assertEqual({error["file"] for error in result["errors"]}, {"portProxying", "ipExclude", "xkeenConfig"})
        self.assertEqual(result["warnings"][0]["code"], "port-priority")

    def test_save_xkeen_network_files_restarts_once_after_atomic_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            xkeen_dir = app_dir / "xkeen"
            xkeen_dir.mkdir()
            proxying = xkeen_dir / "port_proxying.lst"
            proxying.write_text("80\n", encoding="utf-8")
            (xkeen_dir / "port_exclude.lst").write_text("", encoding="utf-8")
            (xkeen_dir / "ip_exclude.lst").write_text("", encoding="utf-8")
            (xkeen_dir / "xkeen.json").write_text("{}\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(f'MIHUI_XKEEN_DIR="{xkeen_dir}"\n', encoding="utf-8")
            with mock.patch.object(mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"), mock.patch.object(
                mihui_server,
                "run_xkeen_restart",
                return_value={"ok": True, "message": "XKeen перезапущен"},
            ) as restart:
                result = mihui_server.save_xkeen_network_files(app_dir, {"portProxying": "80\n443\n"})
                invalid = mihui_server.save_xkeen_network_files(app_dir, {"portProxying": "70000\n"})

            self.assertTrue(result["ok"])
            self.assertTrue(result["restarted"])
            self.assertFalse(invalid["ok"])
            self.assertEqual(proxying.read_text(encoding="utf-8"), "80\n443\n")
            restart.assert_called_once_with(app_dir, "/opt/bin/xkeen")

    def test_save_xkeen_network_files_restores_originals_after_restart_failure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            xkeen_dir = app_dir / "xkeen"
            xkeen_dir.mkdir()
            proxying = xkeen_dir / "port_proxying.lst"
            proxying.write_text("80\n", encoding="utf-8")
            (xkeen_dir / "port_exclude.lst").write_text("", encoding="utf-8")
            (xkeen_dir / "ip_exclude.lst").write_text("", encoding="utf-8")
            (xkeen_dir / "xkeen.json").write_text("{}\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(f'MIHUI_XKEEN_DIR="{xkeen_dir}"\n', encoding="utf-8")
            restarts = [
                {"ok": False, "message": "restart failed"},
                {"ok": True, "message": "restored"},
            ]
            with mock.patch.object(mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"), mock.patch.object(
                mihui_server, "run_xkeen_restart", side_effect=restarts
            ) as restart:
                result = mihui_server.save_xkeen_network_files(app_dir, {"portProxying": "443\n"})

            self.assertFalse(result["ok"])
            self.assertTrue(result["rolledBack"])
            self.assertEqual(proxying.read_text(encoding="utf-8"), "80\n")
            self.assertEqual(restart.call_count, 2)

    def test_xkeen_network_files_endpoint_requires_fixed_action_header(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            server, thread = self.start_mihui_server(Path(temp_dir))
            try:
                status, result = self.post_json(
                    server,
                    "/api/xkeen/network-files",
                    {"files": {"portProxying": "80\n"}},
                )
            finally:
                self.stop_provider_server(server, thread)

        self.assertEqual(status, 403)
        self.assertFalse(result["ok"])

    def test_services_status_endpoint_is_read_only_and_returns_both_services(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            server, thread = self.start_mihui_server(app_dir)
            payload = {
                "ok": True,
                "checkedAt": 123,
                "services": {
                    "xkeen": {"state": "ok", "message": "XKeen работает", "detail": ""},
                    "mihomo": {"state": "ok", "message": "Mihomo отвечает", "detail": "1.19.9"},
                },
            }
            try:
                with mock.patch.object(mihui_server, "get_services_status", return_value=payload):
                    status, result = self.get_json(server, "/api/services/status")
            finally:
                self.stop_provider_server(server, thread)

        self.assertEqual(status, 200)
        self.assertEqual(result, payload)

    def test_components_status_marks_newer_versions(self):
        catalog = {
            "xkeen": {"latest": "v2.1", "versions": ["v2.1", "v2.0"], "error": ""},
            "mihomo": {"latest": "v1.19.28", "versions": ["v1.19.28", "v1.19.27"], "error": ""},
        }
        with mock.patch.object(
            mihui_server, "get_component_release_catalog", return_value=(catalog, 123)
        ), mock.patch.object(
            mihui_server,
            "get_xkeen_version_info",
            return_value={"installed": True, "version": "2.0", "channel": "Stable"},
        ), mock.patch.object(
            mihui_server,
            "read_mihomo_binary_version",
            return_value={"installed": True, "version": "1.19.27", "binary": "/opt/sbin/mihomo"},
        ):
            result = mihui_server.get_components_status(Path("."))

        self.assertEqual(result["updateCount"], 2)
        self.assertTrue(result["components"]["xkeen"]["updateAvailable"])
        self.assertTrue(result["components"]["mihomo"]["updateAvailable"])

    def test_components_status_does_not_compare_beta_xkeen_with_stable_release(self):
        catalog = {
            "xkeen": {"latest": "v2.1", "versions": ["v2.1"], "error": "stable unavailable"},
            "mihomo": {"latest": "", "versions": [], "error": ""},
        }
        with mock.patch.object(
            mihui_server, "get_component_release_catalog", return_value=(catalog, 123)
        ), mock.patch.object(
            mihui_server,
            "get_xkeen_version_info",
            return_value={"installed": True, "version": "2.0.1", "channel": "Beta"},
        ), mock.patch.object(
            mihui_server,
            "read_mihomo_binary_version",
            return_value={"installed": False, "version": "", "binary": ""},
        ):
            result = mihui_server.get_components_status(Path("."))

        xkeen = result["components"]["xkeen"]
        self.assertEqual(xkeen["channel"], "Beta")
        self.assertEqual(xkeen["latest"], "")
        self.assertEqual(xkeen["error"], "")
        self.assertFalse(xkeen["updateAvailable"])

    def test_xkeen_version_info_reads_beta_build_timestamp(self):
        output = "Версия XKeen 2.0.1 Beta (время сборки: 2026-07-16 18:16:57 MSK)\n"
        completed = mihui_server.subprocess.CompletedProcess(["xkeen", "-v"], 0, stdout=output.encode("utf-8"))
        with mock.patch.object(
            mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"
        ), mock.patch.object(mihui_server.subprocess, "run", return_value=completed):
            result = mihui_server.get_xkeen_version_info(Path("."))

        self.assertEqual(result["version"], "2.0.1")
        self.assertEqual(result["channel"], "Beta")
        self.assertEqual(result["buildTimestamp"], "2026-07-16 18:16:57 MSK")

    def test_parse_xkeen_beta_archive_reads_embedded_build_metadata(self):
        source = (
            'xkeen_current_version="2.0.1"\n'
            'xkeen_build="Beta"\n'
            'build_timestamp="2026-07-16 20:45:12 MSK"\n'
        ).encode("utf-8")
        body = io.BytesIO()
        with tarfile.open(fileobj=body, mode="w:gz") as archive:
            member = tarfile.TarInfo("_xkeen/01_info/01_info_variable.sh")
            member.size = len(source)
            archive.addfile(member, io.BytesIO(source))

        result = mihui_server.parse_xkeen_beta_archive(body.getvalue())

        self.assertEqual(result["version"], "2.0.1")
        self.assertEqual(result["buildTimestamp"], "2026-07-16 20:45:12 MSK")

    def test_components_status_compares_beta_build_timestamps_with_same_version(self):
        catalog = {
            "xkeen": {
                "latest": "v2.0.1",
                "versions": ["v2.0.1"],
                "error": "",
                "betaVersion": "2.0.1",
                "betaBuildTimestamp": "2026-07-16 20:45:12 MSK",
                "betaError": "",
            },
            "mihomo": {"latest": "", "versions": [], "error": ""},
        }
        with mock.patch.object(
            mihui_server, "get_component_release_catalog", return_value=(catalog, 123)
        ), mock.patch.object(
            mihui_server,
            "get_xkeen_version_info",
            return_value={
                "installed": True,
                "version": "2.0.1",
                "channel": "Beta",
                "buildTimestamp": "2026-07-16 18:16:57 MSK",
            },
        ), mock.patch.object(
            mihui_server,
            "read_mihomo_binary_version",
            return_value={"installed": False, "version": "", "binary": ""},
        ):
            result = mihui_server.get_components_status(Path("."))

        xkeen = result["components"]["xkeen"]
        self.assertEqual(xkeen["current"], "2.0.1")
        self.assertEqual(xkeen["latest"], "2.0.1")
        self.assertEqual(xkeen["buildTimestamp"], "2026-07-16 18:16:57 MSK")
        self.assertEqual(xkeen["latestBuildTimestamp"], "2026-07-16 20:45:12 MSK")
        self.assertTrue(xkeen["updateAvailable"])
        self.assertEqual(result["updateCount"], 1)

    def test_component_action_requires_custom_header(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            server, thread = self.start_mihui_server(Path(temp_dir))
            try:
                status, result = self.post_json(
                    server,
                    "/api/components/action",
                    {"component": "xkeen", "action": "update"},
                )
            finally:
                self.stop_provider_server(server, thread)

        self.assertEqual(status, 403)
        self.assertFalse(result["ok"])

    def test_validate_mihomo_action_accepts_only_checked_release(self):
        status = {
            "components": {
                "mihomo": {"latest": "v1.19.28", "versions": ["v1.19.28", "v1.19.27"]}
            }
        }
        with mock.patch.object(mihui_server, "get_components_status", return_value=status):
            result = mihui_server.validate_component_action(
                Path("."), {"component": "mihomo", "action": "update", "target": "1.19.27"}
            )
            with self.assertRaisesRegex(ValueError, "checked release list"):
                mihui_server.validate_component_action(
                    Path("."), {"component": "mihomo", "action": "update", "target": "1.18.0"}
                )

        self.assertEqual(result["target"], "v1.19.27")

    def test_validate_component_action_accepts_only_fixed_channel_and_maintenance_actions(self):
        channel = mihui_server.validate_component_action(
            Path("."), {"component": "xkeen", "action": "channel", "target": "Beta"}
        )
        restart = mihui_server.validate_component_action(
            Path("."), {"component": "mihomo", "action": "restart"}
        )
        geo_update = mihui_server.validate_component_action(
            Path("."), {"component": "xkeen", "action": "geo-update"}
        )
        with self.assertRaisesRegex(ValueError, "invalid XKeen channel"):
            mihui_server.validate_component_action(
                Path("."), {"component": "xkeen", "action": "channel", "target": "nightly"}
            )
        with self.assertRaisesRegex(ValueError, "target is not supported"):
            mihui_server.validate_component_action(
                Path("."), {"component": "mihomo", "action": "restart", "target": "shell"}
            )

        self.assertEqual(channel["target"], "beta")
        self.assertEqual(restart["action"], "restart")
        self.assertEqual(geo_update["action"], "geo-update")

    def test_validate_all_component_update_uses_only_available_checked_versions(self):
        status = {
            "components": {
                "xkeen": {"updateAvailable": True, "latest": "2.0.1"},
                "mihomo": {"updateAvailable": True, "latest": "v1.19.29"},
            }
        }
        with mock.patch.object(
            mihui_server, "get_components_status", return_value=status
        ) as get_status:
            result = mihui_server.validate_component_action(
                Path("."), {"component": "all", "action": "update"}
            )

        get_status.assert_called_once_with(Path("."), force=True)
        self.assertEqual(
            result["updates"],
            [
                {"component": "xkeen", "target": ""},
                {"component": "mihomo", "target": "v1.19.29"},
            ],
        )
        with self.assertRaisesRegex(ValueError, "unsupported all-components action"):
            mihui_server.validate_component_action(
                Path("."), {"component": "all", "action": "restart"}
            )

    def test_run_all_component_updates_runs_checked_components_in_order(self):
        updates = [
            {"component": "xkeen", "target": ""},
            {"component": "mihomo", "target": "v1.19.29"},
        ]
        with mock.patch.object(
            mihui_server, "run_xkeen_component_action"
        ) as xkeen_update, mock.patch.object(
            mihui_server, "run_mihomo_component_update"
        ) as mihomo_update:
            mihui_server.run_all_component_updates(Path("."), updates)

        xkeen_update.assert_called_once_with(Path("."), "update")
        mihomo_update.assert_called_once_with(Path("."), "v1.19.29")

    def test_xkeen_channel_switch_uses_backup_and_fixed_interactive_commands(self):
        version_info = [
            {"installed": True, "version": "2.0.1", "channel": "Beta"},
            {"installed": True, "version": "2.0", "channel": "Stable"},
        ]
        with mock.patch.object(
            mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"
        ), mock.patch.object(
            mihui_server, "get_xkeen_service_status", return_value={"state": "ok"}
        ), mock.patch.object(
            mihui_server, "get_xkeen_version_info", side_effect=version_info
        ), mock.patch.object(
            mihui_server, "run_component_command", return_value=(0, "ok")
        ) as run:
            mihui_server.run_xkeen_component_action(Path("."), "channel", "stable")

        self.assertEqual(
            run.call_args_list,
            [
                mock.call(["/opt/bin/xkeen", "-kb"], input_text=None, timeout=180),
                mock.call(["/opt/bin/xkeen", "-channel"], input_text="1\n", timeout=180),
                mock.call(["/opt/bin/xkeen", "-uk"], input_text=None, timeout=600),
            ],
        )

    def test_xkeen_maintenance_uses_only_restart_and_geo_commands(self):
        with mock.patch.object(
            mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"
        ), mock.patch.object(
            mihui_server, "get_xkeen_service_status", return_value={"state": "ok"}
        ), mock.patch.object(
            mihui_server, "run_component_command", return_value=(0, "ok")
        ) as run:
            mihui_server.run_xkeen_maintenance_action(Path("."), "restart")
            mihui_server.run_xkeen_maintenance_action(Path("."), "geo-update")

        self.assertEqual(
            run.call_args_list,
            [
                mock.call(["/opt/bin/xkeen", "-restart"], input_text=None, timeout=180),
                mock.call(["/opt/bin/xkeen", "-ug"], input_text=None, timeout=600),
            ],
        )

    def test_mihomo_maintenance_uses_native_restart_and_geo_fallback(self):
        not_found = urllib.error.HTTPError("http://mihomo/upgrade/geo", 404, "not found", {}, None)
        with mock.patch.object(
            mihui_server, "find_mihomo_binary", return_value="/opt/sbin/mihomo"
        ), mock.patch.object(
            mihui_server, "get_mihomo_service_status", return_value={"state": "ok"}
        ), mock.patch.object(
            mihui_server, "mihomo_api_request", side_effect=[{}, not_found, {}]
        ) as request:
            mihui_server.run_mihomo_maintenance_action(Path("."), "restart")
            mihui_server.run_mihomo_maintenance_action(Path("."), "geo-update")

        payload = {"path": "", "payload": ""}
        self.assertEqual(
            request.call_args_list,
            [
                mock.call(Path("."), "/restart", method="POST", payload=payload, timeout=30),
                mock.call(Path("."), "/upgrade/geo", method="POST", payload=payload, timeout=180),
                mock.call(Path("."), "/configs/geo", method="POST", payload=payload, timeout=180),
            ],
        )

    def test_mihomo_update_uses_fixed_xkeen_command_and_version_input(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            binary = app_dir / "mihomo"
            binary.write_bytes(b"current-binary")
            versions = [
                {"installed": True, "version": "1.19.27", "binary": str(binary)},
                {"installed": True, "version": "1.19.28", "binary": str(binary)},
            ]
            with mock.patch.object(
                mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"
            ), mock.patch.object(
                mihui_server, "read_mihomo_binary_version", side_effect=versions
            ), mock.patch.object(
                mihui_server,
                "get_mihomo_service_status",
                return_value={"state": "error"},
            ), mock.patch.object(
                mihui_server, "run_component_command", return_value=(0, "installed")
            ) as run:
                mihui_server.run_mihomo_component_update(app_dir, "v1.19.28")

        run.assert_called_once_with(
            ["/opt/bin/xkeen", "-um"],
            input_text="9\nv1.19.28\n",
        )

    def test_xkeen_update_rolls_back_when_health_check_fails(self):
        service_states = [{"state": "ok"}, {"state": "error"}]
        with mock.patch.object(
            mihui_server, "find_xkeen_binary", return_value="/opt/bin/xkeen"
        ), mock.patch.object(
            mihui_server, "get_xkeen_service_status", side_effect=service_states
        ), mock.patch.object(
            mihui_server,
            "get_xkeen_version_info",
            return_value={"installed": True, "version": "2.1", "channel": "Stable"},
        ), mock.patch.object(
            mihui_server, "run_component_command", return_value=(0, "ok")
        ) as run:
            with self.assertRaisesRegex(RuntimeError, "не запустился"):
                mihui_server.run_xkeen_component_action(Path("."), "update")

        self.assertEqual(
            run.call_args_list,
            [
                mock.call(["/opt/bin/xkeen", "-kb"], input_text=None, timeout=180),
                mock.call(["/opt/bin/xkeen", "-uk"], input_text=None, timeout=600),
                mock.call(["/opt/bin/xkeen", "-kbr"], timeout=180),
                mock.call(["/opt/bin/xkeen", "-rrk"], timeout=180),
                mock.call(["/opt/bin/xkeen", "-start"], timeout=180),
            ],
        )

    def test_save_checked_config_rejects_invalid_config_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("original\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            with mock.patch.object(
                mihui_server,
                "check_mihomo_config",
                return_value={"ok": False, "available": True, "message": "invalid yaml"},
            ):
                result = mihui_server.save_checked_config(app_dir, "broken\n")

            self.assertFalse(result["ok"])
            self.assertEqual(config_path.read_text(encoding="utf-8"), "original\n")
            self.assertFalse((app_dir / "backups").exists())

    def test_save_checked_config_rejects_stale_revision_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("current\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            with mock.patch.object(mihui_server, "check_mihomo_config") as check:
                result = mihui_server.save_checked_config(
                    app_dir,
                    "updated\n",
                    expected_revision=mihui_server.config_revision("older\n"),
                )

            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "conflict")
            self.assertEqual(config_path.read_text(encoding="utf-8"), "current\n")
            self.assertFalse((app_dir / "backups").exists())
            check.assert_not_called()

    def test_mihomo_config_check_uses_writable_home_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{app_dir / "config.yaml"}"\n', encoding="utf-8"
            )
            completed = mihui_server.subprocess.CompletedProcess([], 0, stdout=b"")
            with mock.patch.object(
                mihui_server, "find_mihomo_binary", return_value="/opt/sbin/mihomo"
            ), mock.patch.object(
                mihui_server.subprocess, "run", return_value=completed
            ) as run:
                result = mihui_server.check_mihomo_config(app_dir, "mixed-port: 7890\n")

        self.assertTrue(result["ok"])
        run.assert_called_once_with(
            [
                "/opt/sbin/mihomo",
                "-t",
                "-d",
                str(app_dir),
                "-f",
                mock.ANY,
            ],
            stdout=mihui_server.subprocess.PIPE,
            stderr=mihui_server.subprocess.STDOUT,
            timeout=45,
            check=False,
        )

    def test_save_checked_config_writes_when_check_is_unavailable(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("original\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            check = {"ok": True, "available": False, "message": "check skipped"}
            with mock.patch.object(mihui_server, "check_mihomo_config", return_value=check), mock.patch.object(
                mihui_server, "reload_mihomo", return_value={"ok": True}
            ):
                result = mihui_server.save_checked_config(app_dir, "updated\n")

            self.assertTrue(result["ok"])
            self.assertTrue(result["applied"])
            self.assertEqual(result["check"], check)
            self.assertEqual(config_path.read_text(encoding="utf-8"), "updated\n")
            self.assertEqual(len(list((app_dir / "backups").glob("config-*.yaml"))), 1)

    def test_save_checked_config_restores_previous_file_after_confirmed_reload_failure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("original\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            reloads = [
                {"ok": False, "uncertain": False, "stage": "apply", "message": "rejected"},
                {"ok": True, "verified": True},
            ]
            with mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
            ), mock.patch.object(mihui_server, "reload_mihomo", side_effect=reloads) as reload_mihomo:
                result = mihui_server.save_checked_config(app_dir, "updated\n")

            self.assertFalse(result["ok"])
            self.assertFalse(result["saved"])
            self.assertTrue(result["rolledBack"])
            self.assertTrue(result["rollback"]["reload"]["ok"])
            self.assertEqual(config_path.read_text(encoding="utf-8"), "original\n")
            self.assertEqual(reload_mihomo.call_count, 2)

    def test_save_checked_config_keeps_saved_file_when_reload_result_is_uncertain(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("original\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            with mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
            ), mock.patch.object(
                mihui_server,
                "reload_mihomo",
                return_value={"ok": False, "uncertain": True, "stage": "verify", "message": "timeout"},
            ) as reload_mihomo:
                result = mihui_server.save_checked_config(app_dir, "updated\n")

            self.assertFalse(result["ok"])
            self.assertTrue(result["saved"])
            self.assertTrue(result["uncertain"])
            self.assertFalse(result.get("rolledBack", False))
            self.assertEqual(config_path.read_text(encoding="utf-8"), "updated\n")
            reload_mihomo.assert_called_once_with(app_dir, config_path)

    def test_reload_mihomo_confirms_service_and_config_path(self):
        config_path = Path("/opt/etc/mihomo/config.yaml")
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            side_effect=[
                {"path": str(config_path)},
                {},
                {"version": "1.19.12"},
                {"path": str(config_path)},
            ],
        ) as request:
            result = mihui_server.reload_mihomo(Path("."), config_path)

        self.assertTrue(result["ok"])
        self.assertTrue(result["verified"])
        self.assertTrue(result["pathConfirmed"])
        self.assertEqual(result["version"], "1.19.12")
        self.assertEqual(
            request.call_args_list,
            [
                mock.call(Path("."), "/configs", timeout=5),
                mock.call(
                    Path("."),
                    "/configs?force=true",
                    method="PUT",
                    payload={"path": str(config_path)},
                    timeout=10,
                ),
                mock.call(Path("."), "/version", timeout=5),
                mock.call(Path("."), "/configs", timeout=5),
            ],
        )

    def test_reload_mihomo_accepts_healthy_config_response_without_path(self):
        config_path = Path("/opt/etc/mihomo/config.yaml")
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            side_effect=[
                {"mode": "rule"},
                {},
                {"version": "1.19.29"},
                {"mode": "rule"},
            ],
        ):
            result = mihui_server.reload_mihomo(Path("."), config_path)

        self.assertTrue(result["ok"])
        self.assertTrue(result["verified"])
        self.assertFalse(result["pathConfirmed"])
        self.assertEqual(result["path"], str(config_path))
        self.assertEqual(result["version"], "1.19.29")

    def test_reload_mihomo_rejects_different_confirmed_path_after_put(self):
        config_path = Path("/opt/etc/mihomo/config.yaml")
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            side_effect=[
                {},
                {},
                {"version": "1.19.29"},
                {"path": "/opt/etc/mihomo/other.yaml"},
            ],
        ):
            result = mihui_server.reload_mihomo(Path("."), config_path)

        self.assertFalse(result["ok"])
        self.assertTrue(result["uncertain"])
        self.assertEqual(result["stage"], "verify")

    def test_reload_mihomo_rejects_different_active_config_before_put(self):
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            return_value={"path": "/opt/etc/mihomo/other.yaml"},
        ) as request:
            result = mihui_server.reload_mihomo(Path("."), Path("/opt/etc/mihomo/config.yaml"))

        self.assertFalse(result["ok"])
        self.assertFalse(result["uncertain"])
        self.assertEqual(result["stage"], "prepare")
        request.assert_called_once_with(Path("."), "/configs", timeout=5)

    def test_config_save_endpoint_rejects_invalid_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("original\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            server, thread = self.start_mihui_server(app_dir)
            try:
                with mock.patch.object(
                    mihui_server,
                    "check_mihomo_config",
                    return_value={"ok": False, "available": True, "message": "invalid yaml"},
                ):
                    status, result = self.post_json(server, "/api/config/save", {"text": "broken\n"})
            finally:
                self.stop_provider_server(server, thread)

            self.assertEqual(status, 422)
            self.assertFalse(result["ok"])
            self.assertEqual(config_path.read_text(encoding="utf-8"), "original\n")

    def test_config_endpoint_returns_revision_and_rejects_stale_save(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("current\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            server, thread = self.start_mihui_server(app_dir)
            try:
                status, loaded = self.get_json(server, "/api/config")
                with mock.patch.object(mihui_server, "check_mihomo_config") as check:
                    save_status, result = self.post_json(
                        server,
                        "/api/config/save",
                        {
                            "text": "updated\n",
                            "expectedRevision": mihui_server.config_revision("older\n"),
                        },
                    )
            finally:
                self.stop_provider_server(server, thread)

            self.assertEqual(status, 200)
            self.assertEqual(loaded["revision"], mihui_server.config_revision("current\n"))
            self.assertEqual(save_status, 409)
            self.assertEqual(result["stage"], "conflict")
            self.assertEqual(config_path.read_text(encoding="utf-8"), "current\n")
            check.assert_not_called()

    def test_backup_restore_rejects_invalid_backup_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("original\n", encoding="utf-8")
            backup_dir = app_dir / "backups"
            backup_dir.mkdir()
            (backup_dir / "config-test.yaml").write_text("broken\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\nMIHUI_BACKUP_DIR="{backup_dir}"\n',
                encoding="utf-8",
            )
            server, thread = self.start_mihui_server(app_dir)
            try:
                with mock.patch.object(
                    mihui_server,
                    "check_mihomo_config",
                    return_value={"ok": False, "available": True, "message": "invalid yaml"},
                ):
                    status, result = self.post_json(
                        server, "/api/backups/restore", {"name": "config-test.yaml"}
                    )
            finally:
                self.stop_provider_server(server, thread)

            self.assertEqual(status, 422)
            self.assertFalse(result["ok"])
            self.assertEqual(config_path.read_text(encoding="utf-8"), "original\n")

    def test_restore_checked_backup_rolls_back_after_confirmed_reload_failure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("current\n", encoding="utf-8")
            backup_dir = app_dir / "backups"
            backup_dir.mkdir()
            selected_backup = backup_dir / "config-test.yaml"
            selected_backup.write_text("restored\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\nMIHUI_BACKUP_DIR="{backup_dir}"\n',
                encoding="utf-8",
            )
            reloads = [
                {"ok": False, "uncertain": False, "stage": "apply", "message": "rejected"},
                {"ok": True, "verified": True},
            ]
            with mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
            ), mock.patch.object(mihui_server, "reload_mihomo", side_effect=reloads) as reload_mihomo:
                result = mihui_server.restore_checked_backup(app_dir, selected_backup)

            self.assertFalse(result["ok"])
            self.assertTrue(result["rolledBack"])
            self.assertEqual(config_path.read_text(encoding="utf-8"), "current\n")
            self.assertEqual(result["revision"], mihui_server.config_revision("current\n"))
            self.assertEqual(reload_mihomo.call_count, 2)

    def test_restore_checked_backup_rejects_stale_revision_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("current\n", encoding="utf-8")
            selected_backup = app_dir / "config-test.yaml"
            selected_backup.write_text("restored\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
            )
            with mock.patch.object(mihui_server, "check_mihomo_config") as check:
                result = mihui_server.restore_checked_backup(
                    app_dir,
                    selected_backup,
                    expected_revision=mihui_server.config_revision("older\n"),
                )

            self.assertFalse(result["ok"])
            self.assertEqual(result["stage"], "conflict")
            self.assertEqual(config_path.read_text(encoding="utf-8"), "current\n")
            check.assert_not_called()

    def test_restore_checked_backup_keeps_file_when_reload_is_uncertain(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("current\n", encoding="utf-8")
            backup_dir = app_dir / "backups"
            backup_dir.mkdir()
            selected_backup = backup_dir / "config-test.yaml"
            selected_backup.write_text("restored\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(
                f'MIHUI_CONFIG_PATH="{config_path}"\nMIHUI_BACKUP_DIR="{backup_dir}"\n',
                encoding="utf-8",
            )
            with mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
            ), mock.patch.object(
                mihui_server,
                "reload_mihomo",
                return_value={"ok": False, "uncertain": True, "stage": "verify", "message": "timeout"},
            ):
                result = mihui_server.restore_checked_backup(app_dir, selected_backup)

            self.assertFalse(result["ok"])
            self.assertTrue(result["restored"])
            self.assertTrue(result["uncertain"])
            self.assertEqual(config_path.read_text(encoding="utf-8"), "restored\n")

    def test_is_loopback_address(self):
        self.assertTrue(mihui_server.is_loopback_address("127.0.0.1"))
        self.assertTrue(mihui_server.is_loopback_address("127.10.0.2"))
        self.assertTrue(mihui_server.is_loopback_address("::1"))
        self.assertFalse(mihui_server.is_loopback_address("192.168.1.2"))

    def test_normalize_current_group_selections_keeps_selected_proxy_details(self):
        groups = mihui_server.normalize_current_group_selections(
            {
                "Proxy": {"name": "Proxy", "type": "Selector", "now": "node-a", "all": ["node-a", "DIRECT"]},
                "node-a": {
                    "name": "node-a",
                    "type": "Vmess",
                    "alive": True,
                    "udp": True,
                    "history": [{"delay": 97}],
                },
            }
        )

        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]["name"], "Proxy")
        self.assertEqual(groups[0]["now"], "node-a")
        self.assertEqual(groups[0]["all"], ["node-a", "DIRECT"])
        self.assertEqual(groups[0]["selected"]["type"], "Vmess")
        self.assertTrue(groups[0]["selected"]["alive"])
        self.assertEqual(groups[0]["selected"]["delay"], 97)

    def test_select_proxy_group_checks_option_and_confirms_selection(self):
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            side_effect=[
                {"name": "Proxy", "type": "Selector", "now": "node-a", "all": ["node-a", "node-b"]},
                {},
                {"name": "Proxy", "type": "Selector", "now": "node-b", "all": ["node-a", "node-b"]},
            ],
        ) as request:
            result = mihui_server.select_proxy_group(Path("."), "Proxy", "node-b")

        self.assertTrue(result["ok"])
        self.assertTrue(result["changed"])
        self.assertEqual(result["now"], "node-b")
        self.assertEqual(
            request.call_args_list,
            [
                mock.call(Path("."), "/proxies/Proxy"),
                mock.call(Path("."), "/proxies/Proxy", method="PUT", payload={"name": "node-b"}),
                mock.call(Path("."), "/proxies/Proxy"),
            ],
        )

    def test_group_select_endpoint_rejects_non_select_group(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            server, thread = self.start_mihui_server(app_dir)
            try:
                with mock.patch.object(
                    mihui_server,
                    "mihomo_api_request",
                    return_value={"name": "Auto", "type": "URLTest", "now": "node-a", "all": ["node-a"]},
                ):
                    status, result = self.post_json(
                        server, "/api/groups/select", {"group": "Auto", "name": "node-a"}
                    )
            finally:
                self.stop_provider_server(server, thread)

        self.assertEqual(status, 422)
        self.assertFalse(result["ok"])
        self.assertEqual(result["message"], "group is not selectable")

    def test_resource_monitor_settings_are_validated_and_persisted(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            settings = mihui_server.default_resource_monitor_settings()
            settings["intervalSeconds"] = 120

            validated = mihui_server.validate_resource_monitor_settings(settings)
            mihui_server.save_resource_monitor_settings(app_dir, validated)

            self.assertEqual(mihui_server.load_resource_monitor_settings(app_dir), validated)
            self.assertEqual(validated["services"]["ai"]["group"], "AI")

            invalid = dict(settings)
            invalid["intervalSeconds"] = 30
            with self.assertRaises(ValueError):
                mihui_server.validate_resource_monitor_settings(invalid)

    def test_resource_monitor_switches_to_fastest_successful_candidate(self):
        settings = mihui_server.default_resource_monitor_settings()
        settings["failureThreshold"] = 2
        settings["maxAlternatives"] = 3
        runtime = mihui_server.default_resource_monitor_runtime()
        proxies = {
            "YOUTUBE": {
                "name": "YOUTUBE",
                "type": "Selector",
                "now": "node-a",
                "all": ["node-a", "node-b", "node-c", "DIRECT"],
            },
            "node-a": {"name": "node-a", "type": "VLESS", "alive": True, "history": [{"delay": 20}]},
            "node-b": {"name": "node-b", "type": "VLESS", "alive": True, "history": [{"delay": 30}]},
            "node-c": {"name": "node-c", "type": "VLESS", "alive": True, "history": [{"delay": 40}]},
        }
        probe_results = {
            "node-a": {"ok": False, "delay": None, "message": "youtube.com: timeout"},
            "node-b": {"ok": True, "delay": 90, "message": ""},
            "node-c": {"ok": True, "delay": 55, "message": ""},
        }

        with tempfile.TemporaryDirectory() as temp_dir, mock.patch.object(
            mihui_server,
            "probe_resource_node",
            side_effect=lambda _app, _service, node, _timeout, _proxies=None: probe_results[node],
        ), mock.patch.object(
            mihui_server,
            "select_proxy_group",
            return_value={"ok": True, "changed": True, "group": "YOUTUBE", "now": "node-c"},
        ) as select:
            mihui_server.run_resource_monitor_service(
                Path(temp_dir),
                settings,
                runtime,
                "youtube",
                proxies,
            )
            self.assertEqual(runtime["services"]["youtube"]["state"], "warning")
            self.assertEqual(runtime["services"]["youtube"]["consecutiveFailures"], 1)
            select.assert_not_called()

            mihui_server.run_resource_monitor_service(
                Path(temp_dir),
                settings,
                runtime,
                "youtube",
                proxies,
            )

        item = runtime["services"]["youtube"]
        self.assertEqual(item["state"], "available")
        self.assertEqual(item["currentNode"], "node-c")
        self.assertEqual(item["delay"], 55)
        self.assertGreater(item["quarantine"]["node-a"], int(time.time()))
        select.assert_called_once_with(Path(temp_dir), "YOUTUBE", "node-c")

    def test_resource_monitor_accepts_provider_nodes_omitted_from_proxies_map(self):
        settings = mihui_server.default_resource_monitor_settings()
        proxies = {
            name: {
                "name": name,
                "type": "Selector",
                "now": "provider-node",
                "all": ["provider-node", "provider-node-2"],
            }
            for name in ("YOUTUBE", "TELEGRAM", "WHATSAPP", "AI")
        }

        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            return_value={"proxies": proxies},
        ):
            readiness = mihui_server.get_resource_monitor_readiness(Path("."), settings)

        self.assertTrue(readiness["ready"])
        self.assertTrue(all(item["ready"] for item in readiness["services"].values()))
        self.assertEqual(
            mihui_server.resource_monitor_candidates(
                proxies["YOUTUBE"],
                proxies,
                "provider-node",
                {},
                3,
            ),
            ["provider-node-2"],
        )

    def test_resource_monitor_uses_mihomo_provider_delays_for_initial_selection(self):
        settings = mihui_server.default_resource_monitor_settings()
        for service in settings["services"].values():
            service["enabled"] = False
        settings["services"]["youtube"]["enabled"] = True
        group = {
            "name": "YOUTUBE",
            "type": "Selector",
            "now": "node-a",
            "all": ["node-a", "node-b", "node-c"],
        }

        def request(_app_dir, path, **_kwargs):
            if path == "/proxies":
                return {
                    "proxies": {
                        "YOUTUBE": group,
                        "node-a": {"name": "node-a", "type": "VLESS", "alive": True},
                        "node-b": {"name": "node-b", "type": "VLESS", "alive": True},
                        "node-c": {"name": "node-c", "type": "VLESS", "alive": True},
                    }
                }
            if path == "/providers/proxies":
                return {
                    "providers": {
                        "main": {
                            "proxies": [
                                {"name": "node-a", "type": "VLESS", "alive": True, "history": [{"delay": 80}]},
                                {"name": "node-b", "type": "VLESS", "alive": True, "history": [{"delay": 25}]},
                                {"name": "node-c", "type": "VLESS", "alive": True, "history": [{"delay": 45}]},
                            ]
                        }
                    }
                }
            raise AssertionError(path)

        with mock.patch.object(mihui_server, "mihomo_api_request", side_effect=request), mock.patch.object(
            mihui_server,
            "select_proxy_group",
            return_value={"ok": True, "changed": True, "group": "YOUTUBE", "now": "node-b"},
        ) as select:
            proxies = mihui_server.load_resource_monitor_proxies(Path("."))
            result = mihui_server.select_resource_monitor_fastest_nodes(Path("."), settings, proxies)

        self.assertTrue(result["ok"])
        self.assertEqual(
            mihui_server.resource_monitor_candidates(group, proxies, "", {}, 3),
            ["node-b", "node-c", "node-a"],
        )
        self.assertEqual(proxies["node-b"]["_mihui_provider"], "main")
        select.assert_called_once_with(Path("."), "YOUTUBE", "node-b")

    def test_resource_monitor_keeps_current_node_without_mihomo_delay(self):
        settings = mihui_server.default_resource_monitor_settings()
        for service in settings["services"].values():
            service["enabled"] = False
        settings["services"]["youtube"]["enabled"] = True
        proxies = {
            "YOUTUBE": {
                "name": "YOUTUBE",
                "type": "Selector",
                "now": "node-a",
                "all": ["node-a", "node-b"],
            },
            "node-a": {"name": "node-a", "type": "VLESS", "alive": True},
            "node-b": {"name": "node-b", "type": "VLESS", "alive": True},
        }

        with mock.patch.object(mihui_server, "select_proxy_group") as select:
            result = mihui_server.select_resource_monitor_fastest_nodes(Path("."), settings, proxies)

        self.assertTrue(result["ok"])
        self.assertEqual(result["services"]["youtube"]["now"], "node-a")
        select.assert_not_called()

    def test_resource_monitor_enable_applies_fastest_mihomo_nodes(self):
        settings = mihui_server.default_resource_monitor_settings()
        settings["enabled"] = True
        proxies = {"YOUTUBE": {"type": "Selector", "now": "node-a", "all": ["node-a"]}}

        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            server, thread = self.start_mihui_server(app_dir)
            try:
                with mock.patch.object(
                    mihui_server,
                    "get_resource_monitor_readiness",
                    return_value={"ready": True, "message": "", "services": {}},
                ), mock.patch.object(
                    mihui_server,
                    "load_resource_monitor_proxies",
                    return_value=proxies,
                ), mock.patch.object(
                    mihui_server,
                    "select_resource_monitor_fastest_nodes",
                    return_value={"ok": True, "services": {}},
                ) as select_fastest, mock.patch.object(
                    mihui_server,
                    "get_resource_monitor_status",
                    return_value={"ok": True, "config": settings},
                ):
                    status, result = self.post_json(
                        server,
                        "/api/resource-monitor/settings",
                        settings,
                        headers={"X-Mihui-Action": "resource-monitor"},
                    )
            finally:
                self.stop_provider_server(server, thread)

        self.assertEqual(status, 200)
        self.assertTrue(result["ok"])
        select_fastest.assert_called_once_with(app_dir, settings, proxies)

    def test_resource_monitor_delay_uses_mihomo_proxy_probe(self):
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            return_value={"delay": 47},
        ) as request:
            delay = mihui_server.resource_monitor_delay(
                Path("."),
                "node name",
                {"url": "https://example.com/generate_204", "expected": 204},
                5000,
            )

        self.assertEqual(delay, 47)
        path = request.call_args.args[1]
        self.assertTrue(path.startswith("/proxies/node%20name/delay?"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)
        self.assertEqual(query["url"], ["https://example.com/generate_204"])
        self.assertEqual(query["timeout"], ["5000"])
        self.assertEqual(query["expected"], ["204"])

    def test_resource_monitor_delay_uses_provider_healthcheck_for_provider_node(self):
        with mock.patch.object(
            mihui_server,
            "mihomo_api_request",
            return_value={"delay": 53},
        ) as request:
            delay = mihui_server.resource_monitor_delay(
                Path("."),
                "node name",
                {"url": "https://example.com/generate_204", "expected": 204},
                5000,
                {"_mihui_provider": "main provider"},
            )

        self.assertEqual(delay, 53)
        path = request.call_args.args[1]
        self.assertTrue(
            path.startswith(
                "/providers/proxies/main%20provider/node%20name/healthcheck?"
            )
        )
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)
        self.assertEqual(query["url"], ["https://example.com/generate_204"])
        self.assertEqual(query["timeout"], ["5000"])
        self.assertNotIn("expected", query)

    def test_resource_monitor_settings_endpoint_requires_action_header(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            server, thread = self.start_mihui_server(app_dir)
            try:
                status, result = self.post_json(
                    server,
                    "/api/resource-monitor/settings",
                    mihui_server.default_resource_monitor_settings(),
                )
            finally:
                self.stop_provider_server(server, thread)

        self.assertEqual(status, 403)
        self.assertFalse(result["ok"])


if __name__ == "__main__":
    unittest.main()
