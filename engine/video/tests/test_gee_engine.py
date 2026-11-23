"""Security and request-contract tests for the local GEEHUB engine."""
import math
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import gee_engine


class LocalBridgeSecurityTests(unittest.TestCase):
    def test_accepts_only_loopback_hostnames_and_addresses(self):
        for host in ("127.0.0.1:8765", "localhost:8765", "[::1]:8765"):
            with self.subTest(host=host):
                self.assertTrue(gee_engine.host_is_loopback(host))

    def test_rejects_non_loopback_and_rebinding_hosts(self):
        for host in ("example.com:8765", "127.0.0.2:8765", "localhost.evil:8765", "127.0.0.1:9999", None):
            with self.subTest(host=host):
                self.assertFalse(gee_engine.host_is_loopback(host))

    def test_origin_allowlist_is_exact_and_configurable(self):
        self.assertTrue(gee_engine.origin_is_allowed(None))
        self.assertTrue(gee_engine.origin_is_allowed("null"))
        self.assertFalse(gee_engine.origin_is_allowed("https://attacker.example"))
        with patch.dict(os.environ, {"GEEHUB_ALLOWED_ORIGINS": "https://studio.example, https://studio.example:443"}):
            self.assertTrue(gee_engine.origin_is_allowed("https://studio.example"))
            self.assertFalse(gee_engine.origin_is_allowed("https://studio.example.evil"))
            self.assertFalse(gee_engine.origin_is_allowed("null"))


class RenderRequestValidationTests(unittest.TestCase):
    def test_accepts_minimal_valid_manifest(self):
        self.assertEqual(gee_engine.valid_render_manifest({"format": {"duration_seconds": 45}}), (True, None))

    def test_rejects_missing_or_malformed_format(self):
        for manifest in ({}, {"format": None}, {"format": []}, None, []):
            with self.subTest(manifest=manifest):
                self.assertFalse(gee_engine.valid_render_manifest(manifest)[0])

    def test_rejects_boolean_nonfinite_and_out_of_range_duration(self):
        for duration in (True, False, math.nan, math.inf, 9, 601, "45"):
            with self.subTest(duration=duration):
                valid, _ = gee_engine.valid_render_manifest({"format": {"duration_seconds": duration}})
                self.assertFalse(valid)

    def test_rejects_invalid_project_and_audio_types(self):
        self.assertFalse(gee_engine.valid_render_manifest({"format": {}, "project": " "})[0])
        self.assertFalse(gee_engine.valid_render_manifest({"format": {}, "audio_file": ["x.mp3"]})[0])

    def test_rejects_second_concurrent_render(self):
        old_jobs = gee_engine.JOBS.copy()
        try:
            gee_engine.JOBS.clear()
            gee_engine.JOBS["active"] = {"state": "running"}
            with self.assertRaisesRegex(RuntimeError, "already queued or running"):
                gee_engine.launch_job({"format": {"duration_seconds": 45}})
        finally:
            gee_engine.JOBS.clear()
            gee_engine.JOBS.update(old_jobs)


if __name__ == "__main__":
    unittest.main()
