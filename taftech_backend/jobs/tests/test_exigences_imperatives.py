"""S12 (REGLES_MATCHING) — exigences impératives de l'offre (permis, habilitation, droit
d'exercice...), à 3 états, jamais notées dans le score de matching. Un statut INCONNU déclenche
une vérification manuelle par le recruteur, jamais un rejet automatique de la candidature."""
import json
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import (
    ProfilCandidat, ProfilEntreprise, OffreEmploi, ExigenceImperative, ReponseExigence,
    Candidature,
)

User = get_user_model()


def _make_offre(**kwargs):
    username = kwargs.pop("username", "rec_exig")
    entreprise_user = User.objects.create_user(
        username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR",
    )
    entreprise = ProfilEntreprise.objects.create(
        user=entreprise_user, nom_entreprise=f"ExigCo-{username}", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    offre = OffreEmploi.objects.create(
        entreprise=entreprise, titre="Chauffeur livreur", wilaya="16 - Alger",
        experience_requise="DEBUTANT", statut_moderation="APPROUVEE",
    )
    return entreprise_user, entreprise, offre


def _make_entreprise_seule(username):
    """Sans offre pré-créée — pour tester la publication via l'API sans buter sur le quota
    d'offres actives (1 seule pour le palier Gratuit par défaut)."""
    entreprise_user = User.objects.create_user(
        username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR",
    )
    entreprise = ProfilEntreprise.objects.create(
        user=entreprise_user, nom_entreprise=f"ExigCo-{username}", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    return entreprise_user, entreprise


class ExigenceImperativeModelTest(TestCase):
    def test_creation_et_unicite_par_offre(self):
        _, _, offre = _make_offre()
        ExigenceImperative.objects.create(offre=offre, label="Permis B")
        with self.assertRaises(Exception):
            ExigenceImperative.objects.create(offre=offre, label="Permis B")

    def test_reponse_par_defaut_inconnu(self):
        _, _, offre = _make_offre()
        exigence = ExigenceImperative.objects.create(offre=offre, label="Permis B")
        cand_user = User.objects.create_user(username="cand_exig1", email="cand_exig1@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=cand_user)
        candidature = Candidature.objects.create(offre=offre, candidat=cand_user, statut='RECUE')
        reponse = ReponseExigence.objects.create(candidature=candidature, exigence=exigence)
        self.assertEqual(reponse.statut, 'INCONNU')


class SynchroniserExigencesOffreAPITest(APITestCase):
    """Le recruteur définit les exigences à la création/modification de l'offre — même pattern
    remplacement intégral que compétences structurées / couples diplôme+spécialité."""

    def setUp(self):
        self.rec_user, self.entreprise = _make_entreprise_seule("rec_exig_api")
        self.client.force_authenticate(user=self.rec_user)

    def test_creation_offre_avec_exigences(self):
        payload = {
            "titre": "Chauffeur", "wilaya": "16 - Alger", "type_contrat": "CDI",
            "experience_requise": "DEBUTANT", "description": "x",
            "exigences_imperatives": [
                {"label": "Permis B", "justificatif_requis": True},
                {"label": "Casier judiciaire vierge", "description": "Bulletin n°3", "justificatif_requis": False},
            ],
        }
        resp = self.client.post(reverse('creer-offre'), data=json.dumps(payload), content_type='application/json')
        self.assertEqual(resp.status_code, 201, resp.data)
        offre = OffreEmploi.objects.get(pk=resp.data['id'])
        self.assertEqual(offre.exigences_imperatives.count(), 2)
        permis = offre.exigences_imperatives.get(label="Permis B")
        self.assertTrue(permis.justificatif_requis)

    def test_modification_remplace_integralement(self):
        # EN_ATTENTE (pas APPROUVEE) — sinon seul `date_expiration` est modifiable, cf.
        # UpdateOffreRecruteurAPIView (règle inchangée, sans rapport avec S12).
        offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Chauffeur", wilaya="16 - Alger",
            experience_requise="DEBUTANT", statut_moderation="EN_ATTENTE",
        )
        ExigenceImperative.objects.create(offre=offre, label="Ancienne exigence")
        resp = self.client.patch(
            reverse('modifier-offre', args=[offre.id]),
            data=json.dumps({"exigences_imperatives": [{"label": "Permis B"}]}),
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        offre.refresh_from_db()
        labels = set(offre.exigences_imperatives.values_list('label', flat=True))
        self.assertEqual(labels, {"Permis B"})


class PostulerAvecExigencesAPITest(APITestCase):
    def setUp(self):
        self.rec_user, self.entreprise, self.offre = _make_offre(username="rec_exig_post")
        self.exigence_permis = ExigenceImperative.objects.create(offre=self.offre, label="Permis B")
        self.exigence_habilitation = ExigenceImperative.objects.create(offre=self.offre, label="Habilitation électrique")
        self.cand_user = User.objects.create_user(
            username="cand_exig_post", email="cand_exig_post@test.dz", password="pwd", role="CANDIDAT",
            nin="100000000000000002",  # exigé pour postuler (ANEM)
        )
        ProfilCandidat.objects.create(user=self.cand_user, wilaya="16 - Alger")
        self.client.force_authenticate(user=self.cand_user)

    def test_reponses_exigences_enregistrees_a_la_candidature(self):
        payload = {
            "reponses_exigences": json.dumps([
                {"exigence_id": self.exigence_permis.id, "statut": "SATISFAIT"},
                {"exigence_id": self.exigence_habilitation.id, "statut": "NON_SATISFAIT"},
            ]),
        }
        resp = self.client.post(reverse('postuler-offre', args=[self.offre.id]), data=payload)
        self.assertEqual(resp.status_code, 201, resp.data)
        candidature = Candidature.objects.get(offre=self.offre, candidat=self.cand_user)
        reponses = {r.exigence_id: r.statut for r in candidature.reponses_exigences.all()}
        self.assertEqual(reponses[self.exigence_permis.id], 'SATISFAIT')
        self.assertEqual(reponses[self.exigence_habilitation.id], 'NON_SATISFAIT')

    def test_exigence_sans_reponse_reste_tracee_inconnu(self):
        # T12-like : le candidat ne répond qu'à une seule des deux exigences — l'autre doit
        # rester tracée comme INCONNU (à vérifier), jamais silencieusement absente.
        payload = {
            "reponses_exigences": json.dumps([
                {"exigence_id": self.exigence_permis.id, "statut": "SATISFAIT"},
            ]),
        }
        resp = self.client.post(reverse('postuler-offre', args=[self.offre.id]), data=payload)
        self.assertEqual(resp.status_code, 201, resp.data)
        candidature = Candidature.objects.get(offre=self.offre, candidat=self.cand_user)
        reponses = {r.exigence_id: r.statut for r in candidature.reponses_exigences.all()}
        self.assertEqual(reponses[self.exigence_permis.id], 'SATISFAIT')
        self.assertEqual(reponses[self.exigence_habilitation.id], 'INCONNU')

    def test_statut_inconnu_ne_bloque_pas_la_candidature(self):
        # S12 : "inconnu provoque une vérification, pas un rejet automatique" — la candidature
        # doit être créée normalement (201), pas rejetée, même sans aucune réponse.
        resp = self.client.post(reverse('postuler-offre', args=[self.offre.id]), data={})
        self.assertEqual(resp.status_code, 201, resp.data)
        candidature = Candidature.objects.get(offre=self.offre, candidat=self.cand_user)
        self.assertEqual(candidature.reponses_exigences.count(), 2)
        self.assertTrue(all(r.statut == 'INCONNU' for r in candidature.reponses_exigences.all()))

    def test_exigence_id_etranger_a_loffre_ignoree(self):
        autre_offre = OffreEmploi.objects.create(
            entreprise=self.entreprise, titre="Autre", wilaya="16 - Alger",
            experience_requise="DEBUTANT", statut_moderation="APPROUVEE",
        )
        exigence_autre = ExigenceImperative.objects.create(offre=autre_offre, label="Autre exigence")
        payload = {
            "reponses_exigences": json.dumps([
                {"exigence_id": exigence_autre.id, "statut": "SATISFAIT"},
            ]),
        }
        resp = self.client.post(reverse('postuler-offre', args=[self.offre.id]), data=payload)
        self.assertEqual(resp.status_code, 201, resp.data)
        candidature = Candidature.objects.get(offre=self.offre, candidat=self.cand_user)
        self.assertEqual(candidature.reponses_exigences.filter(exigence=exigence_autre).count(), 0)


class MettreAJourReponseExigenceAPITest(APITestCase):
    def setUp(self):
        self.rec_user, self.entreprise, self.offre = _make_offre(username="rec_exig_verif")
        self.exigence = ExigenceImperative.objects.create(offre=self.offre, label="Permis B")
        self.cand_user = User.objects.create_user(username="cand_exig_verif", email="cand_exig_verif@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=self.cand_user)
        self.candidature = Candidature.objects.create(offre=self.offre, candidat=self.cand_user, statut='RECUE')
        self.reponse = ReponseExigence.objects.create(candidature=self.candidature, exigence=self.exigence, statut='INCONNU')

    def test_recruteur_verifie_manuellement_une_exigence_inconnue(self):
        self.client.force_authenticate(user=self.rec_user)
        url = reverse('maj-reponse-exigence', args=[self.candidature.id, self.exigence.id])
        resp = self.client.patch(url, data={"statut": "SATISFAIT"})
        self.assertEqual(resp.status_code, 200, resp.data)
        self.reponse.refresh_from_db()
        self.assertEqual(self.reponse.statut, 'SATISFAIT')

    def test_candidat_ne_peut_pas_verifier_lui_meme(self):
        self.client.force_authenticate(user=self.cand_user)
        url = reverse('maj-reponse-exigence', args=[self.candidature.id, self.exigence.id])
        resp = self.client.patch(url, data={"statut": "SATISFAIT"})
        self.assertEqual(resp.status_code, 403)

    def test_autre_entreprise_ne_peut_pas_verifier(self):
        autre_rec, _, _ = _make_offre(username="rec_exig_autre")
        self.client.force_authenticate(user=autre_rec)
        url = reverse('maj-reponse-exigence', args=[self.candidature.id, self.exigence.id])
        resp = self.client.patch(url, data={"statut": "SATISFAIT"})
        self.assertEqual(resp.status_code, 403)
