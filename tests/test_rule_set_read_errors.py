import errno
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


class RuleSetReadErrorTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.config = self.root / "config.yaml"

    def test_trusted_config_link_is_resolved_before_bounded_read(self):
        self.config.write_text("rule-providers:\n  test: {type: file, behavior: domain, format: text, path: rules.list}\n", encoding="utf-8")
        (self.root / "rules.list").write_text("example.com\n", encoding="utf-8")
        link = mock.MagicMock(spec=Path)
        link.__str__.return_value = str(self.root / "active.yaml")
        link.resolve.return_value = self.config
        original_open = os.open

        def open_without_following(path, flags):
            if path == str(link):
                raise OSError(errno.ELOOP, "private config path")
            return original_open(path, flags)

        with mock.patch.object(server, "get_config_path", return_value=link), mock.patch.object(
            server.os, "open", side_effect=open_without_following
        ) as opened:
            result = server.inspect_rule_provider(self.root, "test")
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["entries"], ["example.com"])
        self.assertEqual(opened.call_args_list[0].args[0], str(self.config))

    def test_config_and_provider_read_errors_include_safe_reason(self):
        for is_config, label in ((True, "конфигурации Mihomo"), (False, "набора правил")):
            for number, reason in ((errno.ENOENT, "отсутствует"), (errno.EACCES, "недостаточно прав"),
                                   (errno.EPERM, "недостаточно прав"), (errno.ELOOP, "символическая ссылка"),
                                   (errno.EIO, "ошибка ввода-вывода")):
                with self.subTest(is_config=is_config, errno=number), mock.patch.object(
                    server.os, "open", side_effect=OSError(number, "private-secret", "/private-secret/config")
                ):
                    with self.assertRaises(ValueError) as raised:
                        server.rule_set_read_file(self.config, is_config=is_config)
                message = str(raised.exception)
                self.assertIn(label, message)
                self.assertIn(reason, message)
                self.assertIn(errno.errorcode[number], message)
                self.assertNotIn("private-secret", message)

    def test_config_link_loop_is_reported_without_exposing_path(self):
        link = mock.Mock(spec=Path)
        link.resolve.side_effect = RuntimeError("Symlink loop from /private-secret/config")
        with mock.patch.object(server, "get_config_path", return_value=link):
            result = server.inspect_rule_provider(self.root, "test")
        self.assertFalse(result["ok"])
        self.assertIn("конфигурации Mihomo", result["message"])
        self.assertIn("ELOOP", result["message"])
        self.assertNotIn("private-secret", result["message"])

    def test_config_read_failure_is_distinct_from_provider_read_failure(self):
        self.config.write_text("rule-providers:\n  test: {type: file, behavior: domain, format: text, path: missing.list}\n", encoding="utf-8")
        with mock.patch.object(server, "get_config_path", return_value=self.config):
            provider_result = server.inspect_rule_provider(self.root, "test")
            with mock.patch.object(server.os, "open", side_effect=PermissionError(errno.EACCES, "private-secret")):
                config_result = server.inspect_rule_provider(self.root, "test")
        self.assertIn("набора правил", provider_result["message"])
        self.assertIn("ENOENT", provider_result["message"])
        self.assertIn("конфигурации Mihomo", config_result["message"])
        self.assertIn("EACCES", config_result["message"])
        self.assertNotIn("private-secret", config_result["message"])

    def test_config_size_limit_is_preserved(self):
        self.config.write_bytes(b"four")
        with self.assertRaisesRegex(ValueError, "конфигурации Mihomo.*лимит"):
            server.rule_set_read_file(self.config, limit=3, is_config=True)

    def test_provider_path_is_not_resolved_by_reader(self):
        path = mock.MagicMock(spec=Path)
        path.__str__.return_value = str(self.root / "rules.list")
        with mock.patch.object(server.os, "open", side_effect=OSError(errno.ELOOP, "private-secret")):
            with self.assertRaisesRegex(ValueError, "набора правил.*ELOOP"):
                server.rule_set_read_file(path)
        path.resolve.assert_not_called()


if __name__ == "__main__":
    unittest.main()
