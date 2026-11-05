import array
import unittest

from engine.audio_sampler import analyse, build_cues


class AudioSamplerTests(unittest.TestCase):
    def test_detects_energy_changes_and_emits_program_cues(self):
        rate = 11025
        samples = array.array("h")
        # Quiet bed with periodic short impulses.
        for i in range(rate * 5):
            value = 500 if i % (rate // 2) < 30 else 0
            samples.append(value)
        result = analyse(samples, rate)
        self.assertGreaterEqual(len(result["onset_ms"]), 3)
        self.assertGreater(result["peak_rms"], result["mean_rms"])
        cues = build_cues(result, 5000)
        self.assertEqual(cues[0]["kind"], "intro")
        self.assertTrue(any(cue["kind"] == "transient" for cue in cues))
        self.assertTrue(all(cue["instruction"] for cue in cues))


if __name__ == "__main__":
    unittest.main()
