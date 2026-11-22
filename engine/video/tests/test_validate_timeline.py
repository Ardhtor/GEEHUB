"""Regression tests for timeline and provenance validation."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from validate_timeline import validate_provenance, validate_timeline


def timeline():
    return {
        "schema": "geehub.video-timeline/1",
        "project_id": "test-project",
        "timebase": {"fps": 24, "frame_count": 48},
        "duration_seconds": 2,
        "stages": [
            {"id": "opening", "start_seconds": 0, "end_seconds": 1, "function": "establish"},
            {"id": "ending", "start_seconds": 1, "end_seconds": 2, "function": "hold"},
        ],
        "continuity_policy": {"continuous_event": True, "cuts_allowed": False},
    }


class TimelineValidationTests(unittest.TestCase):
    def test_valid_contiguous_timeline(self):
        self.assertEqual(validate_timeline(timeline()), [])

    def test_rejects_stage_beyond_duration(self):
        data = timeline()
        data["stages"][1]["end_seconds"] = 2.5
        self.assertTrue(any("exceeds timeline duration" in error for error in validate_timeline(data)))

    def test_rejects_boolean_as_time(self):
        data = timeline()
        data["stages"][0]["start_seconds"] = False
        self.assertTrue(any("finite numbers" in error for error in validate_timeline(data)))

    def test_rejects_non_finite_duration(self):
        data = timeline()
        data["duration_seconds"] = float("nan")
        self.assertTrue(any("finite positive" in error for error in validate_timeline(data)))

    def test_malformed_stage_is_reported_not_raised(self):
        data = timeline()
        data["stages"].append("not a stage")
        self.assertTrue(any("every stage must be an object" in error for error in validate_timeline(data)))

    def test_non_object_manifest_is_reported(self):
        self.assertTrue(validate_timeline([]))


class ProvenanceValidationTests(unittest.TestCase):
    def test_malformed_asset_is_reported_not_raised(self):
        data = {"schema": "geehub.provenance/1", "assets": [None]}
        self.assertTrue(any("must be an object" in error for error in validate_provenance(data)))

    def test_invalid_origin_type_is_reported(self):
        data = {"schema": "geehub.provenance/1", "assets": [{"id": "asset-a", "origin": []}]}
        self.assertTrue(any("origin must be an object" in error for error in validate_provenance(data)))


if __name__ == "__main__":
    unittest.main()
