"""Un métier proposé (« Je ne trouve pas mon métier ») reste sélectionné sur l'expérience et le profil du
candidat en attendant la décision de l'admin (21/10/2026), comme une spécialité « Autre » sur une formation :
jamais un critère de calcul tant qu'il n'est pas accepté, vérifié sur les vraies routes du candidat."""
from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from jobs.demandes_ajout import accepter_demande, creer_demande, rattacher_demande, refuser_demande
from jobs.models import DemandeAjout, ExperienceCandidat, ProfilCandidat
from jobs.serializers.profils import ProfilCandidatDTO
from jobs.tests.test_demandes_ajout_metiers import _referentiel

User = get_user_model()
D = DemandeAjout


class MetierProposeBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.groupe, self.metier = _referentiel()
        self.candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        self.profil = ProfilCandidat.objects.create(user=self.candidat)
        self.autre_candidat = User.objects.create_user(username='autre', email='autre@test.dz', role='CANDIDAT')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=self.candidat)

    def demande(self, libelle='Technicien drone', utilisateur=None, type_demande='METIER'):
        return creer_demande(utilisateur or self.candidat, type_demande, libelle)[0]

    def poster_experience(self, **champs):
        corps = {'titre_poste': 'Pilote de drone', 'entreprise': 'Société X', 'date_debut': '2023-01-01', **champs}
        return self.client.post(reverse('profil-experiences'), corps, format='json')

    def experience_en_attente(self, demande):
        reponse = self.poster_experience(demande_metier=demande.pk)
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED, reponse.data)
        return ExperienceCandidat.objects.get(pk=reponse.data['id'])


class ExperienceMetierProposeTests(MetierProposeBase):
    def test_experience_enregistree_avec_une_demande_garde_le_lien_sans_metier(self):
        demande = self.demande()
        reponse = self.poster_experience(demande_metier=demande.pk)
        self.assertEqual(reponse.status_code, status.HTTP_201_CREATED, reponse.data)
        experience = ExperienceCandidat.objects.get()
        self.assertEqual((experience.demande_metier, experience.metier), (demande, None))
        self.assertEqual(
            reponse.data['metier_propose'],
            {'id': demande.pk, 'libelle': 'Technicien drone', 'statut': 'A_EXAMINER', 'motif_refus': ''},
        )

    def test_demande_d_un_autre_compte_refusee(self):
        demande = self.demande(utilisateur=self.autre_candidat)
        reponse = self.poster_experience(demande_metier=demande.pk)
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(ExperienceCandidat.objects.exists())

    def test_demande_d_un_autre_type_refusee(self):
        demande = self.demande(libelle='Soudage laser', type_demande='COMPETENCE')
        reponse = self.poster_experience(demande_metier=demande.pk)
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_choisir_un_vrai_metier_retire_la_demande(self):
        experience = self.experience_en_attente(self.demande())
        reponse = self.client.put(
            reverse('profil-experience-detail', args=[experience.pk]),
            {'titre_poste': experience.titre_poste, 'entreprise': experience.entreprise,
             'date_debut': '2023-01-01', 'metier': self.metier.pk},
            format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_200_OK, reponse.data)
        experience.refresh_from_db()
        self.assertEqual((experience.metier, experience.demande_metier), (self.metier, None))
        self.assertIsNone(reponse.data['metier_propose'])

    def test_proposer_remplace_le_metier_choisi_auparavant(self):
        experience = ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste='Pilote', entreprise='X', date_debut=date(2022, 1, 1), metier=self.metier,
        )
        demande = self.demande()
        reponse = self.client.put(
            reverse('profil-experience-detail', args=[experience.pk]),
            {'titre_poste': 'Pilote', 'entreprise': 'X', 'date_debut': '2022-01-01', 'demande_metier': demande.pk},
            format='json',
        )
        self.assertEqual(reponse.status_code, status.HTTP_200_OK, reponse.data)
        experience.refresh_from_db()
        self.assertEqual((experience.metier, experience.demande_metier), (None, demande))

    def test_retirer_la_proposition(self):
        experience = self.experience_en_attente(self.demande())
        self.client.put(
            reverse('profil-experience-detail', args=[experience.pk]),
            {'titre_poste': 'Pilote', 'entreprise': 'X', 'date_debut': '2023-01-01', 'demande_metier': None},
            format='json',
        )
        experience.refresh_from_db()
        self.assertIsNone(experience.demande_metier)

    def test_une_modification_sans_toucher_au_metier_conserve_la_demande(self):
        experience = self.experience_en_attente(self.demande())
        self.client.put(
            reverse('profil-experience-detail', args=[experience.pk]),
            {'titre_poste': 'Pilote de drones', 'entreprise': 'X', 'date_debut': '2023-01-01'},
            format='json',
        )
        experience.refresh_from_db()
        self.assertIsNotNone(experience.demande_metier)


