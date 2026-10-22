"""Reconnaissance de noms/lieux (spaCy fr_core_news_md installé en Task 1) et échec fermé."""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from jobs.confidentialite_ia.ner import ModeleNerIndisponible
from jobs.confidentialite_ia.pseudonymisation import nettoyer_texte


class NerTest(SimpleTestCase):
    def test_nom_dans_le_texte_masque(self):
        r = nettoyer_texte("J'ai travaillé avec Jean Dupont sur ce projet.")
        self.assertNotIn("Dupont", r.texte)
        self.assertIn("[NOM]", r.texte)

    def test_lieu_masque_dans_l_entete_seulement(self):
        entete = "Jean Dupont\nOran, Algérie\n"
        corps = "x " * 400 + "Mission réalisée à Alger pour un client."
        r = nettoyer_texte(entete + corps)
        self.assertNotIn("Oran", r.texte)
        self.assertIn("Alger", r.texte)  # hors en-tête : conservé (utile à l'analyse)

    def test_noms_connus_masques_sans_modele(self):
        r = nettoyer_texte("Karim BENALI, ingénieur", avec_ner=False, noms_connus=("Karim", "Benali"))
        self.assertNotIn("Karim", r.texte)
        self.assertNotIn("BENALI", r.texte)

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    def test_ner_desactive_ne_masque_pas_les_noms_inconnus(self):
        self.assertIn("Dupont", nettoyer_texte("Jean Dupont").texte)

    def test_echec_ferme_si_modele_absent(self):
        with patch("jobs.confidentialite_ia.ner._charger", side_effect=ModeleNerIndisponible("absent")):
            with self.assertRaises(ModeleNerIndisponible):
                nettoyer_texte("Jean Dupont")


class LieuxEnteteTest(SimpleTestCase):
    """Les wilayas de l'en-tête sont masquées par une liste, sans dépendre de la reconnaissance
    automatique (qui ratait « EL KERMA / ORAN » en majuscules, collé à une autre entité)."""

    def test_wilaya_de_l_entete_masquee_meme_en_majuscules_et_sans_modele(self):
        texte = "BELAMRI Meriem\nLICENCIÉ EN INFORMATIQUE\nEL KERMA / ORAN | 0657 89 79 66 |\nProfil"
        r = nettoyer_texte(texte, avec_ner=False)
        self.assertNotIn("ORAN", r.texte)
        self.assertIn("[LIEU]", r.texte)
        self.assertEqual(r.categories.get("LIEU"), 1)

    def test_wilaya_hors_entete_conservee(self):
        corps = "x " * 400 + "Mission réalisée à Oran pour un client."
        self.assertIn("Oran", nettoyer_texte(corps, avec_ner=False).texte)

    def test_un_mot_qui_contient_un_nom_de_wilaya_n_est_pas_masque(self):
        self.assertIn("Algérie", nettoyer_texte("Profil basé en Algérie", avec_ner=False).texte)


class NerMotDeDebutDeLigneTest(SimpleTestCase):
    """Un mot courant qui n'est capitalisé que parce qu'il ouvre une ligne (« Expertise confirmée… »,
    « - Reporting RH… ») n'est ni un lieu ni un nom (constaté sur un CV réel le 21/10/2026)."""

    EXTRAIT = (
        "CURRICULUM VITAE\nMme KARIMI Lina, Oran, Algérie.\nTél : 0552 39 90 67\n"
        "PROFIL PROFESSIONNEL\nResponsable des Ressources Humaines avec plus de 8 ans d’expérience.\n"
        "Expertise confirmée en administration du personnel, relations sociales, paie.\n"
        "Habituée aux contextes auditables, fortement réglementés et à forts enjeux sociaux.\n"
        "EXPÉRIENCE PROFESSIONNELLE\n- Coordination avec les organismes institutionnels (ANEM, CNAS).\n"
        "- Reporting RH et suivi des indicateurs sociaux.\n"
    )

    def test_mots_courants_en_debut_de_ligne_restent_lisibles(self):
        texte = nettoyer_texte(self.EXTRAIT).texte
        for debut in ("Expertise confirmée", "Habituée aux", "- Reporting RH"):
            self.assertIn(debut, texte)

    def test_nom_et_lieux_de_l_entete_restent_masques(self):
        texte = nettoyer_texte(self.EXTRAIT).texte
        self.assertNotIn("KARIMI", texte)
        self.assertNotIn("Oran", texte)

    def test_mot_seul_sur_sa_ligne_n_est_pas_ecarte(self):
        from jobs.confidentialite_ia.ner import _ouvre_une_ligne_de_texte
        texte = "Arzew\nExpertise confirmée\n- Reporting RH\n"
        self.assertFalse(_ouvre_une_ligne_de_texte(texte, 0, 5))
        self.assertTrue(_ouvre_une_ligne_de_texte(texte, 6, 15))
        self.assertTrue(_ouvre_une_ligne_de_texte(texte, 28, 37))


