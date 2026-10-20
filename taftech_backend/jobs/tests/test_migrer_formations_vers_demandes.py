"""Commande `migrer_formations_vers_demandes` : simulation par défaut, sauvegarde JSON avant toute écriture,
création des demandes pour les formations « Autre diplôme » / sans diplôme / à spécialité non résolue, idempotence."""
import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings

from jobs.models import (
    DemandeAjout, DiplomeSpecialite, DomaineFormation, FormationCandidat, ProfilCandidat, SpecialiteFormation, TypeDiplome,
)
from jobs.referentiel_utils import normaliser_recherche

User = get_user_model()


class MigrerFormationsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.licence = TypeDiplome.objects.create(code='D-LIC', libelle='Licence', systeme='superieur_lmd')
        self.autre = TypeDiplome.objects.create(code='D-AUTRE', libelle='Autre diplôme à préciser', systeme='autre')
        domaine = DomaineFormation.objects.create(code='DOM-1', libelle='Informatique', systeme='superieur_lmd')
        self.specialite = SpecialiteFormation.objects.create(
            code='SP-1', domaine=domaine, libelle='Génie logiciel', cle_recherche=normaliser_recherche('Génie logiciel'),
        )
        DiplomeSpecialite.objects.create(code='DS-1', diplome=self.licence, specialite=self.specialite)
        candidat = User.objects.create_user(username='cand', email='cand@test.dz', role='CANDIDAT')
        profil = ProfilCandidat.objects.create(user=candidat)

        def formation(diplome, **champs):
            return FormationCandidat.objects.create(
                profil=profil, diplome=diplome, etablissement='Université', statut='OBTENU', **champs,
            )

        self.f_autre = formation('Licence pro', diplome_ref=self.autre)
        self.f_sans_ref = formation('Master maison')
        self.f_specialite = formation('Licence', diplome_ref=self.licence, specialite_texte='Cybersécurité')
        self.f_complete = formation('Licence', diplome_ref=self.licence, specialite_ref=self.specialite, description='Génie logiciel')
        self.f_trop_courte = formation('ab', diplome_ref=self.autre)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name) / 'taftech_backend'
        self.base.mkdir()

    def lancer(self, *arguments):
        sortie = StringIO()
        with override_settings(BASE_DIR=str(self.base)):
            call_command('migrer_formations_vers_demandes', *arguments, stdout=sortie)
        return sortie.getvalue()

    def sauvegardes(self):
        return list((self.base.parent / 'docs' / 'archives').glob('sauvegarde-formations-avant-demandes-*.json'))

    def test_la_simulation_liste_sans_rien_ecrire(self):
        sortie = self.lancer()
        self.assertIn('diplôme « Autre » ou sans diplôme de référence : 1', sortie)
        self.assertIn('spécialité non résolue : 1', sortie)
        self.assertIn(f'formation {self.f_autre.id}', sortie)
        self.assertIn('Simulation', sortie)
        self.assertFalse(DemandeAjout.objects.exists())
        self.assertFalse(self.sauvegardes())

    def test_appliquer_sauvegarde_puis_cree_les_demandes(self):
        sortie = self.lancer('--appliquer')
        self.assertIn('Sauvegarde écrite', sortie)
        fichiers = self.sauvegardes()
        self.assertEqual(len(fichiers), 1)
        contenu = json.loads(fichiers[0].read_text(encoding='utf-8'))
        self.assertEqual({ligne['id'] for ligne in contenu}, {self.f_autre.id, self.f_specialite.id})
        self.assertEqual(DemandeAjout.objects.filter(type='DIPLOME').count(), 1)
        self.assertEqual(DemandeAjout.objects.filter(type='SPECIALITE').count(), 1)
        self.f_autre.refresh_from_db()
        self.assertIsNotNone(self.f_autre.demande_diplome)
        self.f_sans_ref.refresh_from_db()
        self.assertIsNone(self.f_sans_ref.demande_diplome)  # l'intitulé n'est pas un type de diplôme
        self.f_specialite.refresh_from_db()
        self.assertEqual(self.f_specialite.demande_specialite.libelle, 'Cybersécurité')
        for formation in (self.f_complete, self.f_trop_courte):
            formation.refresh_from_db()
            self.assertIsNone(formation.demande_diplome)
            self.assertIsNone(formation.demande_specialite)

    def test_la_commande_est_idempotente(self):
        self.lancer('--appliquer')
        nombre = DemandeAjout.objects.count()
        sortie = self.lancer('--appliquer')
        self.assertIn('Rien à migrer', sortie)
        self.assertEqual(DemandeAjout.objects.count(), nombre)
        self.assertEqual(len(self.sauvegardes()), 1)

    def test_rien_ne_change_hors_des_deux_liens(self):
        avant = {f.id: (f.diplome, f.diplome_ref_id, f.specialite_ref_id, f.description) for f in FormationCandidat.objects.all()}
        self.lancer('--appliquer')
        apres = {f.id: (f.diplome, f.diplome_ref_id, f.specialite_ref_id, f.description) for f in FormationCandidat.objects.all()}
        self.assertEqual(avant, apres)
