"""Un jeton de masquage (« [NOM] ») ne doit jamais rester dans le profil du candidat : le NER
peut prendre un mot courant (« Monitoring ») pour un nom, et l'IA recopie le jeton."""
from django.test import SimpleTestCase

from jobs.cv_parser.jetons import restaurer_jetons

CV_BRUT = (
    "Développement et implémentation de workflows automatisés avec N8N.\n"
    "Monitoring, maintenance et débogage continu des processus d'automatisation.\n"
)


class RestaurerJetonsTests(SimpleTestCase):
    def test_texte_sans_jeton_est_inchange(self):
        self.assertEqual(restaurer_jetons("Gestion de la paie", CV_BRUT), "Gestion de la paie")

    def test_jeton_en_debut_de_ligne_est_restaure_depuis_le_cv_brut(self):
        texte = ("- Développement et implémentation de workflows automatisés avec N8N.\n"
                 "- [NOM], maintenance et débogage continu des processus d'automatisation.")
        attendu = ("- Développement et implémentation de workflows automatisés avec N8N.\n"
                   "- Monitoring, maintenance et débogage continu des processus d'automatisation.")
        self.assertEqual(restaurer_jetons(texte, CV_BRUT), attendu)

    def test_jeton_introuvable_dans_le_cv_est_retire(self):
        texte = "[NOM], maintenance et support"
        resultat = restaurer_jetons(texte, "texte sans rapport")
        self.assertNotIn("[", resultat)
        self.assertEqual(resultat, "maintenance et support")

    def test_valeur_vide_ou_non_texte_est_renvoyee_telle_quelle(self):
        self.assertEqual(restaurer_jetons("", CV_BRUT), "")
        self.assertIsNone(restaurer_jetons(None, CV_BRUT))
