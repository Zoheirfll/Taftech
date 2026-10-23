"""Doublons d'appellations dans un même métier (même `cle_recherche`) : une seule ligne est conservée,
les références candidat sont rattachées à elle, rien n'est supprimé en `--dry-run`. Les mêmes
appellations sur des métiers DIFFÉRENTS ne sont jamais touchées (ambiguïté réelle, à relire à la main)."""
import json
import os
import tempfile
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from jobs.doublons_appellations import detecter_doublons_appellations, supprimer_doublons_appellations
from jobs.models import Appellation, GroupeMetier, Metier, ProfilCandidat

User = get_user_model()


def _appel(metier, code, libelle="Buyer", type_alias="appellation_source", ambiguite=False, **extra):
    return Appellation.objects.create(
        code=code, metier=metier, libelle=libelle, cle_recherche=libelle.lower(),
        type_alias=type_alias, ambiguite=ambiguite, **extra)


class DoublonsAppellationsTests(TestCase):
    def setUp(self):
        groupe = GroupeMetier.objects.create(code="G-ACH", libelle="Achats", type_groupe="domaine_source")
        self.acheteur = Metier.objects.create(code="M-ACH", libelle="Acheteur", groupe_principal=groupe)
        self.autre = Metier.objects.create(code="M-LOG", libelle="Logisticien", groupe_principal=groupe)
        self.journal = []

    def _supprimer(self, **kw):
        return supprimer_doublons_appellations(self.journal.append, **kw)

    def test_garde_la_ligne_preferee_et_supprime_les_autres(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.acheteur, "APP-2")
        _appel(self.acheteur, "APPX-9", type_alias="preferent")
        self.assertEqual(self._supprimer(sauvegarder=False), 2)
        self.assertEqual(list(Appellation.objects.values_list("code", flat=True)), ["APPX-9"])

    def test_sans_ligne_preferee_garde_le_plus_petit_code(self):
        _appel(self.acheteur, "APP-6298")
        _appel(self.acheteur, "APP-6001")
        self._supprimer(sauvegarder=False)
        self.assertEqual(list(Appellation.objects.values_list("code", flat=True)), ["APP-6001"])

    def test_variante_de_casse_meme_cle_est_un_doublon(self):
        _appel(self.acheteur, "APP-1", libelle="SOC Analyst")
        Appellation.objects.create(code="APPX-2", metier=self.acheteur, libelle="SOC analyst",
                                   cle_recherche="soc analyst", type_alias="synonyme_editorial")
        self._supprimer(sauvegarder=False)
        self.assertEqual(Appellation.objects.count(), 1)

    def test_meme_libelle_sur_deux_metiers_n_est_jamais_touche(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.autre, "APP-2")
        self.assertEqual(self._supprimer(sauvegarder=False), 0)
        self.assertEqual(Appellation.objects.count(), 2)

    def test_si_une_ligne_est_ambigue_la_conservee_l_est_aussi(self):
        _appel(self.acheteur, "APP-1", ambiguite=True)
        _appel(self.acheteur, "APPX-2", type_alias="preferent", ambiguite=False)
        self._supprimer(sauvegarder=False)
        self.assertTrue(Appellation.objects.get(code="APPX-2").ambiguite)

    def test_dry_run_ne_supprime_rien(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.acheteur, "APP-2")
        self.assertEqual(self._supprimer(sauvegarder=False, appliquer=False), 1)
        self.assertEqual(Appellation.objects.count(), 2)

    def test_les_references_candidat_sont_rattachees_a_la_ligne_conservee(self):
        gardee = _appel(self.acheteur, "APP-1")
        doublon = _appel(self.acheteur, "APP-2")
        profil = ProfilCandidat.objects.create(
            user=User.objects.create_user(username="c", email="c@test.dz", role="CANDIDAT"),
            metier=self.acheteur, metier_appellation=doublon)
        self._supprimer(sauvegarder=False)
        profil.refresh_from_db()
        self.assertEqual(profil.metier_appellation_id, gardee.id)

    def test_idempotente(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.acheteur, "APP-2")
        self._supprimer(sauvegarder=False)
        self.assertEqual(self._supprimer(sauvegarder=False), 0)

    def test_detection_expose_conservee_et_supprimees(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.acheteur, "APP-2")
        ((conservee, doublons),) = detecter_doublons_appellations()
        self.assertEqual((conservee.code, [d.code for d in doublons]), ("APP-1", ["APP-2"]))

    def test_sauvegarde_json_ecrite_avant_suppression(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.acheteur, "APP-2")
        with tempfile.TemporaryDirectory() as dossier, override_settings(BASE_DIR=dossier):
            self._supprimer(sauvegarder=True)
            fichiers = os.listdir(os.path.join(dossier, "backups"))
            self.assertEqual(len(fichiers), 1)
            with open(os.path.join(dossier, "backups", fichiers[0]), encoding="utf-8") as f:
                contenu = json.load(f)
        self.assertEqual([a["code"] for a in contenu["appellations"]], ["APP-2"])

    def test_commande_dry_run_n_ecrit_rien(self):
        _appel(self.acheteur, "APP-1")
        _appel(self.acheteur, "APP-2")
        sortie = StringIO()
        call_command("supprimer_doublons_appellations", "--dry-run", stdout=sortie)
        self.assertEqual(Appellation.objects.count(), 2)
        self.assertIn("DRY-RUN", sortie.getvalue())
