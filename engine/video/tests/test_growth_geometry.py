"""Tests for GEEHUB's bilateral pectoral deformation fields."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from growth_geometry import pectoral_offset, validate_pectorals_geometry


class PectoralGeometryTests(unittest.TestCase):
    def test_projection_moves_front_surface_toward_camera(self):
        dx, dy, dz = pectoral_offset((0.36, -0.48, 2.27), "projection")
        self.assertLess(dy, 0.0)
        self.assertGreater(abs(dy), abs(dx))

    def test_left_and_right_are_mirrored(self):
        left = pectoral_offset((-0.36, -0.42, 2.27), "projection")
        right = pectoral_offset((0.36, -0.42, 2.27), "projection")
        self.assertAlmostEqual(left[0], -right[0], places=8)
        self.assertAlmostEqual(left[1], right[1], places=8)
        self.assertAlmostEqual(left[2], right[2], places=8)

    def test_upper_fullness_is_localised_above_pec_centre(self):
        upper = pectoral_offset((0.34, -0.30, 2.43), "upper")
        lower = pectoral_offset((0.34, -0.30, 1.55), "upper")
        self.assertGreater(upper[2], 0.0)
        self.assertLess(upper[1], 0.0)
        self.assertLess(abs(lower[1]), 1e-5)

    def test_outer_sweep_moves_laterally_and_forward(self):
        left = pectoral_offset((-0.58, -0.25, 2.25), "outer")
        right = pectoral_offset((0.58, -0.25, 2.25), "outer")
        self.assertLess(left[0], 0.0)
        self.assertGreater(right[0], 0.0)
        self.assertLess(left[1], 0.0)
        self.assertAlmostEqual(left[1], right[1], places=8)

    def test_face_and_lower_abdomen_are_outside_influence(self):
        face = pectoral_offset((0.0, -0.1, 3.4), "projection")
        abdomen = pectoral_offset((0.0, -0.1, 1.45), "projection")
        self.assertTrue(all(abs(value) < 1e-5 for value in face))
        self.assertTrue(all(abs(value) < 1e-5 for value in abdomen))

    def test_unknown_region_is_rejected(self):
        with self.assertRaises(ValueError):
            pectoral_offset((0.0, 0.0, 2.0), "whole-body")

    def test_project_geometry_overrides_default_offsets(self):
        point = (0.36, -0.29, 2.27)
        default = pectoral_offset(point, "projection")
        custom = pectoral_offset(point, "projection", {
            "projection": {
                "centre": [0.36, -0.29, 2.27],
                "radius": [0.43, 0.42, 0.32],
                "offset": [0.0, -0.40, 0.0]
            }
        })
        self.assertLess(custom[1], default[1])
        self.assertAlmostEqual(custom[0], 0.0, places=8)

    def test_pectorals_geometry_validation_rejects_nonpositive_radius(self):
        errors = validate_pectorals_geometry({
            "projection": {
                "centre": [0.0, 0.0, 2.0],
                "radius": [0.4, 0.0, 0.3],
                "offset": [0.0, -0.1, 0.0]
            }
        })
        self.assertTrue(any("radius values must be positive" in error for error in errors))

    def test_sternal_separation_moves_inner_edges_outward(self):
        left = pectoral_offset((-0.17, -0.38, 2.27), "sternal")
        right = pectoral_offset((0.17, -0.38, 2.27), "sternal")
        self.assertLess(left[0], 0.0)
        self.assertGreater(right[0], 0.0)
        self.assertAlmostEqual(left[1], right[1], places=8)

    def test_lower_shelf_adds_localized_lower_chest_projection(self):
        lower = pectoral_offset((0.36, -0.30, 2.12), "lower_shelf")
        upper = pectoral_offset((0.36, -0.30, 2.60), "lower_shelf")
        self.assertLess(lower[1], 0.0)
        self.assertLess(lower[2], 0.0)
        self.assertLess(abs(upper[1]), abs(lower[1]))

    def test_default_pectorals_geometry_is_valid(self):
        self.assertEqual(validate_pectorals_geometry(None), [])


if __name__ == "__main__":
    unittest.main()
