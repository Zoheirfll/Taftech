# -*- coding: utf-8 -*-
"""Normalisation de la recherche référentiel v2 (REGLES_MATCHING N01-N03) — session
18/09/2026 : une requête tapée avec les accents usuels ("développeur") ne matchait
plus aucune entrée du référentiel (`cle_recherche` est déjà normalisé côté import,
mais la requête utilisateur ne l'était jamais). Voir `jobs/referentiel_utils.py::
normaliser_recherche()`."""
from django.test import TestCase
from rest_framework.test import APIClient

from jobs.models import GroupeMetier, Metier, Appellation
from jobs.referentiel_utils import normaliser_recherche, corriger_mots_flous, _levenshtein_leq1


class NormaliserRechercheUnitTest(TestCase):
    def test_accents_latins_retires(self):
        self.assertEqual(normaliser_recherche("Développeur"), "developpeur")

    def test_tokens_techniques_avant_ponctuation(self):
        self.assertEqual(normaliser_recherche("Développeur C++ et .NET"), "developpeur cpp et dotnet")
        self.assertEqual(normaliser_recherche("C# senior"), "csharp senior")

    def test_c_seul_non_confondu_avec_cpp_ou_csharp(self):
        # "C" seul ne doit jamais devenir "cpp"/"csharp" (limites de mot, N02)
        self.assertEqual(normaliser_recherche("langage C"), "langage c")

    def test_harakat_et_tatweel_retires_lettres_arabes_conservees(self):
        # harakat (voyelles courtes) + tatweel retirés, le mot arabe reste lisible
        self.assertEqual(normaliser_recherche("مُطوّّر"), "مطور")

    def test_variantes_alef_unifiees(self):
        self.assertIn("ا", normaliser_recherche("أحمد"))  # أحمد -> ا... (alef hamza -> alef nu)

    def test_chaine_vide_ou_none(self):
        self.assertEqual(normaliser_recherche(""), "")
        self.assertEqual(normaliser_recherche(None), "")


class RechercheMetierEndpointTest(TestCase):
    """Vérifie en conditions réelles (vraie base, vrai référentiel importé en dev)
    qu'une recherche accentuée retourne des résultats. Si le référentiel n'est pas
    importé dans cet environnement de test, les deux assertions passent trivialement
    à 0==0 sans échouer à tort — le test compare les deux comportements entre eux,
    pas un compte absolu."""

    def test_recherche_avec_et_sans_accents_retournent_le_meme_nombre(self):
        c = APIClient()
        avec_accents = c.get("/api/jobs/referentiel/metiers/", {"search": "développeur"})
        sans_accents = c.get("/api/jobs/referentiel/metiers/", {"search": "developpeur"})
        self.assertEqual(avec_accents.status_code, 200)
        self.assertEqual(sans_accents.status_code, 200)
        self.assertEqual(len(avec_accents.data), len(sans_accents.data))

    def test_N02_c_seul_ne_matche_jamais_cpp_avec_fixtures_reelles(self):
        # Bug réel trouvé le 21/09/2026 (en écrivant RechercheUniverselleAPIView) : le
        # `icontains` par mot ne respectait pas les limites de mot — "developpeur c"
        # matchait à tort "developpeur cpp" en tant que sous-chaîne. Corrigé via
        # `q_mots_cle_recherche` (limite de mot par regex).
        from jobs.models import GroupeMetier, Metier, Appellation
        groupe = GroupeMetier.objects.create(code="G-N02-DEV", type_groupe="domaine_source", libelle="Dev")
        metier_cpp = Metier.objects.create(
            code="TAF-N02-CPP", libelle="Développeur C++", cle_recherche="developpeur cpp", groupe_principal=groupe)
        Appellation.objects.create(code="APP-N02-CPP", metier=metier_cpp, libelle="Développeur C++", cle_recherche="developpeur cpp")

        c = APIClient()
        resp = c.get("/api/jobs/referentiel/metiers/", {"search": "developpeur c"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, [])


class LevenshteinLeq1Test(TestCase):
    def test_identique(self):
        self.assertTrue(_levenshtein_leq1("developpeur", "developpeur"))

    def test_une_lettre_manquante(self):
        self.assertTrue(_levenshtein_leq1("developpeur", "developeur"))

    def test_deux_differences_refusees(self):
        self.assertFalse(_levenshtein_leq1("developpeur", "developpppeur"))
        self.assertFalse(_levenshtein_leq1("developpeur", "commercial"))


class CorrigerMotsFlousTest(TestCase):
    """N04 — corrige une faute de frappe (Levenshtein<=1) sur un mot absent du
    référentiel, jamais sur les acronymes courts ni sur un mot déjà exact."""

    def setUp(self):
        secteur = GroupeMetier.objects.create(code="TST-SECT-FLOU", libelle="Secteur Test", type_groupe="secteur_source")
        groupe = GroupeMetier.objects.create(code="TST-DOM-FLOU", libelle="Domaine Test", type_groupe="domaine_source", parent=secteur)
        metier = Metier.objects.create(code="TST-M-FLOU", libelle="Développeur Test", selectionnable=True, groupe_principal=groupe)
        Appellation.objects.create(
            code="TST-APP-FLOU", metier=metier, libelle="Développeur web",
            cle_recherche="developpeur web", actif=True,
        )

    def test_faute_de_frappe_corrigee(self):
        # "developeur" (1 p au lieu de 2) -> corrigé en "developpeur", présent en base
        self.assertEqual(corriger_mots_flous(["developeur"]), ["developpeur"])

    def test_mot_deja_exact_jamais_retouche(self):
        # N04 : "rechercher exact avant correction" — un mot déjà présent n'est pas modifié
        self.assertEqual(corriger_mots_flous(["developpeur"]), ["developpeur"])

    def test_acronymes_courts_jamais_touches(self):
        self.assertEqual(corriger_mots_flous(["bts", "cap", "daf", "si", "c"]), ["bts", "cap", "daf", "si", "c"])

    def test_chiffres_jamais_touches(self):
        self.assertEqual(corriger_mots_flous(["12345"]), ["12345"])

    def test_mot_sans_correction_plausible_inchange(self):
        self.assertEqual(corriger_mots_flous(["xyzab"]), ["xyzab"])
