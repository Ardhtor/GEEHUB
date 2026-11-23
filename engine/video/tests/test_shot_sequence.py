"""Tests for verified final and local-review OTIO assembly."""
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
        manifests = self.root / "07_MANIFESTS"
        manifests.mkdir()
        source_dir = self.root / "01_SOURCE" / "GENERATED_SHOTS"
        source_dir.mkdir(parents=True)
        self.video_a = source_dir / "shot-a.mp4"
        self.video_b = source_dir / "shot-b.mp4"
        self.video_a.write_bytes(b"verified video fixture A")
        self.video_b.write_bytes(b"verified video fixture B")
        digest_a = hashlib.sha256(self.video_a.read_bytes()).hexdigest()
        digest_b = hashlib.sha256(self.video_b.read_bytes()).hexdigest()
        first_frame = "a" * 64
        boundary_frame = "b" * 64
        final_frame = "c" * 64
        self.references = {
            "project_id": "test-project",
            "assets": [{"asset_id": "ref-a"}, {"asset_id": "ref-b"}],
        }
        self.provider = {
            "schema": "geehub.video-provider/1",
            "provider_id": "test-video-provider",
            "display_name": "Test Video Provider",
            "connection_status": "connected",
            "api_adapter_status": "implemented",
            "generation_enabled": True,
            "cost_approval_required": True,
            "cost_approval_status": "approved",
            "data_transfer_approval_status": "approved",
            "reference_rights_clearance_status": "cleared",
            "mock_mode": False,
            "fallback_policy": "Never substitute placeholder media for real generated video.",
        }
        self.shots = {
            "schema": "geehub.shot-manifest/1",
            "project_id": "test-project",
            "provider": "Test Video Provider",
            "provider_id": "test-video-provider",
            "sequence_id": "test-sequence",
            "generation_policy": {
                "cost_approval_required": True,
                "mock_or_placeholder_media_allowed": False,
                "connection_status": "connected",
                "api_adapter_status": "implemented",
                "generation_enabled": True,
                "cost_approval_status": "approved",
                "data_transfer_approval_status": "approved",
                "reference_rights_clearance_status": "cleared",
            },
            "sequence_policy": {
                "no_mock_fallback": True,
                "segment_count": 2,
                "total_duration_seconds": 16,
                "segment_boundary_frame_match_required": True,
            },
            "shots": [],
        }
        for order, shot_id, digest, first_hash, last_hash, continuity in (
            (1, "shot-a", digest_a, first_frame, boundary_frame, "initial"),
            (2, "shot-b", digest_b, boundary_frame, final_frame, "passed"),
        ):
            prompt = f"Actual generated video shot {shot_id}"
            submitted_prompt = prompt
            generation = {
                "status": "completed",
                "provider_id": "test-video-provider",
                "provider_job_id": f"job-{shot_id}",
                "provider_output_id": f"output-{shot_id}",
                "provider_output_file_id": f"output-{shot_id}",
                "model_id": "test-video-model",
                "prompt_revision": 1,
                "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                "submitted_prompt": submitted_prompt,
                "submitted_prompt_sha256": hashlib.sha256(submitted_prompt.encode()).hexdigest(),
                "reference_asset_ids": ["ref-a", "ref-b"],
                "reference_file_ids": ["file-ref-a", "file-ref-b"],
                "pinned_first_frame_file_id": None if order == 1 else "file-last-frame-a",
                "first_frame_file_id": None if order == 1 else "file-last-frame-a",
                "last_frame_file_id": f"file-last-frame-{shot_id}",
                "first_frame_sha256": first_hash,
                "last_frame_sha256": last_hash,
                "continuity_status": continuity,
                "submitted_at": "2026-11-23T17:00:00Z",
                "completed_at": "2026-11-23T17:01:00Z",
                "duration_seconds": 8,
                "frame_rate": "24/1",
                "width": 1920,
                "height": 1080,
                "video_codec": "h264",
                "audio_codec": "aac",
                "output_path": f"01_SOURCE/GENERATED_SHOTS/{shot_id}.mp4",
                "output_sha256": digest,
                "media_metadata": {
                    "duration_seconds": 8,
                    "frame_rate": "24/1",
                    "width": 1920,
                    "height": 1080,
                    "video_codec": "h264",
                    "audio_codec": "aac",
                },
                "dropbox_file_id": f"dropbox-{shot_id}",
                "dropbox_path": f"/GEEHUB/{shot_id}.mp4",
                "reopened_from_dropbox": True,
                "metadata_verified": True,
                "dropbox_verification": {
                    "reopened": True,
                    "file_id": f"dropbox-{shot_id}",
                    "path": f"/GEEHUB/{shot_id}.mp4",
                    "sha256": digest,
                    "reopened_at": "2026-11-23T17:02:00Z",
                    "metadata_verified": True,
                },
            }
            self.shots["shots"].append({
                "shot_id": shot_id,
                "revision": 1,
                "sequence_order": order,
                "timeline_range_seconds": [(order - 1) * 8, order * 8],
                "duration_seconds": 8,
                "status": "completed",
                "continuity_key": "test-subject",
                "prompt": prompt,
                "reference_assets": [
                    {"asset_id": "ref-a", "use": "test"},
                    {"asset_id": "ref-b", "use": "test"},
                ],
                "generation": generation,
            })
        for name, data in (
            ("shots.json", self.shots),
            ("video_provider.json", self.provider),
            ("reference_library.json", self.references),
        ):
            (manifests / name).write_text(json.dumps(data), encoding="utf-8")
        acceptance = {
            "schema": "geehub.video-production-acceptance/1",
            "project_id": "test-project",
            "minimum_independent_generated_shots": 2,
        }
        (manifests / "production_acceptance.json").write_text(json.dumps(acceptance), encoding="utf-8")

    def _probe(self, _path):
        return {
            "duration_seconds": 8.0,
            "frame_rate": "24/1",
            "width": 1920,
            "height": 1080,
            "video_codec": "h264",
            "audio_codec": "aac",
        }

    def _write_shots(self):
        (self.root / "07_MANIFESTS" / "shots.json").write_text(json.dumps(self.shots), encoding="utf-8")

    def test_builds_and_round_trips_two_clip_verified_otio_sequence(self):
        output = self.root / "04_COMPOSITES" / "proof.otio"
        with patch("shot_sequence.probe_media", side_effect=self._probe):
            report = build_otio_sequence(self.root, output)
        self.assertEqual(report["shot_count"], 2)
        self.assertEqual(report["otio_round_trip"], "passed")
        self.assertFalse(report["preview_only"])
        self.assertTrue(report["continuity_verified"])
        self.assertTrue(output.is_file())

    def test_generated_local_segments_require_explicit_local_preview(self):
        for shot in self.shots["shots"]:
            generation = shot["generation"]
            generation["status"] = "generated-local"
            generation["dropbox_file_id"] = None
            generation["dropbox_path"] = None
            generation["reopened_from_dropbox"] = False
            generation["metadata_verified"] = False
            generation.pop("dropbox_verification", None)
        self._write_shots()
        with patch("shot_sequence.probe_media", side_effect=self._probe):
            with self.assertRaisesRegex(ValueError, "require --local-preview"):
                build_otio_sequence(self.root, self.root / "04_COMPOSITES" / "not-final.otio")
            report = build_otio_sequence(
                self.root,
                self.root / "04_COMPOSITES" / "review.otio",
                allow_local_preview=True,
            )
        self.assertTrue(report["preview_only"])
        self.assertTrue((self.root / "04_COMPOSITES" / "review.otio").is_file())

    def test_draft_shots_cannot_be_assembled(self):
        for shot in self.shots["shots"]:
            shot["generation"]["status"] = "not-started"
            shot["generation"]["provider_job_id"] = None
            shot["generation"]["provider_id"] = None
            shot["generation"]["provider_output_id"] = None
            shot["generation"]["provider_output_file_id"] = None
            shot["generation"]["model_id"] = None
            shot["generation"]["output_path"] = None
            shot["generation"]["output_sha256"] = None
        self._write_shots()
        with self.assertRaises(ValueError):
            build_otio_sequence(self.root, self.root / "04_COMPOSITES" / "draft.otio")

    def test_sequence_rejects_nonmatching_segment_boundary_hashes(self):
        self.shots["shots"][1]["generation"]["first_frame_sha256"] = "d" * 64
        self._write_shots()
        with patch("shot_sequence.probe_media", side_effect=self._probe):
            with self.assertRaisesRegex(ValueError, "first frame does not match"):
                build_otio_sequence(self.root, self.root / "04_COMPOSITES" / "bad-boundary.otio")


if __name__ == "__main__":
    unittest.main()
