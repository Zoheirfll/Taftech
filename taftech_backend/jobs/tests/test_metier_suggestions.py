# -*- coding: utf-8 -*-
"""MetierSuggestionsAPIView — Phase 3 du plan client (suggestions compétences/spécialités
via MetierCompetence/MetierFormation), jamais branchée jusqu'à cette session (18/09/2026)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from jobs.models import (
    GroupeMetier, Metier, CompetenceReferentiel, MetierCompetence,
    TypeDiplome, DomaineFormation, SpecialiteFormation, DiplomeSpecialite, MetierFormation,
)

User = get_user_model()


class MetierSuggestionsAPITest(APITestCase):
    def setUp(self):
        self.recruteur = User.objects.create_user(
            username="rec_sugg", email="rec_sugg@test.dz", password="Pass1234!", role="RECRUTEUR",
        )
        secteur = GroupeMetier.objects.create(code="TST-SECT-SUGG", libelle="Secteur Test", type_groupe="secteur_source")
        groupe = GroupeMetier.objects.create(code="TST-DOM-SUGG", libelle="Domaine Test", type_groupe="domaine_source", parent=secteur)
        self.metier = Metier.objects.create(code="TST-M-SUGG", libelle="Développeur Test", groupe_principal=groupe)

        self.competence = CompetenceReferentiel.objects.create(label="Django (test)", actif=True)
        MetierCompetence.objects.create(code="TST-MC-1", metier=self.metier, competence=self.competence)

        self.type_diplome = TypeDiplome.objects.create(
            code="TST-TD-SUGG", libelle="Diplôme Test", systeme="universitaire", selectionnable=True,
        )
        domaine_form = DomaineFormation.objects.create(code="TST-DF-SUGG", libelle="Domaine Formation Test", actif=True)
        self.specialite = SpecialiteFormation.objects.create(
            code="TST-SP-SUGG", domaine=domaine_form, libelle="Spécialité Test",
            cle_recherche="specialite test", selectionnable=True,
        )
        DiplomeSpecialite.objects.create(
            code="TST-DS-SUGG", diplome=self.type_diplome, specialite=self.specialite, selectionnable=True,
        )
        MetierFormation.objects.create(code="TST-MF-1", metier=self.metier, specialite=self.specialite)

    def test_recruteur_recoit_les_suggestions_du_metier(self):
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(f"/api/jobs/referentiel/metiers/{self.metier.id}/suggestions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["competences"]), 1)
        self.assertEqual(response.data["competences"][0]["label"], "Django (test)")
        self.assertEqual(len(response.data["diplomes_specialites"]), 1)
        self.assertEqual(response.data["diplomes_specialites"][0]["specialite_libelle"], "Spécialité Test")
        self.assertEqual(response.data["diplomes_specialites"][0]["diplome_libelle"], "Diplôme Test")
        self.assertIn("id", response.data["diplomes_specialites"][0])

    def test_metier_inexistant_404(self):
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get("/api/jobs/referentiel/metiers/999999/suggestions/")
        self.assertEqual(response.status_code, 404)

    def test_non_authentifie_bloque(self):
        response = self.client.get(f"/api/jobs/referentiel/metiers/{self.metier.id}/suggestions/")
        self.assertEqual(response.status_code, 401)

    def test_metier_redirige_renvoie_les_suggestions_du_canonique_R04(self):
        # R04 : les liens MetierCompetence/MetierFormation sont posés sur le métier
        # canonique, jamais sur un ancien code redirigé — l'endpoint doit résoudre
        # metier_canonique avant de chercher, sinon un code redirigé renvoie des listes
        # vides alors que de vraies suggestions existent sur sa cible.
        secteur3 = GroupeMetier.objects.create(code="TST-SECT-REDIR", libelle="Secteur Redir", type_groupe="secteur_source")
        groupe3 = GroupeMetier.objects.create(code="TST-DOM-REDIR", libelle="Domaine Redir", type_groupe="domaine_source", parent=secteur3)
        ancien_code = Metier.objects.create(
            code="TST-M-ANCIEN", libelle="Ancien intitulé", groupe_principal=groupe3,
            metier_canonique=self.metier,
        )
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(f"/api/jobs/referentiel/metiers/{ancien_code.id}/suggestions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["competences"]), 1)
        self.assertEqual(response.data["competences"][0]["label"], "Django (test)")

    def test_metier_sans_liens_retourne_listes_vides(self):
        secteur2 = GroupeMetier.objects.create(code="TST-SECT-VIDE", libelle="Secteur Vide", type_groupe="secteur_source")
        groupe2 = GroupeMetier.objects.create(code="TST-DOM-VIDE", libelle="Domaine Vide", type_groupe="domaine_source", parent=secteur2)
        metier_vide = Metier.objects.create(code="TST-M-VIDE", libelle="Métier Sans Liens", groupe_principal=groupe2)
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(f"/api/jobs/referentiel/metiers/{metier_vide.id}/suggestions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["competences"], [])
        self.assertEqual(response.data["diplomes_specialites"], [])
