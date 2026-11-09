"""Simulated high-I/O and recovery tests for the durable Tractus inscriber."""
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from engine import inscription


class InscriptionIOTests(unittest.TestCase):
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

    def event(self, event_id, description=None):
        return {
            "id": event_id,
            "at": "2026-11-09T18:00:00Z",
            "type": "observation",
            "title": f"IO test {event_id}",
            "description": description if description is not None else f"payload for {event_id}",
        }

    def test_concurrent_read_write_integrity(self):
        def write(index):
            return inscription.inscribe_event(self.event(f"parallel-{index:03d}"), "io-test")

        def read_snapshot():
            with inscription._activity_lock():
                rows = [json.loads(line) for line in self.log.read_text(encoding="utf-8").splitlines() if line]
                return len(rows)

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(write, index) for index in range(48)]
            read_futures = [pool.submit(read_snapshot) for _ in range(12)]
            for future in futures + read_futures:
                future.result()

        rows = [json.loads(line) for line in self.log.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(len(rows), 48)
        self.assertEqual(len({row["id"] for row in rows}), 48)
        ledger = json.loads(self.index.read_text(encoding="utf-8"))
        self.assertEqual(len(ledger["artifacts"]), 48)
        for row in rows:
            saved = json.loads((self.artifacts / f"{row['id']}.json").read_text(encoding="utf-8"))
            self.assertEqual(saved["lineage"]["event"]["id"], row["id"])

    def test_repeated_autosaves_are_idempotent(self):
        event = self.event("autosave-001")
        for _ in range(25):
            inscription.inscribe_event(event, "io-test")
        self.assertEqual(len(self.log.read_text(encoding="utf-8").splitlines()), 1)
        ledger = json.loads(self.index.read_text(encoding="utf-8"))
        self.assertEqual(len(ledger["artifacts"]), 1)

    def test_conflicting_event_id_is_rejected(self):
        inscription.inscribe_event(self.event("conflict-001", "first payload"), "io-test")
        with self.assertRaisesRegex(ValueError, "Event ID conflict"):
            inscription.inscribe_event(self.event("conflict-001", "different payload"), "io-test")
        self.assertEqual(len(self.log.read_text(encoding="utf-8").splitlines()), 1)

    def test_large_payload_reads_back_exactly(self):
        payload = "large-write-" * 45000
        inscription.inscribe_event(self.event("large-001", payload), "io-test")
        artifact = json.loads((self.artifacts / "large-001.json").read_text(encoding="utf-8"))
        self.assertEqual(artifact["content"], payload)

    def test_interrupted_activity_tail_is_truncated_before_next_append(self):
        self.log.parent.mkdir(parents=True, exist_ok=True)
        valid = json.dumps({"id": "prior-event", "occurred_at": "2026-11-09T17:00:00Z"}) + "\\n"
        self.log.write_bytes(valid.encode("utf-8") + b'{"id":"interrupted')
        inscription.inscribe_event(self.event("recovery-001"), "io-test")
        rows = [json.loads(line) for line in self.log.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual([row["id"] for row in rows], ["prior-event", "recovery-001"])

    def test_partial_artifact_is_recovered_from_canonical_event(self):
        self.artifacts.mkdir(parents=True, exist_ok=True)
        (self.artifacts / "interrupted-001.json").write_text('{"partial":', encoding="utf-8")
        inscription.inscribe_event(self.event("interrupted-001"), "io-test")
        recovered = json.loads((self.artifacts / "interrupted-001.json").read_text(encoding="utf-8"))
        self.assertEqual(recovered["lineage"]["event"]["id"], "interrupted-001")

    def test_failed_atomic_replace_preserves_previous_file(self):
        path = Path(self.temp.name) / "atomic.json"
        path.write_text('{"old": true}', encoding="utf-8")
        with patch.object(inscription.os, "replace", side_effect=OSError("simulated interrupted transfer")):
            with self.assertRaises(OSError):
                inscription._write_json(path, {"new": True})
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), {"old": True})
        self.assertEqual(list(Path(self.temp.name).glob("atomic.json.*.tmp")), [])


if __name__ == "__main__":
    unittest.main()