class NerMotsDOrganisationTest(SimpleTestCase):
    """Un nom commun d'établissement (« Hypermarché ») détecté comme personne par spaCy n'est pas un nom."""

    EXTRAIT = (
        "HÔTESSE DE CAISSE ET D’ACCUEIL CHEZ UNO - ES-SENIA\nNovembre 2023\nHypermarché UNO Es-senia\n"
        "Septembre 2025\nGestion des transactions et comptage de caisse\n"
    )

    def test_hypermarche_n_est_pas_masque_comme_un_nom(self):
        r = nettoyer_texte(self.EXTRAIT)
        self.assertIn("Hypermarché", r.texte)
        self.assertNotIn("NOM", r.categories)

    def test_nom_de_personne_a_cote_d_un_mot_d_organisation_reste_masque(self):
        from jobs.confidentialite_ia.ner import entites_ner
        texte = "Université Karim Benali"
        detections = entites_ner(texte)
        masque = "".join(texte[d.debut:d.fin] for d in detections if d.categorie == "NOM")
        self.assertNotIn("Université", masque)


class NerFauxPositifsCvIndustrielTest(SimpleTestCase):
    """CV réel du 22/10/2026 : un employeur détecté une seule fois comme personne, et une commune
    (« Hassi Ameur », suivie de sa wilaya) prise pour un nom, avec la barre verticale avalée."""

    EXTRAIT = (
        "Parcours construit chez Renault Algérie Production,\n"
        "FieldCore - General Electric et Stellantis autour du management de fabrication.\n"
        "VEHICLE TECHNICAL MANAGER 2026\nStellantis Production El Djazair - FIAT Oran\n"
        "ALTEN, via IRMA Global Services | Mission Stellantis Oran\n"
        "INGÉNIEUR EN ELECTRONIQUE Déc. 2011 - Oct. 2012\n"
        "SARL CERAL - Ceramique Algérienne | Hassi Ameur - Oran\n"
    )

    def test_employeur_detecte_une_seule_fois_reste_lisible(self):
        texte = nettoyer_texte(self.EXTRAIT).texte
        self.assertIn("General Electric et Stellantis autour", texte)

    def test_commune_suivie_de_sa_wilaya_n_est_pas_un_nom(self):
        r = nettoyer_texte("Profil\n" + "x " * 400 + "\n" + self.EXTRAIT)  # hors de l'en-tête, comme un vrai CV
        self.assertIn("Algérienne | Hassi Ameur - Oran", r.texte)
        self.assertNotIn("NOM", r.categories)

    def test_ponctuation_de_bordure_jamais_incluse_dans_un_nom(self):
        from jobs.confidentialite_ia.ner import entites_ner
        texte = "Société Atlas | Karim Benali | Oran"
        for d in entites_ner(texte):
            self.assertTrue(texte[d.debut:d.fin][0].isalnum() and texte[d.debut:d.fin][-1].isalnum())

    def test_nom_cite_une_fois_reste_masque(self):
        texte = "Recommandé par Karim Benali, directeur technique.\n" + "x " * 10
        self.assertNotIn("Benali", nettoyer_texte(texte).texte)
