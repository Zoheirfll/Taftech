"""Le profil conserve l'APPELLATION choisie pour le métier actuel et pour le métier souhaité (« Développeur
web »), comme une expérience : le métier officiel qui la regroupe reste la seule clé du calcul."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from jobs.models import Appellation, GroupeMetier, Metier, ProfilCandidat
from jobs.serializers import ProfilCandidatDTO

User = get_user_model()


class AppellationProfilTests(TestCase):
    def setUp(self):
        groupe = GroupeMetier.objects.create(code="G-INFO", libelle="Informatique", type_groupe="domaine_source")
        self.dev = Metier.objects.create(code="M-DEV", libelle="Études et développement informatique", groupe_principal=groupe)
        self.paie = Metier.objects.create(code="M-PAIE", libelle="Gestionnaire de Paie", groupe_principal=groupe)
        self.web = Appellation.objects.create(code="A-WEB", libelle="Développeur web", metier=self.dev, cle_recherche="developpeur web")
        self.app_paie = Appellation.objects.create(code="A-PAIE", libelle="Gestionnaire de Paie", metier=self.paie, cle_recherche="gestionnaire de paie")
        self.profil = ProfilCandidat.objects.create(user=User.objects.create_user(username="cand", email="c@test.dz", role="CANDIDAT"))

    def _maj(self, donnees, premium=True):
        serializer = ProfilCandidatDTO(self.profil, data=donnees, partial=True, context={"is_premium": premium})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        return ProfilCandidatDTO(self.profil, context={"is_premium": premium}).data

    def test_le_metier_souhaite_conserve_l_appellation_choisie(self):
        data = self._maj({"metier_souhaite": self.dev.id, "metier_souhaite_appellation": self.web.id})
        self.assertEqual(data["metier_souhaite_libelle"], "Études et développement informatique")
        self.assertEqual(data["metier_souhaite_appellation_libelle"], "Développeur web")

    def test_le_metier_actuel_conserve_l_appellation_choisie(self):
        data = self._maj({"metier": self.dev.id, "metier_appellation": self.web.id})
        self.assertEqual(data["metier_appellation_libelle"], "Développeur web")

    def test_une_appellation_d_un_autre_metier_est_refusee(self):
        for champs in ({"metier_souhaite": self.dev.id, "metier_souhaite_appellation": self.app_paie.id},
                       {"metier": self.dev.id, "metier_appellation": self.app_paie.id}):
            serializer = ProfilCandidatDTO(self.profil, data=champs, partial=True)
            self.assertFalse(serializer.is_valid(), champs)

    def test_changer_de_metier_sans_appellation_efface_l_ancienne_appellation(self):
        self._maj({"metier_souhaite": self.dev.id, "metier_souhaite_appellation": self.web.id})
        data = self._maj({"metier_souhaite": self.paie.id})
        self.assertIsNone(data["metier_souhaite_appellation_libelle"])
        self.profil.refresh_from_db()
        self.assertIsNone(self.profil.metier_souhaite_appellation_id)

    def test_l_appellation_du_metier_actuel_est_masquee_avant_deblocage_comme_le_metier(self):
        self._maj({"metier": self.dev.id, "metier_appellation": self.web.id})
        masque = ProfilCandidatDTO(self.profil, context={"is_premium": False}).data
        self.assertIsNone(masque["metier_libelle"])
        self.assertIsNone(masque["metier_appellation_libelle"])
