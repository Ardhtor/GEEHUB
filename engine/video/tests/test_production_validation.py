"""Tests for non-mock provider and production acceptance contracts."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from production_validation import evaluate_acceptance, validate_audio_render, validate_cost_approval_manifest, validate_provider_manifest, validate_shot_manifest, validate_staged_references
from engine.audio.procedural_soundscape import validate_audio_plan


class ProductionValidationTests(unittest.TestCase):
    def setUp(self):
        self.references = {"project_id": "test-project", "assets": [{"asset_id": "ref-a"}, {"asset_id": "ref-b"}]}
        self.provider = {
            "schema": "geehub.video-provider/1",
            "provider_id": "test-video-provider",
            "display_name": "Grok Imagine Video",
            "connection_status": "not-connected",
            "api_adapter_status": "not-implemented",
            "generation_enabled": False,
            "cost_approval_required": True,
            "cost_approval_status": "not-granted",
            "data_transfer_approval_status": "not-granted",
            "reference_rights_clearance_status": "not-verified",
            "mock_mode": False,
            "fallback_policy": "Never substitute placeholder media for real generated video."
        }
        self.shots = {
            "schema": "geehub.shot-manifest/1",
            "project_id": "test-project",
            "provider": "Grok Imagine Video",
            "provider_id": "test-video-provider",
            "generation_policy": {
                "cost_approval_required": True,
                "mock_or_placeholder_media_allowed": False,
                "connection_status": "not-connected",
                "api_adapter_status": "not-implemented",
                "generation_enabled": False,
                "cost_approval_status": "not-granted",
                "data_transfer_approval_status": "not-granted",
                "reference_rights_clearance_status": "not-verified",
            },
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



    def _audio_plan(self):
        return {
            "schema": "geehub.audio-plan/1",
            "project_id": "audio-test-project",
            "duration_seconds": 60,
            "sample_rate_hz": 48000,
            "channels": 2,
            "bit_depth": 24,
            "stems": [
                {"name": name, "source": "procedural-original"}
                for name in ("room_tone", "wood_grain", "serum_pulse", "bit_motif", "climax")
            ],
            "optional_sample_layer": {"enabled": False},
            "master": {"integrated_lufs": -16.0, "true_peak_dbtp": -1.0},
        }

    def test_audio_plan_requires_original_five_stem_48k_24bit_master(self):
        plan = self._audio_plan()
        self.assertEqual(validate_audio_plan(plan, "audio-test-project"), [])
        plan["optional_sample_layer"]["enabled"] = True
        self.assertTrue(any("sample layer" in error for error in validate_audio_plan(plan, "audio-test-project")))

    def test_missing_audio_render_is_a_blocker_not_a_schema_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "07_MANIFESTS").mkdir()
            errors, report = validate_audio_render(root, "audio-test-project", self._audio_plan())
        self.assertEqual(errors, [])
        self.assertTrue(report["missing"])
        self.assertFalse(report["verified"])

    def test_audio_render_requires_checksums_and_loudness_evidence(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifests = root / "07_MANIFESTS"
            manifests.mkdir()
            audio_dir = root / "06_AUDIO" / "GENERATED"
            audio_dir.mkdir(parents=True)
            master_path = audio_dir / "master.wav"
            master_path.write_bytes(b"master-wav-fixture")
            stems = []
            for name in ("room_tone", "wood_grain", "serum_pulse", "bit_motif", "climax"):
                stem_path = audio_dir / f"{name}.wav"
                stem_path.write_bytes(f"stem-{name}".encode())
                stems.append({
                    "name": name,
                    "path": str(stem_path.relative_to(root)),
                    "size_bytes": stem_path.stat().st_size,
                    "sha256": hashlib.sha256(stem_path.read_bytes()).hexdigest(),
                })
            master = {
                "path": str(master_path.relative_to(root)),
                "size_bytes": master_path.stat().st_size,
                "sha256": hashlib.sha256(master_path.read_bytes()).hexdigest(),
                "media_metadata": {
                    "duration_seconds": 60,
                    "sample_rate": 48000,
                    "channels": 2,
                    "bits_per_sample": 24,
                    "codec_name": "pcm_s24le",
                },
            }
            render = {
                "schema": "geehub.audio-render/1",
                "project_id": "audio-test-project",
                "status": "rendered",
                "duration_seconds": 60,
                "format": {
                    "container": "wav", "codec": "pcm_s24le",
                    "sample_rate_hz": 48000, "channels": 2, "bit_depth": 24,
                },
                "master": master,
                "loudness_measurement": {
                    "measurement_status": "measured",
                    "integrated_lufs": -16.0,
                    "true_peak_dbtp": -1.0,
                },
                "stems": stems,
                "rights": {
                    "original_procedural_generation": True,
                    "external_samples_used": False,
                    "sample_layer_enabled": False,
                },
            }
            (manifests / "audio_render.json").write_text(json.dumps(render), encoding="utf-8")
            errors, report = validate_audio_render(root, "audio-test-project", self._audio_plan())
            self.assertEqual(errors, [])
            self.assertTrue(report["verified"])
            render["loudness_measurement"]["true_peak_dbtp"] = -0.5
            (manifests / "audio_render.json").write_text(json.dumps(render), encoding="utf-8")
            errors, _ = validate_audio_render(root, "audio-test-project", self._audio_plan())
            self.assertTrue(any("true peak" in error for error in errors))

    def test_xai_cost_approval_template_matches_provider_and_reference_scope(self):
        provider = {
            "schema": "geehub.video-provider/1",
            "provider_id": "xai-grok-imagine-video",
            "display_name": "Grok Imagine Video (xAI API)",
            "connection_status": "not-connected-in-current-workspace",
            "api_adapter_status": "implemented",
            "generation_enabled": False,
            "cost_approval_required": True,
            "cost_approval_status": "not-granted",
            "data_transfer_approval_required": True,
            "data_transfer_approval_status": "not-granted",
            "reference_rights_clearance_required": True,
            "reference_rights_clearance_status": "not-verified",
            "mock_mode": False,
            "fallback_policy": "Never substitute mock or placeholder media for real provider output.",
            "api": {"base_url": "https://api.x.ai/v1"},
            "generation_workflow": {
                "model_id": "grok-imagine-video-1.5",
                "segment_duration_seconds": 15,
                "total_duration_seconds": 60,
                "provider_resolution": "1280x720",
            },
            "pricing": {
                "resolution": "720p",
                "estimated_total_usd": 8.4,
            },
        }
        refs = [{"asset_id": "ref-a"}, {"asset_id": "ref-b"}]
        shots = {"project_id": "hulums-lab-serum-60s", "shots": [{"reference_assets": refs}]}
        approval = {
            "schema": "geehub.provider-cost-approval/1",
            "project_id": "hulums-lab-serum-60s",
            "provider_id": "xai-grok-imagine-video",
            "status": "not-granted",
            "approved_by": None,
            "approved_at": None,
            "max_usd": None,
            "model": "grok-imagine-video-1.5",
            "resolution": "720p",
            "total_duration_seconds": 60,
            "segment_duration_seconds": 15,
            "estimated_cost_usd": 8.4,
            "reference_data_transfer_approved": False,
            "reference_rights_cleared": False,
            "reference_asset_ids": ["ref-a", "ref-b"],
        }
        self.assertEqual(validate_provider_manifest(provider), [])
        self.assertEqual(validate_cost_approval_manifest(approval, provider, shots), [])
        approval["reference_asset_ids"] = ["ref-a"]
        self.assertTrue(any("reference_asset_ids" in error for error in validate_cost_approval_manifest(approval, provider, shots)))

    def test_xai_generation_cannot_be_enabled_without_cost_transfer_and_rights_approval(self):
        provider = {
            "schema": "geehub.video-provider/1",
            "provider_id": "xai-grok-imagine-video",
            "display_name": "Grok Imagine Video (xAI API)",
            "connection_status": "connected",
            "api_adapter_status": "implemented",
            "generation_enabled": True,
            "cost_approval_required": True,
            "cost_approval_status": "not-granted",
            "data_transfer_approval_required": True,
            "data_transfer_approval_status": "not-granted",
            "reference_rights_clearance_required": True,
            "reference_rights_clearance_status": "not-verified",
            "mock_mode": False,
            "fallback_policy": "Never substitute mock or placeholder media for real provider output.",
            "api": {"base_url": "https://api.x.ai/v1"},
            "generation_workflow": {
                "model_id": "grok-imagine-video-1.5",
                "segment_duration_seconds": 15,
                "total_duration_seconds": 60,
            },
            "pricing": {"resolution": "720p", "estimated_total_usd": 8.4},
        }
        errors = validate_provider_manifest(provider)
        self.assertTrue(any("explicit cost approval" in error for error in errors))
        self.assertTrue(any("reference-image transfer approval" in error for error in errors))
        self.assertTrue(any("reference-image rights" in error for error in errors))

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

    def test_reference_staging_requires_hash_matched_source_sidecar(self):
        asset = b"reference image bytes"
        source_dir = self.root / "01_SOURCE" / "REFERENCE_IMAGES"
        source_dir.mkdir(parents=True)
        staged = source_dir / "ref-a.png"
        staged.write_bytes(asset)
        digest = hashlib.sha256(asset).hexdigest()
        sidecar = staged.with_suffix(".png.source.json")
        sidecar.write_text(json.dumps({
            "asset_id": "ref-a", "project_id": "test-project",
            "library": {"file_id": "file-a", "library_file_id": "libfile-a"},
            "source": {"sha256": digest, "original_modified": False},
            "staged": {"path": "01_SOURCE/REFERENCE_IMAGES/ref-a.png", "sha256": digest},
            "integrity": {"verified": True, "copy_matches_source": True}
        }))
        registry = {
            "schema": "geehub.reference-imports/1", "project_id": "test-project",
            "assets": [{
                "asset_id": "ref-a", "path": "01_SOURCE/REFERENCE_IMAGES/ref-a.png",
                "sidecar": "01_SOURCE/REFERENCE_IMAGES/ref-a.png.source.json",
                "sha256": digest, "size_bytes": len(asset)
            }]
        }
        registry_path = self.root / "07_MANIFESTS" / "reference_imports.json"
        registry_path.parent.mkdir(parents=True, exist_ok=True)
        registry_path.write_text(json.dumps(registry))
        library = {"project_id": "test-project", "assets": [{"asset_id": "ref-a", "file_id": "file-a", "library_file_id": "libfile-a"}]}
        report = validate_staged_references(self.root, ["ref-a"], library)
        self.assertTrue(report["verified"])
        staged.write_bytes(b"changed bytes")
        report = validate_staged_references(self.root, ["ref-a"], library)
        self.assertFalse(report["verified"])
        self.assertTrue(report["errors"])

    def test_completed_shot_without_provider_and_dropbox_evidence_is_rejected(self):
        shots = dict(self.shots)
        shots["shots"] = [dict(self.shots["shots"][0], generation={"status": "completed"})] + [self.shots["shots"][1]]
        errors = validate_shot_manifest(shots, self.references, self.provider, self.root)
        self.assertTrue(any("provider_job_id" in error for error in errors))
        self.assertTrue(any("Dropbox reopen verification" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
