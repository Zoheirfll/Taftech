"""Découpage en sections : intitulés anglais les plus fréquents d'un corpus de 2 484 CV réels
(Kaggle « Resume Dataset », rapport du 23/10/2026) : « Work History » ouvrait l'expérience de
221 des 238 CV où elle n'était pas détectée."""
from django.test import SimpleTestCase

from jobs.cv_parser.sections import find_sections

CV_ANGLAIS = """Professional Summary
Accountant with ten years of experience.
Work History
Senior Accountant
Company Name - City
Education
Bachelor of Science in Accounting
Skills
Excel
Payroll
Additional Information
Member of a professional association.
"""


class DecoupageSectionsAnglaisTest(SimpleTestCase):
    def test_work_history_ouvre_la_section_experiences(self):
        sections = find_sections(CV_ANGLAIS)
        self.assertIn("Senior Accountant", sections["experiences"])

    def test_employment_history_est_une_experience(self):
        sections = find_sections("Employment History\nTeacher\nEducation\nMaster")
        self.assertIn("Teacher", sections["experiences"])

    def test_la_formation_ne_deborde_pas_dans_les_experiences(self):
        sections = find_sections(CV_ANGLAIS)
        self.assertNotIn("Bachelor", sections["experiences"])
        self.assertIn("Bachelor", sections["formations"])

    def test_intitules_qualifies_se_terminant_par_experience(self):
        for titre in ("Relevant Professional Experience", "Teaching Experience", "Employment & Experience",
                      "Corporate Experience", "Relevant Experience"):
            with self.subTest(titre=titre):
                sections = find_sections(f"Summary\nTeacher\n{titre}\nLead Teacher\nEducation\nMaster")
                self.assertIn("Lead Teacher", sections["experiences"])

    def test_un_titre_repete_ne_perd_pas_la_premiere_section(self):
        texte = "Teaching Experience\nLead Teacher\nCorporate Experience\nProject Engineer\nEducation\nMaster"
        sections = find_sections(texte)
        self.assertIn("Lead Teacher", sections["experiences"])
        self.assertIn("Project Engineer", sections["experiences"])

    def test_education_repetee_garde_les_deux_blocs(self):
        sections = find_sections("Education\nMaster\nSkills\nExcel\nEducation\nBachelor")
        self.assertIn("Master", sections["formations"])
        self.assertIn("Bachelor", sections["formations"])

    def test_une_competence_se_terminant_par_experience_n_ouvre_pas_de_section(self):
        sections = find_sections("Work History\nTeacher\nTutoring experience\nEducation\nMaster")
        self.assertIn("Tutoring experience", sections["experiences"])

    def test_additional_information_delimite_les_competences(self):
        sections = find_sections(CV_ANGLAIS)
        self.assertNotIn("professional association", sections["competences"])
