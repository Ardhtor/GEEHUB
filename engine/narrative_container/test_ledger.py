import tempfile
import unittest
from pathlib import Path

from engine.narrative_container.ledger import Ledger


class NarrativeLedgerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ledger = Ledger(str(Path(self.tmp.name) / "ledger.sqlite"))
        self.ledger.add({
            "id": "DC-VEYR-001", "kind": "plan", "sender": "The Grammaton",
            "source": "dad-convent", "recipient": "The Keeper",
            "destination": "veyrthalis", "payload": "Timber-to-stone joint",
            "status": "sent"
        })

    def tearDown(self):
        self.ledger.close()
        self.tmp.cleanup()

    def test_inbox_and_receive(self):
        self.assertEqual(len(self.ledger.list("veyrthalis")), 1)
        self.ledger.transition("DC-VEYR-001", "received")
        self.ledger.transition("DC-VEYR-001", "interpreted", "Add drainage")
        self.ledger.transition("DC-VEYR-001", "accepted")
        self.assertEqual(self.ledger.get("DC-VEYR-001")["status"], "accepted")

    def test_invalid_transition_is_rejected(self):
        with self.assertRaises(ValueError):
            self.ledger.transition("DC-VEYR-001", "accepted")

    def test_adaptation_keeps_parent(self):
        self.ledger.transition("DC-VEYR-001", "received")
        self.ledger.adapt("DC-VEYR-001", {
            "id": "DC-VEYR-002", "sender": "The Keeper", "source": "veyrthalis",
            "recipient": "The Grammaton", "destination": "dad-convent",
            "payload": "Joint with drainage clearance"
        })
        child = self.ledger.get("DC-VEYR-002")
        self.assertEqual(child["parent_id"], "DC-VEYR-001")
        self.assertEqual(self.ledger.get("DC-VEYR-001")["status"], "adapted")

    def test_export_import_is_idempotent(self):
        bundle = Path(self.tmp.name) / "bundle.json"
        self.ledger.export(bundle)
        other = Ledger(str(Path(self.tmp.name) / "other.sqlite"))
        self.assertEqual(other.import_file(bundle), 1)
        self.assertEqual(other.import_file(bundle), 0)
        other.close()


if __name__ == "__main__":
    unittest.main()
