"""Lieux de travail et types de contrat MULTIPLES d'une offre (« Oran, Mostaganem », « CDD ou Stage ») : le principal
(`wilaya`, `commune`, `type_contrat`) reste lu par tout l'existant ; les listes supplémentaires sont validées contre
les listes officielles, comptent pour le score (le MEILLEUR lieu), pour la recherche « l'un ou l'autre » et pour le
JobPosting (Google)."""
from types import SimpleNamespace

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from accounts.models import CustomUser
from jobs.matcher import _score_region
from jobs.models import OffreEmploi, ProfilEntreprise
from jobs.offres_multiples import (
    MAX_CONTRATS_SUPPLEMENTAIRES, MAX_LIEUX_SUPPLEMENTAIRES, lieux_de_l_offre, types_contrat_de_l_offre,
    valider_lieux_supplementaires, valider_types_contrat_supplementaires,
)
from jobs.seo_pages import construire_job_posting
from jobs.serializers.offres import OffreEmploiCreateDTO, OffreEmploiSerializer

ORAN, MOSTA, ALGER, MASCARA = "31 - Oran", "27 - Mostaganem", "16 - Alger", "29 - Mascara"


class ValidationLieuxTest(SimpleTestCase):
    def test_liste_valide_nettoyee(self):
        brut = [{"wilaya": MOSTA, "commune": "  Mazagran ", "autre": "ignoré"}]
        self.assertEqual(valider_lieux_supplementaires(brut, ORAN, ""), [{"wilaya": MOSTA, "commune": "Mazagran"}])

    def test_vide_ou_absent(self):
        self.assertEqual(valider_lieux_supplementaires(None, ORAN, ""), [])
        self.assertEqual(valider_lieux_supplementaires([], ORAN, ""), [])

    def test_wilaya_inconnue_refusee(self):
        with self.assertRaises(ValueError):
            valider_lieux_supplementaires([{"wilaya": "99 - Atlantide"}], ORAN, "")

    def test_wilaya_non_texte_refusee(self):
        with self.assertRaises(ValueError):
            valider_lieux_supplementaires([{"wilaya": ["31 - Oran"]}], ORAN, "")

    def test_le_lieu_principal_ne_se_repete_pas(self):
        with self.assertRaises(ValueError):
            valider_lieux_supplementaires([{"wilaya": ORAN, "commune": "Es Senia"}], ORAN, "es senia")

    def test_meme_wilaya_autre_commune_est_un_autre_lieu(self):
        lieux = valider_lieux_supplementaires([{"wilaya": ORAN, "commune": "Bir El Djir"}], ORAN, "Es Senia")
        self.assertEqual(len(lieux), 1)

    def test_doublon_dans_la_liste_refuse(self):
        with self.assertRaises(ValueError):
            valider_lieux_supplementaires([{"wilaya": MOSTA}, {"wilaya": MOSTA, "commune": ""}], ORAN, "")

    def test_plafond(self):
        assez = [{"wilaya": MOSTA, "commune": f"C{i}"} for i in range(MAX_LIEUX_SUPPLEMENTAIRES)]
        self.assertEqual(len(valider_lieux_supplementaires(assez, ORAN, "")), MAX_LIEUX_SUPPLEMENTAIRES)
        with self.assertRaises(ValueError):
            valider_lieux_supplementaires(assez + [{"wilaya": MOSTA, "commune": "en trop"}], ORAN, "")

    def test_format_invalide(self):
        for mauvais in ("Oran", {"wilaya": MOSTA}, ["Oran"], [{"wilaya": MOSTA, "commune": 12}], [{"wilaya": MOSTA, "commune": "x" * 101}]):
            with self.assertRaises(ValueError):
                valider_lieux_supplementaires(mauvais, ORAN, "")


