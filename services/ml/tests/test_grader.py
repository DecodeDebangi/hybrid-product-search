import unittest
from collections import Counter

from findwise_ml.grader import build_sample, cohens_kappa


class KappaTest(unittest.TestCase):
    def test_perfect_agreement(self):
        self.assertEqual(cohens_kappa([0, 1, 2, 2], [0, 1, 2, 2]), 1.0)

    def test_chance_level_agreement_is_zero(self):
        self.assertAlmostEqual(cohens_kappa([0, 0, 1, 1], [0, 1, 0, 1]), 0.0)


class SampleTest(unittest.TestCase):
    def test_sample_is_balanced_unique_and_deterministic(self):
        sample = build_sample(50, seed=7)
        self.assertEqual(len(sample), 50)
        self.assertEqual(Counter(i["query_id"][:2] for i in sample), {"kw": 17, "sy": 17, "de": 16})
        self.assertEqual(len({i["key"] for i in sample}), 50)
        self.assertEqual([i["key"] for i in sample], [i["key"] for i in build_sample(50, seed=7)])


if __name__ == "__main__":
    unittest.main()
