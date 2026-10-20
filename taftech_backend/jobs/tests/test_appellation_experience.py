"""L'expérience affiche l'APPELLATION choisie (« Développeur web »), pas le métier officiel qui la regroupe
(« Études et développement informatique »). Le métier reste l'unique clé du calcul ; l'appellation (champ
`ExperienceCandidat.appellation`) est conservée pour l'affichage."""
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from jobs.domaine_agent import (
    SPECIALITE_INDEX, _candidats_pour_experience, classifier_appellations_experiences,
)
from jobs.models import Appellation, GroupeMetier, Metier
from jobs.serializers import ExperienceSerializer


class AppellationExperienceTests(TestCase):
    def setUp(self):
        groupe = GroupeMetier.objects.create(code="G-INFO", libelle="Informatique", type_groupe="domaine_source")
        self.dev = Metier.objects.create(code="M-DEV", libelle="Études et développement informatique", groupe_principal=groupe)
        self.paie = Metier.objects.create(code="M-PAIE", libelle="Gestionnaire de Paie", groupe_principal=groupe)
        self.web = Appellation.objects.create(code="A-WEB", libelle="Développeur web", metier=self.dev, cle_recherche="developpeur web")
        self.appli = Appellation.objects.create(
            code="A-APP", libelle="Développeur d'application", metier=self.dev, cle_recherche="developpeur d application")
        self.app_paie = Appellation.objects.create(code="A-PAIE", libelle="Gestionnaire de Paie", metier=self.paie, cle_recherche="gestionnaire de paie")

    def test_l_autocompletion_renvoie_l_identifiant_de_l_appellation(self):
        reponse = APIClient().get(reverse("api-metiers-autocomplete"), {"search": "developpeur web"})
        self.assertEqual(reponse.status_code, 200)
        premier = reponse.json()[0]
        self.assertEqual((premier["appellation_id"], premier["appellation_libelle"]), (self.web.id, "Développeur web"))
        self.assertEqual(premier["metier_id"], self.dev.id)

    def test_le_classifieur_renvoie_l_appellation_choisie_avec_son_metier(self):
        titre = "DÉVELOPPEUR D'APPLICATIONS WEB"
        candidats = _candidats_pour_experience(titre, "", limite=10)
        choix = next(i for i, c in enumerate(candidats) if c[0] == "Développeur web")
        reponse = '{"classifications": [{"index": 0, "appellation_choisie": %d, "raison": "x"}]}' % choix
        with patch("jobs.cv_parser._call_groq", return_value=reponse):
            resultat = classifier_appellations_experiences([{"titre_poste": titre, "description": ""}])
        self.assertEqual(resultat, {0: (self.dev.id, self.web.id, "Développeur web")})

    def test_le_profil_est_classe_sous_la_cle_reservee(self):
        reponse = '{"classifications": [{"index": 0, "appellation_choisie": 0, "raison": "x"}]}'
        with patch("jobs.cv_parser._call_groq", return_value=reponse):
            resultat = classifier_appellations_experiences([], titre_professionnel="Gestionnaire de paie")
        self.assertEqual(resultat, {SPECIALITE_INDEX: (self.paie.id, self.app_paie.id, "Gestionnaire de Paie")})

    def _donnees(self, **champs):
        return {"titre_poste": "Développeur", "entreprise": "Taziri", "date_debut": "2026-01-01", **champs}

    def test_l_enregistrement_accepte_une_appellation_du_metier_choisi(self):
        serializer = ExperienceSerializer(data=self._donnees(metier=self.dev.id, appellation=self.web.id))
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_l_enregistrement_refuse_une_appellation_d_un_autre_metier(self):
        serializer = ExperienceSerializer(data=self._donnees(metier=self.dev.id, appellation=self.app_paie.id))
        self.assertFalse(serializer.is_valid())
        self.assertIn("appellation", serializer.errors)

    def test_l_appellation_est_renvoyee_avec_son_libelle(self):
        serializer = ExperienceSerializer(data=self._donnees(metier=self.dev.id, appellation=self.web.id))
        serializer.is_valid(raise_exception=True)
        self.assertEqual(serializer.validated_data["appellation"], self.web)
