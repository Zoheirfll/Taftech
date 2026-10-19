"""Extraction locale, filet de sécurité et champs structurés pseudonymisés."""
from django.test import SimpleTestCase

from jobs.confidentialite_ia import (
    FuiteDonneesPersonnelles, PseudonymeurEmployeurs, effectifs_par_statut, extraire_coordonnees,
    jeton_candidat, lignes_experiences, lignes_formations, nettoyer_champ,
    nettoyer_intitule_formation, verifier_absence_pii,
)

CV = (
    "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\nOran\n"
    "Né le 12/03/1990\nhttps://www.linkedin.com/in/karim-benali\ngithub.com/kbenali\n"
)


class CoordonneesTest(SimpleTestCase):
    def test_extraction_locale(self):
        c = extraire_coordonnees(CV, avec_ner=False)
        self.assertEqual(c["email"], "karim.benali@mail.dz")
        self.assertEqual(c["telephone"], "0555 12 34 56")
        self.assertEqual(c["date_naissance_raw"], "12/03/1990")
        self.assertIn("linkedin.com/in/karim-benali", c["linkedin"])
        self.assertIn("github.com/kbenali", c["github"])
        self.assertIsNone(c["nom_complet"])  # sans NER

    def test_absences_donnent_none(self):
        c = extraire_coordonnees("Développeur Python", avec_ner=False)
        self.assertTrue(all(v is None for v in c.values()))

    def test_telephone_en_chiffres_arabes_extrait(self):
        c = extraire_coordonnees("الهاتف: ٠٥٥٥ ١٢ ٣٤ ٥٦", avec_ner=False)
        self.assertEqual(c["telephone"], "0555 12 34 56")


class FiletTest(SimpleTestCase):
    def test_refuse_email_telephone_url_nin(self):
        for texte in ("a@b.dz", "0555 12 34 56", "https://x.dz/p", "109876543210987654"):
            with self.subTest(texte=texte):
                with self.assertRaises(FuiteDonneesPersonnelles):
                    verifier_absence_pii(f"profil {texte}")

    def test_refuse_telephone_en_chiffres_arabes(self):
        with self.assertRaises(FuiteDonneesPersonnelles):
            verifier_absence_pii("هاتف ٠٥٥٥ ١٢ ٣٤ ٥٦")

    def test_message_sans_contenu(self):
        with self.assertRaises(FuiteDonneesPersonnelles) as ctx:
            verifier_absence_pii("a@b.dz")
        self.assertNotIn("a@b.dz", str(ctx.exception))
        self.assertEqual(ctx.exception.categories, ("EMAIL",))

    def test_texte_propre_accepte(self):
        verifier_absence_pii("Titre : Développeur [EMAIL] [TÉLÉPHONE] Python 2019-2023")
        verifier_absence_pii("")


class ChampsStructuresTest(SimpleTestCase):
    def test_jeton_candidat(self):
        self.assertRegex(jeton_candidat(), r"^CANDIDAT_[0-9A-F]{6}$")
        self.assertNotEqual(jeton_candidat(), jeton_candidat())

    def test_pseudonymes_stables_dans_un_appel(self):
        p = PseudonymeurEmployeurs()
        self.assertEqual(p.libelle("SONATRACH"), "Entreprise A")
        self.assertEqual(p.libelle("Sonelgaz"), "Entreprise B")
        self.assertEqual(p.libelle("  sonatrach "), "Entreprise A")
        self.assertEqual(p.libelle(""), "Entreprise non précisée")

    def test_lignes_experiences_sans_employeur(self):
        lignes = lignes_experiences([
            {"titre_poste": "Ingénieur chez SONATRACH", "entreprise": "SONATRACH",
             "domaine": "Informatique", "debut": "2019", "fin": "2023"},
            {"titre_poste": "Développeur", "entreprise": "Sonelgaz", "domaine": None,
             "debut": "2023", "fin": None},
        ])
        texte = "\n".join(lignes)
        self.assertNotIn("SONATRACH", texte)
        self.assertNotIn("Sonelgaz", texte)
        self.assertIn("Entreprise A", texte)
        self.assertIn("Entreprise B", texte)
        self.assertIn("domaine : Informatique", texte)
        self.assertIn("2023 - présent", texte)

    def test_intitule_sans_etablissement(self):
        cas = {
            "Master informatique – Université d'Oran": "Master informatique",
            "Licence en droit à l'Université d'Alger 2": "Licence en droit",
            "Ingénieur d'état - ESI Alger": "Ingénieur d'état",
            "Master 2 ADSI": "Master 2 ADSI",
        }
        for brut, attendu in cas.items():
            with self.subTest(brut=brut):
                self.assertEqual(nettoyer_intitule_formation(brut), attendu)

    def test_intitule_uniquement_etablissement_donne_vide(self):
        self.assertEqual(nettoyer_intitule_formation("Université d'Oran"), "")

    def test_intitule_masque_les_pii(self):
        self.assertNotIn("a@b.dz", nettoyer_intitule_formation("Master informatique a@b.dz"))

    def test_lignes_formations(self):
        lignes = lignes_formations([
            {"diplome": "Master informatique – Université d'Oran", "specialite": "Systèmes d'information"},
            {"diplome": "Université d'Oran", "specialite": None},
        ])
        self.assertEqual(lignes, ["Master informatique (Systèmes d'information)"])

    def test_nettoyer_champ(self):
        self.assertEqual(nettoyer_champ("Python, joindre a@b.dz"), "Python, joindre [EMAIL]")
        self.assertEqual(nettoyer_champ(None), "")

    def test_effectifs_par_statut(self):
        self.assertEqual(effectifs_par_statut(["RECUE", "ENTRETIEN", "RECUE"]), "1 ENTRETIEN, 2 RECUE")
        self.assertEqual(effectifs_par_statut([]), "aucune candidature")
