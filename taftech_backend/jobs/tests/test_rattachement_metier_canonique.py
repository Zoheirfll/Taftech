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

    def test_titre_profil_generique_s_appuie_sur_l_experience_la_plus_recente(self):
        # « Ingénieur IA et cadre administratif » ne contient que des mots génériques ou
        # trop courts : sans repli, aucune appellation candidate et métier du profil vide.
        from unittest.mock import patch
        from jobs.domaine_agent import SPECIALITE_INDEX, classifier_metiers_experiences
        paie = _metier("TAF-PAIE", "Chargé de paie", self.assistant.groupe_principal)
        _appellation("A9", "Chargé de paie", paie, "charge de paie")
        reponse = '{"classifications": [{"index": 0, "appellation_choisie": 0, "raison": "x"}]}'
        experiences = [{"titre_poste": "Cadre administratif & chargé de paie",
                        "description": "Gestion de la paie de 4000 employés"}]
        with patch("jobs.cv_parser._call_groq", return_value=reponse) as groq:
            resultat = classifier_metiers_experiences(
                experiences, titre_professionnel="Ingénieur IA et cadre administratif")
        self.assertEqual(resultat.get(SPECIALITE_INDEX), paie.id)
        # L'IA doit voir le titre de l'expérience (comparable aux candidats « paie »), pas le titre
        # composite : sur le titre composite elle répondait « aucune appellation » (constaté en réel).
        prompt = groq.call_args.args[0]
        self.assertIn("[PROFIL] Cadre administratif & chargé de paie", prompt)
        self.assertNotIn("Ingénieur IA et cadre administratif", prompt)

    def test_titre_composite_accepte_si_une_fonction_est_couverte(self):
        # « X et Y » : l'appellation « X » suffit, le titre n'a pas à être couvert en entier.
        from jobs.domaine_agent import _candidats_pour_experience
        admin_ventes = _metier("TAF-VENTES", "Administrateur des ventes", self.assistant.groupe_principal)
        _appellation("A10", "Administrateur des ventes", admin_ventes, "administrateur des ventes")
        titre = "Administrateur des ventes et support IT"
        candidats = _candidats_pour_experience(titre, "", limite=10)
        bon = next(i for i, c in enumerate(candidats) if c[0] == "Administrateur des ventes")
        self.assertEqual(self._classer(titre, bon), {0: admin_ventes.id})

    def test_titre_composite_en_majuscules_est_decoupe_comme_en_minuscules(self):
        # Les CV écrivent souvent les intitulés en MAJUSCULES : « … ET SUPPORT IT » (bug réel).
        from jobs.domaine_agent import _titre_couvert_par
        self.assertTrue(_titre_couvert_par("ADMINISTRATEUR DES VENTES ET SUPPORT IT", "Administrateur des ventes"))
        self.assertTrue(_titre_couvert_par("HOTE D'ACCUEIL ET DE CAISSE", "Hôte de caisse"))
        self.assertFalse(_titre_couvert_par("ADMINISTRATEUR DES VENTES ET SUPPORT IT", "Administrateur Cloud"))

    def test_appellation_d_encadrement_non_proposee_sans_encadrement_dans_le_poste(self):
        # « Chargé de paie » ne doit pas se voir proposer « Responsable Paie » (constaté en réel).
        from jobs.domaine_agent import _candidats_pour_experience
        groupe = self.assistant.groupe_principal
        resp = _metier("TAF-RPAIE", "Responsable Paie", groupe)
        gest = _metier("TAF-GPAIE", "Gestionnaire de Paie", groupe)
        _appellation("A12", "Responsable Paie", resp, "responsable paie")
        _appellation("A13", "Gestionnaire de Paie", gest, "gestionnaire de paie")
        libelles = [c[0] for c in _candidats_pour_experience("Chargé de paie", "Gestion de la paie", limite=10)]
        self.assertIn("Gestionnaire de Paie", libelles)
        self.assertNotIn("Responsable Paie", libelles)

    def test_appellation_d_encadrement_proposee_si_le_poste_ou_les_missions_l_evoquent(self):
        from jobs.domaine_agent import _candidats_pour_experience
        groupe = self.assistant.groupe_principal
        resp = _metier("TAF-RPAIE", "Responsable Paie", groupe)
        _appellation("A12", "Responsable Paie", resp, "responsable paie")
        for titre, description in [("Responsable paie", ""), ("Chargé de paie", "Encadrement d'une équipe de 5 personnes")]:
            libelles = [c[0] for c in _candidats_pour_experience(titre, description, limite=10)]
            self.assertIn("Responsable Paie", libelles, (titre, description))

    def test_si_tout_est_encadrement_la_liste_n_est_pas_videe(self):
        from jobs.domaine_agent import _candidats_pour_experience
        resp = _metier("TAF-RPAIE", "Responsable Paie", self.assistant.groupe_principal)
        _appellation("A12", "Responsable Paie", resp, "responsable paie")
        libelles = [c[0] for c in _candidats_pour_experience("Chargé de paie", "", limite=10)]
        self.assertEqual(libelles, ["Responsable Paie"])

    def test_appellation_la_plus_proche_du_titre_passe_en_premier_et_est_acceptee(self):
        # « Développeur d'applications web » : « Développeur web » (2 mots sur 3) est plus proche que
        # « Développeur Android » (1 sur 3) ; le mot court « web » compte.
        from jobs.domaine_agent import _candidats_pour_experience, _titre_couvert_par
        groupe = self.assistant.groupe_principal
        for code, libelle, cle in [("TAF-DW", "Développeur web", "developpeur web"),
                                   ("TAF-DA", "Développeur d'application", "developpeur d application"),
                                   ("TAF-AND", "Développeur Android", "developpeur android")]:
            _appellation("A-" + code, libelle, _metier(code, libelle, groupe), cle)
        titre = "DÉVELOPPEUR D'APPLICATIONS WEB"
        libelles = [c[0] for c in _candidats_pour_experience(titre, "", limite=10)]
        self.assertLess(libelles.index("Développeur web"), libelles.index("Développeur Android"))
        self.assertLess(libelles.index("Développeur d'application"), libelles.index("Développeur Android"))
        self.assertTrue(_titre_couvert_par(titre, "Développeur web"))
        self.assertTrue(_titre_couvert_par(titre, "Développeur d'application"))
        self.assertFalse(_titre_couvert_par(titre, "Développeur Android"))

    def test_une_moitie_exacte_des_mots_ne_suffit_pas(self):
        from jobs.domaine_agent import _titre_couvert_par
        self.assertFalse(_titre_couvert_par("Gestionnaire recrutement", "Gestionnaire administratif ressources humaines"))

    def test_pluriel_du_titre_ne_bloque_pas_l_appellation_au_singulier(self):
        from jobs.domaine_agent import _candidats_pour_experience
        dev = _metier("TAF-DEV", "Développeur d'application", self.assistant.groupe_principal)
        _appellation("A11", "Développeur d'application", dev, "developpeur d application")
        titre = "Développeur d'applications web"
        candidats = _candidats_pour_experience(titre, "", limite=10)
        bon = next(i for i, c in enumerate(candidats) if c[0] == "Développeur d'application")
        self.assertEqual(self._classer(titre, bon), {0: dev.id})

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
