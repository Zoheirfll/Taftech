from django.test import TestCase

from jobs.models import TypeDiplome
from jobs.referentiel_utils import resoudre_diplome_et_specialite_depuis_texte


class ResoudreDiplomeDepuisTexteTest(TestCase):
    """"Licence"/"Master"/"Doctorat" seuls sont ambigus entre plusieurs variantes du
    référentiel (académique/professionnelle/classique) — décision produit (commit 46d33be) :
    le régime académique (le plus répandu en Algérie) l'emporte par défaut plutôt que de
    rester sur l'entrée générique "non précisée", sauf pour le Doctorat qui n'a pas de
    variante "-A" (research-only, son défaut est "-LMD", le système actuel). Le repli "-NP"
    ne s'applique que si aucun défaut n'existe pour la famille. Fixtures synthétiques (la
    base de test ne contient pas le vrai référentiel v2, seulement peuplé en dev via la
    commande d'import)."""

    def setUp(self):
        TypeDiplome.objects.all().delete()
        TypeDiplome.objects.bulk_create([
            TypeDiplome(code="D-LIC-NP", libelle="Licence — nature non précisée", systeme="universitaire"),
            TypeDiplome(code="D-LIC-CL", libelle="Licence — ancien système classique", systeme="universitaire"),
            TypeDiplome(code="D-LIC-A", libelle="Licence académique", systeme="universitaire"),
            TypeDiplome(code="D-LIC-P", libelle="Licence professionnelle", systeme="universitaire"),
            TypeDiplome(code="D-MAS-NP", libelle="Master — nature non précisée", systeme="universitaire"),
            TypeDiplome(code="D-MAS-A", libelle="Master académique", systeme="universitaire"),
            TypeDiplome(code="D-MAS-P", libelle="Master professionnel", systeme="universitaire"),
            TypeDiplome(code="D-DOC-NP", libelle="Doctorat de recherche — régime non précisé", systeme="universitaire"),
            TypeDiplome(code="D-DOC-LMD", libelle="Doctorat LMD / de recherche", systeme="universitaire"),
            TypeDiplome(code="D-BAC", libelle="Baccalauréat", systeme="secondaire"),
        ])

    def test_master_seul_resout_vers_academique(self):
        td, sp = resoudre_diplome_et_specialite_depuis_texte("Master en Informatique")
        self.assertIsNotNone(td)
        self.assertEqual(td.code, "D-MAS-A")

    def test_licence_seule_resout_vers_academique(self):
        td, sp = resoudre_diplome_et_specialite_depuis_texte("Licence en Informatique")
        self.assertIsNotNone(td)
        self.assertEqual(td.code, "D-LIC-A")

    def test_doctorat_seul_resout_vers_lmd(self):
        td, sp = resoudre_diplome_et_specialite_depuis_texte("Doctorat en Chimie")
        self.assertIsNotNone(td)
        self.assertEqual(td.code, "D-DOC-LMD")

    def test_licence_sans_defaut_disponible_resout_vers_non_precise(self):
        """Si aucune variante académique n'existe pour la famille (fixture réduite), le
        repli reste bien "-NP" — vérifie que le défaut -A n'est pas codé en dur sans
        fallback."""
        TypeDiplome.objects.filter(code="D-LIC-A").delete()
        td, sp = resoudre_diplome_et_specialite_depuis_texte("Licence en Informatique")
        self.assertIsNotNone(td)
        self.assertEqual(td.code, "D-LIC-NP")

    def test_diplome_sans_ambiguite_reste_inchange(self):
        td, sp = resoudre_diplome_et_specialite_depuis_texte("Baccalauréat Génie Mécanique")
        self.assertIsNotNone(td)
        self.assertEqual(td.code, "D-BAC")

    def test_familles_differentes_restent_ambigues(self):
        # Aucun mot commun entre les libellés fixtures et ce texte -> aucun candidat du
        # tout (pas le même cas que l'ambiguïté "variantes d'un même diplôme").
        td, sp = resoudre_diplome_et_specialite_depuis_texte("Certificat de formation continue")
        self.assertIsNone(td)

    def test_texte_vide_retourne_none(self):
        td, sp = resoudre_diplome_et_specialite_depuis_texte("")
        self.assertIsNone(td)
        td, sp = resoudre_diplome_et_specialite_depuis_texte(None)
        self.assertIsNone(td)
