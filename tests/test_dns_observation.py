import contextlib
import ipaddress
import json
import socket
import struct
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


def answer(query, address=None, rcode=0, truncated=False):
    identifier = struct.unpack_from("!H", query)[0]
    header = struct.pack("!HHHHHH", identifier, 0x8180 | rcode | (0x0200 if truncated else 0), 1, int(address is not None), 0, 0)
    record = b""
    if address:
        packed = ipaddress.ip_address(address).packed
        record = b"\xc0\x0c" + struct.pack("!HHIH", 1 if len(packed) == 4 else 28, 1, 30, len(packed)) + packed
    return header + query[12:] + record


class DnsObservationTests(unittest.TestCase):
    def test_discovers_actual_ports_without_guessing_policy_number(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, port in (("Policy7", 41102), ("Policy0", 42000), ("main", 53), ("other", 1053)):
                (root / f"ndnproxy_{name}.conf").write_text(f"dns_udp_port = {port} # policy\nsecret = hidden", encoding="utf-8")
            (root / "ndnproxy_dup.conf").write_text("dns_udp_port = 41102", encoding="utf-8")
            (root / "ndnproxy_bad.conf").write_text("dns_udp_port = 999999", encoding="utf-8")
            result = server.discover_observation_resolvers(root)
        self.assertEqual([item["port"] for item in result["candidates"]], [41102, 42000])
        self.assertEqual(len(result["candidates"][0]["sources"]), 2)
        self.assertNotIn("hidden", json.dumps(result))

    def test_missing_firmware_files_are_not_a_health_success(self):
        with tempfile.TemporaryDirectory() as directory:
            result = server.discover_observation_resolvers(Path(directory) / "missing")
        self.assertEqual(result, {"candidates": [], "unreadableFiles": 0})

    def test_unreadable_files_report_uncertainty(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "ndnproxy_x.conf").touch()
            with mock.patch.object(Path, "open", side_effect=PermissionError):
                result = server.discover_observation_resolvers(directory)
        self.assertEqual(result["unreadableFiles"], 1)

    def test_settings_are_opt_in_and_preserve_names(self):
        legacy = {"enabled": True, "intervalSeconds": 300, "timeoutMs": 4000}
        self.assertFalse(server.validate_dns_lab_settings(legacy)["localObservation"])
        settings = server.validate_dns_lab_settings({**legacy, "localObservation": True,
            "localNames": [{"name": "NAS.LAN.", "expectedAddresses": ["192.168.1.10", "fd00::1"]}]})
        with tempfile.TemporaryDirectory() as directory:
            server.save_dns_lab_settings(directory, settings)
            self.assertEqual(server.load_dns_lab_settings(directory), settings)
        self.assertEqual(settings["localNames"][0]["name"], "nas.lan")

    def test_rejects_invalid_or_unbounded_settings(self):
        base = server.default_dns_lab_settings()
        for changes in ({"enabled": "false"}, {"localObservation": "true"}, {"localNames": [{"name": "https://nas/"}]},
                        {"localNames": [{"name": "nas", "expectedAddresses": ["not-an-ip"]}]},
                        {"localNames": [{"name": "nas", "expectedAddresses": [1]}]},
                        {"localNames": [{"name": f"nas{index}"} for index in range(5)]},
                        {"localNames": [{"name": "NAS"}, {"name": "nas"}]}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                server.validate_dns_lab_settings({**base, **changes})

    def test_parses_ipv4_and_ipv6_records(self):
        for kind, address in ((1, "192.168.1.10"), (28, "fd00::10")):
            identifier, query = server.build_dns_query("nas.lan", qtype=kind)
            result = server.parse_observation_dns_response(answer(query, address), identifier, "nas.lan", kind)
            self.assertEqual(result["addresses"], [address])

    def test_follows_cname_but_ignores_unrelated_address(self):
        identifier, query = server.build_dns_query("nas.lan")
        target = b"\x06server\x03lan\x00"
        records = b"\xc0\x0c" + struct.pack("!HHIH", 5, 1, 30, len(target)) + target
        records += target + struct.pack("!HHIH", 1, 1, 30, 4) + socket.inet_aton("192.168.1.10")
        records += b"\x04evil\x00" + struct.pack("!HHIH", 1, 1, 30, 4) + socket.inet_aton("8.8.8.8")
        packet = struct.pack("!HHHHHH", identifier, 0x8180, 1, 3, 0, 0) + query[12:] + records
        self.assertEqual(server.parse_observation_dns_response(packet, identifier, "nas.lan", 1)["addresses"], ["192.168.1.10"])

    def test_rejects_wrong_questions_truncated_packets_and_pointer_loops(self):
        identifier, query = server.build_dns_query("nas.lan")
        packet = answer(query, "192.168.1.10")
        for data, name, kind in ((packet, "other.lan", 1), (packet, "nas.lan", 28),
                                 (packet[:-1], "nas.lan", 1), (packet[:12] + b"\xc0\x0c", "nas.lan", 1)):
            with self.subTest(data=data), self.assertRaises(ValueError):
                server.parse_observation_dns_response(data, identifier, name, kind)

    def test_no_records_are_not_proof_of_working_local_dns(self):
        empty = {"ok": False, "addresses": [], "rcode": 3}
        self.assertEqual(server.observation_comparison(empty, empty, []), "no_baseline")
        positive = {"ok": True, "addresses": ["192.168.1.10"], "rcode": 0}
        self.assertEqual(server.observation_comparison(empty, positive, []), "different")
        self.assertEqual(server.observation_comparison(positive, positive, []), "same")
        self.assertEqual(server.observation_comparison(positive, empty, ["192.168.1.10"]), "expected")
        self.assertEqual(server.observation_comparison(positive, positive, ["192.168.1.11"]), "different")
        self.assertEqual(server.observation_comparison({**positive, "truncated": True}, positive, []), "incomplete")

    def test_actual_loopback_udp_and_tcp_probes(self):
        for protocol in ("udp", "tcp"):
            with self.subTest(protocol=protocol), socket.socket(socket.AF_INET, socket.SOCK_DGRAM if protocol == "udp" else socket.SOCK_STREAM) as listener:
                listener.bind(("127.0.0.1", 0))
                listener.settimeout(3)
                if protocol == "tcp":
                    listener.listen(1)

                def respond():
                    if protocol == "udp":
                        query, peer = listener.recvfrom(4096)
                        listener.sendto(answer(query, "192.168.1.10"), peer)
                    else:
                        with listener.accept()[0] as stream:
                            size = struct.unpack("!H", server.receive_exact(stream, 2))[0]
                            payload = answer(server.receive_exact(stream, size), "192.168.1.10")
                            stream.sendall(struct.pack("!H", len(payload)) + payload)

                thread = threading.Thread(target=respond)
                thread.start()
                result = server.probe_observation_dns({"id": "system", "port": listener.getsockname()[1]}, {"name": "nas.lan"}, 1, protocol, 2000)
                thread.join(3)
                self.assertFalse(thread.is_alive())
                self.assertTrue(result["ok"], result)
                self.assertEqual(result["addresses"], ["192.168.1.10"])

    def test_route_collection_issues_only_read_commands(self):
        calls = []

        def read(binary, arguments):
            calls.append(arguments)
            return {"ok": True, "output": "-A PREROUTING -j _NDM_DNS\n-A MIHUI_DNS4 -j REDIRECT\ndns-proxy no filter engine\npassword secret"}

        with mock.patch.object(server, "find_dns_tool", side_effect=lambda _, tool: tool), mock.patch.object(server, "run_dns_tool", side_effect=read):
            result = server.collect_observation_route_context("unused")
        self.assertEqual(calls, [["-t", "nat", "-S"], ["-t", "nat", "-S"], ["-c", "show running-config"]])
        self.assertEqual(result["filterEngine"], "disabled")
        self.assertFalse(result["lanPathVerified"])
        self.assertNotIn("secret", json.dumps(result))

    def test_local_collection_keeps_applied_port_and_never_mutates_configuration(self):
        settings = {**server.default_dns_lab_settings(), "localObservation": True,
                    "localNames": [{"name": "nas.lan", "expectedAddresses": ["192.168.1.10"]}]}
        config = server.build_dns_protection_block("PROXY", False, True)
        found = {"candidates": [{"port": port} for port in (41101, 41102, 41103, 41104)], "unreadableFiles": 0}

        def probe(target, entry, kind, protocol, timeout):
            return {"resolver": target["id"], "port": target["port"], "name": entry["name"],
                    "type": "A" if kind == 1 else "AAAA", "transport": protocol,
                    "ok": kind == 1, "rcode": 0, "addresses": ["192.168.1.10"] if kind == 1 else []}

        with contextlib.ExitStack() as stack:
            for name in ("apply_dns_protection_action", "refresh_dns_firewall_lease", "ensure_dns_firewall", "save_dns_protection_runtime"):
                stack.enter_context(mock.patch.object(server, name, side_effect=AssertionError("must not mutate")))
            stack.enter_context(mock.patch.object(server, "discover_observation_resolvers", return_value=found))
            stack.enter_context(mock.patch.object(server, "load_dns_protection_runtime", return_value={"requestedMode": "active"}))
            stack.enter_context(mock.patch.object(server, "collect_observation_route_context", return_value={"lanPathVerified": False}))
            stack.enter_context(mock.patch.object(server, "probe_observation_dns", side_effect=probe))
            stack.enter_context(mock.patch.object(Path, "read_text", return_value="new-boot"))
            result = server.collect_local_dns_observation("unused", settings, config, {"candidatePorts": [41100], "bootId": "old-boot"})
        self.assertEqual(result["sampledPorts"], [41100, 41101, 41102])
        self.assertTrue(result["candidatesChanged"])
        self.assertTrue(result["mihomoConfigured"])
        self.assertTrue(result["rebootDetected"])
        self.assertEqual(len(result["probes"]), 20)
        self.assertEqual({row["comparison"] for row in result["probes"] if row["type"] == "A"}, {"expected"})

    def test_cycle_logs_local_results_and_context_changes_without_saving_yaml(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.ExitStack() as stack:
            root = Path(directory)
            config = root / "config.yaml"
            config.write_text("mixed-port: 7890\nsecret: do-not-log\n", encoding="utf-8")
            (root / "mihui.env").write_text(f'MIHUI_CONFIG_PATH="{config}"\n', encoding="utf-8")
            settings = {**server.default_dns_lab_settings(), "localObservation": True}
            server.save_dns_lab_settings(root, settings)
            original = config.read_bytes()
            stack.enter_context(mock.patch.object(server, "run_dns_lab_network_probes", return_value={"plain": [], "encrypted": []}))
            stack.enter_context(mock.patch.object(server, "get_dns_lab_whitelist_context", side_effect=[{"state": "normal"}, {"state": "active"}]))
            for function in ("get_dns_lab_services", "get_dns_lab_system_health", "get_dns_port_listeners"):
                stack.enter_context(mock.patch.object(server, function, return_value={}))
            local = {"candidatePorts": [41101], "bootId": "test", "names": [], "probes": []}
            stack.enter_context(mock.patch.object(server, "collect_local_dns_observation", return_value=local))
            for function in ("apply_dns_protection_action", "refresh_dns_firewall_lease", "ensure_dns_firewall"):
                stack.enter_context(mock.patch.object(server, function, side_effect=AssertionError("must not mutate")))
            event = server.run_dns_lab_cycle(root)
            self.assertTrue(event["contextChangedDuringMeasurement"])
            self.assertEqual(event["observation"], local)
            self.assertEqual(event["whitelist"]["state"], "normal")
            self.assertEqual(event["whitelistEnd"]["state"], "active")
            self.assertEqual(server.read_dns_lab_events(root)[0]["observation"], local)
            self.assertEqual(server.load_dns_lab_runtime(root)["observation"], {"candidatePorts": [41101], "bootId": "test"})
            self.assertEqual(config.read_bytes(), original)
            self.assertNotIn("do-not-log", json.dumps(event))

    def test_worker_does_not_revive_legacy_enabled_monitor(self):
        with mock.patch.object(server.time, "sleep", side_effect=[None, StopIteration]), mock.patch.object(
            server, "load_dns_lab_settings", return_value={**server.default_dns_lab_settings(), "enabled": True}
        ), mock.patch.object(server, "start_dns_lab_check") as start:
            with self.assertRaises(StopIteration):
                server.dns_lab_worker("unused")
        start.assert_not_called()

    def test_worker_runs_opted_in_observation_after_clock_moves_back(self):
        with mock.patch.object(server.time, "sleep", side_effect=[None, StopIteration]), mock.patch.object(
            server, "load_dns_lab_settings", return_value={**server.default_dns_lab_settings(), "enabled": True, "localObservation": True}
        ), mock.patch.object(server, "snapshot_dns_lab_job", return_value={"running": False}), mock.patch.object(
            server, "load_dns_lab_runtime", return_value={"checkedAt": 200}
        ), mock.patch.object(server.time, "time", return_value=100), mock.patch.object(server, "start_dns_lab_check") as start:
            with self.assertRaises(StopIteration):
                server.dns_lab_worker("unused")
        start.assert_called_once_with("unused")


if __name__ == "__main__":
    unittest.main()
