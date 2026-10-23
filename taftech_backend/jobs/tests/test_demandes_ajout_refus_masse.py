"""Refus en masse de demandes d'ajout (23/10/2026) : même chemin que le refus unitaire (statut, motif, notification,
audit), vérifié sur la vraie route avec les vrais droits."""
from django.urls import reverse
from rest_framework import status

from jobs.models import AuditLog, DemandeAjout, Notification

from .test_demandes_ajout_api import ApiBase

D = DemandeAjout


class RefusEnMasseTests(ApiBase):
    def setUp(self):
        super().setUp()
        self.url = reverse('admin-demandes-ajout-refuser-en-masse')
        demandes = [self.demande(f"Compétence {nom}", 'COMPETENCE') for nom in ('alpha', 'bravo', 'charlie')]
        self.ids = [d.id for d in demandes]
        self.client.force_authenticate(user=self.admin)

    def refuser(self, ids=None, motif="Trop vague pour le référentiel"):
        return self.client.post(self.url, {'ids': self.ids if ids is None else ids, 'motif': motif}, format='json')

    def test_refuse_toutes_les_demandes_selectionnees(self):
        reponse = self.refuser()
        self.assertEqual(reponse.status_code, status.HTTP_200_OK)
        self.assertEqual(reponse.data['refusees'], 3)
        self.assertEqual(D.objects.filter(statut=D.STATUT_REFUSEE).count(), 3)
        self.assertEqual(set(D.objects.values_list('motif_refus', flat=True)), {"Trop vague pour le référentiel"})

    def test_une_trace_d_audit_par_demande(self):
        self.refuser()
        self.assertEqual(AuditLog.objects.filter(action='DECISION_DEMANDE_AJOUT', detail__contains='en masse').count(), 3)

    def test_le_motif_est_obligatoire_et_rien_n_est_refuse_sans_lui(self):
        reponse = self.refuser(motif="  ")
        self.assertEqual(reponse.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(D.objects.filter(statut=D.STATUT_REFUSEE).count(), 0)

    def test_une_demande_deja_decidee_est_signalee_sans_bloquer_les_autres(self):
        D.objects.filter(pk=self.ids[0]).update(statut=D.STATUT_ACCEPTEE)
        reponse = self.refuser()
        self.assertEqual(reponse.data['refusees'], 2)
        self.assertEqual([i['id'] for i in reponse.data['ignorees']], [self.ids[0]])
        self.assertEqual(D.objects.get(pk=self.ids[0]).statut, D.STATUT_ACCEPTEE)

    def test_identifiants_inconnus_comptes(self):
        reponse = self.refuser(ids=self.ids + [999999])
        self.assertEqual(reponse.data['introuvables'], 1)

    def test_selection_vide_ou_trop_grande_refusee(self):
        self.assertEqual(self.refuser(ids=[]).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.refuser(ids=list(range(1, 102))).status_code, status.HTTP_400_BAD_REQUEST)

    def test_identifiants_invalides_refuses(self):
        self.assertEqual(self.refuser(ids=['abc']).status_code, status.HTTP_400_BAD_REQUEST)

    def test_le_demandeur_est_notifie_du_motif(self):
        self.refuser()
        self.assertTrue(Notification.objects.filter(destinataire=self.candidat, message__contains="Trop vague").exists())

    def test_reserve_aux_administrateurs(self):
        for utilisateur in (self.candidat, self.rh):
            self.client.force_authenticate(user=utilisateur)
            self.assertEqual(self.refuser().status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.refuser().status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(D.objects.filter(statut=D.STATUT_REFUSEE).count(), 0)
