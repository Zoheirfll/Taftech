"""« Licence en informatique » : le diplôme est reconnu mais aucune spécialité n'est devinée (le référentiel
n'atteste pas « Informatique » pour une licence). Le candidat reçoit en un clic les spécialités DÉJÀ reliées à
ce diplôme et proches du mot ; rien n'est choisi à sa place."""
from django.test import TestCase

from jobs.models import DiplomeSpecialite, DomaineFormation, SpecialiteFormation, TypeDiplome
from jobs.referentiel_utils import (
    normaliser_recherche, resoudre_diplome_et_specialite_depuis_texte, suggerer_specialites_pour_diplome,
)


class SuggestionsSpecialitesTests(TestCase):
    def setUp(self):
        self.licence = TypeDiplome.objects.create(code='D-LIC-A', libelle='Licence académique', systeme='superieur_lmd')
        self.master = TypeDiplome.objects.create(code='D-MAS-A', libelle='Master académique', systeme='superieur_lmd')
        domaine = DomaineFormation.objects.create(code='DOM-1', libelle='Mathématiques et informatique', systeme='superieur_lmd')

        def specialite(code, libelle):
            return SpecialiteFormation.objects.create(
                code=code, domaine=domaine, libelle=libelle, cle_recherche=normaliser_recherche(libelle),
            )

        self.systemes = specialite('SP-1', 'Systèmes informatiques')
        self.statistique = specialite('SP-2', 'Statistique et traitement informatique des données')
        self.droit = specialite('SP-3', 'Droit des affaires')
        self.securite = specialite('SP-4', 'Sécurité informatique')
        for i, spec in enumerate([self.systemes, self.statistique, self.droit], start=1):
            DiplomeSpecialite.objects.create(code=f'DS-{i}', diplome=self.licence, specialite=spec)
        DiplomeSpecialite.objects.create(code='DS-9', diplome=self.master, specialite=self.securite)

    def test_aucune_specialite_n_est_devinee_pour_un_intitule_qui_ne_donne_que_le_domaine(self):
        diplome, specialite = resoudre_diplome_et_specialite_depuis_texte('DIPLÔME DE LICENCE EN INFORMATIQUE')
        self.assertEqual(diplome, self.licence)
        self.assertIsNone(specialite)

    def test_suggere_les_specialites_attestees_du_diplome_proches_du_mot(self):
        suggestions = suggerer_specialites_pour_diplome(self.licence, 'DIPLÔME DE LICENCE EN INFORMATIQUE')
        self.assertEqual({s.id for s in suggestions}, {self.systemes.id, self.statistique.id})

    def test_ne_suggere_jamais_une_specialite_non_reliee_au_diplome(self):
        suggestions = suggerer_specialites_pour_diplome(self.licence, 'DIPLÔME DE LICENCE EN INFORMATIQUE')
        self.assertNotIn(self.securite.id, [s.id for s in suggestions])  # reliée au Master seulement
        self.assertNotIn(self.droit.id, [s.id for s in suggestions])  # aucun mot commun

    def test_limite_et_texte_vide(self):
        self.assertEqual(len(suggerer_specialites_pour_diplome(self.licence, 'Licence en informatique', limite=1)), 1)
        self.assertEqual(suggerer_specialites_pour_diplome(self.licence, ''), [])
        self.assertEqual(suggerer_specialites_pour_diplome(None, 'Licence en informatique'), [])
