"""OpenTimelineIO adapter tests; CI installs the optional OTIO package."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from otio_export import export_timeline


def sample_timeline():
    return {
        "schema": "geehub.video-timeline/1",
        "project_id": "otio-adapter-test",
        "timebase": {"fps": 24, "frame_count": 48},
        "duration_seconds": 2,
        "stages": [
            {"id": "arrival", "start_seconds": 0, "end_seconds": 1,
             "label": "Arrival", "function": "establish", "required_visible": ["subject"]},
            {"id": "hold", "start_seconds": 1, "end_seconds": 2,
             "label": "Hold", "function": "hold", "required_visible": ["final pose"]},
        ],
        "continuity_policy": {"continuous_event": True, "cuts_allowed": False},
    }


class OpenTimelineIOExportTests(unittest.TestCase):
    def test_exports_one_continuous_track_with_stage_markers(self):
        import opentimelineio as otio

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "test.otio"
            result = export_timeline(sample_timeline(), output)
            exported = otio.adapters.read_from_file(str(output))
            track = exported.tracks[0]
            self.assertEqual(result["markers"], 2)
            self.assertEqual(len(track), 1)
            self.assertEqual(track[0].schema_name(), "Gap")
            self.assertEqual(len(track.markers), 2)
            self.assertEqual(track.markers[0].metadata["geehub"]["stage_id"], "arrival")
            self.assertTrue(exported.metadata["geehub"]["continuous_event"])
            self.assertFalse(exported.metadata["geehub"]["cuts_allowed"])

    def test_links_optional_source_media(self):
        import opentimelineio as otio

        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "reference.mp4"
            media.write_bytes(b"not decoded by adapter")
            output = Path(directory) / "reference.otio"
            result = export_timeline(sample_timeline(), output, media)
            exported = otio.adapters.read_from_file(str(output))
            self.assertTrue(result["media_linked"])
            self.assertEqual(exported.tracks[0][0].schema_name(), "Clip")
            self.assertTrue(exported.tracks[0][0].media_reference.target_url.endswith("reference.mp4"))

    def test_rejects_invalid_timeline(self):
        bad = sample_timeline()
        bad["stages"][1]["start_seconds"] = 1.25
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                export_timeline(bad, Path(directory) / "bad.otio")


if __name__ == "__main__":
    unittest.main()
