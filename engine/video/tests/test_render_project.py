"""Integration checks for the Luke Library transformation production package."""
import sys
import unittest
from pathlib import Path

VIDEO_ENGINE = Path(__file__).resolve().parents[1]
REPO_ROOT = VIDEO_ENGINE.parents[1]
sys.path.insert(0, str(VIDEO_ENGINE))

from render_project import validate


class LukeProductionProjectTests(unittest.TestCase):
    def test_luke_library_project_manifests_validate(self):
        project = REPO_ROOT / "production" / "projects" / "luke-library-transformation"
        manifest, timeline = validate(project)
        self.assertEqual(manifest["id"], "luke-library-transformation")
        self.assertEqual(timeline["timebase"]["frame_count"], 240)
        self.assertEqual(timeline["timebase"]["fps"], 30)
        self.assertEqual(len(timeline["stages"]), 6)

    def test_project_is_configured_for_fixed_camera_rigged_render(self):
        project = REPO_ROOT / "production" / "projects" / "luke-library-transformation"
        manifest, timeline = validate(project)
        self.assertEqual(manifest["character_model"], "rigged")
        self.assertEqual(timeline["camera"]["mode"], "fixed")
        self.assertFalse(timeline["continuity_policy"]["cuts_allowed"])


if __name__ == "__main__":
    unittest.main()
