import http.client
import io
import json
import os
import stat
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server


class GithubUpdateTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.app_dir = Path(self.directory.name)
        (self.app_dir / "www").mkdir()
        (self.app_dir / "VERSION").write_text("v0.2.173")
        self.token = "github_pat_" + "test_" * 8
        mihui_server.github_api_states.clear()
        mihui_server.github_release_cache.clear()
        mihui_server.invalidate_component_release_cache()

    def metadata(self, request, max_bytes, headers=None):
        if headers is not None:
            headers.update({"x-ratelimit-limit": "5000", "x-ratelimit-remaining": "4999",
                            "x-ratelimit-reset": "10000"})
        return b'{"tag_name":"v0.2.174"}'

    def start_server(self):
        mihui_server.MihuiHandler.app_dir = self.app_dir
        server = ThreadingHTTPServer(("127.0.0.1", 0), lambda *args, **kwargs:
            mihui_server.MihuiHandler(*args, directory=str(self.app_dir / "www"), **kwargs))
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()

        def stop():
            server.shutdown()
            server.server_close()
            worker.join()
        self.addCleanup(stop)
        return server

    def request(self, server, path, payload=None, confirmed=True):
        connection = http.client.HTTPConnection(*server.server_address, timeout=3)
        headers = {"Content-Type": "application/json"}
        if confirmed:
            headers["X-Mihui-Action"] = "github-token"
        connection.request("GET" if payload is None else "POST", path,
                           body=None if payload is None else json.dumps(payload), headers=headers)
        response = connection.getresponse()
        body = response.read().decode("utf-8")
        status = response.status
        connection.close()
        self.assertNotIn(self.token, body)
        return status, body

    def test_settings_save_check_status_and_delete_never_return_secret(self):
        server = self.start_server()
        with mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=self.metadata) as fetch:
            status, body = self.request(server, "/api/github/token", {"token": self.token})
            self.assertEqual(status, 200)
            self.assertTrue(json.loads(body)["configured"])
            self.assertEqual((self.app_dir / "github-token").read_text().strip(), self.token)
            fetch.assert_not_called()
            status, body = self.request(server, "/api/github/status")
            self.assertTrue(json.loads(body)["configured"])
            fetch.assert_not_called()
            for path in ("/github-token", "/../github-token"):
                self.assertEqual(self.request(server, path)[0], 404)
            status, body = self.request(server, "/api/github/check", {})
            self.assertTrue(json.loads(body)["ok"])
            self.assertEqual(json.loads(body)["remaining"], 4999)
            self.request(server, "/api/update/check")
            self.assertEqual(fetch.call_count, 1)
            self.assertEqual(fetch.call_args.args[0].get_header("Authorization"), "Bearer " + self.token)
            status, body = self.request(server, "/api/github/token", {"token": ""})
            self.assertFalse(json.loads(body)["configured"])
            self.assertNotIn("remaining", json.loads(body))
            self.assertFalse((self.app_dir / "github-token").exists())
            self.assertEqual(fetch.call_count, 1)

    def test_token_requires_action_header_and_rejects_header_injection(self):
        server = self.start_server()
        self.assertEqual(self.request(server, "/api/github/token", {"token": self.token}, False)[0], 403)
        self.assertEqual(self.request(server, "/api/github/check", {}, False)[0], 403)
        for token in (None, 12, "short", self.token + "\nX-Test: true", "x" * 256):
            self.assertEqual(self.request(server, "/api/github/token", {"token": token})[0], 400)
        self.assertEqual(self.request(server, "/api/github/token", [self.token])[0], 400)
        self.assertFalse((self.app_dir / "github-token").exists())

    def test_token_file_is_replaced_with_owner_only_permissions(self):
        with mock.patch.object(mihui_server.os, "chmod", wraps=os.chmod) as chmod:
            mihui_server.save_github_token(self.app_dir, self.token)
            self.assertEqual(chmod.call_args.args[1], 0o600)
        if os.name == "posix":
            self.assertEqual(stat.S_IMODE((self.app_dir / "github-token").stat().st_mode), 0o600)
        self.assertFalse(list(self.app_dir.glob(".github-token-*")))

    def test_concurrent_page_checks_share_six_hour_cache_and_manual_checks_have_cooldown(self):
        with mock.patch.object(mihui_server.time, "time", return_value=1000) as clock, \
                mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=self.metadata) as fetch:
            with ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(lambda _: mihui_server.fetch_latest_release("test/repo", self.app_dir), range(5)))
            self.assertTrue(all(item["ok"] for item in results))
            self.assertEqual(fetch.call_count, 1)
            mihui_server.fetch_latest_release("test/repo", self.app_dir, force=True)
            self.assertEqual(fetch.call_count, 1)
            clock.return_value = 1060
            mihui_server.fetch_latest_release("test/repo", self.app_dir, force=True)
            self.assertEqual(fetch.call_count, 2)
            clock.return_value = 1060 + mihui_server.COMPONENT_RELEASE_CACHE_TTL - 1
            mihui_server.fetch_latest_release("test/repo", self.app_dir)
            self.assertEqual(fetch.call_count, 2)
            clock.return_value += 1
            mihui_server.fetch_latest_release("test/repo", self.app_dir)
            self.assertEqual(fetch.call_count, 3)

    def test_rate_limit_blocks_other_repositories_and_forced_checks_until_reset(self):
        error = urllib.error.HTTPError("https://api.github.com/", 403, "Forbidden",
            {"X-RateLimit-Limit": "60", "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "2000"},
            io.BytesIO(b'{"message":"API rate limit exceeded"}'))
        with mock.patch.object(mihui_server.time, "time", return_value=1000) as clock, \
                mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=[error, b'{"tag_name":"v2.0.0"}']) as fetch:
            first = mihui_server.fetch_latest_release("test/repo", self.app_dir)
            self.assertEqual(first["retryAt"], 2001)
            self.assertFalse(first["retryable"])
            for now in (1001, 1100, 2000):
                clock.return_value = now
                self.assertFalse(mihui_server.fetch_latest_release("test/other", self.app_dir, force=True)["ok"])
            self.assertEqual(fetch.call_count, 1)
            clock.return_value = 2001
            self.assertTrue(mihui_server.fetch_latest_release("test/other", self.app_dir, force=True)["ok"])
            self.assertEqual(fetch.call_count, 2)

    def test_manual_component_checks_reuse_catalog_for_one_minute(self):
        with mock.patch.object(mihui_server.time, "time", return_value=1000) as clock, \
                mock.patch.object(mihui_server, "fetch_component_releases", return_value=["v2.1.0"]) as fetch, \
                mock.patch.object(mihui_server, "fetch_xkeen_beta_build", return_value={
                    "version": "2.1.0", "buildTimestamp": "2026-10-05 12:00:00 MSK"}) as beta:
            mihui_server.get_component_release_catalog(self.app_dir, force=True)
            mihui_server.get_component_release_catalog(self.app_dir, force=True)
            self.assertEqual(fetch.call_count, 2)
            self.assertEqual(beta.call_count, 1)
            clock.return_value = 1060
            mihui_server.get_component_release_catalog(self.app_dir, force=True)
            self.assertEqual(fetch.call_count, 4)
            self.assertEqual(beta.call_count, 2)

    def test_retry_after_and_secondary_limit_are_respected(self):
        self.assertEqual(mihui_server.github_retry_at({"retry-after": "120"}, 1000), 1120)
        self.assertEqual(mihui_server.github_retry_at({"retry-after": "Thu, 01 Jan 1970 00:20:00 GMT"}, 1000), 1200)
        self.assertEqual(mihui_server.github_retry_at({"retry-after": "invalid"}, 1000), 0)
        error = urllib.error.HTTPError("https://api.github.com/", 403, "Forbidden", {},
                                      io.BytesIO(b'{"message":"secondary rate limit"}'))
        with mock.patch.object(mihui_server.time, "time", return_value=1000), \
                mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=error):
            self.assertEqual(mihui_server.fetch_latest_release("test/repo", self.app_dir)["retryAt"], 1060)

    def test_invalid_token_is_reported_without_retrying_or_echoing_error_body(self):
        mihui_server.save_github_token(self.app_dir, self.token)
        error = urllib.error.HTTPError("https://api.github.com/", 401, "Unauthorized", {}, io.BytesIO(self.token.encode()))
        with mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=error) as fetch:
            result = mihui_server.fetch_latest_release("test/repo", self.app_dir)
            self.assertFalse(result["retryable"])
            self.assertIn("отклонил токен", result["message"])
            self.assertNotIn(self.token, json.dumps(result))
            mihui_server.fetch_latest_release("test/repo", self.app_dir, force=True)
            self.assertEqual(fetch.call_count, 1)

    def test_changing_token_clears_cache_and_rate_limit(self):
        with mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=self.metadata) as fetch:
            mihui_server.fetch_latest_release("test/repo", self.app_dir)
            key = mihui_server.github_app_key(self.app_dir)
            mihui_server.github_api_states[key]["retryAt"] = 9999999999
            mihui_server.save_github_token(self.app_dir, self.token)
            self.assertTrue(mihui_server.fetch_latest_release("test/repo", self.app_dir)["ok"])
            self.assertEqual(fetch.call_count, 2)

    def test_only_api_requests_receive_token_and_redirects_do_not_inherit_it(self):
        mihui_server.save_github_token(self.app_dir, self.token)
        requests = []

        def metadata(request, max_bytes, headers=None):
            requests.append(request)
            return b"[]"

        with mock.patch.object(mihui_server, "fetch_component_metadata", side_effect=metadata), \
                mock.patch.object(mihui_server, "parse_xkeen_beta_archive", return_value={}):
            mihui_server.fetch_component_releases("test/repo", app_dir=self.app_dir)
            mihui_server.fetch_xkeen_beta_build("test/repo")
        self.assertEqual(requests[0].get_header("Authorization"), "Bearer " + self.token)
        self.assertIsNone(requests[1].get_header("Authorization"))
        redirected = mihui_server.urllib.request.HTTPRedirectHandler().redirect_request(
            requests[0], None, 302, "Found", {}, "https://example.com/download")
        self.assertIsNone(redirected.get_header("Authorization"))
        with self.assertRaises(ValueError):
            mihui_server.fetch_github_metadata(self.app_dir, "https://example.com/", 1024)

    def test_dns_fallback_preserves_authorization_and_rate_limit_headers(self):
        mihui_server.save_github_token(self.app_dir, self.token)
        error = urllib.error.URLError(mihui_server.socket.gaierror(-2, "DNS failure"))

        def curl(command, **kwargs):
            self.assertIn("Authorization: Bearer " + self.token, command)
            Path(command[command.index("--dump-header") + 1]).write_text(
                "HTTP/2 403\r\nX-RateLimit-Remaining: 0\r\nX-RateLimit-Reset: 2000\r\n\r\n")
            return subprocess.CompletedProcess(command, 22, stdout=b"", stderr=b"HTTP 403")

        with mock.patch.object(mihui_server.time, "time", return_value=1000), \
                mock.patch.object(mihui_server.urllib.request, "urlopen", side_effect=error), \
                mock.patch.object(mihui_server.subprocess, "run", side_effect=curl):
            result = mihui_server.fetch_latest_release("test/repo", self.app_dir)
            self.assertEqual(result["retryAt"], 2001)
            self.assertEqual(mihui_server.get_github_status(self.app_dir)["remaining"], 0)


if __name__ == "__main__":
    unittest.main()
