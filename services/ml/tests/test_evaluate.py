import unittest

from findwise_ml.evaluate import grade, score

QUERY = {"must": {"article_type": ["Watches"]}, "should": {"base_colour": ["Black"]}}


class GradeTest(unittest.TestCase):
    def test_grades_by_must_and_should(self):
        self.assertEqual(grade({"article_type": "Watches", "base_colour": "Black"}, QUERY), 2)
        self.assertEqual(grade({"article_type": "Watches", "base_colour": "Gold"}, QUERY), 1)
        self.assertEqual(grade({"article_type": "Formal Shoes", "base_colour": "Black"}, QUERY), 0)

    def test_without_should_every_relevant_doc_is_perfect(self):
        self.assertEqual(grade({"article_type": "Watches"}, {"must": QUERY["must"]}), 2)


class ScoreTest(unittest.TestCase):
    def test_ideal_ranking_scores_one(self):
        result = score([2] * 10, n_relevant=500, n_perfect=200)
        self.assertAlmostEqual(result["ndcg"], 1.0)
        self.assertEqual(result["precision"], 1.0)
        self.assertEqual(result["mrr"], 1.0)

    def test_partial_matches_score_below_ideal(self):
        self.assertLess(score([1] * 10, n_relevant=500, n_perfect=200)["ndcg"], 1.0)

    def test_ideal_accounts_for_few_perfect_matches(self):
        # Only 3 perfect products exist, so 3 perfect + 7 partial is the best possible top 10.
        self.assertAlmostEqual(score([2, 2, 2] + [1] * 7, n_relevant=50, n_perfect=3)["ndcg"], 1.0)

    def test_no_relevant_results(self):
        result = score([0] * 50, n_relevant=10, n_perfect=10)
        self.assertEqual((result["ndcg"], result["precision"], result["mrr"]), (0.0, 0.0, 0.0))
        self.assertEqual(score([0, 0, 1], n_relevant=1, n_perfect=0)["mrr"], 1 / 3)


if __name__ == "__main__":
    unittest.main()
