"""Regression tests for the Generation 01 data contract."""
import json
import unittest
from pathlib import Path
from validate_generation_01 import validate

ROOT = Path(__file__).resolve().parent

class Generation01Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "generation-01.json").read_text(encoding="utf-8"))

    def test_exactly_twenty_unique_adults(self):
        members = self.data["members"]
        self.assertEqual(len(members), 20)
        self.assertEqual(len({m["id"] for m in members}), 20)
        self.assertEqual(len({m["name"] for m in members}), 20)
        self.assertTrue(all(m["age_years"] >= 18 for m in members))

    def test_validator_accepts_canonical_roster(self):
        self.assertEqual(validate(self.data), [])

    def test_relationships_resolve_and_do_not_self_reference(self):
        known = {m["id"] for m in self.data["members"]}
        for member in self.data["members"]:
            for relation in member["relationships"]:
                self.assertIn(relation["character_id"], known)
                self.assertNotEqual(relation["character_id"], member["id"])
                self.assertTrue(relation["dynamic"])

    def test_every_member_has_turnaround_and_modular_spec(self):
        for member in self.data["members"]:
            production = member["production"]
            self.assertEqual(production["turnaround_views"], ["front", "left_profile", "back"])
            self.assertGreaterEqual(len(production["signature_poses"]), 3)
            self.assertGreaterEqual(len(production["modular_asset_components"]), 3)
            self.assertTrue(production["reference_sheet"].startswith("REF-"))

    def test_specializations_and_silhouettes_are_individualized(self):
        members = self.data["members"]
        self.assertEqual(len({m["specialization"] for m in members}), 20)
        self.assertEqual(len({tuple(m["production"]["silhouette_anchors"]) for m in members}), 20)

if __name__ == "__main__":
    unittest.main()
