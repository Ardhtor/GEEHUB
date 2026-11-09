import unittest
from datetime import datetime, timezone

from tractus_memory import advance_thread, due_threads, next_interval, sha256_text


class SpacedRetrievalTests(unittest.TestCase):
    def test_expanding_interval_after_successful_recall(self):
        self.assertEqual(next_interval(1, 0.9), 3)
        self.assertEqual(next_interval(3, 0.95), 7)
        self.assertEqual(next_interval(7, 0.85), 21)
        self.assertEqual(next_interval(21, 0.99), 21)

    def test_failed_recall_returns_to_one_day(self):
        self.assertEqual(next_interval(21, 0.79), 1)

    def test_due_thread_selection(self):
        now = datetime(2026, 11, 9, 12, tzinfo=timezone.utc)
        schedule = {"threads": [
            {"thread_id": "due", "next_due_at": "2026-11-09T00:00:00Z"},
            {"thread_id": "later", "next_due_at": "2026-11-10T00:00:00Z"},
        ]}
        self.assertEqual([x["thread_id"] for x in due_threads(schedule, now)], ["due"])

    def test_advancing_thread_tracks_retrieval_separately(self):
        now = datetime(2026, 11, 9, 12, tzinfo=timezone.utc)
        thread = {
            "thread_id": "test", "last_retrieved_at": None,
            "next_due_at": "2026-11-09T00:00:00Z", "interval_days": 1,
            "successful_recalls": 0, "last_recall_score": None,
        }
        updated = advance_thread(thread, now, 0.9)
        self.assertEqual(updated["interval_days"], 3)
        self.assertEqual(updated["successful_recalls"], 1)
        self.assertIsNone(thread["last_retrieved_at"])
        self.assertEqual(updated["last_recall_score"], 0.9)

    def test_hash_is_stable_and_content_sensitive(self):
        self.assertEqual(sha256_text("same"), sha256_text("same"))
        self.assertNotEqual(sha256_text("same"), sha256_text("changed"))


if __name__ == "__main__":
    unittest.main()
