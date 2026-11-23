"""Tests for non-mock provider and production acceptance contracts."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from production_validation import evaluate_acceptance, validate_provider_manifest, validate_shot_manifest


class ProductionValidationTests(unittest.TestCase):
    def setUp(self):
        self.references = {"project_id": "test-project", "assets": [{"asset_id": "ref-a"}, {"asset_id": "ref-b"}]}
        self.provider = {
            "schema": "geehub.video-provider/1",
            "provider_id": "xai-grok-imagine-video",
            "display_name": "Grok Imagine Video",
            "connection_status": "not-connected",
            "api_adapter_status": "not-implemented",
            "generation_enabled": False,
            "cost_approval_required": True,
            "cost_approval_status": "not-granted",
            "mock_mode": False,
            "fallback_policy": "Never substitute placeholder media for real generated video."
        }
        self.shots = {
            "schema": "geehub.shot-manifest/1",
            "project_id": "test-project",
            "provider": "Grok Imagine Video",
            "generation_policy": {"cost_approval_required": True, "mock_or_placeholder_media_allowed": False},
            "shots": [
                {"shot_id": "a", "sequence_order": 1, "duration_seconds": 8, "timeline_range_seconds": [0, 8],
                 "continuity_key": "subject", "prompt": "First actual video shot", "reference_assets": [{"asset_id": "ref-a", "use": "shape"}],
                 "generation": {"status": "not-started", "provider_job_id": None, "model_id": None, "output_path": None, "output_sha256": None, "dropbox_file_id": None, "dropbox_path": None, "reopened_from_dropbox": False}},
                {"shot_id": "b", "sequence_order": 2, "duration_seconds": 8, "timeline_range_seconds": [8, 16],
                 "continuity_key": "subject", "prompt": "Second actual video shot", "reference_assets": [{"asset_id": "ref-b", "use": "scale"}],
                 "generation": {"status": "not-started", "provider_job_id": None, "model_id": None, "output_path": None, "output_sha256": None, "dropbox_file_id": None, "dropbox_path": None, "reopened_from_dropbox": False}}
            ],
            "sequence_policy": {"no_mock_fallback": True}
        }
        self.root = Path(tempfile.mkdtemp())

    def test_provider_manifest_keeps_generation_disabled_without_approval(self):
        self.assertEqual(validate_provider_manifest(self.provider), [])

    def test_provider_cannot_enable_generation_without_connection_and_approval(self):
        provider = dict(self.provider, generation_enabled=True)
        errors = validate_provider_manifest(provider)
        self.assertTrue(any("disconnected" in error for error in errors))
        self.assertTrue(any("cost approval" in error for error in errors))

    def test_two_draft_shots_are_valid_but_not_complete(self):
        self.assertEqual(validate_shot_manifest(self.shots, self.references, self.provider, self.root), [])
        acceptance = {
            "minimum_independent_generated_shots": 2,
            "evidence": {"sequence_otio": None, "master_mp4": None, "master_dropbox_verification": None}
        }
        report = evaluate_acceptance(self.shots, acceptance, self.root)
        self.assertFalse(report["accepted"])
        self.assertEqual(report["completed_shots"], 0)
        self.assertGreaterEqual(len(report["blockers"]), 3)

    def test_completed_shot_without_provider_and_dropbox_evidence_is_rejected(self):
        shots = dict(self.shots)
        shots["shots"] = [dict(self.shots["shots"][0], generation={"status": "completed"})] + [self.shots["shots"][1]]
        errors = validate_shot_manifest(shots, self.references, self.provider, self.root)
        self.assertTrue(any("provider_job_id" in error for error in errors))
        self.assertTrue(any("Dropbox reopen verification" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
