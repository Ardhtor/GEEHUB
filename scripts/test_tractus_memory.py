import unittest
from datetime import datetime, timezone

from tractus_memory import INTERVAL_LADDER, advance_thread, due_threads, next_interval


class SpacedRetrievalTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 9, 18, 0, tzinfo=timezone.utc)

    def test_interval_ladder_and_threshold(self):
        self.assertEqual(INTERVAL_LADDER, (1, 3, 7, 14, 30))
        self.assertEqual(next_interval(1, 0.5), 3)
        self.assertEqual(next_interval(3, 0.49), 3)
        self.assertEqual(next_interval(7, 0.5), 21)
        self.assertEqual(next_interval(14, 0.5), 30)
        self.assertEqual(next_interval(30, 0.9), 30)

    def test_first_failed_retrieval_holds_interval(self):
        thread = {"interval_days": 7, "retrieval_attempts": 0, "retrieval_failures": 0}
        updated = advance_thread(thread, self.now, 0.4)
        self.assertEqual(updated["interval_days"], 7)
        self.assertEqual(updated["retrieval_failures"], 1)
        self.assertFalse(updated.get("needs_repair", False))

    def test_second_failed_retrieval_resets_and_flags_repair(self):
        thread = {"interval_days": 7, "retrieval_attempts": 1, "retrieval_failures": 1}
        updated = advance_thread(thread, self.now, 0.4)
        self.assertEqual(updated["interval_days"], 1)
        self.assertTrue(updated["needs_repair"])

    def test_success_advances_interval(self):
        thread = {"interval_days": 7, "retrieval_attempts": 2, "retrieval_failures": 1}
        updated = advance_thread(thread, self.now, 0.5)
        self.assertEqual(updated["interval_days"], 14)
        self.assertEqual(updated["retrieval_failures"], 0)

    def test_due_thread_selection_oldest_then_lowest_successes(self):
        schedule = {"threads": [
            {"thread_id": "later", "status": "open", "next_due_at": "2026-11-09T17:00:00Z", "successful_recalls": 2},
            {"thread_id": "earlier-more", "status": "open", "next_due_at": "2026-11-08T17:00:00Z", "successful_recalls": 3},
            {"thread_id": "earlier-less", "status": "open", "next_due_at": "2026-11-08T17:00:00Z", "successful_recalls": 1},
            {"thread_id": "closed", "status": "closed", "next_due_at": "2026-11-01T00:00:00Z", "successful_recalls": 0},
        ]}
        self.assertEqual([item["thread_id"] for item in due_threads(schedule, self.now)],
                         ["earlier-less", "earlier-more", "later"])


if __name__ == "__main__":
    unittest.main()
