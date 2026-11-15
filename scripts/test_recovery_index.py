import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "recovery" / "index.json"
SCHEMA = ROOT / "recovery" / "index.schema.json"

class RecoveryIndexTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = json.loads(INDEX.read_text(encoding="utf-8"))
        cls.schema = json.loads(SCHEMA.read_text(encoding="utf-8"))

    def test_index_matches_schema_version_and_required_sections(self):
        self.assertEqual(self.index["schema_version"], self.schema["properties"]["schema_version"]["const"])
        for key in self.schema["required"]:
            self.assertIn(key, self.index)

    def test_repository_revision_and_artifact_registry_are_pinned(self):
        repo = self.index["repository"]
        self.assertEqual(len(repo["source_commit"]), 40)
        self.assertEqual(len(repo["index_introduced_by_commit"]), 40)
        registry = repo["canonical_artifact_registry"]
        self.assertEqual(registry["path"], "artifacts/index.json")
        self.assertEqual(len(registry["git_blob_sha1"]), 40)
        self.assertGreater(registry["bytes"], 0)

    def test_dropbox_snapshot_has_explicit_verification_boundary(self):
        snapshot = self.index["dropbox_snapshots"][0]
        self.assertEqual(snapshot["verification"]["result"], "exact_match")
        self.assertFalse(snapshot["verification"]["content_hashes_checked"])
        self.assertEqual(snapshot["inventory"]["entries"],
                         snapshot["inventory"]["files"] + snapshot["inventory"]["folders"])
        self.assertEqual(snapshot["verification"]["missing_entries"], 0)
        self.assertEqual(snapshot["verification"]["unexpected_entries"], 0)
        self.assertEqual(snapshot["verification"]["mismatched_entries"], 0)

    def test_dropbox_control_document_is_linked(self):
        doc = self.index["dropbox_control_document"]
        self.assertEqual(doc["revision"], "1")
        self.assertTrue(doc["url"].startswith("https://www.dropbox.com/"))
        self.assertTrue(doc["file_id"].startswith("id:"))

    def test_pending_controls_preserve_known_gaps(self):
        pending = " ".join(self.index["pending_controls"]).lower()
        for phrase in ("file-content hash", "restore drill", "independently administered", "branch rules"):
            self.assertIn(phrase, pending)

    def test_restore_history_does_not_claim_dropbox_restore(self):
        systems = [event["system"] for event in self.index["restoration_history"]]
        self.assertNotIn("Dropbox", systems)

if __name__ == "__main__":
    unittest.main()
