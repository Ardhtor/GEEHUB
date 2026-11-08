"""Unit tests for the renderer-independent GEEHUB growth curve engine."""
import unittest

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

    def test_profiles_have_distinct_onsets(self):
        early = evaluate_profile(DEFAULT_PROFILE, 18)
        late = evaluate_profile(DEFAULT_PROFILE, 18)
        self.assertGreater(early["pectorals"], early["calves"])
        self.assertEqual(early, late)

    def test_sampling_matches_60_second_24fps_delivery(self):
        samples = list(sample_profile(DEFAULT_PROFILE, 60, 24))
        self.assertEqual(len(samples), 1440)
        self.assertEqual(samples[0][0], 1)
        self.assertEqual(samples[-1][0], 1440)
        self.assertAlmostEqual(samples[-1][1]["pectorals"], 1.0)

    def test_invalid_profile_is_rejected(self):
        invalid = {"pectorals": ((0, 0.0), (2, 0.8), (1, 0.9))}
        self.assertTrue(validate_profile(invalid))


if __name__ == "__main__":
    unittest.main()
