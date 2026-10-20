"""CV en colonnes : la date de fin peut être seule sur la ligne qui suit le titre
(« DÉVELOPPEUR N8N Novembre 2025 » puis « Janvier 2026 »). Quand l'IA la laisse vide, on la lit localement."""
from django.test import SimpleTestCase

from jobs.cv_parser.dates_fin import completer_dates_fin

CV = (
    "DÉVELOPPEUR D'APPLICATIONS WEB Janvier 2026\n"
    "Taziri - Oran\n"
    "Développement d'une application web interne.\n"
    "DÉVELOPPEUR N8N Novembre 2025\n"
    "Janvier 2026\n"
    "Boite de e-commerce- Oran\n"
    "Monitoring, maintenance et débogage.\n"
    "Aout 2025\n"
    "ADMINISTRATEUR DES VENTES ET SUPPORT IT\n"
    "Eurl DHL Distribution - Oran Octobre 2025\n"
)


def experience(titre, debut, fin=""):
    return {"titre_poste": titre, "date_debut_raw": debut, "date_fin_raw": fin}


class CompleterDatesFinTests(SimpleTestCase):
    def test_date_seule_sous_le_titre_devient_la_date_de_fin(self):
        experiences = [experience("DÉVELOPPEUR N8N", "Novembre 2025")]
        completer_dates_fin(experiences, CV)
        self.assertEqual(experiences[0]["date_fin_raw"], "Janvier 2026")

    def test_une_seule_date_dans_le_cv_ne_cree_pas_de_date_de_fin(self):
        experiences = [experience("DÉVELOPPEUR D'APPLICATIONS WEB", "Janvier 2026")]
        completer_dates_fin(experiences, CV)
        self.assertEqual(experiences[0]["date_fin_raw"], "")

    def test_date_de_fin_deja_renseignee_n_est_pas_modifiee(self):
        experiences = [experience("DÉVELOPPEUR N8N", "Novembre 2025", "Décembre 2025")]
        completer_dates_fin(experiences, CV)
        self.assertEqual(experiences[0]["date_fin_raw"], "Décembre 2025")

    def test_la_date_du_poste_suivant_n_est_pas_prise_pour_une_fin(self):
        # « Aout 2025 » précède le titre suivant : elle n'est pas sous le titre de N8N.
        experiences = [experience("DÉVELOPPEUR N8N", "Novembre 2025", "Janvier 2026"),
                       experience("ADMINISTRATEUR DES VENTES ET SUPPORT IT", "Aout 2025")]
        completer_dates_fin(experiences, CV)
        self.assertEqual(experiences[1]["date_fin_raw"], "")

    def test_titre_absent_du_cv_ou_sans_date_de_debut_est_ignore(self):
        experiences = [experience("TITRE INCONNU", "Mai 2020"), experience("DÉVELOPPEUR N8N", "")]
        completer_dates_fin(experiences, CV)
        self.assertEqual([e["date_fin_raw"] for e in experiences], ["", ""])
