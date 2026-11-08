"""Tests for the canonical GEEHUB event inscription path."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from engine import inscription


class InscriptionTests(unittest.TestCase):
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
            "id": "dialogue-test-001",
            "at": "2026-11-08T18:00:00Z",
            "type": "UTTERANCE",
            "artifact_kind": "dialogue",
            "title": "Joey speaks",
            "body": "The room changes when he answers.",
            "utterance": "The room changes when he answers.",
            "from": "joseph",
            "to": "luke",
        }

    def test_dialogue_is_written_to_all_durable_projections(self):
        result = inscription.inscribe_event(self.event(), "unit-test")
        self.assertEqual(result["status"], "OCCURRED_AND_INSCRIBED")
        artifact = json.loads((self.artifacts / "dialogue-test-001.json").read_text())
        self.assertEqual(artifact["kind"], "dialogue")
        self.assertEqual(artifact["content"], "The room changes when he answers.")
        ledger = json.loads(self.index.read_text())
        self.assertEqual(ledger["artifacts"][0]["id"], "activity-dialogue-test-001")
        self.assertTrue((self.outbox / "dialogue-test-001.json").exists())
        self.assertEqual(len(self.log.read_text().splitlines()), 1)

    def test_duplicate_event_id_is_inscribed_once(self):
        inscription.inscribe_event(self.event(), "unit-test")
        inscription.inscribe_event(self.event(), "unit-test")
        self.assertEqual(len(self.log.read_text().splitlines()), 1)
        ledger = json.loads(self.index.read_text())
        self.assertEqual(len(ledger["artifacts"]), 1)

    def test_unsafe_event_id_is_rejected_before_path_write(self):
        event = self.event()
        event["id"] = "../outside"
        with self.assertRaises(ValueError):
            inscription.inscribe_event(event, "unit-test")
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
