import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "router"))

import mihui_server  # noqa: E402


class DnsProtectionTests(unittest.TestCase):
    def make_app(self, directory, text="mixed-port: 7890\n"):
        app_dir = Path(directory)
        config_path = app_dir / "config.yaml"
        config_path.write_text(text, encoding="utf-8")
        (app_dir / "mihui.env").write_text(
            f'MIHUI_CONFIG_PATH="{config_path}"\n', encoding="utf-8"
        )
        return app_dir, config_path

    def ready_capabilities(self):
        return {
            "ready": True,
            "activationReady": True,
            "testReady": True,
            "strictSupported": False,
            "checks": [],
            "lanInterfaces": ["br0"],
            "lanCandidates": [{"interface": "br0", "ipv4": ["192.168.1.1"], "ipv6": ["fe80::1"]}],
            "lanSelection": {"state": "ready", "message": "LAN selected"},
            "addresses": {"ipv4": ["192.168.1.1"], "ipv6": ["fe80::1"]},
            "ipv6ClientDns": True,
            "proxyGroups": ["PROXY", "FALLBACK"],
            "selectedProxyGroup": "PROXY",
            "localResolver": {"ok": True, "tcpDiagnosticOk": False},
            "systemFallback": {"ok": True, "state": "ready", "message": "System DNS answers fresh UDP queries", "tcpDiagnosticOk": False},
            "routerDns": {
                "provider": {"ignoreIpv4": None, "ignoreIpv6": None, "servers": [], "state": "unknown"},
                "transit": {"blocked": None, "state": "unknown"},
            },
        }

    def test_managed_dns_block_routes_local_names_without_geosite_dependency(self):
        original = "mixed-port: 7890\n"
        prepared = mihui_server.prepare_dns_protection_text(
            original, "PROXY", ipv6_enabled=True, local_resolver=True
        )

        self.assertIn("listen: ':1053'", prepared)
        self.assertIn("ipv6: true", prepared)
        self.assertIn("enhanced-mode: redir-host", prepared)
        self.assertIn("https://1.1.1.1/dns-query#PROXY", prepared)
        self.assertIn("udp://127.0.0.1:53", prepared)
        for domain in ("*", "+.lan", "+.localdomain", "+.home.arpa"):
            self.assertIn(f"    '{domain}':", prepared)
        self.assertNotIn("geosite:", prepared)
        self.assertNotIn("+.local'", prepared)
        self.assertNotIn("plex.direct", prepared)
        self.assertNotIn("ts.net", prepared)
        self.assertIn("udp://127.0.0.1:41100", prepared)
        self.assertNotIn("category-ru", prepared)
        self.assertEqual(mihui_server.remove_dns_protection_text(prepared), original)
        without_local = mihui_server.prepare_dns_protection_text(original, "PROXY", False, False)
        self.assertNotIn("nameserver-policy", without_local)
        self.assertNotIn("41100", without_local)

    def test_unmanaged_dns_section_is_never_overwritten(self):
        with self.assertRaisesRegex(ValueError, "unmanaged"):
            mihui_server.prepare_dns_protection_text(
                "dns: {enable: true}\n", "PROXY", False
            )

    def test_dns_request_rejects_browser_supplied_command_fields(self):
        revision = "a" * 64
        with self.assertRaisesRegex(ValueError, "unknown DNS request field"):
            mihui_server.validate_dns_protection_request(
                {"action": "activate", "expectedRevision": revision, "command": "iptables -F"},
                require_action=True,
            )

    def test_dns_request_bounds_interface_selection(self):
        for value in (None, "br0", ["br0", "br0"], ["br0;reboot"], [123], [f"br{n}" for n in range(17)]):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "lanInterfaces"):
                mihui_server.validate_dns_protection_request({"lanInterfaces": value})
        self.assertEqual(mihui_server.validate_dns_protection_request({"lanInterfaces": ["br1"]})["lanInterfaces"], ["br1"])
        self.assertEqual(mihui_server.validate_dns_protection_request({"lanInterfaces": []})["lanInterfaces"], [])
        self.assertIsNone(mihui_server.validate_dns_protection_request({})["lanInterfaces"])

    def test_strict_action_requires_confirmations_and_never_mutates(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            revision = mihui_server.config_revision(config_path.read_text(encoding="utf-8"))
            request = mihui_server.validate_dns_protection_request(
                {
                    "action": "activate",
                    "profile": "strict",
                    "expectedRevision": revision,
                    "confirmations": {},
                },
                require_action=True,
            )
            with mock.patch.object(mihui_server, "save_checked_config") as save, mock.patch.object(
                mihui_server, "run_dns_tool"
            ) as command:
                result = mihui_server.apply_dns_protection_action(app_dir, request)

        self.assertFalse(result["ok"])
        self.assertEqual(result["stage"], "validation")
        self.assertEqual(
            set(result["missingConfirmations"]),
            {"providerDns", "transitDns", "wanReconnect"},
        )
        save.assert_not_called()
        command.assert_not_called()

    def test_strict_action_stays_unsupported_after_all_confirmations(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            revision = mihui_server.config_revision(config_path.read_text(encoding="utf-8"))
            request = mihui_server.validate_dns_protection_request(
                {
                    "action": "activate",
                    "profile": "strict",
                    "expectedRevision": revision,
                    "confirmations": {
                        "providerDns": True,
                        "transitDns": True,
                        "wanReconnect": True,
                    },
                },
                require_action=True,
            )
            with mock.patch.object(mihui_server, "save_checked_config") as save:
                result = mihui_server.apply_dns_protection_action(app_dir, request)

        self.assertFalse(result["ok"])
        self.assertEqual(result["stage"], "unsupported")
        save.assert_not_called()

    def test_activation_checks_revision_before_firewall_or_config_changes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, _ = self.make_app(temp_dir)
            request = mihui_server.validate_dns_protection_request(
                {"action": "activate", "expectedRevision": "0" * 64},
                require_action=True,
            )
            with mock.patch.object(mihui_server, "preview_dns_protection") as preview, mock.patch.object(
                mihui_server, "remove_dns_firewall"
            ) as firewall, mock.patch.object(mihui_server, "save_checked_config") as save:
                result = mihui_server.apply_dns_protection_action(app_dir, request)

        self.assertEqual(result["stage"], "conflict")
        preview.assert_not_called()
        firewall.assert_not_called()
        save.assert_not_called()

    def test_system_mode_disables_capture_before_reporting_stale_revision(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update(
                {
                    "requestedMode": "active",
                    "lanInterfaces": ["br0"],
                    "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
                }
            )
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            request = mihui_server.validate_dns_protection_request(
                {"action": "system", "expectedRevision": "0" * 64},
                require_action=True,
            )
            order = []
            with mock.patch.object(
                mihui_server,
                "remove_dns_firewall",
                side_effect=lambda *_: order.append("firewall") or {"ok": True, "errors": []},
            ), mock.patch.object(
                mihui_server,
                "dns_capture_lease_state",
                return_value={"known": True, "active": False, "complete": False},
            ), mock.patch.object(mihui_server, "save_checked_config") as save:
                result = mihui_server.apply_dns_protection_action(app_dir, request)
            stopped = mihui_server.load_dns_protection_runtime(app_dir)

        self.assertFalse(result["ok"])
        self.assertEqual(result["stage"], "conflict")
        self.assertTrue(result["captureDisabled"])
        self.assertEqual(order, ["firewall"])
        self.assertEqual(stopped["requestedMode"], "system")
        save.assert_not_called()

    def test_repeated_system_keeps_listener_while_prior_cleanup_is_pending(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            config_path.write_text(protected, encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "test",
                "fallbackPending": True,
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            request = mihui_server.validate_dns_protection_request(
                {"action": "system", "expectedRevision": mihui_server.config_revision(protected)},
                require_action=True,
            )
            with mock.patch.object(
                mihui_server, "remove_dns_firewall", return_value={"ok": False, "errors": ["failed"]}
            ), mock.patch.object(
                mihui_server, "dns_capture_lease_state", return_value={"known": False, "active": None, "complete": False}
            ), mock.patch.object(mihui_server, "save_checked_config") as save:
                result = mihui_server.apply_dns_system_mode(app_dir, request, protected, runtime)

        self.assertEqual(result["mode"], "fallback")
        self.assertTrue(result["fallbackPending"])
        self.assertTrue(result["runtime"]["fallbackPending"])
        save.assert_not_called()

    def test_system_can_remove_listener_after_pending_lease_is_confirmed_expired(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "test",
                "fallbackPending": True,
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            request = mihui_server.validate_dns_protection_request(
                {"action": "system", "expectedRevision": mihui_server.config_revision(protected)},
                require_action=True,
            )
            restored = mihui_server.remove_dns_protection_text(protected)
            with mock.patch.object(
                mihui_server, "remove_dns_firewall", return_value={"ok": True, "errors": []}
            ), mock.patch.object(
                mihui_server, "dns_capture_lease_state", return_value={"known": True, "active": False, "complete": False}
            ), mock.patch.object(
                mihui_server,
                "save_checked_config",
                return_value={"ok": True, "applied": True, "revision": mihui_server.config_revision(restored)},
            ) as save:
                result = mihui_server.apply_dns_system_mode(app_dir, request, protected, runtime)

        self.assertTrue(result["ok"])
        self.assertEqual(result["mode"], "system")
        save.assert_called_once()
        self.assertEqual(save.call_args.args[1], restored)

    def test_test_action_cannot_clear_unconfirmed_pending_capture(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            revision = mihui_server.config_revision(config_path.read_text(encoding="utf-8"))
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "test",
                "fallbackPending": True,
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            request = mihui_server.validate_dns_protection_request(
                {"action": "test", "expectedRevision": revision}, require_action=True
            )
            with mock.patch.object(
                mihui_server, "dns_capture_lease_state", return_value={"known": False, "active": None, "complete": False}
            ), mock.patch.object(mihui_server, "preview_dns_protection") as preview, mock.patch.object(
                mihui_server, "save_checked_config"
            ) as save:
                result = mihui_server.apply_dns_protection_action(app_dir, request)

        self.assertEqual(result["stage"], "preflight")
        self.assertEqual(result["mode"], "fallback")
        self.assertTrue(result["fallbackPending"])
        preview.assert_not_called()
        save.assert_not_called()

    def test_protected_probe_uses_one_fresh_name_and_accepts_nxdomain(self):
        calls = []

        def probe(address, port, protocol, timeout_ms=1000, **kwargs):
            calls.append((address, protocol, kwargs["query_name"], kwargs["accepted_rcodes"]))
            return {"ok": True}

        with mock.patch.object(mihui_server, "probe_dns_endpoint", side_effect=probe):
            first = mihui_server.probe_mihomo_dns_listener(False)
            second = mihui_server.probe_mihomo_dns_listener(False)

        self.assertTrue(first["ok"])
        self.assertEqual(calls[0][2], calls[1][2])
        self.assertNotEqual(calls[0][2], calls[2][2])
        self.assertEqual(calls[0][3], (0, 3))

    def test_router_dns_parser_reports_only_explicit_provider_flags(self):
        parsed = mihui_server.parse_router_dns_settings(
            """
interface ISP
 ip dhcp client no name-servers
no interface ISP ipv6 name-servers auto
dns-proxy intercept enable
ip name-server 1.1.1.1
"""
        )

        self.assertTrue(parsed["provider"]["ignoreIpv4"])
        self.assertTrue(parsed["provider"]["ignoreIpv6"])
        self.assertTrue(parsed["transit"]["blocked"])
        self.assertEqual(parsed["system"]["servers"], ["1.1.1.1"])

        defaults = mihui_server.parse_router_dns_settings("hostname Router\n")
        self.assertIsNone(defaults["provider"]["ignoreIpv4"])
        self.assertIsNone(defaults["provider"]["ignoreIpv6"])
        self.assertIsNone(defaults["transit"]["blocked"])
        self.assertEqual(defaults["transit"]["state"], "unknown")

    def test_resilient_activation_applies_listener_before_short_lease(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            original = config_path.read_text(encoding="utf-8")
            revision = mihui_server.config_revision(original)
            capabilities = self.ready_capabilities()
            preview = {
                "ok": True,
                "proxyGroup": "PROXY",
                "capabilities": capabilities,
                "fallback": {"preserved": True},
            }
            calls = []

            def save_config(_app_dir, text, expected_revision=None):
                calls.append(("config", text, expected_revision))
                return {
                    "ok": True,
                    "applied": True,
                    "revision": mihui_server.config_revision(text),
                }

            request = mihui_server.validate_dns_protection_request(
                {
                    "action": "activate",
                    "profile": "resilient",
                    "proxyGroup": "PROXY",
                    "expectedRevision": revision,
                },
                require_action=True,
            )
            with mock.patch.object(
                mihui_server, "preview_dns_protection", return_value=preview
            ), mock.patch.object(
                mihui_server, "save_checked_config", side_effect=save_config
            ), mock.patch.object(
                mihui_server, "wait_for_mihomo_dns", return_value={"ok": True, "probes": []}
            ), mock.patch.object(
                mihui_server, "ensure_dns_firewall", side_effect=lambda *_: calls.append(("firewall",)) or {"ok": True}
            ), mock.patch.object(
                mihui_server, "refresh_dns_firewall_lease", side_effect=lambda *_: calls.append(("lease",)) or {"ok": True}
            ):
                result = mihui_server.apply_dns_protection_action(app_dir, request)

            runtime = mihui_server.load_dns_protection_runtime(app_dir)

        self.assertTrue(result["ok"])
        self.assertEqual(result["mode"], "active")
        self.assertEqual([item[0] for item in calls], ["config", "firewall", "lease"])
        self.assertEqual(calls[0][2], revision)
        self.assertIn("listen: ':1053'", calls[0][1])
        self.assertEqual(runtime["requestedMode"], "active")
        self.assertTrue(runtime["ipv6"])

    def test_firewall_rule_is_gated_by_destination_lease_set(self):
        commands = []

        def command(_binary, arguments, timeout=5):
            commands.append(arguments)
            if arguments[:4] == ["-t", "nat", "-S", mihui_server.DNS_PROTECTION_CHAIN4]:
                return {"ok": False, "returncode": 1, "output": "", "message": ""}
            if arguments[:2] == ["list", mihui_server.DNS_PROTECTION_SET4]:
                return {"ok": False, "returncode": 1, "output": "", "message": ""}
            if "-C" in arguments:
                return {"ok": False, "returncode": 1, "output": "", "message": ""}
            return {"ok": True, "returncode": 0, "output": "", "message": ""}

        spec = {
            "binary": "/sbin/iptables",
            "chain": mihui_server.DNS_PROTECTION_CHAIN4,
            "set": mihui_server.DNS_PROTECTION_SET4,
            "family": "inet",
            "addresses": ["192.168.1.1"],
            "interfaces": ["br0"],
        }
        with mock.patch.object(mihui_server, "run_dns_tool", side_effect=command):
            result = mihui_server.ensure_dns_firewall_family("/sbin/ipset", spec)

        self.assertTrue(result["ok"])
        create = next(item for item in commands if item and item[0] == "create")
        self.assertIn("timeout", create)
        append_rules = [item for item in commands if "-A" in item]
        self.assertEqual(len(append_rules), 2)
        for rule in append_rules:
            self.assertIn("--match-set", rule)
            self.assertIn(mihui_server.DNS_PROTECTION_SET4, rule)
            self.assertIn("dst", rule)
        flush_index = commands.index(["flush", mihui_server.DNS_PROTECTION_SET4])
        first_rule_index = min(
            index for index, command in enumerate(commands)
            if "-A" in command or "-I" in command
        )
        self.assertLess(flush_index, first_rule_index)

    def test_ipset_operational_error_is_not_reported_as_absent_lease(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, _ = self.make_app(temp_dir)
            runtime = mihui_server.default_dns_protection_runtime()
            runtime["addresses"] = {"ipv4": ["192.168.1.1"], "ipv6": []}
            with mock.patch.object(mihui_server, "find_dns_tool", return_value="/sbin/ipset"), mock.patch.object(
                mihui_server,
                "run_dns_tool",
                return_value={"ok": False, "returncode": 1, "output": "Permission denied", "message": "Permission denied"},
            ):
                unknown = mihui_server.dns_capture_lease_state(app_dir, runtime)
            with mock.patch.object(mihui_server, "find_dns_tool", return_value="/sbin/ipset"), mock.patch.object(
                mihui_server,
                "run_dns_tool",
                return_value={"ok": False, "returncode": 1, "output": "192.168.1.1 is NOT in set", "message": ""},
            ):
                absent = mihui_server.dns_capture_lease_state(app_dir, runtime)

        self.assertFalse(unknown["known"])
        self.assertIsNone(unknown["active"])
        self.assertTrue(absent["known"])
        self.assertFalse(absent["active"])

    def test_firewall_inspection_distinguishes_unknown_from_missing(self):
        spec = {
            "binary": "/sbin/iptables",
            "chain": mihui_server.DNS_PROTECTION_CHAIN4,
            "set": mihui_server.DNS_PROTECTION_SET4,
            "family": "inet",
            "addresses": ["192.168.1.1"],
            "interfaces": ["br0"],
        }
        with mock.patch.object(
            mihui_server,
            "run_dns_tool",
            return_value={"ok": False, "returncode": 1, "output": "Permission denied", "message": "Permission denied"},
        ):
            unknown = mihui_server.dns_firewall_family_state("/sbin/ipset", spec)
        with mock.patch.object(
            mihui_server,
            "run_dns_tool",
            return_value={"ok": False, "returncode": 1, "output": "The set with the given name does not exist", "message": ""},
        ):
            missing = mihui_server.dns_firewall_family_state("/sbin/ipset", spec)

        self.assertEqual(unknown, "unknown")
        self.assertEqual(missing, "missing")

    def test_system_fallback_requires_udp_on_each_address_but_tcp_is_diagnostic(self):
        targets = []

        def v4_probe(address, _port, protocol, *_args, **_kwargs):
            targets.append(address)
            return {"address": address, "transport": protocol, "ok": protocol == "udp"}

        with mock.patch.object(mihui_server, "probe_dns_endpoint", side_effect=v4_probe):
            ipv4 = mihui_server.probe_system_dns_fallback([
                {"address": "192.168.1.1", "interface": "br0"}
            ])
        self.assertTrue(ipv4["ok"])
        self.assertEqual(ipv4["state"], "ready")
        self.assertFalse(ipv4["tcpDiagnosticOk"])
        self.assertEqual(set(targets), {"192.168.1.1"})

        def dual_probe(address, _port, protocol, *_args, **_kwargs):
            return {
                "address": address,
                "transport": protocol,
                "ok": protocol == "tcp" or address == "127.0.0.1",
            }

        with mock.patch.object(mihui_server, "probe_dns_endpoint", side_effect=dual_probe):
            dual = mihui_server.probe_system_dns_fallback([
                {"address": "192.168.1.1", "interface": "br0"},
                {"address": "2001:db8::1", "interface": "br0"},
            ])
        self.assertFalse(dual["ok"])
        self.assertEqual(dual["state"], "failed")

    def test_missing_lan_does_not_claim_system_dns_failed(self):
        with mock.patch.object(mihui_server, "probe_dns_endpoint") as probe:
            result = mihui_server.probe_system_dns_fallback([])
        self.assertFalse(result["ok"])
        self.assertEqual(result["state"], "not-tested")
        self.assertIn("not tested", result["message"])
        self.assertEqual(result["probes"], [])
        probe.assert_not_called()

    def test_preview_reports_failed_system_fallback_and_blocks_activation(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, _ = self.make_app(temp_dir)
            capabilities = self.ready_capabilities()
            capabilities.update({
                "ready": False,
                "activationReady": False,
                "systemFallback": {"ok": False, "state": "failed", "message": "System DNS did not answer", "tcpDiagnosticOk": False},
            })
            request = mihui_server.validate_dns_protection_request(
                {"profile": "resilient", "proxyGroup": "PROXY"}
            )
            with mock.patch.object(
                mihui_server, "collect_dns_protection_capabilities", return_value=capabilities
            ), mock.patch.object(
                mihui_server, "find_mihomo_binary", return_value="/opt/bin/mihomo"
            ), mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True, "message": "OK"}
            ), mock.patch.object(
                mihui_server, "get_dns_protection_mode", return_value="system"
            ):
                preview = mihui_server.preview_dns_protection(app_dir, request)

        self.assertFalse(preview["canActivate"])
        self.assertFalse(preview["fallback"]["preserved"])
        self.assertIn("system-fallback", {item["code"] for item in preview["warnings"]})

    def test_preview_returns_config_error_and_records_only_safe_diagnostics(self):
        error = "list private not found in GeoSite.dat; password: secret-value; https://subscription.example/token"
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            original = config_path.read_text(encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime["lanInterfaces"] = ["br0"]
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            request = mihui_server.validate_dns_protection_request({"lanInterfaces": ["br1"]})
            config_check = {"ok": False, "available": True, "returncode": 1, "message": error}
            with mock.patch.object(
                mihui_server, "collect_dns_protection_capabilities", return_value=self.ready_capabilities()
            ) as capabilities, mock.patch.object(
                mihui_server, "find_mihomo_binary", return_value="mihomo"
            ), mock.patch.object(
                mihui_server, "check_mihomo_config", return_value=config_check
            ), mock.patch.object(mihui_server, "save_checked_config") as save, mock.patch.object(
                mihui_server, "ensure_dns_firewall"
            ) as firewall, mock.patch.object(mihui_server, "save_dns_protection_runtime") as save_runtime:
                result = mihui_server.preview_dns_protection(app_dir, request)
            self.assertFalse(result["ok"])
            self.assertEqual(result["message"], error)
            self.assertEqual(result["configCheck"], config_check)
            self.assertFalse(result["canTest"])
            self.assertEqual(result["event"]["type"], "preview_failed")
            self.assertEqual(result["events"], [result["event"]])
            log = mihui_server.dns_protection_log_path(app_dir).read_text(encoding="utf-8")
            self.assertIn("list private not found in GeoSite.dat", log)
            self.assertNotIn("secret-value", log)
            self.assertNotIn("subscription.example", log)
            self.assertEqual(config_path.read_text(encoding="utf-8"), original)
            self.assertEqual(mihui_server.load_dns_protection_runtime(app_dir), runtime)
            capabilities.assert_called_once_with(app_dir, "", lan_interfaces=["br1"])
            save.assert_not_called()
            firewall.assert_not_called()
            save_runtime.assert_not_called()

    def test_preview_logs_success_and_does_not_mislabel_unselected_lan(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, _ = self.make_app(temp_dir)
            capabilities = self.ready_capabilities()
            request = mihui_server.validate_dns_protection_request({})
            with mock.patch.object(
                mihui_server, "collect_dns_protection_capabilities", return_value=capabilities
            ), mock.patch.object(mihui_server, "find_mihomo_binary", return_value="mihomo"), mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
            ):
                success = mihui_server.preview_dns_protection(app_dir, request)
                capabilities.update({"activationReady": False, "testReady": False})
                capabilities["systemFallback"] = mihui_server.probe_system_dns_fallback([])
                capabilities["checks"] = [{"id": "lan-selection", "ok": False, "required": True}]
                unselected = mihui_server.preview_dns_protection(app_dir, request)
                internal = mihui_server.preview_dns_protection(app_dir, request, record_event=False)
            self.assertEqual(success["event"]["type"], "preview")
            self.assertEqual(unselected["event"]["type"], "preview_failed")
            self.assertIn("system-fallback-not-tested", {item["code"] for item in unselected["warnings"]})
            self.assertNotIn("system-fallback", {item["code"] for item in unselected["warnings"]})
            self.assertFalse(unselected["canActivate"])
            self.assertFalse(unselected["canTest"])
            self.assertNotIn("event", internal)
            self.assertEqual(len(mihui_server.read_dns_protection_events(app_dir)), 2)

    def test_action_preflight_rejects_invalid_scope_without_mutation_and_returns_preview(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            revision = mihui_server.config_revision(config_path.read_text(encoding="utf-8"))
            capabilities = self.ready_capabilities()
            capabilities.update({"testReady": False, "activationReady": False, "lanInterfaces": []})
            capabilities["lanSelection"] = {"state": "invalid", "message": "Selected LAN is unavailable"}
            capabilities["checks"] = [{"id": "lan-selection", "ok": False, "required": True}]
            request = mihui_server.validate_dns_protection_request({
                "action": "test", "lanInterfaces": ["missing"], "expectedRevision": revision,
            }, require_action=True)
            with mock.patch.object(
                mihui_server, "collect_dns_protection_capabilities", return_value=capabilities
            ), mock.patch.object(mihui_server, "find_mihomo_binary", return_value="mihomo"), mock.patch.object(
                mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
            ), mock.patch.object(mihui_server, "save_checked_config") as save, mock.patch.object(
                mihui_server, "save_dns_protection_runtime"
            ) as runtime, mock.patch.object(mihui_server, "ensure_dns_firewall") as firewall:
                result = mihui_server.apply_dns_protection_action(app_dir, request)
            self.assertEqual(result["stage"], "preflight")
            self.assertEqual(result["preview"]["capabilities"]["lanSelection"]["state"], "invalid")
            self.assertEqual(result["event"]["diagnostics"]["failedChecks"], ["lan-selection"])
            self.assertEqual(result["events"], [result["event"]])
            save.assert_not_called()
            runtime.assert_not_called()
            firewall.assert_not_called()

    def test_firewall_failure_preserves_listener_when_cleanup_is_not_confirmed(self):
        for lease_state in (
            {"known": True, "active": True, "complete": False},
            {"known": False, "active": None, "complete": False},
        ):
            with self.subTest(lease_state=lease_state), tempfile.TemporaryDirectory() as temp_dir:
                app_dir, config_path = self.make_app(temp_dir)
                revision = mihui_server.config_revision(config_path.read_text(encoding="utf-8"))
                capabilities = self.ready_capabilities()
                preview = {
                    "ok": True,
                    "proxyGroup": "PROXY",
                    "capabilities": capabilities,
                    "fallback": {"preserved": True},
                }
                writes = []

                def save_config(_app_dir, text, expected_revision=None):
                    writes.append(text)
                    return {"ok": True, "applied": True, "revision": mihui_server.config_revision(text)}

                request = mihui_server.validate_dns_protection_request(
                    {"action": "activate", "expectedRevision": revision}, require_action=True
                )
                with mock.patch.object(mihui_server, "preview_dns_protection", return_value=preview), mock.patch.object(
                    mihui_server, "save_checked_config", side_effect=save_config
                ), mock.patch.object(
                    mihui_server, "wait_for_mihomo_dns", return_value={"ok": True, "probes": []}
                ), mock.patch.object(
                    mihui_server, "ensure_dns_firewall", return_value={"ok": False, "message": "failed"}
                ), mock.patch.object(
                    mihui_server, "remove_dns_firewall", return_value={"ok": False, "errors": ["failed"]}
                ), mock.patch.object(
                    mihui_server, "dns_capture_lease_state", return_value=lease_state
                ):
                    result = mihui_server.apply_dns_protection_action(app_dir, request)

                self.assertTrue(result["fallbackPending"])
                self.assertEqual(len(writes), 1)
                self.assertIn("listen: ':1053'", writes[0])

    def test_worker_probes_before_rebuilding_missing_firewall(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            config_path.write_text(protected, encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "active",
                "managedBlockRevision": mihui_server.dns_managed_block_revision(protected),
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            calls = []
            capabilities = self.ready_capabilities()
            capabilities.update({"ipv6ClientDns": False, "addresses": runtime["addresses"]})
            lan = {"ok": True, "interfaces": ["br0"], "ipv4": ["192.168.1.1"], "ipv6": []}
            with mock.patch.object(
                mihui_server, "discover_dns_lan_addresses", return_value=lan
            ), mock.patch.object(
                mihui_server, "probe_mihomo_dns_listener", side_effect=lambda *_args, **_kwargs: calls.append("probe") or {"ok": True}
            ), mock.patch.object(
                mihui_server, "dns_firewall_installed", side_effect=lambda *_: calls.append("verify") or {"ok": False}
            ), mock.patch.object(
                mihui_server, "collect_dns_protection_capabilities", return_value=capabilities
            ), mock.patch.object(
                mihui_server, "ensure_dns_firewall", side_effect=lambda *_: calls.append("firewall") or {"ok": True}
            ), mock.patch.object(
                mihui_server, "refresh_dns_firewall_lease", side_effect=lambda *_: calls.append("lease") or {"ok": True}
            ):
                mihui_server.run_dns_protection_lease_cycle(app_dir)

        self.assertEqual(calls, ["probe", "verify", "firewall", "lease"])

    def test_worker_tracks_only_managed_dns_block_revision(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            config_path.write_text("# unrelated whitelist revision\n" + protected, encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "active",
                "managedBlockRevision": mihui_server.dns_managed_block_revision(protected),
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            lan = {"ok": True, "interfaces": ["br0"], "ipv4": ["192.168.1.1"], "ipv6": []}
            with mock.patch.object(
                mihui_server, "discover_dns_lan_addresses", return_value=lan
            ), mock.patch.object(mihui_server, "probe_mihomo_dns_listener", return_value={"ok": True}) as probe, mock.patch.object(
                mihui_server, "dns_firewall_installed", return_value={"ok": True}
            ), mock.patch.object(
                mihui_server, "refresh_dns_firewall_lease", return_value={"ok": True}
            ) as refresh:
                mihui_server.run_dns_protection_lease_cycle(app_dir)
            probe.assert_called_once()
            refresh.assert_called_once()

            config_path.write_text(
                config_path.read_text(encoding="utf-8").replace("enhanced-mode: redir-host", "enhanced-mode: fake-ip"),
                encoding="utf-8",
            )
            with mock.patch.object(
                mihui_server, "discover_dns_lan_addresses", return_value=lan
            ), mock.patch.object(mihui_server, "probe_mihomo_dns_listener") as changed_probe, mock.patch.object(
                mihui_server, "refresh_dns_firewall_lease"
            ) as changed_refresh:
                mihui_server.run_dns_protection_lease_cycle(app_dir)
            changed_probe.assert_not_called()
            changed_refresh.assert_not_called()

    def test_worker_stops_lease_refresh_when_lan_topology_changes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            config_path.write_text(protected, encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "active",
                "managedBlockRevision": mihui_server.dns_managed_block_revision(protected),
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            changed_lan = {
                "ok": True,
                "interfaces": ["br0"],
                "ipv4": ["192.168.1.1"],
                "ipv6": ["2001:db8::1"],
            }
            with mock.patch.object(
                mihui_server, "discover_dns_lan_addresses", return_value=changed_lan
            ), mock.patch.object(mihui_server, "probe_mihomo_dns_listener") as probe, mock.patch.object(
                mihui_server, "refresh_dns_firewall_lease"
            ) as refresh:
                mihui_server.run_dns_protection_lease_cycle(app_dir)

        probe.assert_not_called()
        refresh.assert_not_called()

    def test_worker_clears_pending_only_after_lease_expiry_is_confirmed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, _ = self.make_app(temp_dir)
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "system",
                "fallbackPending": True,
                "lanInterfaces": ["br0"],
                "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []},
            })
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            with mock.patch.object(
                mihui_server, "dns_capture_lease_state", return_value={"known": True, "active": False, "complete": False}
            ):
                mihui_server.run_dns_protection_lease_cycle(app_dir)
            saved = mihui_server.load_dns_protection_runtime(app_dir)

        self.assertFalse(saved["fallbackPending"])

    def test_multiple_unconfigured_lan_bridges_block_auto_selection(self):
        output = "\n".join((
            "1: br0    inet 192.168.1.1/24 scope global br0",
            "2: br1    inet 192.168.2.1/24 scope global br1",
        ))
        with tempfile.TemporaryDirectory() as temp_dir, mock.patch.object(
            mihui_server,
            "run_dns_tool",
            return_value={"ok": True, "returncode": 0, "output": output, "message": ""},
        ):
            lan = mihui_server.discover_dns_lan_addresses(Path(temp_dir), "/sbin/ip")

        self.assertFalse(lan["ok"])
        self.assertEqual(lan["candidateInterfaces"], ["br0", "br1"])
        self.assertIn("MIHUI_DNS_LAN_INTERFACES", lan["message"])
        self.assertEqual(lan["selection"]["state"], "required")
        self.assertEqual(lan["candidates"], [
            {"interface": "br0", "ipv4": ["192.168.1.1"], "ipv6": []},
            {"interface": "br1", "ipv4": ["192.168.2.1"], "ipv6": []},
        ])

    def test_explicit_lan_selection_cannot_silently_include_wan_or_partial_scope(self):
        output = "\n".join((
            "1: br0    inet 192.168.71.1/24 scope global br0",
            "1: br0    inet6 fe80::1/64 scope link br0",
            "2: br1    inet 192.168.72.1/24 scope global br1",
            "3: eth0   inet 203.0.113.2/24 scope global eth0",
        ))
        with tempfile.TemporaryDirectory() as temp_dir, mock.patch.object(
            mihui_server, "run_dns_tool", return_value={"ok": True, "output": output}
        ):
            app_dir = Path(temp_dir)
            valid = mihui_server.discover_dns_lan_addresses(app_dir, "ip", ["br0"])
            self.assertTrue(valid["ok"])
            self.assertEqual(valid["interfaces"], ["br0"])
            self.assertEqual(valid["ipv6"], ["fe80::1"])
            self.assertEqual(valid["candidateInterfaces"], ["br0", "br1"])
            for selection in (["br0", "missing"], ["eth0"], ["br0", "eth0"]):
                with self.subTest(selection=selection):
                    invalid = mihui_server.discover_dns_lan_addresses(app_dir, "ip", selection)
                    self.assertFalse(invalid["ok"])
                    self.assertEqual(invalid["selection"]["state"], "invalid")
                    self.assertEqual(invalid["interfaces"], [])
                    self.assertEqual(invalid["bindings"], [])

    def test_saved_lan_selection_and_legacy_environment_keep_explicit_scope(self):
        output = "\n".join((
            "1: br0    inet 192.168.1.1/24 scope global br0",
            "2: br1    inet 192.168.2.1/24 scope global br1",
            "3: lan0   inet 192.168.3.1/24 scope global lan0",
        ))
        with tempfile.TemporaryDirectory() as temp_dir, mock.patch.object(
            mihui_server, "run_dns_tool", return_value={"ok": True, "output": output}
        ):
            app_dir, _ = self.make_app(temp_dir)
            runtime = mihui_server.default_dns_protection_runtime()
            runtime["lanInterfaces"] = ["br1"]
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            saved = mihui_server.discover_dns_lan_addresses(app_dir, "ip")
            empty = mihui_server.discover_dns_lan_addresses(app_dir, "ip", [])
            self.assertEqual(saved["interfaces"], ["br1"])
            self.assertEqual(empty["selection"]["state"], "required")
            runtime["lanInterfaces"] = []
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            with mock.patch.object(mihui_server, "get_env", return_value={"MIHUI_DNS_LAN_INTERFACES": "lan0"}):
                legacy = mihui_server.discover_dns_lan_addresses(app_dir, "ip")
            self.assertEqual(legacy["interfaces"], ["lan0"])
            self.assertEqual(legacy["candidateInterfaces"], ["br0", "br1", "lan0"])
            with mock.patch.object(mihui_server, "get_env", return_value={"MIHUI_DNS_LAN_INTERFACES": "br0,missing"}):
                missing = mihui_server.discover_dns_lan_addresses(app_dir, "ip")
            self.assertEqual(missing["selection"]["state"], "invalid")
            self.assertEqual(missing["interfaces"], [])

    def test_explicit_empty_selection_does_not_activate_the_only_bridge_or_environment(self):
        output = "1: br0    inet 192.168.1.1/24 scope global br0"
        for configured in ("", "br0"):
            with self.subTest(configured=configured), tempfile.TemporaryDirectory() as temp_dir, mock.patch.object(
                mihui_server, "run_dns_tool", return_value={"ok": True, "output": output}
            ), mock.patch.object(mihui_server, "get_env", return_value={"MIHUI_DNS_LAN_INTERFACES": configured}):
                automatic = mihui_server.discover_dns_lan_addresses(Path(temp_dir), "ip")
                explicit_empty = mihui_server.discover_dns_lan_addresses(Path(temp_dir), "ip", [])
                self.assertEqual(automatic["selection"]["state"], "ready")
                self.assertEqual(automatic["interfaces"], ["br0"])
                self.assertEqual(explicit_empty["selection"]["state"], "required")
                self.assertFalse(explicit_empty["ok"])
                self.assertEqual(explicit_empty["interfaces"], [])
                self.assertEqual(explicit_empty["bindings"], [])
                self.assertEqual(explicit_empty["candidateInterfaces"], ["br0"])

    def test_worker_renews_saved_lan_subset_when_another_bridge_exists(self):
        output = "\n".join((
            "1: br0    inet 192.168.1.1/24 scope global br0",
            "2: br1    inet 192.168.2.1/24 scope global br1",
        ))
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(config_path.read_text(encoding="utf-8"), "PROXY", False)
            config_path.write_text(protected, encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "active", "lanInterfaces": ["br1"],
                "addresses": {"ipv4": ["192.168.2.1"], "ipv6": []},
                "managedBlockRevision": mihui_server.dns_managed_block_revision(protected),
            })
            mihui_server.save_dns_protection_runtime(app_dir, runtime)
            with mock.patch.object(mihui_server, "find_dns_tool", return_value="ip"), mock.patch.object(
                mihui_server, "run_dns_tool", return_value={"ok": True, "output": output}
            ), mock.patch.object(mihui_server, "probe_mihomo_dns_listener", return_value={"ok": True}), mock.patch.object(
                mihui_server, "dns_firewall_installed", return_value={"ok": True}
            ), mock.patch.object(mihui_server, "refresh_dns_firewall_lease", return_value={"ok": True}) as refresh:
                mihui_server.run_dns_protection_lease_cycle(app_dir)
            self.assertEqual(refresh.call_args.args[1]["lanInterfaces"], ["br1"])
            self.assertEqual(refresh.call_args.args[1]["addresses"], runtime["addresses"])

    def test_capabilities_require_complete_lan_selection_and_status_uses_saved_scope(self):
        output = "\n".join((
            "1: br0    inet 192.168.71.1/24 scope global br0",
            "2: br1    inet 192.168.72.1/24 scope global br1",
        ))

        def command(_binary, arguments, **_kwargs):
            if arguments == ["-o", "addr", "show"]:
                return {"ok": True, "returncode": 0, "output": output}
            if arguments == ["help", "hash:ip"]:
                return {"ok": True, "returncode": 0, "output": "timeout inet6"}
            if arguments[:3] == ["-t", "nat", "-S"] and len(arguments) == 4:
                return {"ok": False, "returncode": 1, "output": ""}
            return {"ok": True, "returncode": 0, "output": "", "message": ""}

        def listeners(port):
            return {"listeners": [
                {"protocol": "udp", "owners": ["ndnproxy"]},
                {"protocol": "tcp", "owners": ["ndnproxy"]},
            ] if port == 53 else []}

        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, _ = self.make_app(temp_dir)
            with mock.patch.object(mihui_server, "find_dns_tool", return_value="tool"), mock.patch.object(
                mihui_server, "run_dns_tool", side_effect=command
            ), mock.patch.object(mihui_server.os, "geteuid", return_value=0, create=True), mock.patch.object(
                mihui_server, "get_dns_proxy_groups", return_value={"ok": True, "groups": ["PROXY"]}
            ), mock.patch.object(mihui_server, "get_port_listeners", side_effect=listeners), mock.patch.object(
                mihui_server, "find_mihomo_binary", return_value="mihomo"
            ), mock.patch.object(mihui_server, "probe_dns_local_resolver", return_value={"ok": False}), mock.patch.object(
                mihui_server, "probe_dns_endpoint", side_effect=lambda address, port, protocol, *_args, **_kwargs: {"ok": True, "transport": protocol}
            ):
                required = mihui_server.collect_dns_protection_capabilities(app_dir)
                self.assertEqual(required["lanSelection"]["state"], "required")
                self.assertFalse(required["testReady"])
                self.assertFalse(required["activationReady"])
                self.assertEqual(required["systemFallback"]["state"], "not-tested")
                selected = mihui_server.collect_dns_protection_capabilities(app_dir, lan_interfaces=["br1"])
                self.assertTrue(selected["testReady"])
                self.assertTrue(selected["activationReady"])
                self.assertEqual(selected["addresses"]["ipv4"], ["192.168.72.1"])
                self.assertEqual(selected["systemFallback"]["state"], "ready")
                runtime = mihui_server.default_dns_protection_runtime()
                runtime["lanInterfaces"] = ["br1"]
                mihui_server.save_dns_protection_runtime(app_dir, runtime)
                status = mihui_server.get_dns_protection_status(app_dir)
                self.assertEqual(status["capabilities"]["lanInterfaces"], ["br1"])
                self.assertEqual(status["capabilities"]["lanCandidates"], selected["lanCandidates"])
                output = output.splitlines()[0]
                explicit_empty = mihui_server.collect_dns_protection_capabilities(app_dir, lan_interfaces=[])
                self.assertFalse(explicit_empty["testReady"])
                self.assertFalse(explicit_empty["activationReady"])
                self.assertEqual(explicit_empty["lanSelection"]["state"], "required")
                self.assertEqual(explicit_empty["systemFallback"]["state"], "not-tested")

    def test_successful_test_and_activate_preserve_selected_lan_scope(self):
        for action in ("test", "activate"):
            with self.subTest(action=action), tempfile.TemporaryDirectory() as temp_dir:
                app_dir, config_path = self.make_app(temp_dir)
                revision = mihui_server.config_revision(config_path.read_text(encoding="utf-8"))
                capabilities = self.ready_capabilities()
                capabilities.update({
                    "ipv6ClientDns": False, "lanInterfaces": ["br1"],
                    "addresses": {"ipv4": ["192.168.2.1"], "ipv6": []},
                })
                request = mihui_server.validate_dns_protection_request({
                    "action": action, "lanInterfaces": ["br1"], "expectedRevision": revision,
                }, require_action=True)
                with mock.patch.object(
                    mihui_server, "collect_dns_protection_capabilities", return_value=capabilities
                ) as collect, mock.patch.object(mihui_server, "find_mihomo_binary", return_value="mihomo"), mock.patch.object(
                    mihui_server, "check_mihomo_config", return_value={"ok": True, "available": True}
                ), mock.patch.object(
                    mihui_server, "save_checked_config", return_value={"ok": True, "applied": True, "revision": "1" * 64}
                ), mock.patch.object(mihui_server, "wait_for_mihomo_dns", return_value={"ok": True}), mock.patch.object(
                    mihui_server, "ensure_dns_firewall", return_value={"ok": True}
                ), mock.patch.object(mihui_server, "refresh_dns_firewall_lease", return_value={"ok": True}):
                    result = mihui_server.apply_dns_protection_action(app_dir, request)
                self.assertTrue(result["ok"])
                self.assertEqual(result["runtime"]["lanInterfaces"], ["br1"])
                self.assertEqual(result["capabilities"]["lanInterfaces"], ["br1"])
                self.assertEqual(mihui_server.load_dns_protection_runtime(app_dir)["lanInterfaces"], ["br1"])
                self.assertEqual(len(mihui_server.read_dns_protection_events(app_dir)), 1)
                collect.assert_called_once_with(app_dir, "", lan_interfaces=["br1"])

    def test_dns_action_holds_config_lock_through_probe_and_transition(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            original = config_path.read_text(encoding="utf-8")
            revision = mihui_server.config_revision(original)
            capabilities = self.ready_capabilities()
            capabilities.update({"ipv6ClientDns": False, "addresses": {"ipv4": ["192.168.1.1"], "ipv6": []}})
            preview = {
                "ok": True,
                "proxyGroup": "PROXY",
                "capabilities": capabilities,
                "fallback": {"preserved": True},
            }
            contender_acquired = threading.Event()
            contender = []

            def probe(_ipv6):
                thread = threading.Thread(
                    target=lambda: (
                        mihui_server.config_write_lock.acquire(),
                        contender_acquired.set(),
                        mihui_server.config_write_lock.release(),
                    )
                )
                thread.start()
                contender.append(thread)
                self.assertFalse(contender_acquired.wait(0.05))
                return {"ok": True, "probes": []}

            request = mihui_server.validate_dns_protection_request(
                {"action": "test", "expectedRevision": revision}, require_action=True
            )
            with mock.patch.object(
                mihui_server, "preview_dns_protection", return_value=preview
            ), mock.patch.object(
                mihui_server,
                "save_checked_config",
                return_value={"ok": True, "applied": True, "revision": "f" * 64},
            ), mock.patch.object(mihui_server, "wait_for_mihomo_dns", side_effect=probe):
                result = mihui_server.apply_dns_protection_action(app_dir, request)
            contender[0].join(timeout=1)

        self.assertTrue(result["ok"])
        self.assertTrue(contender_acquired.is_set())

    def test_active_mode_requires_firewall_rules_as_well_as_lease(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            config_path.write_text(protected, encoding="utf-8")
            runtime = mihui_server.default_dns_protection_runtime()
            runtime["requestedMode"] = "active"
            with mock.patch.object(
                mihui_server, "dns_capture_lease_state", return_value={"known": True, "active": True, "complete": True}
            ), mock.patch.object(
                mihui_server, "dns_firewall_installed", return_value={"ok": False}
            ):
                mode = mihui_server.get_dns_protection_mode(app_dir, runtime)
        self.assertEqual(mode, "fallback")

    def test_active_mode_rejects_changed_managed_dns_block(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            app_dir, config_path = self.make_app(temp_dir)
            protected = mihui_server.prepare_dns_protection_text(
                config_path.read_text(encoding="utf-8"), "PROXY", False
            )
            config_path.write_text(
                protected.replace("enhanced-mode: redir-host", "enhanced-mode: fake-ip"),
                encoding="utf-8",
            )
            runtime = mihui_server.default_dns_protection_runtime()
            runtime.update({
                "requestedMode": "active",
                "managedBlockRevision": mihui_server.dns_managed_block_revision(protected),
            })
            with mock.patch.object(
                mihui_server, "dns_capture_lease_state", return_value={"known": True, "active": True, "complete": True}
            ), mock.patch.object(
                mihui_server, "dns_firewall_installed", return_value={"ok": True}
            ):
                mode = mihui_server.get_dns_protection_mode(app_dir, runtime)

        self.assertEqual(mode, "fallback")


if __name__ == "__main__":
    unittest.main()
