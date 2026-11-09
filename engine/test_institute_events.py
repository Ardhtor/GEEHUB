"""Regression tests for Institute-to-Tractus event inscription."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from engine import institute_events, inscription


class InstituteEventTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.log = root / "activity.jsonl"
        self.artifacts = root / "activity-events"
        self.index = root / "index.json"
        self.outbox = root / "dropbox_outbox"
        self.patches = [
            patch.object(inscription, "ACTIVITY_LOG", self.log),
            patch.object(inscription, "ARTIFACT_DIR", self.artifacts),
            patch.object(inscription, "ARTIFACT_INDEX", self.index),
            patch.object(inscription, "OUTBOX", self.outbox),
        ]
        for item in self.patches:
            item.start()

    def tearDown(self):
        for item in reversed(self.patches):
            item.stop()
        self.temp.cleanup()

    def event(self):
        return {
            "event_id": "institute-test-0001",
            "occurred_at": "2026-11-09T20:00:00Z",
            "kind": "training",
            "place_id": "institute-gymnasium",
            "participants": ["luke", "andrew"],
            "description": "Luke and Andrew complete a shared movement session.",
            "payload": {"phase": "recovery", "canon": "experiment"},
        }

    def test_event_uses_shared_stream_and_artifact_ledger(self):
        result = institute_events.record_institute_event(self.event())
        self.assertEqual(result["status"], "OCCURRED_AND_INSCRIBED")
        self.assertEqual(result["world"], "INSTITUTE OF BECOMING")
        self.assertEqual(result["region"], "institute-gymnasium")
        self.assertEqual(len(self.log.read_text().splitlines()), 1)
        artifact = json.loads((self.artifacts / "institute-test-0001.json").read_text())
        self.assertEqual(artifact["kind"], "institute-event")
        self.assertEqual(artifact["lineage"]["event_id"], "institute-test-0001")
        self.assertTrue((self.outbox / "institute-test-0001.json").exists())

    def test_retry_is_idempotent(self):
        event = self.event()
        first = institute_events.record_institute_event(event)
        second = institute_events.record_institute_event(event)
        self.assertEqual(first, second)
        self.assertEqual(len(self.log.read_text().splitlines()), 1)

    def test_unknown_place_is_rejected_before_write(self):
        event = self.event()
        event["place_id"] = "imaginary-campus"
        with self.assertRaises(ValueError):
            institute_events.record_institute_event(event)
        self.assertFalse(self.log.exists())

    def test_duplicate_participants_are_rejected(self):
        event = self.event()
        event["participants"] = ["luke", "luke"]
        with self.assertRaises(ValueError):
            institute_events.record_institute_event(event)
        self.assertFalse(self.log.exists())

    def test_invalid_timestamp_is_rejected(self):
        event = self.event()
        event["occurred_at"] = "tomorrow"
        with self.assertRaises(ValueError):
            institute_events.record_institute_event(event)
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
