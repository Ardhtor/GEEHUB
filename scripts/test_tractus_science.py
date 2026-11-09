import unittest

from engine.tractus_science import (
    validate_cue, validate_event, validate_thread, validate_writer_output,
    validate_version_records,
)


class TractusScienceTests(unittest.TestCase):
    def test_legacy_events_remain_valid(self):
        self.assertEqual(validate_event({"id": "old-event", "type": "world_pulse"}), [])

    def test_canon_update_fails_closed_without_prediction_error(self):
        event = {
            "type": "canon_update",
            "prediction": {"expected": "Luke travels alone"},
            "observation": {"happened": "Berit is already there"},
            "prediction_error": {"present": False},
            "prior_version_id": "v1",
            "change": {"canon_version_id": "v2", "what_changed": "company", "what_remains": "road"},
        }
        self.assertTrue(any("prediction_error" in error for error in validate_event(event)))

    def test_valid_canon_update_passes(self):
        event = {
            "type": "canon_update",
            "prediction": {"expected": "Luke travels alone"},
            "observation": {"happened": "Berit is already there"},
            "prediction_error": {"present": True, "type": "who", "severity": "medium"},
            "prior_version_id": "v1",
            "change": {"canon_version_id": "v2", "what_changed": "company", "what_remains": "road"},
            "provenance": {"author": "unit-test"},
        }
        self.assertEqual(validate_event(event), [])

    def test_cue_without_state_change_fails(self):
        cue = {"bpm": 72, "phase": "on_beat", "duration_beats": 4,
               "target_response": "step", "state_change": {}}
        self.assertTrue(any("state_change" in error for error in validate_cue(cue)))

    def test_invalid_bpm_fails(self):
        cue = {"bpm": 500, "phase": "on_beat", "duration_beats": 4,
               "target_response": "step", "state_change": {"tempo_before": 90, "tempo_after": 72}}
        self.assertTrue(any("bpm" in error for error in validate_cue(cue)))

    def test_break_requires_tempo_change_or_two_silent_beats(self):
        cue = {"bpm": 72, "phase": "break", "duration_beats": 4,
               "target_response": "pause", "state_change": {"routes_before": ["north"], "routes_after": ["north"]}}
        self.assertTrue(any("break cue" in error for error in validate_cue(cue)))

    def test_thread_requires_ladder_and_repair_flag(self):
        thread = {"status": "open", "interval_days": 21, "interval_ladder": [1, 3, 7, 21],
                  "retrieval_attempts": 2, "retrieval_failures": 2, "needs_repair": True}
        self.assertEqual(validate_thread(thread), [])
        thread["interval_days"] = 30
        self.assertTrue(any("interval_days" in error for error in validate_thread(thread)))

    def test_writer_requires_retrieval_and_one_addition(self):
        self.assertTrue(validate_writer_output({"canon_additions": [{"id": "a"}]}))
        self.assertTrue(validate_writer_output({"retrieval": {}, "canon_additions": [{"id": "a"}, {"id": "b"}]}))

    def test_experiment_promotion_requires_explicit_event(self):
        records = [
            {"canon_version_id": "v1", "entity": "lore/test.md", "created_by_event_id": "e1", "status": "experiment"},
            {"canon_version_id": "v2", "entity": "lore/test.md", "created_by_event_id": "e2",
             "prior_version_id": "v1", "status": "canon"},
        ]
        self.assertTrue(any("promotion_event_id" in error for error in validate_version_records(records)))
        records[1]["promotion_event_id"] = "promotion-e1"
        self.assertEqual(validate_version_records(records), [])


if __name__ == "__main__":
    unittest.main()
