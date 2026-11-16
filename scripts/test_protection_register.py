import json
import tempfile
import unittest
from pathlib import Path

from scripts.check_protection_register import validate_register


class ProtectionRegisterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "src").mkdir()
        (self.root / "tests").mkdir()
        (self.root / "docs").mkdir()
        (self.root / "src" / "engine.py").write_text("# implementation\n", encoding="utf-8")
        (self.root / "tests" / "test_engine.py").write_text("# test\n", encoding="utf-8")
        (self.root / "docs" / "spec.md").write_text("# specification\n", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def register(self):
        return {
            "schema_version": 1,
            "register_id": "tractus-protection-register",
            "governing_principle": "Continuity through change.",
            "controls": [{
                "id": "sample-control",
                "title": "Sample control",
                "foundation": "integrity",
                "status": "implemented",
                "scope": "A bounded implementation.",
                "implementation": ["src/engine.py"],
                "tests": [],
                "verification": [],
                "limitations": []
            }]
        }

    def test_valid_implemented_control_passes(self):
        self.assertEqual(validate_register(self.register(), self.root), [])

    def test_implemented_control_requires_existing_implementation(self):
        data = self.register()
        data["controls"][0]["implementation"] = ["src/missing.py"]
        errors = validate_register(data, self.root)
        self.assertTrue(any("missing implementation evidence" in item for item in errors))

    def test_tested_control_requires_test_evidence(self):
        data = self.register()
        data["controls"][0]["status"] = "tested"
        errors = validate_register(data, self.root)
        self.assertTrue(any("requires test evidence" in item for item in errors))

    def test_verified_control_requires_verification_evidence(self):
        data = self.register()
        data["controls"][0].update({
            "status": "verified",
            "tests": ["tests/test_engine.py"],
            "verification": []
        })
        errors = validate_register(data, self.root)
        self.assertTrue(any("verified requires verification evidence" in item for item in errors))

    def test_duplicate_ids_are_rejected(self):
        data = self.register()
        data["controls"].append(dict(data["controls"][0]))
        errors = validate_register(data, self.root)
        self.assertTrue(any("duplicate control id" in item for item in errors))

    def test_path_traversal_is_rejected(self):
        data = self.register()
        data["controls"][0]["implementation"] = ["../outside.py"]
        errors = validate_register(data, self.root)
        self.assertTrue(any("unsafe evidence path" in item for item in errors))

    def test_non_string_status_is_reported_without_crashing(self):
        data = self.register()
        data["controls"][0]["status"] = ["implemented"]
        errors = validate_register(data, self.root)
        self.assertTrue(any("invalid status" in item for item in errors))

    def test_specified_control_can_exist_without_code(self):
        data = self.register()
        data["controls"][0].update({
            "status": "specified",
            "specification": ["docs/spec.md"],
            "implementation": [],
            "tests": [],
            "verification": []
        })
        self.assertEqual(validate_register(data, self.root), [])


if __name__ == "__main__":
    unittest.main()