class DecisionAdminTests(MetierProposeBase):
    def test_accepter_pose_le_metier_officiel_et_retire_le_lien(self):
        demande = self.demande()
        experience = self.experience_en_attente(demande)
        self.profil.demande_metier = demande
        self.profil.demande_metier_souhaite = demande
        self.profil.save()
        accepter_demande(demande, self.admin, parent=self.groupe.pk)
        experience.refresh_from_db()
        self.profil.refresh_from_db()
        nouveau = experience.metier
        self.assertEqual(nouveau.libelle, 'Technicien drone')
        self.assertIsNone(experience.demande_metier)
        self.assertEqual(experience.appellation.libelle, 'Technicien drone')
        self.assertEqual((self.profil.metier, self.profil.metier_souhaite), (nouveau, nouveau))
        self.assertEqual((self.profil.demande_metier, self.profil.demande_metier_souhaite), (None, None))
        self.assertEqual(self.profil.metier_appellation.libelle, 'Technicien drone')

    def test_rattacher_pose_le_metier_existant(self):
        demande = self.demande()
        experience = self.experience_en_attente(demande)
        rattacher_demande(demande, self.admin, self.metier.pk)
        experience.refresh_from_db()
        self.assertEqual((experience.metier, experience.demande_metier), (self.metier, None))

    def test_refuser_garde_le_lien_sans_metier_et_expose_le_motif(self):
        demande = self.demande()
        experience = self.experience_en_attente(demande)
        refuser_demande(demande, self.admin, "Intitulé trop spécifique pour le référentiel.")
        experience.refresh_from_db()
        self.assertEqual((experience.metier, experience.demande_metier), (None, demande))
        reponse = self.client.get(reverse('profil-candidat'))
        propose = reponse.data['experiences_detail'][0]['metier_propose']
        self.assertEqual(propose['statut'], 'REFUSEE')
        self.assertIn('trop spécifique', propose['motif_refus'])

    def test_les_experiences_des_autres_candidats_ne_sont_pas_touchees(self):
        demande = self.demande()
        autre_profil = ProfilCandidat.objects.create(user=self.autre_candidat)
        autre = ExperienceCandidat.objects.create(
            profil=autre_profil, titre_poste='Autre', entreprise='Y', date_debut=date(2020, 1, 1))
        accepter_demande(demande, self.admin, parent=self.groupe.pk)
        autre.refresh_from_db()
        self.assertIsNone(autre.metier)


class ProfilMetierProposeTests(MetierProposeBase):
    def test_metier_souhaite_propose_reste_selectionne_sans_etre_un_critere(self):
        demande = self.demande()
        self.profil.metier_souhaite = self.metier
        self.profil.save()
        reponse = self.client.put(reverse('profil-candidat'), {'demande_metier_souhaite': demande.pk}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_200_OK, reponse.data)
        self.profil.refresh_from_db()
        self.assertEqual((self.profil.metier_souhaite, self.profil.demande_metier_souhaite), (None, demande))
        self.assertEqual(reponse.data['profil']['metier_souhaite_propose']['libelle'], 'Technicien drone')

    def test_demande_d_un_autre_compte_refusee_sur_le_profil(self):
        demande = self.demande(utilisateur=self.autre_candidat)
        reponse = self.client.put(reverse('profil-candidat'), {'demande_metier': demande.pk}, format='json')
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.profil.refresh_from_db()
        self.assertIsNone(self.profil.demande_metier)

    def test_le_metier_propose_n_est_jamais_expose_aux_recruteurs(self):
        demande = self.demande()
        self.profil.demande_metier = demande
        self.profil.save()
        donnees = ProfilCandidatDTO(self.profil, context={'is_premium': True}).data
        for cle in ('demande_metier', 'demande_metier_souhaite', 'metier_propose', 'metier_souhaite_propose'):
            self.assertNotIn(cle, donnees)

    def test_la_cvtheque_d_un_recruteur_ne_montre_jamais_un_metier_propose(self):
        """Vraie route recruteur (CVthèque), pas seulement le sérialiseur : ni l'objet, ni le libellé proposé."""
        from datetime import timedelta
        from django.utils import timezone
        from jobs.models import AbonnementEntreprise, Palier, ProfilEntreprise

        demande = self.demande('Technicien drone')
        self.profil.demande_metier = demande
        self.profil.demande_metier_souhaite = demande
        self.profil.visible_cvtheque = True
        self.profil.titre_professionnel = 'Pilote'
        self.profil.save()
        ExperienceCandidat.objects.create(
            profil=self.profil, titre_poste='Pilote', entreprise='Société X', date_debut=date(2022, 1, 1),
            demande_metier=demande,
        )
        self.candidat.consentement_cvtheque = True
        self.candidat.save()

        recruteur = User.objects.create_user(
            username='rh', email='rh@test.dz', role='RECRUTEUR', consentement_cvtheque=True)
        entreprise = ProfilEntreprise.objects.create(
            user=recruteur, nom_entreprise='CVCorp', registre_commerce='RC_CV', est_approuvee=True)
        palier, _ = Palier.objects.get_or_create(
            nom='BUSINESS',
            defaults=dict(acces_coordonnees=True, acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True, ordre=3),
        )
        AbonnementEntreprise.objects.create(
            entreprise=entreprise, palier=palier, date_expiration=timezone.now() + timedelta(days=30))

        self.client.force_authenticate(user=recruteur)
        reponse = self.client.get(reverse('cvtheque'))
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        corps = reponse.content.decode('utf-8')
        self.assertIn('Pilote', corps)  # le profil est bien dans la liste : le test n'est pas vide
        self.assertNotIn('metier_propose', corps)
        self.assertNotIn('Technicien drone', corps)

    def test_le_matching_ne_lit_jamais_les_demandes(self):
        from pathlib import Path
        import jobs.matcher as matcher
        self.assertNotIn('demande_metier', Path(matcher.__file__).read_text(encoding='utf-8'))
