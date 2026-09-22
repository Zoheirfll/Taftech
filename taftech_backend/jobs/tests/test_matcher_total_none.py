from django.test import TestCase
from jobs.views.recruteur import _score_ou_zero


class ScoreOuZeroTest(TestCase):
    def test_total_none_devient_zero_pour_le_tri(self):
        self.assertEqual(_score_ou_zero({"total": None}), 0)

    def test_total_connu_inchange(self):
        self.assertEqual(_score_ou_zero({"total": 73.4}), 73)
