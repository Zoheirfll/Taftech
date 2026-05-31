# test_profil_snapshot.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import (
    ProfilEntreprise, OffreEmploi, Candidature,
    ProfilCandidat, ExperienceCandidat, FormationCandidat
)
import datetime

User = get_user_model()


class ProfilSnapshotTestCase(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.recruteur = User.objects.create_user(
            username="recruteur_test",
            email="recruteur@test.dz",
            password="Pass1234!",
            role="RECRUTEUR"
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur,
            nom_entreprise="TechCorp",
            secteur_activite="IT",
            registre_commerce="RC123",
            wilaya_siege="31 - Oran",
            est_approuvee=True
        )

        self.candidat = User.objects.create_user(
            username="candidat_test",
            email="candidat@test.dz",
            password="Pass1234!",
            role="CANDIDAT",
            first_name="Zoheir",
            last_name="Filali",
            telephone="0664540375"
        )

        self.profil, _ = ProfilCandidat.objects.get_or_create(user=self.candidat)
        self.profil.titre_professionnel = "Ingénieur Full-Stack"
        self.profil.wilaya = "31 - Oran"
        self.profil.commune = "Bir El Djir"
        self.profil.diplome = "MASTER_2"
        self.profil.specialite = "IT"
        self.profil.competences = "React, Django, Python"
        self.profil.langues = "Français:Avancé,Anglais:Intermédiaire"
        self.profil.save()

        ExperienceCandidat.objects.create(
            profil=self.profil,
            titre_poste="Développeur Backend",
            entreprise="SOMIZ",
            date_debut=datetime.date(2020, 1, 1),
            date_fin=datetime.date(2023, 6, 30),
            description="Développement Django"
        )

        FormationCandidat.objects.create(
            profil=self.profil,
            diplome="Master 2 ADSI",
            etablissement="Université Oran 1",
            date_debut=datetime.date(2018, 9, 1),
            date_fin=datetime.date(2020, 6, 30),
            description="Aide à la décision et systèmes intelligents"
        )

        self.offre = OffreEmploi.objects.create(
            entreprise=self.entreprise,
            titre="Développeur Full-Stack",
            wilaya="31 - Oran",
            specialite="IT",
            type_contrat="CDI",
            experience_requise="CONFIRME",
            statut_moderation="APPROUVEE",
            est_active=True
        )

    # ==============================================
    # HAPPY PATHS
    # ==============================================

    def test_HP1_snapshot_cree_lors_postulation(self):
        """HP1 : Un snapshot est créé lors de la postulation."""
        self.client.force_authenticate(user=self.candidat)
        response = self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": "Je suis motivé."},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        candidature = Candidature.objects.get(
            offre=self.offre, candidat=self.candidat
        )
        self.assertIsNotNone(candidature.profil_snapshot)

    def test_HP2_snapshot_contient_infos_de_base(self):
        """HP2 : Le snapshot contient les informations de base du candidat."""
        self.client.force_authenticate(user=self.candidat)
        self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        candidature = Candidature.objects.get(
            offre=self.offre, candidat=self.candidat
        )
        snapshot = candidature.profil_snapshot
        self.assertEqual(snapshot["first_name"], "Zoheir")
        self.assertEqual(snapshot["last_name"], "Filali")
        self.assertEqual(snapshot["email"], "candidat@test.dz")
        self.assertEqual(snapshot["telephone"], "0664540375")
        self.assertEqual(snapshot["titre_professionnel"], "Ingénieur Full-Stack")
        self.assertEqual(snapshot["wilaya"], "31 - Oran")
        self.assertEqual(snapshot["diplome"], "MASTER_2")

    def test_HP3_snapshot_contient_experiences(self):
        """HP3 : Le snapshot contient les expériences du candidat."""
        self.client.force_authenticate(user=self.candidat)
        self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        candidature = Candidature.objects.get(
            offre=self.offre, candidat=self.candidat
        )
        snapshot = candidature.profil_snapshot
        self.assertEqual(len(snapshot["experiences"]), 1)
        self.assertEqual(snapshot["experiences"][0]["titre_poste"], "Développeur Backend")
        self.assertEqual(snapshot["experiences"][0]["entreprise"], "SOMIZ")

    def test_HP4_snapshot_contient_formations(self):
        """HP4 : Le snapshot contient les formations du candidat."""
        self.client.force_authenticate(user=self.candidat)
        self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        candidature = Candidature.objects.get(
            offre=self.offre, candidat=self.candidat
        )
        snapshot = candidature.profil_snapshot
        self.assertEqual(len(snapshot["formations"]), 1)
        self.assertEqual(snapshot["formations"][0]["diplome"], "Master 2 ADSI")
        self.assertEqual(
            snapshot["formations"][0]["etablissement"], "Université Oran 1"
        )

    def test_HP5_snapshot_statique_apres_modification_profil(self):
        """HP5 : Le snapshot reste statique même si le profil est modifié après."""
        self.client.force_authenticate(user=self.candidat)
        self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )

        # Modifier le profil après postulation
        self.profil.titre_professionnel = "Titre Modifié Après Postulation"
        self.profil.wilaya = "16 - Alger"
        self.profil.save()

        # Le snapshot doit toujours avoir les anciennes valeurs
        candidature = Candidature.objects.get(
            offre=self.offre, candidat=self.candidat
        )
        snapshot = candidature.profil_snapshot
        self.assertEqual(
            snapshot["titre_professionnel"], "Ingénieur Full-Stack"
        )
        self.assertEqual(snapshot["wilaya"], "31 - Oran")

    def test_HP6_snapshot_statique_apres_ajout_experience(self):
        """HP6 : Le snapshot ne change pas si une expérience est ajoutée après."""
        self.client.force_authenticate(user=self.candidat)
        self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )

        # Ajouter une expérience après postulation
        ExperienceCandidat.objects.create(
            profil=self.profil,
            titre_poste="Nouveau Poste",
            entreprise="Nouvelle Entreprise",
            date_debut=datetime.date(2024, 1, 1),
        )

        candidature = Candidature.objects.get(
            offre=self.offre, candidat=self.candidat
        )
        # Le snapshot doit toujours avoir 1 seule expérience
        self.assertEqual(len(candidature.profil_snapshot["experiences"]), 1)

    # ==============================================
    # EDGE CASES
    # ==============================================

    def test_EC1_double_postulation_bloquee(self):
        """EC1 : Un candidat ne peut pas postuler deux fois à la même offre."""
        self.client.force_authenticate(user=self.candidat)
        self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        response = self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_EC2_snapshot_avec_profil_vide(self):
        """EC2 : Le snapshot fonctionne même si le profil est vide."""
        candidat_vide = User.objects.create_user(
            username="candidat_vide",
            email="vide@test.dz",
            password="Pass1234!",
            role="CANDIDAT"
        )
        ProfilCandidat.objects.get_or_create(user=candidat_vide)
        self.client.force_authenticate(user=candidat_vide)
        response = self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        candidature = Candidature.objects.get(
            offre=self.offre, candidat=candidat_vide
        )
        self.assertIsNotNone(candidature.profil_snapshot)
        self.assertEqual(candidature.profil_snapshot["experiences"], [])
        self.assertEqual(candidature.profil_snapshot["formations"], [])

    def test_EC3_non_authentifie_bloque(self):
        """EC3 : Un utilisateur non authentifié ne peut pas postuler."""
        response = self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_EC4_recruteur_ne_peut_pas_postuler(self):
        """EC4 : Un recruteur ne peut pas postuler à une offre."""
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.post(
            f"/api/jobs/{self.offre.id}/postuler/",
            {"lettre_motivation": ""},
            format="json"
        )
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)