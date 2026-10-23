"""Demandes d'ajout répétées (23/10/2026) : une seule demande ouverte par libellé, une seule ligne datée par
compte (`ArriveeDemandeur`), jamais de duplication, même quand la compétence est redemandée plusieurs fois."""
from datetime import timedelta

from django.utils import timezone

from jobs.demandes_ajout import creer_demande
from jobs.models import ArriveeDemandeur, DemandeAjout
from jobs.serializers.demande_ajout import DemandeAjoutAdminSerializer

from .test_demandes_ajout_service import ReferentielTestCase

D = DemandeAjout


class ArriveesDemandeursTests(ReferentielTestCase):
    def test_la_premiere_demande_enregistre_une_arrivee_datee(self):
        demande = self.demande('Word avancé', D.TYPE_COMPETENCE)

        arrivee = ArriveeDemandeur.objects.get(demande=demande)
        self.assertEqual(arrivee.utilisateur, self.candidat)
        self.assertLess(timezone.now() - arrivee.date_demande, timedelta(minutes=1))

    def test_la_meme_competence_redemandee_trois_fois_ne_cree_ni_demande_ni_ligne_en_plus(self):
        premiere = self.demande('Word avancé', D.TYPE_COMPETENCE)
        creer_demande(self.candidat, D.TYPE_COMPETENCE, 'Word avancé')
        creer_demande(self.candidat, D.TYPE_COMPETENCE, 'word  AVANCÉ')

        self.assertEqual(D.objects.filter(type=D.TYPE_COMPETENCE).count(), 1)
        self.assertEqual(ArriveeDemandeur.objects.filter(demande=premiere).count(), 1)

    def test_deux_comptes_distincts_rejoignent_la_meme_demande_avec_chacun_sa_date(self):
        premiere = self.demande('Word avancé', D.TYPE_COMPETENCE)
        _, deja = creer_demande(self.candidat2, D.TYPE_COMPETENCE, 'Word avancé')

        self.assertTrue(deja)
        self.assertEqual(D.objects.filter(type=D.TYPE_COMPETENCE).count(), 1)
        self.assertEqual(
            set(ArriveeDemandeur.objects.filter(demande=premiere).values_list('utilisateur_id', flat=True)),
            {self.candidat.pk, self.candidat2.pk},
        )
        self.assertEqual(premiere.demandeurs.count(), 2)

    def test_la_date_conservee_est_celle_de_la_premiere_demande(self):
        demande = self.demande('Word avancé', D.TYPE_COMPETENCE)
        ancienne = timezone.now() - timedelta(days=3)
        ArriveeDemandeur.objects.filter(demande=demande).update(date_demande=ancienne)

        creer_demande(self.candidat, D.TYPE_COMPETENCE, 'Word avancé')

        self.assertEqual(ArriveeDemandeur.objects.get(demande=demande).date_demande, ancienne)

    def test_le_serialiseur_admin_expose_la_date_de_chaque_demandeur(self):
        demande = self.demande('Word avancé', D.TYPE_COMPETENCE)
        creer_demande(self.candidat2, D.TYPE_COMPETENCE, 'Word avancé')

        donnees = DemandeAjoutAdminSerializer(
            D.objects.prefetch_related('demandeurs', 'arrivees').get(pk=demande.pk),
        ).data

        self.assertEqual(donnees['nb_demandeurs'], 2)
        self.assertTrue(all(d['date'] is not None for d in donnees['demandeurs_apercu']))
