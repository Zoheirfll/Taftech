"""Niveaux de langue du parser : toujours l'un des quatre niveaux de TafTech.

CV du 22/10/2026 : l'IA recopiait « maternelle », « courant », « B2 » ; ces libellés n'étaient dans aucune
liste de l'écran (« B2 » s'ajoutait comme 5e option) et ne rapportaient aucun point au score du profil."""
from django.test import SimpleTestCase

from jobs.cv_parser.langues import NIVEAUX, normaliser_langues
from jobs.profile_score import POINTS_NIVEAU_LANGUE


class NormaliserLanguesTest(SimpleTestCase):
    def test_cv_du_22_10_2026(self):
        self.assertEqual(
            normaliser_langues("Arabe:maternelle, Français:courant, Anglais:B2"),
            "Arabe:Bilingue / Maternelle,Français:Avancé,Anglais:Intermédiaire")

    def test_niveaux_du_cadre_europeen(self):
        for brut, attendu in (("A1", "Débutant"), ("A2", "Débutant"), ("B1", "Intermédiaire"),
                              ("B2 (IELTS)", "Intermédiaire"), ("C1", "Avancé"), ("c2", "Avancé")):
            with self.subTest(niveau=brut):
                self.assertEqual(normaliser_langues(f"Anglais:{brut}"), f"Anglais:{attendu}")

    def test_niveaux_en_toutes_lettres(self):
        for brut, attendu in (("langue maternelle", "Bilingue / Maternelle"), ("Bilingue", "Bilingue / Maternelle"),
                              ("natif", "Bilingue / Maternelle"), ("Couramment", "Avancé"), ("Avancé", "Avancé"),
                              ("notions", "Débutant"), ("Débutant", "Débutant"), ("moyen", "Intermédiaire")):
            with self.subTest(niveau=brut):
                self.assertEqual(normaliser_langues(f"Espagnol:{brut}"), f"Espagnol:{attendu}")

    def test_cecrl_prime_sur_le_mot(self):
        self.assertEqual(normaliser_langues("Anglais:Courant (C1)"), "Anglais:Avancé")

    def test_niveau_absent_ou_inconnu_prend_le_defaut_du_prompt(self):
        self.assertEqual(normaliser_langues("Anglais"), "Anglais:Intermédiaire")
        self.assertEqual(normaliser_langues("Anglais:IELTS 7"), "Anglais:Intermédiaire")

    def test_niveau_entre_parentheses(self):
        self.assertEqual(normaliser_langues("Anglais (courant), Arabe (maternelle)"),
                         "Anglais:Avancé,Arabe:Bilingue / Maternelle")

    def test_idempotent(self):
        une_fois = normaliser_langues("Arabe:maternelle, Français:courant, Anglais:B2")
        self.assertEqual(normaliser_langues(une_fois), une_fois)

    def test_vide_et_liste(self):
        self.assertIsNone(normaliser_langues(None))
        self.assertEqual(normaliser_langues(""), "")
        self.assertEqual(normaliser_langues(["Arabe:maternelle", "Anglais:B2"]),
                         "Arabe:Bilingue / Maternelle,Anglais:Intermédiaire")

    def test_memes_niveaux_que_le_score_du_profil(self):
        """Un niveau que `profile_score` ne reconnaît pas ne rapporte aucun point, sans erreur."""
        self.assertEqual(set(NIVEAUX), set(POINTS_NIVEAU_LANGUE))
