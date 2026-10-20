"""Étape 1 des demandes d'ajout : une formation enregistrée en « Autre, préciser » crée ou rejoint une demande
d'ajout, vérifié sur les vraies routes d'enregistrement d'une formation du candidat."""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.models import (
    DemandeAjout, DiplomeSpecialite, DomaineFormation, FormationCandidat, ProfilCandidat, SpecialiteFormation, TypeDiplome,
)
from jobs.referentiel_utils import normaliser_recherche

User = get_user_model()
D = DemandeAjout


class FormationDemandesBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.licence = TypeDiplome.objects.create(code='D-LIC', libelle='Licence', systeme='superieur_lmd')
        self.autre = TypeDiplome.objects.create(code='D-AUTRE', libelle='Autre diplôme à préciser', systeme='autre')
        self.domaine = DomaineFormation.objects.create(code='DOM-1', libelle='Informatique', systeme='superieur_lmd')
        self.specialite = SpecialiteFormation.objects.create(
            code='SP-1', domaine=self.domaine, libelle='Génie logiciel', cle_recherche=normaliser_recherche('Génie logiciel'),
        )
        DiplomeSpecialite.objects.create(code='DS-1', diplome=self.licence, specialite=self.specialite)
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.profil = ProfilCandidat.objects.create(user=self.candidat)
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)
        self.url = reverse('profil-formations')
        self.client.force_authenticate(user=self.candidat)

    def poster(self, **champs):
        corps = {'diplome': 'Licence professionnelle', 'etablissement': 'Université Oran 1', 'statut': 'OBTENU', **champs}
        return self.client.post(self.url, corps, format='json')

    def modifier(self, formation, **champs):
        corps = {'diplome': formation.diplome, 'etablissement': formation.etablissement, 'statut': 'OBTENU', **champs}
        return self.client.put(reverse('profil-formation-detail', args=[formation.pk]), corps, format='json')


class DiplomeAutreTests(FormationDemandesBase):
    def test_autre_diplome_cree_une_demande_liee_a_la_formation(self):
        reponse = self.poster(diplome_ref=self.autre.pk)
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED, reponse.data)
        formation = FormationCandidat.objects.get()
        demande = D.objects.get()
        self.assertEqual((demande.type, demande.libelle, demande.explicite, demande.statut), ('DIPLOME', 'Licence professionnelle', True, 'A_EXAMINER'))
        self.assertEqual(list(demande.demandeurs.all()), [self.candidat])
        self.assertEqual(formation.demande_diplome, demande)

    def test_un_intitule_sans_type_de_diplome_ne_cree_aucune_demande(self):
        self.poster(diplome_ref=None)
        self.assertFalse(D.objects.exists())
        self.assertIsNone(FormationCandidat.objects.get().demande_diplome)

    def test_un_vrai_diplome_ne_cree_aucune_demande(self):
        self.poster(diplome_ref=self.licence.pk)
        self.assertFalse(D.objects.exists())
        self.assertIsNone(FormationCandidat.objects.get().demande_diplome)

    def test_un_texte_trop_court_ne_cree_rien_et_la_formation_est_enregistree(self):
        reponse = self.poster(diplome='ab', diplome_ref=self.autre.pk)
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertFalse(D.objects.exists())
        self.assertEqual(FormationCandidat.objects.count(), 1)

    def test_deux_candidats_avec_le_meme_texte_rejoignent_la_meme_demande(self):
        self.poster(diplome_ref=self.autre.pk)
        autre_candidat = User.objects.create_user(username='cand2', email='cand2@test.dz', role='CANDIDAT')
        ProfilCandidat.objects.create(user=autre_candidat)
        self.client.force_authenticate(user=autre_candidat)
        self.poster(diplome='LICENCE professionnelle', diplome_ref=self.autre.pk)
        demande = D.objects.get()
        self.assertEqual(demande.demandeurs.count(), 2)
        self.assertEqual(FormationCandidat.objects.filter(demande_diplome=demande).count(), 2)

    def test_choisir_un_vrai_diplome_detache_la_formation_de_la_demande(self):
        self.poster(diplome_ref=self.autre.pk)
        formation = FormationCandidat.objects.get()
        self.modifier(formation, diplome='Licence', diplome_ref=self.licence.pk)
        formation.refresh_from_db()
        self.assertIsNone(formation.demande_diplome)
        self.assertEqual(D.objects.get().statut, 'A_EXAMINER')

    def test_modifier_un_autre_champ_conserve_le_lien(self):
        self.poster(diplome_ref=self.autre.pk)
        formation = FormationCandidat.objects.get()
        demande = D.objects.get()
        self.modifier(formation, diplome_ref=self.autre.pk, etablissement='Université d’Alger')
        formation.refresh_from_db()
        self.assertEqual(formation.demande_diplome, demande)
        self.assertEqual(D.objects.count(), 1)

    def test_la_decision_de_l_admin_met_a_jour_la_formation_de_bout_en_bout(self):
        self.poster(diplome_ref=self.autre.pk)
        demande = D.objects.get()
        self.client.force_authenticate(user=self.admin)
        reponse = self.client.post(
            reverse('admin-demande-ajout-rattacher', args=[demande.pk]), {'entree_id': self.licence.pk}, format='json',
        )
        self.assertEqual(reponse.status_code, 200, reponse.data)
        formation = FormationCandidat.objects.get()
        self.assertEqual(formation.diplome_ref, self.licence)
        self.assertEqual(formation.statut_validation, 'DECLARE')

    def test_le_sixieme_diplome_en_attente_est_enregistre_sans_demande(self):
        for i in range(6):
            reponse = self.poster(diplome=f'Diplôme maison numéro {chr(97 + i)}', diplome_ref=self.autre.pk)
            self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FormationCandidat.objects.count(), 6)
        self.assertEqual(D.objects.count(), 5)


