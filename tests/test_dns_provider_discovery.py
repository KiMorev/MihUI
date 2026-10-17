import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


class DnsProviderDiscoveryTests(unittest.TestCase):
    def test_nested_dhcp_records_preserve_provenance_and_deduplicate_addresses(self):
        ipv4 = {"address": "62.112.106.130", "service": "Dhcp::Client-GigabitEthernet1", "interface": "GigabitEthernet1"}
        ipv6 = {"address": "2001:DB8::53", "service": "Dhcp6::Client-ISP", "interface": "ISP"}
        second_interface = {**ipv4, "interface": "ISP2"}
        result = server.parse_provider_dns_servers([{"show": {"ip": {"name-server": {"server": [
            {"address": "1.1.1.1", "service": "Dns::Manager", "interface": ""},
            ipv4, ipv4, ipv6, second_interface,
        ]}}}}])
        self.assertEqual(result["serversState"], "detected")
        self.assertEqual(result["servers"], ["62.112.106.130", "2001:db8::53"])
        self.assertEqual(result["details"], [ipv4, {**ipv6, "address": "2001:db8::53"}, second_interface])

    def test_empty_collections_and_only_static_servers_are_known_empty(self):
        for payload in ([], {"server": []}, {"server": {}}, {"server": [
            {"address": "77.88.8.8", "service": "Dns::Manager", "interface": ""},
        ]}):
            with self.subTest(payload=payload):
                self.assertEqual(server.parse_provider_dns_servers(payload), {
                    "servers": [], "details": [], "serversState": "empty",
                })

    def test_malformed_dhcp_addresses_and_rci_errors_do_not_report_known_empty(self):
        for payload in (None, "invalid", {}, {"server": "invalid"},
                        {"server": [{"service": "Dhcp::Client-ISP"}]},
                        {"server": [{"service": "Dhcp::Client-ISP", "address": 123}]},
                        {"server": [{"service": "Dhcp::Client-ISP", "address": "999.1.1.1"}]},
                        {"server": [], "status": [{"status": "error", "message": "secret"}]}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                server.parse_provider_dns_servers(payload)

    def test_read_only_local_request_bypasses_environment_proxies_and_is_bounded(self):
        response = mock.MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({"server": [
            {"address": "192.0.2.53", "service": "DHCP::Client-ISP", "interface": "ISP"},
        ]}).encode()
        opener = mock.Mock()
        opener.open.return_value = response
        with mock.patch.object(server.urllib.request, "ProxyHandler", return_value="proxy-disabled") as proxy, mock.patch.object(
            server.urllib.request, "build_opener", return_value=opener
        ) as build:
            result = server.discover_provider_dns_servers()
        proxy.assert_called_once_with({})
        build.assert_called_once_with("proxy-disabled")
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, "http://127.0.0.1:79/rci/show/ip/name-server")
        self.assertEqual(request.get_method(), "GET")
        self.assertIsNone(request.data)
        self.assertEqual(opener.open.call_args.kwargs["timeout"], 2)
        response.__enter__.return_value.read.assert_called_once_with(256 * 1024 + 1)
        self.assertEqual(result["servers"], ["192.0.2.53"])

    def test_transport_failures_and_bad_responses_are_unknown_without_response_details(self):
        for failure in (TimeoutError("secret"), urllib.error.URLError("secret"),
                        urllib.error.HTTPError("http://secret", 403, "secret", {}, None)):
            with self.subTest(failure=failure), mock.patch.object(server.urllib.request, "build_opener") as build:
                build.return_value.open.side_effect = failure
                result = server.discover_provider_dns_servers()
            self.assertEqual(result["serversState"], "unknown")
            self.assertEqual(result["servers"], [])
            self.assertEqual(result["details"], [])
            self.assertNotIn("secret", result["error"])
        for data in (b"not-json secret", b"[]" + b" " * (256 * 1024), b'{"status":[{"status":"error"}]}'):
            with self.subTest(data_size=len(data)), mock.patch.object(server.urllib.request, "build_opener") as build:
                build.return_value.open.return_value.__enter__.return_value.read.return_value = data
                result = server.discover_provider_dns_servers()
            self.assertEqual(result["serversState"], "unknown")
            self.assertNotIn("secret", result["error"])

    def test_diagnostics_preserve_provider_flags_and_do_not_gate_activation(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir = Path(temp_dir)
            config_path = app_dir / "config.yaml"
            config_path.write_text("mixed-port: 7890\n", encoding="utf-8")
            (app_dir / "mihui.env").write_text(f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8")
            def command(_binary, arguments, **_kwargs):
                output = ""
                if arguments == ["-c", "show running-config"]:
                    output = "ip dhcp client no name-servers\ninterface ISP ipv6 name-servers auto\n"
                if arguments == ["help", "hash:ip"]:
                    output = "timeout inet6"
                return {"ok": True, "returncode": 0, "output": output}
            with mock.patch.object(server, "find_dns_tool", return_value="tool"), mock.patch.object(
                server, "run_dns_tool", side_effect=command
            ), mock.patch.object(server.os, "geteuid", return_value=0, create=True), mock.patch.object(
                server, "discover_dns_lan_addresses", return_value={"ok": True, "interfaces": ["br0"],
                    "ipv4": ["192.168.1.1"], "ipv6": [], "bindings": [], "candidates": [],
                    "selection": {"state": "ready", "message": "ready"}}
            ), mock.patch.object(server, "get_dns_proxy_groups", return_value={"ok": True, "groups": ["PROXY"],
                "proxies": {"PROXY": {"type": "Selector", "all": ["node"], "now": "node"}, "node": {"type": "Vless"}}}
            ), mock.patch.object(server, "get_port_listeners", side_effect=lambda port: {"listeners": [
                {"protocol": "udp", "owners": ["ndnproxy"]}, {"protocol": "tcp", "owners": ["ndnproxy"]},
            ] if port == 53 else []}), mock.patch.object(server, "probe_system_dns_fallback", return_value={
                "ok": True, "message": "ready"}
            ), mock.patch.object(server, "find_mihomo_binary", return_value="mihomo"), mock.patch.object(
                server, "dns_chain_is_safe", return_value=True
            ), mock.patch.object(server, "probe_dns_local_resolver", return_value={"ok": False}), mock.patch.object(
                server, "discover_provider_dns_servers", return_value={
                    "servers": [], "details": [], "serversState": "unknown", "error": "unavailable"}
            ):
                capabilities = server.collect_dns_protection_capabilities(app_dir)
        provider = capabilities["routerDns"]["provider"]
        self.assertTrue(provider["ignoreIpv4"])
        self.assertFalse(provider["ignoreIpv6"])
        self.assertEqual(provider["state"], "detected")
        self.assertEqual(provider["serversState"], "unknown")
        self.assertTrue(capabilities["activationReady"])
        self.assertTrue(capabilities["testReady"])


if __name__ == "__main__":
    unittest.main()
