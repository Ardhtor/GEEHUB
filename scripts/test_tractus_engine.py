import unittest

from tractus_engine import int_to_roman, roman_to_int


class RomanNumeralTests(unittest.TestCase):
    def test_chapter_seventy_three(self):
        self.assertEqual(int_to_roman(73), "LXXIII")
        self.assertEqual(roman_to_int("LXXIII"), 73)

    def test_subtractive_forms(self):
        for number, numeral in ((4, "IV"), (9, "IX"), (40, "XL"), (90, "XC"), (400, "CD"), (900, "CM")):
            with self.subTest(number=number):
                self.assertEqual(int_to_roman(number), numeral)
                self.assertEqual(roman_to_int(numeral), number)

    def test_round_trip(self):
        for number in (1, 12, 49, 73, 99, 2026):
            with self.subTest(number=number):
                self.assertEqual(roman_to_int(int_to_roman(number)), number)


if __name__ == "__main__":
    unittest.main()
