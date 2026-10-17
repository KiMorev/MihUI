import hashlib
import errno
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


class RuleSetInspectorTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.config = self.root / "config.yaml"
        self.patch = mock.patch.object(server, "get_config_path", return_value=self.config)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def configure(self, body, before="", after=""):
        self.config.write_text(before + "rule-providers:\n" + body + after, encoding="utf-8")

    def inspect(self, **kwargs):
        return server.inspect_rule_provider(self.root, "test", **kwargs)

    def test_text_search_is_literal_case_insensitive_and_paginated(self):
        self.configure("  test: {type: file, behavior: classical, format: text, path: rules.list}\n")
        (self.root / "rules.list").write_text("# ignored\n// ignored\nDOMAIN,Example.com\nDOMAIN-SUFFIX,example.net\nIP-CIDR,192.0.2.0/24\n", encoding="utf-8")
        result = self.inspect(query="EXAMPLE", offset="1", limit="1")
        self.assertTrue(result["ok"])
        self.assertEqual((result["total"], result["matched"]), (3, 2))
        self.assertEqual(result["entries"], ["DOMAIN-SUFFIX,example.net"])
        self.assertEqual(result["source"], "file")
        self.assertFalse(result["truncated"])
        self.assertEqual(self.inspect(query="example.*")["matched"], 0)
        self.assertEqual(self.inspect(query="192.0.2")["matched"], 1)

    def test_yaml_payload_preserves_quotes_apostrophes_and_hash(self):
        self.configure("  test:\n    type: file\n    behavior: domain\n    path: rules.yaml\n")
        (self.root / "rules.yaml").write_text("payload:\n  - '+.example.com' # comment\n  - 'a#b.example'\n  - 'it''s.example'\n  - \"quoted.example\"\n", encoding="utf-8")
        self.assertEqual(self.inspect()["entries"], ["+.example.com", "a#b.example", "it's.example", "quoted.example"])

    def test_flow_payload_inline_provider_and_quoted_name(self):
        self.config.write_text("rule-providers: {test: {type: inline, behavior: classical, payload: ['DOMAIN,example.com', 'IP-CIDR,192.0.2.0/24']}}\n", encoding="utf-8")
        result = self.inspect()
        self.assertTrue(result["ok"])
        self.assertEqual(result["source"], "inline")
        self.assertEqual(result["entries"], ["DOMAIN,example.com", "IP-CIDR,192.0.2.0/24"])
        self.configure("  'a: test': {type: inline, behavior: domain, payload: [example.com]}\n")
        self.assertEqual(server.inspect_rule_provider(self.root, "a: test")["entries"], ["example.com"])

    def test_yaml_rules_alias_and_flow_list(self):
        self.configure("  test: {type: file, behavior: domain, path: rules.yaml}\n")
        (self.root / "rules.yaml").write_text("rules: ['+.example.com', example.net]\n", encoding="utf-8")
        self.assertEqual(self.inspect()["entries"], ["+.example.com", "example.net"])
        (self.root / "rules.yaml").write_text("payload:\n- '+.example.com'\n- example.net\n", encoding="utf-8")
        self.assertEqual(self.inspect()["entries"], ["+.example.com", "example.net"])

    def test_http_cache_uses_official_rules_md5_path_without_fetching_url(self):
        url = "https://example.invalid/list?token=private-secret"
        self.configure(f"  test: {{type: http, behavior: domain, format: text, url: '{url}'}}\n")
        (self.root / "rules").mkdir()
        (self.root / "rules" / hashlib.md5(url.encode()).hexdigest()).write_text("example.com\n", encoding="utf-8")
        with mock.patch.object(server.urllib.request, "urlopen", side_effect=AssertionError("must not fetch")):
            result = self.inspect()
        self.assertEqual(result["entries"], ["example.com"])
        self.assertNotIn("private-secret", str(result))

    def test_unknown_missing_and_invalid_specs_return_safe_errors(self):
        self.configure("  test: {type: http, behavior: domain, url: 'https://secret.invalid/token-123', path: missing}\n")
        self.assertFalse(self.inspect()["ok"])
        self.assertNotIn("token-123", str(self.inspect()))
        self.assertFalse(server.inspect_rule_provider(self.root, "other")["ok"])
        for spec in ("[]", "{type: [file], behavior: domain}", "{type: file, behavior: other}", "{type: inline, behavior: domain, payload: {secret: token}}"):
            with self.subTest(spec=spec):
                self.configure(f"  test: {spec}\n")
                result = self.inspect()
                self.assertFalse(result["ok"])
                self.assertNotIn("token", str(result))

    def test_traversal_absolute_and_symlink_paths_are_confined(self):
        with tempfile.TemporaryDirectory() as other:
            outside = Path(other) / "secret.txt"
            outside.write_text("private-secret", encoding="utf-8")
            for path in (os.path.relpath(outside, self.root), str(outside)):
                with self.subTest(path=path):
                    self.configure(f"  test: {{type: file, behavior: domain, format: text, path: '{path}'}}\n")
                    result = self.inspect()
                    self.assertFalse(result["ok"])
                    self.assertNotIn("private-secret", str(result))
            link = self.root / "outside.list"
            try:
                link.symlink_to(outside)
            except OSError:
                return  # Creating symlinks may require administrator rights on Windows.
            self.configure("  test: {type: file, behavior: domain, format: text, path: outside.list}\n")
            self.assertFalse(self.inspect()["ok"])

    def test_absolute_file_inside_mihomo_root_is_allowed(self):
        path = self.root / "inside.list"
        path.write_text("example.com", encoding="utf-8")
        self.configure(f"  test: {{type: file, behavior: domain, format: text, path: '{path}'}}\n")
        self.assertEqual(self.inspect()["entries"], ["example.com"])

    def test_unrelated_complex_yaml_and_other_provider_alias_do_not_break_selected_provider(self):
        self.configure("  inherited: *complex\n  test: {type: inline, behavior: domain, payload: [example.com]}\n",
                       before="proxy-groups: [\n  {name: 'test', proxies: [DIRECT]}\n]\nscript: |\n  it's fine\n",
                       after="proxy-providers:\n  another: *complex\n")
        self.assertEqual(self.inspect()["entries"], ["example.com"])

    def test_aliases_duplicate_names_and_deep_values_fail_explicitly(self):
        for spec in ("  test: *template\n", "  test:\n    <<: *template\n    type: inline\n    behavior: domain\n",
                     "  test: {type: inline, behavior: domain}\n  test: {type: inline, behavior: domain}\n",
                     "  test: {type: inline, behavior: domain, payload: " + "[" * 20 + "x" + "]" * 20 + "}\n"):
            with self.subTest(spec=spec):
                self.configure(spec)
                self.assertFalse(self.inspect()["ok"])

    def test_bad_pagination_and_search_limits(self):
        self.configure("  test: {type: inline, behavior: domain, payload: []}\n")
        for kwargs in ({"limit": "invalid"}, {"limit": 0}, {"limit": 201}, {"offset": -1}, {"offset": 100001}, {"query": "x" * 257}):
            with self.subTest(kwargs=kwargs):
                self.assertFalse(self.inspect(**kwargs)["ok"])

    def test_large_files_encoding_invalid_payload_and_entry_limits(self):
        self.configure("  test: {type: file, behavior: domain, format: text, path: rules.list}\n")
        path = self.root / "rules.list"
        path.write_bytes(b"x" * (server.RULE_SET_MAX_BYTES + 1))
        self.assertFalse(self.inspect()["ok"])
        path.write_bytes(b"\xff\xfe")
        self.assertFalse(self.inspect()["ok"])
        path.write_text("x" * 4097, encoding="utf-8")
        self.assertFalse(self.inspect()["ok"])
        path.write_text("one\ntwo\nthree\n", encoding="utf-8")
        self.configure("  test:\n    type: file\n    behavior: domain\n    format: text\n    path: rules.list\n")
        with mock.patch.object(server, "RULE_SET_MAX_ENTRIES", 2):
            result = self.inspect()
        self.assertTrue(result["truncated"])
        self.assertEqual(result["total"], 2)
        self.assertEqual(result["entries"], ["one", "two"])

    def test_mrs_uses_converter_and_never_returns_raw_binary(self):
        self.configure("  test: {type: file, behavior: domain, format: mrs, path: rules.mrs}\n")
        (self.root / "rules.mrs").write_bytes(b"compressed")
        with mock.patch.object(server, "decode_rule_set_mrs", return_value=b"+.example.com\n") as convert:
            result = self.inspect()
        convert.assert_called_once_with(self.root, b"compressed", "domain")
        self.assertEqual(result["entries"], ["+.example.com"])
        with mock.patch.object(server, "find_mihomo_binary", return_value=""):
            self.assertFalse(self.inspect()["ok"])

    def test_yaml_flow_payload_over_limit_fails_before_collecting_every_item(self):
        self.configure("  test:\n    type: file\n    behavior: domain\n    path: rules.yaml\n")
        (self.root / "rules.yaml").write_text("payload: [one,two,three,four,five]\n", encoding="utf-8")
        with mock.patch.object(server, "RULE_SET_MAX_ENTRIES", 4):
            result = self.inspect()
        self.assertFalse(result["ok"])
        self.assertIn("лимит", result["message"])

    def test_yaml_metadata_cannot_hide_source_line_limit(self):
        self.configure("  test:\n    type: file\n    behavior: domain\n    path: rules.yaml\n")
        (self.root / "rules.yaml").write_text("metadata: description\npayload:\n- one\n- two\n- three\n", encoding="utf-8")
        with mock.patch.object(server, "RULE_SET_MAX_ENTRIES", 2):
            result = self.inspect()
        self.assertFalse(result["ok"])
        self.assertIn("лимит", result["message"])

    def test_mrs_converter_command_is_bounded_and_temporary_snapshot_is_removed(self):
        process = mock.Mock()
        process.stdout.fileno.return_value = 10
        process.wait.return_value = 0
        process.poll.return_value = 0
        converter_os = mock.Mock(wraps=os)
        converter_os.name = "posix"
        converter_os.read.side_effect = [b"example.com\n", b""]
        with mock.patch.object(server, "find_mihomo_binary", return_value="/opt/bin/mihomo"), mock.patch.object(
            server, "os", converter_os
        ), mock.patch.object(
            Path, "exists", return_value=True
        ), mock.patch.object(server.subprocess, "Popen", return_value=process) as start, mock.patch.object(
            server.select, "select", return_value=([process.stdout], [], [])
        ):
            output = server.decode_rule_set_mrs(self.root, b"snapshot", "domain")
        self.assertEqual(output, b"example.com\n")
        command = start.call_args.args[0]
        self.assertEqual(command[:2], [server.sys.executable, "-c"])
        self.assertIn("resource.setrlimit(resource.RLIMIT_DATA,(134217728,134217728))", command[2])
        self.assertIn("mmap.MAP_PRIVATE|mmap.MAP_ANONYMOUS", command[2])
        self.assertIn("error.errno != errno.ENOMEM", command[2])
        self.assertEqual(command[3:7], ["/opt/bin/mihomo", "convert-ruleset", "domain", "mrs"])
        self.assertEqual(command[8], "/dev/stdout")
        self.assertFalse(Path(command[7]).exists())
        self.assertIs(start.call_args.kwargs["stderr"], server.subprocess.DEVNULL)
        self.assertFalse(server.rule_set_conversion_lock.locked())

    @unittest.skipUnless(os.name == "posix", "Linux memory-limit integration")
    def test_real_child_enforces_data_limit_without_blocking_virtual_reservations(self):
        binary = self.root / "converter"
        binary.write_text(f"#!{sys.executable}\nimport resource,sys\nassert resource.getrlimit(resource.RLIMIT_DATA)==(134217728,134217728)\nprint('example.com')\n", encoding="utf-8")
        binary.chmod(0o700)
        with mock.patch.object(server, "find_mihomo_binary", return_value=str(binary)):
            self.assertEqual(server.decode_rule_set_mrs(self.root, b"snapshot", "domain"), b"example.com\n")

    def test_mrs_memory_wrapper_requires_confirmed_enomem_before_exec(self):
        for mode in ("bounded", "unbounded", "other-error"):
            with self.subTest(mode=mode):
                resource, mmap = mock.Mock(), mock.Mock()
                resource.RLIMIT_DATA = 2
                mmap.MAP_PRIVATE, mmap.MAP_ANONYMOUS, mmap.PROT_READ, mmap.PROT_WRITE = 2, 32, 1, 2
                if mode != "unbounded":
                    mmap.mmap.side_effect = OSError(errno.ENOMEM if mode == "bounded" else errno.EPERM, "probe")
                with mock.patch.dict(sys.modules, {"resource": resource, "mmap": mmap}), mock.patch.object(
                    os, "execv"
                ) as execute, mock.patch.object(sys, "argv", ["wrapper", "/mihomo", "convert-ruleset"]):
                    if mode == "bounded":
                        exec(server.RULE_SET_MRS_WRAPPER, {})
                        execute.assert_called_once_with("/mihomo", ["/mihomo", "convert-ruleset"])
                    elif mode == "unbounded":
                        with self.assertRaises(SystemExit) as error:
                            exec(server.RULE_SET_MRS_WRAPPER, {})
                        self.assertEqual(error.exception.code, 125)
                        execute.assert_not_called()
                        mmap.mmap.return_value.close.assert_called_once()
                    else:
                        with self.assertRaises(OSError):
                            exec(server.RULE_SET_MRS_WRAPPER, {})
                        execute.assert_not_called()
                resource.setrlimit.assert_called_once_with(2, (134217728, 134217728))

    def test_mrs_timeout_output_cap_and_converter_failure_clean_up(self):
        for mode in ("timeout", "output", "failure"):
            with self.subTest(mode=mode):
                process = mock.Mock()
                process.stdout.fileno.return_value = 10
                process.poll.return_value = 125 if mode == "failure" else None
                process.wait.return_value = 125 if mode == "failure" else 0
                converter_os = mock.Mock(wraps=os)
                converter_os.name = "posix"
                converter_os.read.side_effect = [b""] if mode == "failure" else [b"x" * 11]
                with mock.patch.object(server, "find_mihomo_binary", return_value="/mihomo"), mock.patch.object(
                    server, "os", converter_os
                ), mock.patch.object(Path, "exists", return_value=True), mock.patch.object(
                    server.subprocess, "Popen", return_value=process
                ), mock.patch.object(server.select, "select", return_value=([process.stdout], [], [])), mock.patch.object(
                    server.time, "monotonic", side_effect=[0, 13] if mode == "timeout" else [0, 1, 2]
                ), mock.patch.object(server, "RULE_SET_MAX_BYTES", 10):
                    with self.assertRaises(ValueError):
                        server.decode_rule_set_mrs(self.root, b"snapshot", "domain")
                if mode != "failure":
                    process.kill.assert_called_once()
                process.stdout.close.assert_called_once()
                self.assertFalse(server.rule_set_conversion_lock.locked())


if __name__ == "__main__":
    unittest.main()
