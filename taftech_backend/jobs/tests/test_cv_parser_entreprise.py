"""L'entreprise est obligatoire à l'enregistrement d'une expérience. Quand le nettoyage avant IA masque
la ligne (« Somiz- Bethioua, Oran » devient « [LIEU] Bethioua, [LIEU] ») et que l'IA la laisse vide, on la
relit dans le CV brut : première ligne utile sous le titre, hors dates seules."""
from django.test import SimpleTestCase

from jobs.cv_parser.entreprise import completer_entreprise

CV = (
    "Janvier 2026\n"
    "CADRE ADMINISTRATIF & CHARGÉ DE PAIE\n"
    "Aujourd’hui\n"
    "Somiz- Bethioua, Oran\n"
    "Gestion, traitement et analyse de la paie pour un effectif de 4 000 employés.\n"
    "DÉVELOPPEUR N8N Novembre 2025\n"
    "Janvier 2026\n"
    "Boite de e-commerce- Oran\n"
    "Aout 2025\n"
    "ADMINISTRATEUR DES VENTES ET SUPPORT IT\n"
    "Eurl DHL Distribution - Oran Octobre 2025\n"
)


def experience(titre, entreprise=""):
    return {"titre_poste": titre, "entreprise": entreprise}


class CompleterEntrepriseTests(SimpleTestCase):
    def test_entreprise_vide_est_lue_sous_le_titre_en_sautant_les_dates_seules(self):
        experiences = [experience("CADRE ADMINISTRATIF & CHARGÉ DE PAIE")]
        completer_entreprise(experiences, CV)
        self.assertEqual(experiences[0]["entreprise"], "Somiz- Bethioua, Oran")

    def test_date_de_fin_sur_la_ligne_suivante_est_sautee(self):
        experiences = [experience("DÉVELOPPEUR N8N", None)]
        completer_entreprise(experiences, CV)
        self.assertEqual(experiences[0]["entreprise"], "Boite de e-commerce- Oran")

    def test_date_collee_en_fin_de_ligne_est_retiree(self):
        experiences = [experience("ADMINISTRATEUR DES VENTES ET SUPPORT IT")]
        completer_entreprise(experiences, CV)
        self.assertEqual(experiences[0]["entreprise"], "Eurl DHL Distribution - Oran")

    def test_entreprise_deja_renseignee_n_est_pas_modifiee(self):
        experiences = [experience("DÉVELOPPEUR N8N", "Autre société")]
        completer_entreprise(experiences, CV)
        self.assertEqual(experiences[0]["entreprise"], "Autre société")

    def test_titre_absent_ou_ligne_trop_longue_laisse_le_champ_vide(self):
        experiences = [experience("TITRE INCONNU")]
        completer_entreprise(experiences, CV)
        self.assertEqual(experiences[0]["entreprise"], "")
        long_cv = "POSTE X\n" + "mot " * 40 + "\n"
        experiences = [experience("POSTE X")]
        completer_entreprise(experiences, long_cv)
        self.assertEqual(experiences[0]["entreprise"], "")
