"""Point 7 des corrections finales : le recruteur garde son intitulé public, rattaché en
interne au métier canonique ; aucun rattachement automatique deviné (R02/F02)."""
from django.test import TestCase

from jobs.models import Appellation, GroupeMetier, Metier
from jobs.referentiel_fusions import appliquer_redirections_metiers
from jobs.referentiel_utils import resoudre_metier_depuis_texte


def _metier(code, libelle, groupe):
    return Metier.objects.create(code=code, libelle=libelle, groupe_principal=groupe)


def _appellation(code, libelle, metier, cle):
    return Appellation.objects.create(code=code, libelle=libelle, metier=metier, cle_recherche=cle)


class RattachementMetierTests(TestCase):
    def setUp(self):
        groupe = GroupeMetier.objects.create(code="G-RH", libelle="RH", type_groupe="domaine_source")
        self.assistant = _metier("L1503", "Assistant en ressources humaines", groupe)
        self.recrutement = _metier("TAF-000165", "Chargé de Recrutement", groupe)
        self.talent = _metier("TAF-000167", "Talent Acquisition Specialist", groupe)
        _appellation("A1", "Gestionnaire administratif ressources humaines", self.assistant,
                     "gestionnaire administratif ressources humaines")
        _appellation("A2", "Chargé de Recrutement", self.recrutement, "charge de recrutement")
        _appellation("A3", "Talent Acquisition Specialist", self.talent, "talent acquisition specialist")

    def test_intitule_libre_non_exact_ne_est_pas_devine(self):
        # Avant : « Gestionnaire RH » était rattaché à « Assistant en ressources humaines ».
        self.assertIsNone(resoudre_metier_depuis_texte("Gestionnaire RH"))
        self.assertIsNone(resoudre_metier_depuis_texte("Gestionnaire ressources humaines"))

    def test_intitule_exact_est_rattache_sans_tenir_compte_casse_ni_accents(self):
        self.assertEqual(resoudre_metier_depuis_texte("CHARGÉ de recrutement"), self.recrutement)

    def test_meme_appellation_sur_deux_metiers_retient_celui_qui_porte_le_libelle(self):
        # « Chargé de recrutement » : métier ANEM large + métier TafTech précis.
        _appellation("A4", "Chargé de recrutement", self.assistant, "charge de recrutement")
        self.assertEqual(resoudre_metier_depuis_texte("Chargé de recrutement"), self.recrutement)

    def test_meme_appellation_sans_metier_homonyme_ne_est_pas_devinee(self):
        _appellation("A5", "Agent RH", self.assistant, "agent polyvalent")
        _appellation("A6", "Agent RH", self.recrutement, "agent polyvalent")
        self.assertIsNone(resoudre_metier_depuis_texte("Agent polyvalent"))

    def test_abreviation_rh_developpee(self):
        from jobs.referentiel_utils import developper_abreviations
        self.assertEqual(developper_abreviations("gestionnaire rh"), "gestionnaire ressources humaines")
        self.assertEqual(developper_abreviations("rhéologue"), "rhéologue")

    def _classer(self, titre, choix):
        from unittest.mock import patch
        from jobs.domaine_agent import classifier_metiers_experiences
        reponse = '{"classifications": [{"index": 0, "appellation_choisie": %d, "raison": "x"}]}' % choix
        with patch("jobs.cv_parser._call_groq", return_value=reponse):
            return classifier_metiers_experiences([{"titre_poste": titre, "description": ""}])

    def test_choix_ia_incoherent_avec_le_titre_est_rejete(self):
        # L'IA choisit un métier dont l'appellation ne contient pas « recrutement ».
        _appellation("A8", "Recruteur Télévente", self.assistant, "recruteur televente")
        from jobs.domaine_agent import _candidats_pour_experience
        candidats = _candidats_pour_experience("Gestionnaire recrutement", "", limite=10)
        faux = next(i for i, c in enumerate(candidats) if c[0] == "Gestionnaire administratif ressources humaines") \
            if any(c[0] == "Gestionnaire administratif ressources humaines" for c in candidats) else 0
        self.assertEqual(self._classer("Gestionnaire recrutement", faux), {})

    def test_choix_ia_coherent_avec_le_titre_est_conserve(self):
        from jobs.domaine_agent import _candidats_pour_experience
        candidats = _candidats_pour_experience("Chargé de recrutement", "", limite=10)
        bon = next(i for i, c in enumerate(candidats) if c[0] == "Chargé de Recrutement")
        self.assertEqual(self._classer("Chargé de recrutement", bon), {0: self.recrutement.id})

    def test_candidats_cv_placent_en_premier_l_appellation_couvrant_tout_le_titre(self):
        from jobs.domaine_agent import _candidats_pour_experience
        groupe = self.assistant.groupe_principal
        autre = _metier("TAF-X1", "Gestionnaire Catalogue", groupe)
        _appellation("A7", "Gestionnaire Catalogue Produits", autre, "gestionnaire catalogue produits")
        premier = _candidats_pour_experience("Gestionnaire RH", "", limite=3)[0]
        self.assertEqual(premier[1], self.assistant.id)

    def test_intitule_public_conserve_et_rattache_au_metier_canonique(self):
        import jobs.referentiel_fusions as fusions
        ancien = fusions.METIERS_REDIRECTIONS
        fusions.METIERS_REDIRECTIONS = [("TAF-000167", "TAF-000165")]
        try:
            appliquer_redirections_metiers(lambda s: None)
            appliquer_redirections_metiers(lambda s: None)  # idempotent
        finally:
            fusions.METIERS_REDIRECTIONS = ancien
        self.talent.refresh_from_db()
        self.assertEqual(self.talent.metier_canonique, self.recrutement)
        # L'intitulé affiché reste celui du recruteur ; la résolution mène au métier de référence.
        self.assertEqual(self.talent.libelle, "Talent Acquisition Specialist")
        self.assertEqual(resoudre_metier_depuis_texte("Talent Acquisition Specialist"), self.recrutement)
