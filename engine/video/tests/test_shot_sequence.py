"""Tests for real generated-shot OTIO assembly."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from shot_sequence import build_otio_sequence


class ShotSequenceTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "07_MANIFESTS").mkdir()
        (self.root / "01_SOURCE" / "GENERATED_SHOTS").mkdir(parents=True)
        self.video = self.root / "01_SOURCE" / "GENERATED_SHOTS" / "shot-a.mp4"
        self.video.write_bytes(b"verified video fixture")
        digest = hashlib.sha256(self.video.read_bytes()).hexdigest()
        self.references = {"project_id": "test-project", "assets": [{"asset_id": "ref-a"}, {"asset_id": "ref-b"}]}
        self.provider = {
            "schema": "geehub.video-provider/1", "provider_id": "xai-grok-imagine-video",
            "display_name": "Grok Imagine Video", "connection_status": "connected",
            "api_adapter_status": "implemented", "generation_enabled": True,
            "cost_approval_required": True, "cost_approval_status": "approved",
            "mock_mode": False, "fallback_policy": "Never substitute placeholder media for real generated video."
        }
        self.shots = {
            "schema": "geehub.shot-manifest/1", "project_id": "test-project",
            "sequence_id": "test-sequence", "provider": "Grok Imagine Video",
            "generation_policy": {"cost_approval_required": True, "mock_or_placeholder_media_allowed": False},
            "sequence_policy": {"no_mock_fallback": True},
            "shots": []
        }
        for order, shot_id, ref_id in ((1, "shot-a", "ref-a"), (2, "shot-b", "ref-b")):
            prompt = f"Actual generated video shot {shot_id}"
            generation = {
                "status": "completed", "provider_id": "xai-grok-imagine-video",
                "provider_job_id": f"job-{shot_id}", "provider_output_id": f"output-{shot_id}",
                "model_id": "grok-imagine-video", "prompt_revision": 1,
                "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                "reference_asset_ids": [ref_id], "submitted_at": "2026-11-23T17:00:00Z",
                "completed_at": "2026-11-23T17:01:00Z",
                "output_path": "01_SOURCE/GENERATED_SHOTS/shot-a.mp4",
                "output_sha256": digest, "dropbox_file_id": f"dropbox-{shot_id}",
                "dropbox_path": f"/GEEHUB/shot-{shot_id}.mp4",
                "media_metadata": {"duration_seconds": 8, "frame_rate": "24/1", "width": 1920, "height": 1080, "video_codec": "h264", "audio_codec": "aac"},
                "dropbox_verification": {"reopened": True, "file_id": f"dropbox-{shot_id}", "path": f"/GEEHUB/shot-{shot_id}.mp4", "sha256": digest, "reopened_at": "2026-11-23T17:02:00Z", "metadata_verified": True}
            }
            self.shots["shots"].append({
                "shot_id": shot_id, "revision": 1, "sequence_order": order,
                "timeline_range_seconds": [(order - 1) * 8, order * 8],
                "duration_seconds": 8, "status": "generated",
                "continuity_key": "test-subject", "prompt": prompt,
                "reference_assets": [{"asset_id": ref_id, "use": "test"}],
                "generation": generation
            })
        # Both clips must exist for a real sequence; the fixture bytes are used only
        # while probe_media is replaced with a deterministic test double.
        self.video_b.write_bytes(b"second verified video fixture")
        digest_b = hashlib.sha256(self.video_b.read_bytes()).hexdigest()
        self.shots["shots"][1]["generation"]["output_path"] = "01_SOURCE/GENERATED_SHOTS/shot-b.mp4"
        self.shots["shots"][1]["generation"]["output_sha256"] = digest_b
        self.shots["shots"][1]["generation"]["dropbox_verification"]["sha256"] = digest_b
        for name, data in (
            ("shots.json", self.shots), ("video_provider.json", self.provider),
            ("reference_library.json", self.references)
        ):
            (self.root / "07_MANIFESTS" / name).write_text(json.dumps(data), encoding="utf-8")
        acceptance = {"schema": "geehub.video-production-acceptance/1", "project_id": "test-project", "minimum_independent_generated_shots": 2}
        (self.root / "07_MANIFESTS" / "production_acceptance.json").write_text(json.dumps(acceptance), encoding="utf-8")

    @property
    def video_b(self):
        return self.root / "01_SOURCE" / "GENERATED_SHOTS" / "shot-b.mp4"

    def test_builds_and_round_trips_two_clip_otio_sequence(self):
        probe = {"duration_seconds": 8.0, "frame_rate": "24/1", "width": 1920, "height": 1080, "video_codec": "h264", "audio_codec": "aac"}
        output = self.root / "04_COMPOSITES" / "proof.otio"
        with patch("shot_sequence.probe_media", return_value=probe):
            report = build_otio_sequence(self.root, output)
        self.assertEqual(report["shot_count"], 2)
        self.assertEqual(report["otio_round_trip"], "passed")
        self.assertTrue(output.is_file())

    def test_draft_shots_cannot_be_assembled(self):
        shots = json.loads((self.root / "07_MANIFESTS" / "shots.json").read_text())
        for shot in shots["shots"]:
            shot["generation"]["status"] = "not-started"
            shot["generation"]["provider_job_id"] = None
            shot["generation"]["provider_id"] = None
        (self.root / "07_MANIFESTS" / "shots.json").write_text(json.dumps(shots))
        with self.assertRaises(ValueError):
            build_otio_sequence(self.root, self.root / "04_COMPOSITES" / "draft.otio")


if __name__ == "__main__":
    unittest.main()
