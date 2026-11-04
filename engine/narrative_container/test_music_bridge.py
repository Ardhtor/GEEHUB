import tempfile
import unittest
from pathlib import Path

from engine.narrative_container.ledger import Ledger
from engine.narrative_container.music_bridge import transmit_music_window


class MusicBridgeTests(unittest.TestCase):
    def test_music_cues_become_provenanced_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            ledger = Ledger(str(Path(tmp) / "music.sqlite"))
            manifest = {
                "id": "quthbert-session-01",
                "asset_ref": "dropbox:/GEEHUB/MUSIC/session-01.wav",
                "duration_ms": 90000,
                "cues": [
                    {"at_ms": 0, "kind": "intro", "intensity": 0.2,
                     "section": "opening", "instruction": "Establish the room."},
                    {"at_ms": 24000, "kind": "rise", "intensity": 0.7,
                     "section": "build", "instruction": "Increase physical scale."},
                    {"at_ms": 61000, "kind": "impact", "intensity": 1.0,
                     "section": "climax", "instruction": "Trigger the irreversible change."}
                ]
            }
            ids = transmit_music_window(ledger, manifest, -1, 30000,
                                        "Music Engine", "sound-stage",
                                        "The Grammaton", "dad-convent")
            self.assertEqual(len(ids), 2)
            record = ledger.get(ids[1])
            self.assertEqual(record["destination"], "dad-convent")
            self.assertIn("Increase physical scale", record["payload"])
            ledger.close()


if __name__ == "__main__":
    unittest.main()
