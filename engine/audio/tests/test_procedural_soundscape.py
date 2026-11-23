"""Unit tests for deterministic procedural audio output."""
import json
import math
import shutil
import sys
import tempfile
import unittest
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from procedural_soundscape import (
    _bit_motif,
    _parse_loudnorm_summary,
    _pcm24_bytes,
    _room_tone,
    probe_audio,
    render_soundscape,
    validate_audio_plan,
    write_pcm24_wav,
)


class ProceduralSoundscapeTests(unittest.TestCase):
    def test_pcm24_encoder_writes_signed_little_endian_samples(self):
        self.assertEqual(_pcm24_bytes(0.0), b"\x00\x00\x00")
        positive = int.from_bytes(_pcm24_bytes(0.5), "little", signed=True)
        negative = int.from_bytes(_pcm24_bytes(-0.5), "little", signed=True)
        self.assertGreater(positive, 0)
        self.assertLess(negative, 0)
        self.assertAlmostEqual(positive / 8388607, 0.5, delta=0.001)
        self.assertAlmostEqual(negative / 8388607, -0.5, delta=0.001)

    def test_writes_stereo_48khz_24bit_wav(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "test.wav"
            record = write_pcm24_wav(
                path,
                lambda t: (0.2 * math.sin(math.tau * 440 * t), 0.2 * math.sin(math.tau * 440 * t)),
                0.1,
            )
            with wave.open(str(path), "rb") as audio:
                self.assertEqual(audio.getnchannels(), 2)
                self.assertEqual(audio.getsampwidth(), 3)
                self.assertEqual(audio.getframerate(), 48000)
                self.assertEqual(audio.getnframes(), 4800)
            self.assertEqual(record["bit_depth"], 24)
            self.assertEqual(record["channels"], 2)
            self.assertEqual(record["duration_seconds"], 0.1)
            with self.assertRaises(FileExistsError):
                write_pcm24_wav(path, lambda _t: (0.0, 0.0), 0.1)

    def test_procedural_room_tone_is_deterministic(self):
        first = _room_tone(12345, 60)
        second = _room_tone(12345, 60)
        for t in (0.0, 0.25, 1.5, 12.0, 58.0):
            self.assertEqual(first(t), second(t))

    def test_original_bit_motif_is_deterministic_and_finite(self):
        first = _bit_motif(77, 60)
        second = _bit_motif(77, 60)
        for t in (0.01, 0.25, 1.75, 15.0, 59.0):
            a, b = first(t), second(t)
            self.assertEqual(a, b)
            self.assertTrue(math.isfinite(a[0]) and math.isfinite(a[1]))

    def test_production_audio_plan_passes_and_external_sample_is_disabled(self):
        project_root = Path(__file__).resolve().parents[3]
        plan_path = project_root / "production" / "projects" / "hulums-lab-serum-60s" / "07_MANIFESTS" / "audio_plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        self.assertEqual(validate_audio_plan(plan, "hulums-lab-serum-60s"), [])
        plan["optional_sample_layer"]["enabled"] = True
        self.assertTrue(any("sample layer" in error for error in validate_audio_plan(plan, "hulums-lab-serum-60s")))


    def test_short_render_creates_verified_stems_and_pcm24_master(self):
        if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
            self.skipTest("ffmpeg and ffprobe are required for the audio integration test")
        source_plan = Path(__file__).resolve().parents[3] / "production" / "projects" / "hulums-lab-serum-60s" / "07_MANIFESTS" / "audio_plan.json"
        with tempfile.TemporaryDirectory() as temporary:
            project = Path(temporary) / "hulums-lab-serum-60s"
            manifests = project / "07_MANIFESTS"
            manifests.mkdir(parents=True)
            (manifests / "audio_plan.json").write_bytes(source_plan.read_bytes())
            result = render_soundscape(project, duration_seconds=8, seed=321)
            master = project / result["master"]["path"]
            media = probe_audio(master)
            self.assertEqual(media["codec_name"], "pcm_s24le")
            self.assertEqual(media["sample_rate"], 48000)
            self.assertEqual(media["channels"], 2)
            self.assertEqual(media["bits_per_sample"], 24)
            self.assertAlmostEqual(media["duration_seconds"], 8.0, delta=0.05)
            self.assertEqual(len(result["stems"]), 5)
            self.assertTrue((manifests / "audio_render.json").is_file())

    def test_loudnorm_summary_parser_extracts_measurements(self):
        summary = """
        Output Integrated: -16.2 LUFS
        Output True Peak: -1.1 dBTP
        Output LRA: 4.2 LU
        """
        result = _parse_loudnorm_summary(summary)
        self.assertEqual(result["measurement_status"], "measured")
        self.assertAlmostEqual(result["integrated_lufs"], -16.2)
        self.assertAlmostEqual(result["true_peak_dbtp"], -1.1)
        self.assertAlmostEqual(result["lra_lu"], 4.2)


if __name__ == "__main__":
    unittest.main()
