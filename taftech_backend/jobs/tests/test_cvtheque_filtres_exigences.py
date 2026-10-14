"""Correction client n°19 : les filtres CVthèque permis / véhicule / passeport / situation militaire
ne s'appliquent que si l'offre choisie déclare l'exigence correspondante."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import (
    AbonnementEntreprise, ExigenceImperative, OffreEmploi, Palier, ProfilCandidat, ProfilEntreprise,
)
from jobs.serializers import OffreEmploiSerializer
from jobs.views.offres import _synchroniser_exigences_offre

User = get_user_model()


def _palier_business():
    palier, _ = Palier.objects.get_or_create(
        nom='BUSINESS',
        defaults=dict(acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True, ordre=3),
    )
    return palier


def _entreprise(email, nom, rc):
    rh = User.objects.create_user(username=email, email=email, role='RECRUTEUR', consentement_cvtheque=True)
    entreprise = ProfilEntreprise.objects.create(user=rh, nom_entreprise=nom, registre_commerce=rc, est_approuvee=True)
    AbonnementEntreprise.objects.create(
        entreprise=entreprise, palier=_palier_business(), date_expiration=timezone.now() + timedelta(days=30),
    )
    return rh, entreprise


def _offre(entreprise, titre="Chauffeur"):
    return OffreEmploi.objects.create(
        entreprise=entreprise, titre=titre, wilaya="16 - Alger", diplome="MASTER", experience_requise="3_5",
        type_contrat="CDI", statut_moderation="APPROUVEE", est_active=True, est_cloturee=False,
    )


class FiltresLiesALOffreTests(APITestCase):
    def setUp(self):
        self.rh, self.entreprise = _entreprise("rh_f@test.com", "FiltreCorp", "RC_F")
        self.avec = User.objects.create_user(username="avec", email="avec@test.com", role="CANDIDAT")
        self.sans = User.objects.create_user(username="sans", email="sans@test.com", role="CANDIDAT")
        ProfilCandidat.objects.create(
            user=self.avec, wilaya="16 - Alger", permis_conduire=True, vehicule_personnel=True,
            passeport_valide=True, service_militaire='DEGAGE',
        )
        ProfilCandidat.objects.create(
            user=self.sans, wilaya="16 - Alger", permis_conduire=False, vehicule_personnel=False,
            passeport_valide=False, service_militaire='SURSITAIRE',
        )
        self.offre = _offre(self.entreprise)
        self.client.force_authenticate(user=self.rh)

    def _exigence(self, categorie, offre=None):
        return ExigenceImperative.objects.create(
            offre=offre or self.offre, label=f"Exigence {categorie}", categorie=categorie,
        )

    def _ids(self, response):
        return {item['user_id'] for item in response.data['results']}

    def _chercher(self, **params):
        return self.client.get(reverse('cvtheque'), params)

    def test_sans_offre_les_filtres_sont_ignores(self):
        response = self._chercher(permis='true', vehicule='true', passeport='true', service_militaire='DEGAGE')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(response), {self.avec.id, self.sans.id})
        self.assertEqual(response.data['filtres_exigence_autorises'], [])

    def test_offre_sans_exigence_les_filtres_sont_ignores(self):
        response = self._chercher(offre_id=self.offre.pk, permis='true')
        self.assertEqual(self._ids(response), {self.avec.id, self.sans.id})
        self.assertEqual(response.data['filtres_exigence_autorises'], [])

    def test_offre_declarant_le_permis_applique_le_filtre_permis(self):
        self._exigence('PERMIS_CONDUIRE')
        response = self._chercher(offre_id=self.offre.pk, permis='true')
        self.assertEqual(self._ids(response), {self.avec.id})
        self.assertEqual(response.data['filtres_exigence_autorises'], ['permis'])

    def test_un_filtre_non_declare_reste_ignore_meme_envoye_a_la_main(self):
        self._exigence('PERMIS_CONDUIRE')
        response = self._chercher(offre_id=self.offre.pk, vehicule='true', passeport='true', service_militaire='DEGAGE')
        self.assertEqual(self._ids(response), {self.avec.id, self.sans.id})

    def test_chaque_categorie_ouvre_son_filtre(self):
        for categorie, params, attendu in (
            ('VEHICULE', {'vehicule': 'true'}, 'vehicule'),
            ('PASSEPORT', {'passeport': 'true'}, 'passeport'),
            ('SERVICE_NATIONAL', {'service_militaire': 'DEGAGE'}, 'service_militaire'),
        ):
            with self.subTest(categorie=categorie):
                offre = _offre(self.entreprise, titre=f"Poste {categorie}")
                self._exigence(categorie, offre=offre)
                response = self._chercher(offre_id=offre.pk, **params)
                self.assertEqual(self._ids(response), {self.avec.id})
                self.assertEqual(response.data['filtres_exigence_autorises'], [attendu])

    def test_offre_d_une_autre_entreprise_n_autorise_aucun_filtre(self):
        _autre_rh, autre_entreprise = _entreprise("autre@test.com", "AutreCorp", "RC_A")
        offre_autre = _offre(autre_entreprise, titre="Autre")
        self._exigence('PERMIS_CONDUIRE', offre=offre_autre)
        response = self._chercher(offre_id=offre_autre.pk, permis='true')
        self.assertEqual(self._ids(response), {self.avec.id, self.sans.id})
        self.assertEqual(response.data['filtres_exigence_autorises'], [])

    def test_offre_id_invalide_ne_plante_pas(self):
        response = self._chercher(offre_id='abc', permis='true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(response), {self.avec.id, self.sans.id})


class CategorieExigenceTests(APITestCase):
    def setUp(self):
        _rh, entreprise = _entreprise("rh_c@test.com", "CatCorp", "RC_C")
        self.offre = _offre(entreprise)

    def test_categorie_enregistree_et_exposee(self):
        _synchroniser_exigences_offre(self.offre, [
            {'label': 'Permis B', 'categorie': 'PERMIS_CONDUIRE'},
            {'label': 'Habilitation électrique'},
        ])
        categories = dict(self.offre.exigences_imperatives.values_list('label', 'categorie'))
        self.assertEqual(categories, {'Permis B': 'PERMIS_CONDUIRE', 'Habilitation électrique': 'AUTRE'})
        exposees = {e['label']: e['categorie'] for e in OffreEmploiSerializer(self.offre).data['exigences_imperatives']}
        self.assertEqual(exposees['Permis B'], 'PERMIS_CONDUIRE')

    def test_categorie_inconnue_devient_autre(self):
        _synchroniser_exigences_offre(self.offre, [{'label': 'X', 'categorie': 'N_IMPORTE_QUOI'}])
        self.assertEqual(self.offre.exigences_imperatives.get(label='X').categorie, 'AUTRE')


class FiltresSansClassementTests(APITestCase):
    """`offre_filtres_id` autorise les filtres sans déclencher le classement par compatibilité,
    donc sans exiger le palier Pro+ (un recruteur Starter doit pouvoir les utiliser)."""

    def setUp(self):
        self.rh = User.objects.create_user(
            username="starter@test.com", email="starter@test.com", role='RECRUTEUR', consentement_cvtheque=True,
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.rh, nom_entreprise="StarterCorp", registre_commerce="RC_S", est_approuvee=True,
        )
        palier, _ = Palier.objects.get_or_create(
            nom='STARTER',
            defaults=dict(acces_coordonnees=False, acces_ia_recommandes=False, acces_ia_avancee=False, ordre=1),
        )
        AbonnementEntreprise.objects.create(
            entreprise=self.entreprise, palier=palier, date_expiration=timezone.now() + timedelta(days=30),
        )
        self.avec = User.objects.create_user(username="s_avec", email="s_avec@test.com", role="CANDIDAT")
        self.sans = User.objects.create_user(username="s_sans", email="s_sans@test.com", role="CANDIDAT")
        ProfilCandidat.objects.create(user=self.avec, wilaya="16 - Alger", permis_conduire=True)
        ProfilCandidat.objects.create(user=self.sans, wilaya="16 - Alger", permis_conduire=False)
        self.offre = _offre(self.entreprise)
        ExigenceImperative.objects.create(offre=self.offre, label="Permis B", categorie='PERMIS_CONDUIRE')
        self.client.force_authenticate(user=self.rh)

    def test_starter_filtre_avec_offre_filtres_id_sans_classement(self):
        response = self.client.get(reverse('cvtheque'), {'offre_filtres_id': self.offre.pk, 'permis': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({i['user_id'] for i in response.data['results']}, {self.avec.id})
        self.assertEqual(response.data['filtres_exigence_autorises'], ['permis'])
        self.assertNotIn('score_offre', response.data['results'][0])

    def test_starter_reste_refuse_pour_le_classement_par_offre_id(self):
        response = self.client.get(reverse('cvtheque'), {'offre_id': self.offre.pk})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_offre_filtres_id_d_une_autre_entreprise_est_ignoree(self):
        _autre_rh, autre_entreprise = _entreprise("autre_s@test.com", "AutreS", "RC_AS")
        offre_autre = _offre(autre_entreprise, titre="Autre")
        ExigenceImperative.objects.create(offre=offre_autre, label="Permis B", categorie='PERMIS_CONDUIRE')
        response = self.client.get(reverse('cvtheque'), {'offre_filtres_id': offre_autre.pk, 'permis': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual({i['user_id'] for i in response.data['results']}, {self.avec.id, self.sans.id})
        self.assertEqual(response.data['filtres_exigence_autorises'], [])

    def test_offre_filtres_id_prime_sur_offre_id_pour_les_filtres(self):
        sans_exigence = _offre(self.entreprise, titre="Sans exigence")
        response = self.client.get(reverse('cvtheque'), {'offre_filtres_id': sans_exigence.pk, 'permis': 'true'})
        self.assertEqual(response.data['filtres_exigence_autorises'], [])
        self.assertEqual({i['user_id'] for i in response.data['results']}, {self.avec.id, self.sans.id})