class ValidationContratsTest(SimpleTestCase):
    def test_liste_valide(self):
        self.assertEqual(valider_types_contrat_supplementaires(["STAGE", "FREELANCE"], "CDD"), ["STAGE", "FREELANCE"])

    def test_vide_ou_absent(self):
        self.assertEqual(valider_types_contrat_supplementaires(None, "CDD"), [])

    def test_code_inconnu_refuse(self):
        with self.assertRaises(ValueError):
            valider_types_contrat_supplementaires(["INCONNU"], "CDD")

    def test_mission_est_un_type_de_contrat_accepte(self):
        self.assertEqual(valider_types_contrat_supplementaires(["MISSION"], "CDD"), ["MISSION"])

    def test_le_contrat_principal_ne_se_repete_pas(self):
        with self.assertRaises(ValueError):
            valider_types_contrat_supplementaires(["CDD"], "CDD")

    def test_doublon_refuse(self):
        with self.assertRaises(ValueError):
            valider_types_contrat_supplementaires(["STAGE", "STAGE"], "CDD")

    def test_plafond(self):
        with self.assertRaises(ValueError):
            valider_types_contrat_supplementaires(["STAGE", "FREELANCE", "ANEM", "TEMPS_PARTIEL"], "CDI")
        self.assertEqual(MAX_CONTRATS_SUPPLEMENTAIRES, 3)


class LireLesListesTest(SimpleTestCase):
    def test_principal_d_abord_sans_doublon(self):
        offre = SimpleNamespace(wilaya=ORAN, commune="", lieux_supplementaires=[{"wilaya": MOSTA, "commune": ""}, {"wilaya": ORAN, "commune": ""}],
                                type_contrat="CDD", types_contrat_supplementaires=["STAGE", "CDD"])
        self.assertEqual([l["wilaya"] for l in lieux_de_l_offre(offre)], [ORAN, MOSTA])
        self.assertEqual(types_contrat_de_l_offre(offre), ["CDD", "STAGE"])

    def test_champs_absents_ou_mal_formes_ignores(self):
        offre = SimpleNamespace(wilaya=ORAN, commune=None, lieux_supplementaires="n'importe quoi", type_contrat="CDI")
        self.assertEqual(len(lieux_de_l_offre(offre)), 1)
        self.assertEqual(types_contrat_de_l_offre(offre), ["CDI"])


class ScoreRegionMeilleurLieuTest(SimpleTestCase):
    def _offre(self, wilaya, extras):
        return SimpleNamespace(wilaya=wilaya, commune="", lieux_supplementaires=extras)

    def test_candidat_d_un_lieu_supplementaire_a_le_score_plein(self):
        profil = SimpleNamespace(wilaya=MOSTA, mobilite=None)
        offre = self._offre(ORAN, [{"wilaya": MOSTA, "commune": ""}])
        self.assertEqual(_score_region(profil, offre), {"score": 1.0, "connu": True})

    def test_sans_lieu_supplementaire_le_meme_candidat_n_a_pas_le_score(self):
        profil = SimpleNamespace(wilaya=MOSTA, mobilite=None)
        self.assertEqual(_score_region(profil, self._offre(ORAN, []))["score"], 0.0)

    def test_mobilite_regionale_compte_avec_n_importe_quel_lieu_de_l_offre(self):
        profil = SimpleNamespace(wilaya=MASCARA, mobilite="REGIONALE")
        self.assertEqual(_score_region(profil, self._offre(ALGER, []))["score"], 0.0)
        self.assertEqual(_score_region(profil, self._offre(ALGER, [{"wilaya": ORAN, "commune": ""}]))["score"], 1.0)

    def test_wilaya_du_candidat_inconnue(self):
        profil = SimpleNamespace(wilaya="", mobilite=None)
        self.assertEqual(_score_region(profil, self._offre(ORAN, [{"wilaya": MOSTA, "commune": ""}])), {"score": 0.0, "connu": False})


class BaseOffre(TestCase):
    def setUp(self):
        rec = CustomUser.objects.create_user(username="rec_multi", email="rec_multi@test.com", password="x", role="RECRUTEUR")
        self.entreprise = ProfilEntreprise.objects.create(user=rec, nom_entreprise="ACME Multi", est_approuvee=True)

    def creer(self, **champs):
        base = dict(entreprise=self.entreprise, titre="Analyste", wilaya=ORAN, description="x",
                    statut_moderation="APPROUVEE", est_active=True)
        base.update(champs)
        return OffreEmploi.objects.create(**base)


