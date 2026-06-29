import os
import sys
import tempfile
import threading
import unittest
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "router"))

import mihui_server  # noqa: E402


class ProviderPayloadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
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

    def restore_decryptor_env(self, previous):
        if previous is None:
            os.environ.pop(mihui_server.HAPP_DECRYPTOR_ENV_KEY, None)
        else:
            os.environ[mihui_server.HAPP_DECRYPTOR_ENV_KEY] = previous

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

    def test_fetch_provider_payload_appends_hwid_when_requested(self):
        server, thread = self.start_provider_server()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/target.yaml"
            mihui_server.fetch_provider_payload(url, {"x-hwid": "ABC123"}, append_hwid=True)
        finally:
            self.stop_provider_server(server, thread)

        self.assertEqual(server.received_hwid_query, "ABC123")

    def test_fetch_provider_payload_rejects_non_http_url(self):
        previous = os.environ.pop(mihui_server.HAPP_DECRYPTOR_ENV_KEY, None)
        self.addCleanup(self.restore_decryptor_env, previous)

        with self.assertRaisesRegex(ValueError, "external decryptor"):
            mihui_server.fetch_provider_payload("happ://crypt/example")

    def test_fetch_provider_payload_uses_configured_happ_decryptor(self):
        previous = os.environ.get(mihui_server.HAPP_DECRYPTOR_ENV_KEY)
        self.addCleanup(self.restore_decryptor_env, previous)

        with tempfile.TemporaryDirectory() as temp_dir:
            script = Path(temp_dir) / "fake_happ_decryptor.py"
            script.write_text(
                "import sys\n"
                "assert sys.argv[1].startswith('happ://crypt')\n"
                "print('proxies:')\n"
                "print('  - name: decrypted')\n"
                "print('    type: direct')\n",
                encoding="utf-8",
            )
            os.environ[mihui_server.HAPP_DECRYPTOR_ENV_KEY] = (
                f'"{Path(sys.executable).as_posix()}" "{script.as_posix()}"'
            )

            body, content_type = mihui_server.fetch_provider_payload(
                "happ://crypt/example",
                {},
                app_dir=Path(temp_dir),
            )

        self.assertEqual(content_type, "text/yaml; charset=utf-8")
        self.assertIn(b"name: decrypted", body)

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

    def test_is_loopback_address(self):
        self.assertTrue(mihui_server.is_loopback_address("127.0.0.1"))
        self.assertTrue(mihui_server.is_loopback_address("127.10.0.2"))
        self.assertTrue(mihui_server.is_loopback_address("::1"))
        self.assertFalse(mihui_server.is_loopback_address("192.168.1.2"))


if __name__ == "__main__":
    unittest.main()