class SpecialiteAutreTests(FormationDemandesBase):
    def test_autre_specialite_cree_une_demande_avec_le_diplome_en_contexte(self):
        self.poster(diplome='Licence', diplome_ref=self.licence.pk, specialite_autre='Cybersécurité', description='Cybersécurité')
        formation = FormationCandidat.objects.get()
        demande = D.objects.get()
        self.assertEqual((demande.type, demande.libelle, demande.contexte), ('SPECIALITE', 'Cybersécurité', 'Licence'))
        self.assertEqual(formation.demande_specialite, demande)
        self.assertIsNone(formation.demande_diplome)

    def test_une_specialite_choisie_dans_la_liste_ne_cree_rien(self):
        self.poster(
            diplome='Licence', diplome_ref=self.licence.pk, specialite_ref=self.specialite.pk,
            specialite_autre='Cybersécurité', description='Génie logiciel',
        )
        self.assertFalse(D.objects.exists())

    def test_modifier_un_autre_champ_conserve_le_lien_de_specialite(self):
        self.poster(diplome='Licence', diplome_ref=self.licence.pk, specialite_autre='Cybersécurité', description='Cybersécurité')
        formation = FormationCandidat.objects.get()
        demande = D.objects.get()
        self.modifier(formation, diplome_ref=self.licence.pk, description='Cybersécurité', etablissement='Université d’Alger')
        formation.refresh_from_db()
        self.assertEqual(formation.demande_specialite, demande)

    def test_choisir_ensuite_une_vraie_specialite_detache_la_formation(self):
        self.poster(diplome='Licence', diplome_ref=self.licence.pk, specialite_autre='Cybersécurité', description='Cybersécurité')
        formation = FormationCandidat.objects.get()
        self.modifier(formation, diplome_ref=self.licence.pk, specialite_ref=self.specialite.pk, description='Génie logiciel')
        formation.refresh_from_db()
        self.assertIsNone(formation.demande_specialite)

    def test_accepter_la_specialite_met_a_jour_la_formation(self):
        self.poster(diplome='Licence', diplome_ref=self.licence.pk, specialite_autre='Cybersécurité', description='Cybersécurité')
        demande = D.objects.get()
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            reverse('admin-demande-ajout-accepter', args=[demande.pk]),
            {'parent': self.domaine.pk, 'diplomes_ids': [self.licence.pk]}, format='json',
        )
        formation = FormationCandidat.objects.get()
        self.assertEqual(formation.specialite_ref.code, f'TAF-SPE-{demande.pk}')

    def test_une_formation_importee_a_preciser_devient_une_demande_de_specialite(self):
        """Parité avec l'ancienne file « Formations à vérifier » : sans texte « Autre » envoyé par le formulaire,
        une formation à préciser à cause de sa spécialité devient quand même une demande."""
        formation = FormationCandidat.objects.create(
            profil=self.profil, diplome='Licence', etablissement='Université', diplome_ref=self.licence,
            specialite_texte='Cybersécurité', statut='OBTENU',
        )
        self.assertEqual(formation.statut_validation, 'A_PRECISER')
        self.modifier(formation, diplome='Licence', diplome_ref=self.licence.pk, specialite_texte='Cybersécurité')
        demande = D.objects.get()
        self.assertEqual((demande.type, demande.libelle), ('SPECIALITE', 'Cybersécurité'))


class RobustesseTests(FormationDemandesBase):
    def test_un_echec_de_synchronisation_n_empeche_pas_l_enregistrement(self):
        with mock.patch('jobs.demandes_ajout.synchroniser_depuis_formation', side_effect=RuntimeError('panne')):
            reponse = self.poster(diplome_ref=self.autre.pk)
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FormationCandidat.objects.count(), 1)

    def test_seul_un_candidat_peut_enregistrer_une_formation(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.poster(diplome_ref=self.autre.pk).status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(D.objects.exists())