class SerializeursTest(BaseOffre):
    def _donnees(self, **extra):
        return {"titre": "Développeur", "wilaya": ORAN, "commune": "", "type_contrat": "CDD", **extra}

    def test_creation_avec_lieux_et_contrats_supplementaires(self):
        serializer = OffreEmploiCreateDTO(data=self._donnees(
            lieux_supplementaires=[{"wilaya": MOSTA, "commune": " "}], types_contrat_supplementaires=["STAGE"]))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        offre = serializer.save(entreprise=self.entreprise)
        self.assertEqual(offre.lieux_supplementaires, [{"wilaya": MOSTA, "commune": ""}])
        self.assertEqual(offre.types_contrat_supplementaires, ["STAGE"])

    def test_lieu_principal_repete_refuse(self):
        serializer = OffreEmploiCreateDTO(data=self._donnees(lieux_supplementaires=[{"wilaya": ORAN, "commune": ""}]))
        self.assertFalse(serializer.is_valid())
        self.assertIn("lieux_supplementaires", serializer.errors)

    def test_contrat_principal_repete_refuse(self):
        serializer = OffreEmploiCreateDTO(data=self._donnees(types_contrat_supplementaires=["CDD"]))
        self.assertFalse(serializer.is_valid())
        self.assertIn("types_contrat_supplementaires", serializer.errors)

    def test_modification_compare_au_principal_de_l_offre(self):
        offre = self.creer(type_contrat="CDD", statut_moderation="EN_ATTENTE")
        serializer = OffreEmploiCreateDTO(offre, data={"types_contrat_supplementaires": ["CDD"]}, partial=True)
        self.assertFalse(serializer.is_valid())

    def test_sans_les_listes_rien_ne_change(self):
        serializer = OffreEmploiCreateDTO(data=self._donnees())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        offre = serializer.save(entreprise=self.entreprise)
        self.assertEqual((offre.lieux_supplementaires, offre.types_contrat_supplementaires), ([], []))

    def test_serializer_general_en_lecture_seule(self):
        offre = self.creer()
        serializer = OffreEmploiSerializer(offre, data={"lieux_supplementaires": [{"wilaya": "n'importe quoi"}]}, partial=True)
        self.assertTrue(serializer.is_valid())
        self.assertNotIn("lieux_supplementaires", serializer.validated_data)

    def test_la_lecture_expose_les_listes(self):
        offre = self.creer(lieux_supplementaires=[{"wilaya": MOSTA, "commune": ""}], types_contrat_supplementaires=["STAGE"])
        data = OffreEmploiSerializer(offre).data
        self.assertEqual(data["lieux_supplementaires"], [{"wilaya": MOSTA, "commune": ""}])
        self.assertEqual(data["types_contrat_supplementaires"], ["STAGE"])


class RechercheEtSeoTest(BaseOffre):
    def _liste(self, **params):
        reponse = APIClient().get("/api/jobs/", params)
        self.assertEqual(reponse.status_code, 200)
        return {o["id"] for o in reponse.json()["results"]}

    def setUp(self):
        super().setUp()
        self.multi = self.creer(titre="Multi", type_contrat="CDD", lieux_supplementaires=[{"wilaya": MOSTA, "commune": ""}],
                                types_contrat_supplementaires=["STAGE"])
        self.simple = self.creer(titre="Simple", wilaya=ALGER, type_contrat="CDI")

    def test_filtre_wilaya_trouve_un_lieu_supplementaire(self):
        self.assertEqual(self._liste(wilaya="Mostaganem"), {self.multi.id})

    def test_filtre_wilaya_principal_inchange(self):
        self.assertEqual(self._liste(wilaya="Oran"), {self.multi.id})
        self.assertEqual(self._liste(wilaya="Alger"), {self.simple.id})

    def test_filtre_contrat_trouve_un_contrat_supplementaire(self):
        self.assertEqual(self._liste(contrat="STAGE"), {self.multi.id})

    def test_filtre_contrat_principal_inchange(self):
        self.assertEqual(self._liste(contrat="CDD"), {self.multi.id})
        self.assertEqual(self._liste(contrat="CDI"), {self.simple.id})

    def test_job_posting_un_lieu_un_contrat_comme_avant(self):
        donnees = construire_job_posting(self.simple)
        self.assertEqual(donnees["jobLocation"]["address"]["addressRegion"], "Alger")
        self.assertEqual(donnees["employmentType"], "FULL_TIME")

    def test_job_posting_plusieurs_lieux_et_contrats(self):
        donnees = construire_job_posting(self.multi)
        self.assertEqual([l["address"]["addressRegion"] for l in donnees["jobLocation"]], ["Oran", "Mostaganem"])
        self.assertEqual(donnees["employmentType"], ["TEMPORARY", "INTERN"])
