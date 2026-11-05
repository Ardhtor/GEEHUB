import unittest
import numpy as np

from engine.audio.vocal_frequency_atlas import analyse, voiced_regions, make_control_events, gesture_segments
from engine.narrative_container.music_program import load_program


class VocalAtlasTests(unittest.TestCase):
    def test_sustained_tone_has_pitch_and_region(self):
        rate = 16000
        t = np.arange(rate) / rate
        signal = 0.3*np.sin(2*np.pi*110*t) + 0.08*np.sin(2*np.pi*220*t)
        rows = analyse(signal, rate)
        voiced = [row for row in rows if row["voiced"]]
        self.assertGreater(len(voiced), 20)
        self.assertAlmostEqual(float(np.median([r["f0_hz"] for r in voiced])), 110, delta=5)
        self.assertTrue(voiced_regions(rows))
        events = make_control_events(rows)
        self.assertTrue(events)
        self.assertIn("formant_candidates_hz", events[0]["acoustic_profile"])
        self.assertEqual(events[0]["gesture"], "sustained_resonance")
        manifest = {"id": "vocal-test", "asset_ref": "test.wav",
                    "duration_ms": 1000, "cues": events[:1]}
        program = load_program(manifest)
        self.assertIsNotNone(program.events_until(1000)[0]["acoustic_profile"])


    def test_gesture_segments_describe_pitch_glide(self):
        rows = []
        for i in range(15):
            rows.append({
                "at_ms": i * 20, "voiced": True, "periodicity": 0.8,
                "f0_hz": 100 + i * 4, "rms": 0.2,
                "roughness_proxy": 0.2,
            })
        segments = gesture_segments(rows)
        self.assertEqual(len(segments), 1)
        self.assertEqual(segments[0]["gesture"], "pitch_glide")
        self.assertEqual(segments[0]["classification"], "acoustic_heuristic")

    def test_gesture_segments_do_not_invent_events_from_silence(self):
        rows = [{
            "at_ms": i * 20, "voiced": False, "periodicity": 0.0,
            "f0_hz": None, "rms": 0.0, "roughness_proxy": 1.0,
        } for i in range(20)]
        self.assertEqual(gesture_segments(rows), [])

    def test_silence_is_not_marked_voiced(self):
        rows = analyse(np.zeros(8000), 16000)
        self.assertFalse(any(row["voiced"] for row in rows))


if __name__ == "__main__":
    unittest.main()
