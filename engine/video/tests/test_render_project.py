"""Integration checks for the Luke Library transformation production package."""
import sys
import unittest
from pathlib import Path

VIDEO_ENGINE = Path(__file__).resolve().parents[1]
REPO_ROOT = VIDEO_ENGINE.parents[1]
sys.path.insert(0, str(VIDEO_ENGINE))

from render_project import validate, validate_camera_sequence


class LukeProductionProjectTests(unittest.TestCase):
    def test_hulums_project_uses_authored_camera_sequence(self):
        import json
        project = REPO_ROOT / "production" / "projects" / "hulums-lab-serum-60s"
        timeline = json.loads((project / "07_MANIFESTS" / "timeline.json").read_text(encoding="utf-8"))
        shots = timeline["camera"]["shots"]
        self.assertEqual(timeline["camera"]["mode"], "sequence")
        self.assertEqual(len(shots), 6)
        self.assertEqual(shots[0]["at_seconds"], 0)
        self.assertEqual(shots[-1]["at_seconds"], 55)
        self.assertEqual(validate_camera_sequence(timeline["camera"], timeline["duration_seconds"]), [])

    def test_camera_sequence_rejects_duplicate_or_out_of_range_times(self):
        invalid = {"mode": "sequence", "shots": [
            {"at_seconds": 0, "location": [0, -10, 2], "target": [0, 0, 1]},
            {"at_seconds": 0, "location": [1, -8, 2], "target": [0, 0, 1]},
        ]}
        self.assertTrue(validate_camera_sequence(invalid, 60))

    def test_luke_library_project_manifests_validate(self):
        project = REPO_ROOT / "production" / "projects" / "luke-library-transformation"
        manifest, timeline = validate(project)
        self.assertEqual(manifest["id"], "luke-library-transformation")
        self.assertEqual(timeline["timebase"]["frame_count"], 240)
        self.assertEqual(timeline["timebase"]["fps"], 30)
        self.assertEqual(len(timeline["stages"]), 6)


    def test_engine_and_project_manifests_stay_in_sync(self):
        import json
        project = REPO_ROOT / "production" / "projects" / "luke-library-transformation"
        engine_profiles = VIDEO_ENGINE / "profiles"
        engine_profile = json.loads((engine_profiles / "luke-library-transformation-profile.json").read_text(encoding="utf-8"))
        project_profile = json.loads((project / "07_MANIFESTS" / "growth_profile.json").read_text(encoding="utf-8"))
        engine_timeline = json.loads((engine_profiles / "luke-library-transformation-timeline.json").read_text(encoding="utf-8"))
        project_timeline = json.loads((project / "07_MANIFESTS" / "timeline.json").read_text(encoding="utf-8"))
        self.assertEqual(engine_profile, project_profile)
        self.assertEqual(engine_timeline, project_timeline)

    def test_supporting_reference_is_not_promoted_to_confirmed_identity(self):
        import json
        profile_path = VIDEO_ENGINE / "profiles" / "luke-library-transformation-profile.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        support = [x for x in profile["source_evidence"] if x["role"] == "pose_and_surface_detail_reference"]
        self.assertEqual(len(support), 1)
        self.assertIn("candidate", support[0]["note"].lower())

    def test_project_is_configured_for_fixed_camera_rigged_render(self):
        project = REPO_ROOT / "production" / "projects" / "luke-library-transformation"
        manifest, timeline = validate(project)
        self.assertEqual(manifest["character_model"], "rigged")
        self.assertEqual(timeline["camera"]["mode"], "fixed")
        self.assertFalse(timeline["continuity_policy"]["cuts_allowed"])


if __name__ == "__main__":
    unittest.main()
