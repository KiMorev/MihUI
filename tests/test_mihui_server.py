import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "router"))

import mihui_server  # noqa: E402


class ProviderPayloadHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.server.received_user_agent = self.headers.get("User-Agent")
        self.server.received_hwid = self.headers.get("x-hwid")
        body = b"proxies:\n  - name: local\n    type: direct\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/yaml")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        return


class ProviderAdapterTests(unittest.TestCase):
    def test_fetch_provider_payload_forwards_headers(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), ProviderPayloadHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{server.server_address[1]}/sub.yaml"
            body, content_type = mihui_server.fetch_provider_payload(
                url,
                {"User-Agent": "MihomoTest/1.0", "x-hwid": "ABC123"},
            )
        finally:
            server.shutdown()
            thread.join(timeout=2)
            server.server_close()

        self.assertIn(b"name: local", body)
        self.assertEqual(content_type, "text/yaml")
        self.assertEqual(server.received_user_agent, "MihomoTest/1.0")
        self.assertEqual(server.received_hwid, "ABC123")

    def test_fetch_provider_payload_rejects_non_http_url(self):
        with self.assertRaisesRegex(ValueError, "http/https"):
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

    def test_is_loopback_address(self):
        self.assertTrue(mihui_server.is_loopback_address("127.0.0.1"))
        self.assertTrue(mihui_server.is_loopback_address("127.10.0.2"))
        self.assertTrue(mihui_server.is_loopback_address("::1"))
        self.assertFalse(mihui_server.is_loopback_address("192.168.1.2"))


if __name__ == "__main__":
    unittest.main()
