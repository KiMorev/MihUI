import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "router"))
import mihui_server as server


class RuleSetTemplateTests(unittest.TestCase):
    def parse(self, text, name="test"):
        return server.rule_set_provider_spec(server.rule_set_yaml_lines(text), name,
                                             server.rule_set_yaml_anchor_resolver(text))

    def test_router_domain_template_resolves_to_mrs_provider(self):
        text = """rule-anchor:
  domain: &domain { type: http, format: mrs, behavior: domain, interval: 86400 }
rule-providers:
  category-gov-ru@domain: { <<: *domain, url: https://example.com/rules.mrs }
"""
        spec = self.parse(text, "category-gov-ru@domain")
        self.assertEqual(spec, {"type": "http", "format": "mrs", "behavior": "domain",
                                "interval": "86400", "url": "https://example.com/rules.mrs"})

    def test_block_templates_and_merge_sequence_obey_yaml_precedence(self):
        for fields in ("format: text, <<: [*first, *second]", "<<: [*first, *second], format: text"):
            with self.subTest(fields=fields):
                spec = self.parse("""templates:
  first: &first
    type: file
    behavior: domain
    path: first.yaml
    format: yaml
  second: &second {behavior: classical, path: second.yaml}
rule-providers:
  test: {""" + fields + "}\n")
                self.assertEqual(spec, {"type": "file", "behavior": "domain", "path": "first.yaml", "format": "text"})

    def test_block_provider_can_merge_template_and_override_fields(self):
        spec = self.parse("""templates:
  first: &base {type: file, behavior: domain, path: old.yaml}
  chained: &next {<<: *base, path: next.yaml}
rule-providers:
  test:
    path: selected.yaml
    <<: *next
""")
        self.assertEqual(spec["path"], "selected.yaml")
        self.assertEqual(spec["type"], "file")

    def test_direct_alias_and_anchor_on_provider_are_supported(self):
        self.assertEqual(self.parse("""templates:
  source: &base {type: inline, behavior: domain, payload: [example.com]}
rule-providers:
  test: *base
""")["payload"], ["example.com"])
        self.assertEqual(self.parse("""rule-providers:
  test: &base
    type: inline
    behavior: domain
    payload: [example.com]
""")["type"], "inline")

    def test_quoted_alias_and_merge_keys_remain_literal(self):
        spec = self.parse("""rule-providers:
  test: {type: inline, behavior: domain, payload: ['*literal'], '<<': literal}
""")
        self.assertEqual(spec["payload"], ["*literal"])
        self.assertEqual(spec["<<"], "literal")

    def test_unrelated_multiline_yaml_and_fake_scalar_anchors_are_ignored(self):
        for marker in ("|", "|2-", ">+"):
            with self.subTest(marker=marker):
                text = """proxy-groups: [
  {name: PROXY, proxies: [DIRECT]}
]
script: """ + marker + """
  domain: &domain {type: file, path: fake}
templates:
  actual: &domain {type: inline, behavior: domain, payload: [example.com]}
rule-providers:
  test: {<<: *domain}
"""
                self.assertEqual(self.parse(text)["type"], "inline")

    def test_unknown_cycles_duplicates_and_invalid_merge_fail_explicitly(self):
        cases = [
            "rule-providers:\n  test: {<<: *missing}\n",
            "templates:\n  first: &a {<<: *b}\n  second: &b {<<: *a}\nrule-providers:\n  test: *a\n",
            "templates:\n  first: &a {}\n  second: &a {}\nrule-providers:\n  test: *a\n",
            "rule-providers:\n  test: {<<: [plain-text]}\n",
            "rule-providers:\n  test: {<<: {}, <<: {}}\n",
        ]
        for text in cases:
            with self.subTest(text=text), self.assertRaises(ValueError):
                self.parse(text)

    def test_anchored_and_quoted_scalar_contents_do_not_define_templates(self):
        scalars = ["script: &script |\n  domain: &domain {type: file}\n",
                   'script: "start\n  escaped \\"\n  domain: &domain {type: file}\n  end"\n',
                   'script: "start\n  text # end"\n',
                   'script: "start\n  # end"\n',
                   "script: 'start\n  it''s text\n  domain: &domain {type: file}\n  end'\n"]
        for scalar in scalars:
            with self.subTest(scalar=scalar):
                spec = self.parse(scalar + """templates:
  source: &domain {type: inline, behavior: domain, payload: [example.com]}
rule-providers:
  test: {<<: *domain}
""")
                self.assertEqual(spec["type"], "inline")

    def test_alias_work_is_bounded_even_for_cached_templates(self):
        text = "templates:\n  source: &base {}\nrule-providers:\n  test: {<<: [" + ",".join(["*base"] * 129) + "]}\n"
        with self.assertRaisesRegex(ValueError, "YAML"):
            self.parse(text)

    def test_inspector_uses_merged_path_and_keeps_file_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = root / "config.yaml"
            config.write_text("""templates:
  source: &base {type: file, behavior: domain, format: text, path: rules.list}
rule-providers:
  test: {<<: *base}
""", encoding="utf-8")
            (root / "rules.list").write_text("example.com\n", encoding="utf-8")
            with mock.patch.object(server, "get_config_path", return_value=config):
                self.assertEqual(server.inspect_rule_provider(root, "test")["entries"], ["example.com"])
                config.write_text(config.read_text().replace("rules.list", "../outside.list"), encoding="utf-8")
                self.assertFalse(server.inspect_rule_provider(root, "test")["ok"])


if __name__ == "__main__":
    unittest.main()
