import math
import unittest
from engine.audio.audio_sampler import analyse_frames, build_cues, estimate_tempo, RATE, FRAME, HOP

class AudioSamplerTests(unittest.TestCase):
    def test_features(self):
        samples=[.4*math.sin(2*math.pi*220*i/RATE) for i in range(FRAME*3)]
        frames=analyse_frames(samples)
        self.assertGreaterEqual(len(frames),3)
        self.assertGreater(frames[0]["rms"],.1)
        self.assertGreater(frames[0]["spectral_centroid_hz"],100)

    def test_cues_match_music_program_schema(self):
        frames=[{"at_ms":i*HOP*1000/RATE,"rms":.05 if i<3 else .7,
          "spectral_flux":.9 if i==3 else .02,"spectral_centroid_hz":500.,
          "zero_crossing_rate":.02} for i in range(12)]
        cues=build_cues(frames,5000)
        self.assertTrue(cues)
        self.assertIn("at_ms",cues[0])
        self.assertIn("instruction",cues[0])
        self.assertGreaterEqual(cues[0]["intensity"],0)
        self.assertLessEqual(cues[0]["intensity"],1)

    def test_short_tempo_input(self):
        self.assertIsNone(estimate_tempo([{"spectral_flux":0.0}]*3))

if __name__=="__main__": unittest.main()
