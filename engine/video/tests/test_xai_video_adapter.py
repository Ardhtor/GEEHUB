"""Offline tests for the cost-gated xAI video adapter."""
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from xai_video_adapter import (
    XAIClient,
    XAIError,
    build_generation_payload,
    estimate_continuous_sequence,
    estimate_video_cost,
    plan_segments,
    prompt_with_reference_slots,
    validate_generation_authorization,
)


class FakeResponse:
    def __init__(self, payload=b"{}", status=200, headers=None):
        self.payload = payload
        self.status = status
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, _size=-1):
        payload, self.payload = self.payload, b""
        return payload

    def getcode(self):
        return self.status


class XAIVideoAdapterTests(unittest.TestCase):
    def test_sixty_second_plan_is_four_contiguous_fifteen_second_segments(self):
        segments = plan_segments(60, 15)
        self.assertEqual(len(segments), 4)
        self.assertEqual(sum(item["duration_seconds"] for item in segments), 60)
        self.assertEqual(segments[0]["start_seconds"], 0)
        self.assertEqual(segments[-1]["end_seconds"], 60)
        for previous, current in zip(segments, segments[1:]):
            self.assertEqual(previous["end_seconds"], current["start_seconds"])

    def test_reference_video_estimate_is_eight_dollars_and_forty_cents(self):
        estimate = estimate_continuous_sequence(60, 15, "720p")
        self.assertEqual(estimate["estimated_cost_usd"], 8.40)
        self.assertEqual(estimate["segment_count"], 4)
        self.assertEqual(estimate["model"], "grok-imagine-video-1.5")

    def test_video_cost_rejects_unknown_model_or_resolution(self):
        with self.assertRaises(ValueError):
            estimate_video_cost("unknown-model", "720p", 15)
        with self.assertRaises(ValueError):
            estimate_video_cost("grok-imagine-video-1.5", "1080p", 15)

    def test_reference_to_video_payload_pins_the_next_segment_first_frame(self):
        payload = build_generation_payload(
            "Continue the same adult subject.",
            ["file_ref_a", "file_ref_b"],
            15,
            "segment-02.mp4",
            first_frame_file_id="file_previous_last_frame",
        )
        self.assertEqual(payload["model"], "grok-imagine-video-1.5")
        self.assertEqual(payload["image"], {"file_id": "file_previous_last_frame"})
        self.assertEqual(payload["reference_images"], [{"file_id": "file_ref_a"}, {"file_id": "file_ref_b"}])
        self.assertFalse(payload["generate_audio"])
        self.assertEqual(payload["storage_options"]["filename"], "segment-02.mp4")
        self.assertEqual(payload["storage_options"]["expires_after"], 604800)

    def test_reference_to_video_rejects_native_1080p(self):
        with self.assertRaises(ValueError):
            build_generation_payload("prompt", ["file_ref_a"], 15, "clip.mp4", resolution="1080p")

    def test_payload_rejects_path_traversal_filename(self):
        with self.assertRaises(ValueError):
            build_generation_payload("prompt", ["file_ref_a"], 15, "../outside.mp4")

    def test_missing_api_key_prevents_client_creation(self):
        with self.assertRaises(XAIError):
            XAIClient(api_key="")

    def test_cost_gate_rejects_disabled_generation(self):
        provider = {
            "provider_id": "xai-grok-imagine-video",
            "api_adapter_status": "implemented",
            "connection_status": "connected",
            "generation_enabled": False,
            "cost_approval_required": True,
            "cost_approval_status": "approved",
            "data_transfer_approval_status": "approved",
            "reference_rights_clearance_status": "cleared",
        }
        approval = {
            "schema": "geehub.provider-cost-approval/1",
            "status": "approved",
            "project_id": "hulums-lab-serum-60s",
            "provider_id": "xai-grok-imagine-video",
            "approved_by": "user",
            "approved_at": "2026-11-23T00:00:00Z",
            "max_usd": 10.0,
            "model": "grok-imagine-video-1.5",
            "resolution": "720p",
            "total_duration_seconds": 60,
            "segment_duration_seconds": 15,
            "estimated_cost_usd": 8.4,
            "reference_data_transfer_approved": True,
            "reference_rights_cleared": True,
            "reference_asset_ids": [
                "car-bearded-base",
                "car-bearded-variation-01",
                "car-bearded-variation-02",
                "doorway-scale-reference",
                "bedroom-scale-reference",
                "denim-cutoffs-reference",
            ],
        }
        estimate = estimate_continuous_sequence()
        with self.assertRaisesRegex(ValueError, "Paid generation is disabled"):
            validate_generation_authorization(provider, approval, estimate, "hulums-lab-serum-60s")

    def test_cost_gate_requires_a_sufficient_explicit_ceiling(self):
        provider = {
            "provider_id": "xai-grok-imagine-video",
            "api_adapter_status": "implemented",
            "connection_status": "connected",
            "generation_enabled": True,
            "cost_approval_required": True,
            "cost_approval_status": "approved",
            "data_transfer_approval_status": "approved",
            "reference_rights_clearance_status": "cleared",
        }
        approval = {
            "schema": "geehub.provider-cost-approval/1",
            "status": "approved",
            "project_id": "hulums-lab-serum-60s",
            "provider_id": "xai-grok-imagine-video",
            "approved_by": "user",
            "approved_at": "2026-11-23T00:00:00Z",
            "max_usd": 8.0,
            "model": "grok-imagine-video-1.5",
            "resolution": "720p",
            "total_duration_seconds": 60,
            "segment_duration_seconds": 15,
            "estimated_cost_usd": 8.4,
            "reference_data_transfer_approved": True,
            "reference_rights_cleared": True,
            "reference_asset_ids": [
                "car-bearded-base",
                "car-bearded-variation-01",
                "car-bearded-variation-02",
                "doorway-scale-reference",
                "bedroom-scale-reference",
                "denim-cutoffs-reference",
            ],
        }
        with self.assertRaisesRegex(ValueError, "below estimated"):
            validate_generation_authorization(provider, approval, estimate_continuous_sequence(), "hulums-lab-serum-60s")

    def test_authorized_generation_requires_matching_project_scope(self):
        provider = {
            "provider_id": "xai-grok-imagine-video",
            "api_adapter_status": "implemented",
            "connection_status": "connected",
            "generation_enabled": True,
            "cost_approval_required": True,
            "cost_approval_status": "approved",
            "data_transfer_approval_status": "approved",
            "reference_rights_clearance_status": "cleared",
        }
        approval = {
            "schema": "geehub.provider-cost-approval/1",
            "status": "approved",
            "project_id": "another-project",
            "provider_id": "xai-grok-imagine-video",
            "approved_by": "user",
            "approved_at": "2026-11-23T00:00:00Z",
            "max_usd": 9.0,
            "model": "grok-imagine-video-1.5",
            "resolution": "720p",
            "total_duration_seconds": 60,
            "segment_duration_seconds": 15,
            "estimated_cost_usd": 8.4,
            "reference_data_transfer_approved": True,
            "reference_rights_cleared": True,
            "reference_asset_ids": [
                "car-bearded-base",
                "car-bearded-variation-01",
                "car-bearded-variation-02",
                "doorway-scale-reference",
                "bedroom-scale-reference",
                "denim-cutoffs-reference",
            ],
        }
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_generation_authorization(provider, approval, estimate_continuous_sequence(), "hulums-lab-serum-60s")


    def test_prompt_reference_slots_shift_after_pinned_first_frame(self):
        prompt = "Keep <IMAGE_0> and <IMAGE_1> as references."
        shifted = prompt_with_reference_slots(prompt, True)
        self.assertIn("pinned first frame is <IMAGE_0>", shifted)
        self.assertIn("<IMAGE_1> and <IMAGE_2>", shifted)

    def test_prompt_reference_slots_do_not_shift_without_pinned_frame(self):
        prompt = "Keep <IMAGE_0> and <IMAGE_1> as references."
        self.assertEqual(prompt_with_reference_slots(prompt, False), prompt)

    def test_file_id_lookup_accepts_documented_hyphen_and_underscore_forms(self):
        captured = []
        def opener(request, timeout):
            captured.append(request.full_url)
            return FakeResponse(b'{"id":"file-abc123","bytes":4}')
        client = XAIClient(api_key="test-secret", opener=opener)
        client.get_file("file_abc123")
        client.get_file("file-abc123")
        self.assertEqual(len(captured), 2)

    def test_video_download_refuses_to_overwrite_existing_file(self):
        client = XAIClient(api_key="test-secret", opener=lambda *_args, **_kwargs: FakeResponse())
        with tempfile.TemporaryDirectory() as temp:
            destination = Path(temp) / "video.mp4"
            destination.write_bytes(b"keep")
            with self.assertRaises(FileExistsError):
                client.download_video("https://vidgen.x.ai/video.mp4", destination)
            self.assertEqual(destination.read_bytes(), b"keep")

    def test_cost_gate_requires_explicit_image_transfer_and_rights_clearance(self):
        provider = {
            "provider_id": "xai-grok-imagine-video",
            "api_adapter_status": "implemented",
            "connection_status": "connected",
            "generation_enabled": True,
            "cost_approval_required": True,
            "cost_approval_status": "approved",
            "data_transfer_approval_status": "not-granted",
            "reference_rights_clearance_status": "cleared",
        }
        approval = {
            "schema": "geehub.provider-cost-approval/1",
            "status": "approved",
            "project_id": "hulums-lab-serum-60s",
            "provider_id": "xai-grok-imagine-video",
            "approved_by": "user",
            "approved_at": "2026-11-23T00:00:00Z",
            "max_usd": 10.0,
            "model": "grok-imagine-video-1.5",
            "resolution": "720p",
            "total_duration_seconds": 60,
            "segment_duration_seconds": 15,
            "estimated_cost_usd": 8.4,
            "reference_data_transfer_approved": True,
            "reference_rights_cleared": True,
            "reference_asset_ids": [
                "car-bearded-base",
                "car-bearded-variation-01",
                "car-bearded-variation-02",
                "doorway-scale-reference",
                "bedroom-scale-reference",
                "denim-cutoffs-reference",
            ],
        }
        with self.assertRaisesRegex(ValueError, "transfer to xAI"):
            validate_generation_authorization(provider, approval, estimate_continuous_sequence(), "hulums-lab-serum-60s")

    def test_json_api_request_uses_bearer_auth_and_fixed_host(self):
        captured = {}

        def opener(request, timeout):
            captured["url"] = request.full_url
            captured["auth"] = request.get_header("Authorization")
            captured["body"] = request.data
            captured["timeout"] = timeout
            return FakeResponse(b'{"request_id":"request-12345678"}')

        client = XAIClient(api_key="test-secret", opener=opener)
        result = client.request_json("POST", "/videos/generations", payload={"model": "grok-imagine-video-1.5"})
        self.assertEqual(result["request_id"], "request-12345678")
        self.assertEqual(captured["url"], "https://api.x.ai/v1/videos/generations")
        self.assertEqual(captured["auth"], "Bearer test-secret")
        self.assertIn(b"grok-imagine-video-1.5", captured["body"])

    def test_upload_uses_multipart_and_checks_returned_file_id(self):
        captured = {}

        def opener(request, timeout):
            captured["content_type"] = request.get_header("Content-type")
            captured["body"] = request.data
            return FakeResponse(json.dumps({"id": "file_reference_01", "bytes": 4, "filename": "ref.png"}).encode())

        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "ref.png"
            source.write_bytes(b"PNG!")
            client = XAIClient(api_key="test-secret", opener=opener)
            result = client.upload_file(source)
        self.assertEqual(result["id"], "file_reference_01")
        self.assertTrue(captured["content_type"].startswith("multipart/form-data; boundary="))
        self.assertIn(b'name="file"; filename="ref.png"', captured["body"])
        self.assertIn(b'name="purpose"', captured["body"])
        self.assertIn(b'assistants', captured["body"])
        self.assertIn(b'name="expires_after"', captured["body"])
        self.assertLess(captured["body"].index(b'name="expires_after"'), captured["body"].index(b'name="file"'))
        self.assertIn(b"604800", captured["body"])
        self.assertIn(b"PNG!", captured["body"])

    def test_poll_returns_completed_video(self):
        client = XAIClient(api_key="test-secret", opener=lambda *_args, **_kwargs: FakeResponse())
        client.request_json = lambda *_args, **_kwargs: {
            "status": "done",
            "video": {"url": "https://vidgen.x.ai/result.mp4"},
        }
        result = client.poll_video("request-12345678", poll_interval=0, sleep_fn=lambda _delay: None)
        self.assertEqual(result["status"], "done")

    def test_poll_fails_closed_for_provider_failure(self):
        client = XAIClient(api_key="test-secret", opener=lambda *_args, **_kwargs: FakeResponse())
        client.request_json = lambda *_args, **_kwargs: {"status": "failed", "error": "provider rejected prompt"}
        with self.assertRaisesRegex(XAIError, "failed"):
            client.poll_video("request-12345678", poll_interval=0, sleep_fn=lambda _delay: None)

    def test_video_download_rejects_unapproved_host(self):
        client = XAIClient(api_key="test-secret", opener=lambda *_args, **_kwargs: FakeResponse())
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError, "unapproved URL host"):
                client.download_video("https://example.com/video.mp4", Path(temp) / "video.mp4")

    def test_video_download_verifies_and_hashes_content(self):
        data = b"fake-mp4-content"
        def opener(_request, timeout):
            return FakeResponse(data, headers={"Content-Type": "video/mp4"})
        client = XAIClient(api_key="test-secret", opener=lambda *_args, **_kwargs: FakeResponse(), download_opener=opener)
        with tempfile.TemporaryDirectory() as temp:
            result = client.download_video("https://vidgen.x.ai/video.mp4", Path(temp) / "video.mp4")
            self.assertEqual(Path(result["path"]).read_bytes(), data)
            self.assertEqual(result["size_bytes"], len(data))
            self.assertEqual(len(result["sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
