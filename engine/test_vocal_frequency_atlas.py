import unittest
import numpy as np

from engine.vocal_frequency_atlas import analyse, voiced_regions, make_control_events


class VocalAtlasTests(unittest.TestCase):
    def test_sustained_tone_has_pitch_and_region(self):
        rate = 16000
        t = np.arange(rate) / rate
        signal = 0.3*np.sin(2*np.pi*110*t) + 0.08*np.sin(2*np.pi*220*t)
        rows = analyse(signal, rate)
        voiced = [row for row in rows if row["voiced"]]
        self.assertGreater(len(voiced), 20)
        self.assertAlmostEqual(float(np.median([r["f0_hz"] for r in voiced])), 110, delta=5)
        regions = voiced_regions(rows)
        self.assertTrue(regions)
        events = make_control_events(rows)
        self.assertTrue(events)
        self.assertIn("formant_candidates_hz", events[0]["acoustic_profile"])

    def test_silence_is_not_marked_voiced(self):
        rows = analyse(np.zeros(8000), 16000)
        self.assertFalse(any(row["voiced"] for row in rows))


if __name__ == "__main__":
    unittest.main()
