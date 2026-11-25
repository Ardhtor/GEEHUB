"""Unit tests for the renderer-independent GEEHUB growth curve engine."""
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from growth_curves import (
    DEFAULT_PROFILE,
    evaluate_curve,
    evaluate_profile,
    sample_profile,
    validate_profile,
)


class GrowthCurveTests(unittest.TestCase):
    def test_default_profile_is_valid(self):
        self.assertEqual(validate_profile(DEFAULT_PROFILE), [])

    def test_curve_holds_before_and_after_domain(self):
        knots = ((2, 0.0), (6, 1.0), (8, 1.0))
        self.assertEqual(evaluate_curve(knots, 0), 0.0)
        self.assertEqual(evaluate_curve(knots, 10), 1.0)

    def test_curve_is_smooth_and_monotonic(self):
        knots = DEFAULT_PROFILE["pectorals"]
        values = [evaluate_curve(knots, frame / 24) for frame in range(1441)]
        self.assertEqual(values[0], 0.0)
        self.assertEqual(values[-1], 1.0)
        self.assertTrue(all(a <= b for a, b in zip(values, values[1:])))
        self.assertTrue(all(0.0 <= value <= 1.0 for value in values))

    def test_regions_have_distinct_onsets(self):
        early = evaluate_profile(DEFAULT_PROFILE, 12)
        self.assertGreater(early["pectorals"], 0.0)
        self.assertEqual(early["calves"], 0.0)

    def test_sampling_matches_60_second_24fps_delivery(self):
        samples = list(sample_profile(DEFAULT_PROFILE, 60, 24))
        self.assertEqual(len(samples), 1440)
        self.assertEqual(samples[0][0], 1)
        self.assertEqual(samples[-1][0], 1440)
        self.assertAlmostEqual(samples[-1][1]["pectorals"], 1.0)


    def test_luke_library_profile_covers_every_deformation_region(self):
        import json
        profile_path = Path(__file__).resolve().parents[1] / "profiles" / "luke-library-transformation-profile.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        regions = {name: entry["knots"] for name, entry in profile["regions"].items()}
        self.assertEqual(set(regions), set(DEFAULT_PROFILE))
        self.assertEqual(validate_profile(regions), [])
        self.assertEqual(profile["timebase"]["frame_count"], round(profile["duration_seconds"] * profile["timebase"]["fps"]))

    def test_luke_library_profile_is_continuous_and_held_at_end(self):
        import json
        profile_path = Path(__file__).resolve().parents[1] / "profiles" / "luke-library-transformation-profile.json"
        profile = json.loads(profile_path.read_text(encoding="utf-8"))
        regions = {name: entry["knots"] for name, entry in profile["regions"].items()}
        samples = list(sample_profile(regions, profile["duration_seconds"], profile["timebase"]["fps"]))
        self.assertEqual(len(samples), 240)
        for region in regions:
            values = [sample[1][region] for sample in samples]
            self.assertEqual(values[0], 0.0, region)
            self.assertTrue(all(a <= b for a, b in zip(values, values[1:])), region)
            self.assertAlmostEqual(values[-1], regions[region][-1][1], msg=region)
        self.assertEqual(samples[-1][1]["pectorals"], 1.0)
        self.assertEqual(samples[-1][1]["deltoids"], 1.0)

    def test_luke_library_timeline_is_contiguous_and_fixed_camera(self):
        import json
        timeline_path = Path(__file__).resolve().parents[1] / "profiles" / "luke-library-transformation-timeline.json"
        timeline = json.loads(timeline_path.read_text(encoding="utf-8"))
        stages = timeline["stages"]
        self.assertEqual(stages[0]["start_seconds"], 0)
        self.assertEqual(stages[-1]["end_seconds"], timeline["duration_seconds"])
        for left, right in zip(stages, stages[1:]):
            self.assertEqual(left["end_seconds"], right["start_seconds"])
        self.assertEqual(timeline["camera"]["mode"], "fixed")


    def test_blender_scene_keeps_luke_identity_and_growth_pipeline_connected(self):
        scene_path = Path(__file__).resolve().parents[1] / "blender_scene.py"
        source = scene_path.read_text(encoding="utf-8")
        self.assertIn("def build_luke_identity_features()", source)
        self.assertIn("LUKE / hair cap", source)
        self.assertIn("LUKE / beard mass", source)
        self.assertIn("build_luke_identity_features()", source)
        self.assertIn("animate_timeline_growth(mesh, timeline, growth_profile)", source)
        self.assertIn("animate_timeline_growth(garment, timeline, growth_profile)", source)
        self.assertIn("build_wardrobe", source)

    def test_invalid_profile_is_rejected(self):
        invalid = {"pectorals": ((0, 0.0), (2, 0.8), (1, 0.9))}
        self.assertTrue(validate_profile(invalid))


if __name__ == "__main__":
    unittest.main()
