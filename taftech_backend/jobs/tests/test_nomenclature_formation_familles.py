"""Point 8 des corrections finales : domaines universitaires et formation professionnelle ne
sont plus mélangés ; doublons de spécialités et variantes de casse nettoyés."""
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from jobs.models import DomaineFormation, SpecialiteFormation, TypeDiplome
from jobs.models import Scolarite
from jobs.referentiel_fusions import construire_dictionnaires_libelles, harmoniser_libelle, normaliser_casse_libelle
from jobs.referentiel_utils import FAMILLES_PAR_NIVEAU_ETUDES, famille_formation


class FamilleFormationTests(SimpleTestCase):
    def test_systemes_regroupes_en_familles(self):
        self.assertEqual(famille_formation("superieur"), "superieur")
        self.assertEqual(famille_formation("superieur_lmd"), "superieur")
        self.assertEqual(famille_formation("superieur_sante"), "superieur")
        self.assertEqual(famille_formation("formation_professionnelle"), "formation_professionnelle")
        self.assertEqual(famille_formation("postgraduation_sante"), "superieur")
        self.assertEqual(famille_formation("scolaire"), "scolaire")
        self.assertEqual(famille_formation("scolaire_historique"), "scolaire")
        self.assertEqual(famille_formation("certification"), "certification")
        self.assertEqual(famille_formation("formation_continue"), "certification")
        self.assertEqual(famille_formation("theme_taftech"), "theme")
        self.assertEqual(famille_formation("sante_paramedical"), "autre")
        self.assertEqual(famille_formation(None), "autre")


class CasseLibelleTests(SimpleTestCase):
    def test_mots_de_liaison_en_minuscule_et_premiere_lettre_majuscule(self):
        self.assertEqual(normaliser_casse_libelle("Gestion Des Ressources Humaines"), "Gestion des Ressources Humaines")
        self.assertEqual(normaliser_casse_libelle("Systemes D'information Et Des Connaissances"),
                         "Systemes d'information et des Connaissances")
        self.assertEqual(normaliser_casse_libelle("archeologie preventive"), "Archeologie preventive")

    def test_noms_propres_et_idempotence(self):
        self.assertEqual(normaliser_casse_libelle("Histoire Et Civilisation Du Maghreb Islamique"),
                         "Histoire et Civilisation du Maghreb Islamique")
        deja_propre = "Droit maritime et des transports"
        self.assertEqual(normaliser_casse_libelle(deja_propre), deja_propre)


class HarmonisationLibellesTests(SimpleTestCase):
    CORPUS = [
        "Réseaux informatiques", "Matériaux de construction", "Exploitation portuaire",
        "Exploitation des réseaux", "Ressources humaines", "Gestion des ressources humaines",
        "Génie civil", "Droit privé et droit public", "Science des matériaux",
    ]

    def setUp(self):
        self.accents, self.minuscules = construire_dictionnaires_libelles(self.CORPUS + ["Exploitation agricole"])

    def test_accents_restitues_quand_la_forme_accentuee_est_attestee(self):
        self.assertEqual(harmoniser_libelle("Reseaux Et Systemes", self.accents, self.minuscules), "Réseaux et Systemes")
        self.assertEqual(harmoniser_libelle("Chimie des Materiaux", self.accents, self.minuscules), "Chimie des matériaux")

    def test_mot_correct_n_est_jamais_accentue_par_erreur(self):
        corpus = self.CORPUS + ["Éxploitation (coquille)"]
        accents, minuscules = construire_dictionnaires_libelles(corpus)
        self.assertEqual(harmoniser_libelle("Exploitation portuaire", accents, minuscules), "Exploitation portuaire")

    def test_title_case_abaisse_seulement_si_tous_les_mots_sont_courants(self):
        self.assertEqual(harmoniser_libelle("Gestion Des Ressources Humaines", self.accents, self.minuscules),
                         "Gestion des ressources humaines")
        # « Maghreb » n'est jamais attesté en minuscule : le libellé n'est pas demi-corrigé.
        self.assertEqual(harmoniser_libelle("Histoire Du Maghreb Islamique", self.accents, self.minuscules),
                         "Histoire du Maghreb Islamique")

    def test_libelles_avec_separateurs_sont_laisses_tels_quels(self):
        libelle = "Hôtellerie/Option : Réception"
        self.assertEqual(harmoniser_libelle(libelle, self.accents, self.minuscules), libelle)

    def test_idempotent(self):
        une_fois = harmoniser_libelle("Reseaux Et Systemes", self.accents, self.minuscules)
        self.assertEqual(harmoniser_libelle(une_fois, self.accents, self.minuscules), une_fois)


class NomenclatureFormationFamillesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.sup = DomaineFormation.objects.create(code="U-X", libelle="Droit", systeme="superieur")
        self.fp = DomaineFormation.objects.create(code="F-X", libelle="Bâtiment", systeme="formation_professionnelle")
        self.autre = DomaineFormation.objects.create(code="D-AUTRE", libelle="Domaine non répertorié", systeme="autre")
        SpecialiteFormation.objects.create(code="S1", libelle="Droit privé", domaine=self.sup)
        SpecialiteFormation.objects.create(code="S2", libelle="Maçonnerie", domaine=self.fp)
        TypeDiplome.objects.create(code="D-LIC", libelle="Licence", systeme="superieur_lmd")
        TypeDiplome.objects.create(code="D-CAP", libelle="CAP", systeme="formation_professionnelle")

    def test_chaque_element_porte_sa_famille_et_le_domaine_autre_est_exclu(self):
        data = APIClient().get("/api/jobs/referentiel/nomenclature-formation/").data
        familles_domaines = {d["libelle"]: d["famille"] for d in data["domaines"]}
        self.assertEqual(familles_domaines, {"Droit": "superieur", "Bâtiment": "formation_professionnelle"})
        familles_types = {t["code"]: t["famille"] for t in data["types_diplomes"]}
        self.assertEqual(familles_types["D-LIC"], "superieur")
        self.assertEqual(familles_types["D-CAP"], "formation_professionnelle")
        familles_spec = {s["libelle"]: s["famille"] for s in data["specialites"]}
        self.assertEqual(familles_spec["Droit privé"], "superieur")
        self.assertEqual(familles_spec["Maçonnerie"], "formation_professionnelle")
        self.assertIn("familles", data)

    def test_niveaux_d_etudes_exposes_avec_leurs_familles_de_diplomes(self):
        Scolarite.objects.all().delete()
        Scolarite.objects.create(code="SC-SUP", libelle="Études supérieures")
        Scolarite.objects.create(code="SC-SANS", libelle="Aucune scolarité", usage="Aucun score négatif.")
        cache.clear()
        data = APIClient().get("/api/jobs/referentiel/nomenclature-formation/").data
        niveaux = {n["code"]: n["familles"] for n in data["niveaux_etudes"]}
        self.assertEqual(niveaux["SC-SUP"], FAMILLES_PAR_NIVEAU_ETUDES["SC-SUP"])
        self.assertEqual(niveaux["SC-SANS"], [])
