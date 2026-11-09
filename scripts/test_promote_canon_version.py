import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import promote_canon_version as promotion
from engine.tractus_science import validate_version_records


class CanonPromotionIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.versions = self.root / "engine" / "canon_versions.jsonl"
        self.activity = self.root / "engine" / "activity.jsonl"
        self.entity = self.root / "lore" / "sample.md"
        self.entity.parent.mkdir(parents=True)
        self.versions.parent.mkdir(parents=True)
        self.entity.write_text("Reviewed baseline.\n", encoding="utf-8")
        digest = hashlib.sha256(self.entity.read_bytes()).hexdigest()
        baseline_event = {"id": "baseline-event", "type": "observation"}
        self.activity.write_text(json.dumps(baseline_event) + "\n", encoding="utf-8")
        baseline = {
            "canon_version_id": "experiment-001",
            "entity": "lore/sample.md",
            "prior_version_id": None,
            "created_by_event_id": "baseline-event",
            "content_sha256": digest,
            "status": "experiment",
            "baseline": True,
            "what_remains": "The reviewed baseline text remains intact."
        }
        self.versions.write_text(json.dumps(baseline) + "\n", encoding="utf-8")
        self.stack = [
            patch.object(promotion, "ROOT", self.root),
            patch.object(promotion, "VERSIONS", self.versions),
            patch.object(promotion, "ACTIVITY", self.activity),
        ]
        for item in self.stack:
            item.start()
        self.addCleanup(self.cleanup_patches)

    def cleanup_patches(self):
        for item in reversed(self.stack):
            item.stop()
        self.temp.cleanup()

    def invoke(self, *extra):
        argv = [
            "promote_canon_version.py", "experiment-001",
            "--reviewer", "unit-test-reviewer",
            "--reason", "Evidence supports the reviewed baseline.",
            "--evidence-event-id", "evidence-001",
            *extra,
        ]
        with patch.object(sys, "argv", argv):
            return promotion.main()

    def test_promotion_appends_linked_canon_version_and_event(self):
        def record_event(event, source):
            with self.activity.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(event) + "\n")
        with patch.object(promotion, "inscribe_event", side_effect=record_event):
            self.assertEqual(self.invoke(), 0)
        versions = [json.loads(line) for line in self.versions.read_text().splitlines()]
        activity = [json.loads(line) for line in self.activity.read_text().splitlines()]
        self.assertEqual(len(versions), 2)
        promoted = versions[-1]
        self.assertEqual(promoted["status"], "canon")
        self.assertEqual(promoted["prior_version_id"], "experiment-001")
        self.assertEqual(promoted["promotion_event_id"], promoted["created_by_event_id"])
        self.assertEqual(promoted["evidence_event_ids"], ["evidence-001"])
        event = next(item for item in activity if item["id"] == promoted["promotion_event_id"])
        self.assertEqual(event["type"], "canon_promotion")
        self.assertEqual(event["version_id"], promoted["canon_version_id"])
        self.assertEqual(validate_version_records(versions), [])

    def test_promotion_rejects_changed_source_file(self):
        self.entity.write_text("Changed after baseline.\n", encoding="utf-8")
        with self.assertRaises(SystemExit):
            self.invoke()

    def test_promotion_rejects_unknown_evidence(self):
        with self.assertRaises(SystemExit):
            self.invoke("--evidence-event-id", "missing-event")

    def test_promotion_rejects_duplicate_promotion(self):
        promoted = {
            "canon_version_id": "canon-existing",
            "entity": "lore/sample.md",
            "prior_version_id": "experiment-001",
            "created_by_event_id": "old-promotion",
            "content_sha256": hashlib.sha256(self.entity.read_bytes()).hexdigest(),
            "status": "canon",
            "baseline": True,
            "promotion_event_id": "old-promotion"
        }
        with self.versions.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(promoted) + "\n")
        with self.assertRaises(SystemExit):
            self.invoke()


if __name__ == "__main__":
    unittest.main()
