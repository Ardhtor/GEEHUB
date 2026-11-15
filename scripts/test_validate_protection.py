import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_protection import validate_changes

class ProtectionValidatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "docs").mkdir()
        (self.root / "data").mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return target

    def test_valid_changed_json_passes(self):
        self.write("data/record.json", json.dumps({"id": "one"}))
        self.assertEqual(validate_changes([("M", "data/record.json")], self.root), [])

    def test_invalid_changed_json_fails(self):
        self.write("data/record.json", '{"broken": ')
        errors = validate_changes([("M", "data/record.json")], self.root)
        self.assertTrue(any("Invalid JSON" in item for item in errors))

    def test_protected_continuity_record_cannot_be_deleted(self):
        errors = validate_changes([("D", "docs/TRACTUS_CONTINUITY_CONTRACT.md")], self.root)
        self.assertTrue(any("cannot be deleted" in item for item in errors))

    def test_common_github_token_is_flagged(self):
        self.write("data/config.txt", "token = ghp_" + "A" * 36)
        errors = validate_changes([("M", "data/config.txt")], self.root)
        self.assertTrue(any("credential" in item for item in errors))

    def test_binary_files_are_outside_text_scan(self):
        target = self.root / "data" / "image.bin"
        target.write_bytes(b"\x00\xff\x00")
        self.assertEqual(validate_changes([("M", "data/image.bin")], self.root), [])

    def test_path_traversal_is_rejected(self):
        errors = validate_changes([("M", "../outside.txt")], self.root)
        self.assertTrue(any("escapes repository root" in item for item in errors))

if __name__ == "__main__":
    unittest.main()
