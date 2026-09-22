"""RechercheUniverselleAPIView — R01/R02 (REGLES_MATCHING) : résoudre indépendamment les
4 référentiels (métiers, compétences, diplômes, spécialités) à partir d'une requête libre,
en présentant le type de chaque résultat, et signaler les entrées ambiguës (R02) plutôt que
de deviner un choix unique."""
from django.test import TestCase
from rest_framework.test import APIClient
from jobs.models import (
    GroupeMetier, Metier, Appellation, CompetenceReferentiel,
    TypeDiplome, AliasDiplome, DomaineFormation, SpecialiteFormation, AliasSpecialite,
)


class RechercheUniverselleTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _url(self, q):
        return f"/api/jobs/referentiel/recherche-universelle/?q={q}"

    def test_requete_vide_retourne_listes_vides(self):
        resp = self.client.get("/api/jobs/referentiel/recherche-universelle/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, {
            "metiers": [], "competences": [], "diplomes": [], "specialites": [], "localisation": None,
        })

    def test_resout_un_metier_par_sigle_R01(self):
        groupe = GroupeMetier.objects.create(code="G-RU-DAF", type_groupe="domaine_source", libelle="Direction")
        metier = Metier.objects.create(code="TAF-RU-DAF", libelle="Directeur administratif et financier",
                                        cle_recherche="directeur administratif et financier", groupe_principal=groupe)
        Appellation.objects.create(code="APP-RU-DAF", metier=metier, libelle="DAF", cle_recherche="daf")

        resp = self.client.get(self._url("DAF"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["metiers"]), 1)
        self.assertEqual(resp.data["metiers"][0]["type"], "metier")
        self.assertEqual(resp.data["metiers"][0]["id"], metier.id)
        self.assertEqual(resp.data["metiers"][0]["contexte"], "Direction")
        # Un sigle court (DAF) ne doit déclencher aucun résultat compétence/diplôme fantaisiste.
        self.assertEqual(resp.data["competences"], [])

    def test_resout_une_competence_par_synonyme(self):
        CompetenceReferentiel.objects.create(label="Pipelines de données ETL", actif=True, synonymes="ETL, ELT")
        resp = self.client.get(self._url("ETL"))
        self.assertEqual(len(resp.data["competences"]), 1)
        self.assertEqual(resp.data["competences"][0]["type"], "competence")
        self.assertEqual(resp.data["competences"][0]["libelle"], "Pipelines de données ETL")

    def test_diplome_ambigu_signale_R02(self):
        diplome = TypeDiplome.objects.create(code="D-RU-BTS", libelle="BTS", systeme="formation_professionnelle")
        AliasDiplome.objects.create(code="AL-RU-1", diplome=diplome, libelle="BTS", cle_recherche="bts", ambiguite=True)
        resp = self.client.get(self._url("bts"))
        self.assertEqual(len(resp.data["diplomes"]), 1)
        self.assertTrue(resp.data["diplomes"][0]["ambigu"])
        self.assertEqual(resp.data["diplomes"][0]["contexte"], "formation_professionnelle")

    def test_specialite_avec_contexte_domaine(self):
        domaine = DomaineFormation.objects.create(code="D-RU-INFO", libelle="Informatique", systeme="universitaire")
        specialite = SpecialiteFormation.objects.create(
            code="SP-RU-INFO", domaine=domaine, libelle="Génie logiciel", cle_recherche="genie logiciel")
        AliasSpecialite.objects.create(code="AS-RU-1", specialite=specialite, libelle="Génie logiciel", cle_recherche="genie logiciel")
        resp = self.client.get(self._url("genie logiciel"))
        self.assertEqual(len(resp.data["specialites"]), 1)
        self.assertEqual(resp.data["specialites"][0]["contexte"], "Informatique")

    def test_R06_requete_composee_localisation_extraite_separement(self):
        # "data analyst Alger" : reconnaître métier et localisation séparément (R06).
        groupe = GroupeMetier.objects.create(code="G-RU-DA", type_groupe="domaine_source", libelle="Data")
        metier = Metier.objects.create(code="TAF-RU-DA", libelle="Data Analyst",
                                        cle_recherche="data analyst", groupe_principal=groupe)
        Appellation.objects.create(code="APP-RU-DA", metier=metier, libelle="Data Analyst", cle_recherche="data analyst")

        resp = self.client.get(self._url("data analyst Alger"))
        self.assertEqual(resp.data["localisation"], "Alger")
        self.assertEqual(len(resp.data["metiers"]), 1)
        self.assertEqual(resp.data["metiers"][0]["id"], metier.id)

    def test_R06_couple_diplome_specialite_valide_si_meme_formation(self):
        # "BTS informatique" : résoudre D-BTS et la spécialité Informatique, vérifier qu'ils
        # forment bien un couple attesté (T23 : jamais deux termes de formations différentes).
        diplome = TypeDiplome.objects.create(code="D-RU-BTSINFO", libelle="BTS", systeme="formation_professionnelle")
        AliasDiplome.objects.create(code="AL-RU-BTSINFO", diplome=diplome, libelle="BTS", cle_recherche="bts")
        domaine = DomaineFormation.objects.create(code="D-RU-INFO2", libelle="Informatique", systeme="universitaire")
        specialite = SpecialiteFormation.objects.create(
            code="SP-RU-INFO2", domaine=domaine, libelle="Informatique", cle_recherche="informatique")
        AliasSpecialite.objects.create(code="AS-RU-INFO2", specialite=specialite, libelle="Informatique", cle_recherche="informatique")
        from jobs.models import DiplomeSpecialite
        DiplomeSpecialite.objects.create(code="DS-RU-BTSINFO", diplome=diplome, specialite=specialite)

        resp = self.client.get(self._url("bts informatique"))
        self.assertEqual(len(resp.data["couples_diplome_specialite_valides"]), 1)
        couple = resp.data["couples_diplome_specialite_valides"][0]
        self.assertEqual(couple["diplome_id"], diplome.id)
        self.assertEqual(couple["specialite_id"], specialite.id)

    def test_R06_T23_pas_de_couple_si_formations_differentes(self):
        # BTS existe dans une spécialité X, Master informatique existe séparément — la requête
        # "BTS informatique" ne doit PAS confirmer de couple si BTS+Informatique n'est pas
        # attesté comme une vraie formation.
        diplome_bts = TypeDiplome.objects.create(code="D-RU-BTSX", libelle="BTS", systeme="formation_professionnelle")
        AliasDiplome.objects.create(code="AL-RU-BTSX", diplome=diplome_bts, libelle="BTS", cle_recherche="bts")
        diplome_master = TypeDiplome.objects.create(code="D-RU-MASTX", libelle="Master", systeme="universitaire")
        domaine = DomaineFormation.objects.create(code="D-RU-INFO3", libelle="Informatique", systeme="universitaire")
        specialite_info = SpecialiteFormation.objects.create(
            code="SP-RU-INFO3", domaine=domaine, libelle="Informatique", cle_recherche="informatique")
        AliasSpecialite.objects.create(code="AS-RU-INFO3", specialite=specialite_info, libelle="Informatique", cle_recherche="informatique")
        from jobs.models import DiplomeSpecialite
        DiplomeSpecialite.objects.create(code="DS-RU-MASTINFO", diplome=diplome_master, specialite=specialite_info)
        # Aucun couple BTS+Informatique n'existe — seulement Master+Informatique.

        resp = self.client.get(self._url("bts informatique"))
        self.assertEqual(resp.data["couples_diplome_specialite_valides"], [])

    def test_type_c_seul_non_confondu_avec_cpp(self):
        # Réutilise la normalisation N02 déjà écrite — "C" seul ne doit jamais matcher "C++".
        groupe = GroupeMetier.objects.create(code="G-RU-DEV", type_groupe="domaine_source", libelle="Dev")
        metier_cpp = Metier.objects.create(code="TAF-RU-CPP", libelle="Développeur C++",
                                            cle_recherche="developpeur cpp", groupe_principal=groupe)
        Appellation.objects.create(code="APP-RU-CPP", metier=metier_cpp, libelle="Développeur C++", cle_recherche="developpeur cpp")
        resp = self.client.get(self._url("developpeur c"))
        self.assertEqual(resp.data["metiers"], [])
