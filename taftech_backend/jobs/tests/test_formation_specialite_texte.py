"""La spécialité saisie en « Autre, préciser » a son propre champ (`specialite_texte`) : la note libre de la
formation (`description`, ex. « Mémoire : … ») ne déclenche plus ni vérification ni demande d'ajout."""
from jobs.models import DemandeAjout, FormationCandidat
from jobs.tests import test_demandes_ajout_formations as base


class SpecialiteTexteTests(base.FormationDemandesBase):
    def test_la_note_libre_ne_declenche_ni_verification_ni_demande(self):
        reponse = self.poster(diplome_ref=self.licence.pk, description='Mémoire : site web dynamique')
        self.assertEqual(reponse.status_code, 201, reponse.data)
        formation = FormationCandidat.objects.get()
        self.assertEqual(formation.statut_validation, 'DECLARE')
        self.assertFalse(DemandeAjout.objects.exists())

    def test_la_specialite_saisie_declenche_la_verification_et_la_demande_sans_toucher_la_note(self):
        reponse = self.poster(
            diplome_ref=self.licence.pk, specialite_texte='Cybersécurité',
            specialite_autre='Cybersécurité', description='Mémoire : site web dynamique',
        )
        self.assertEqual(reponse.status_code, 201, reponse.data)
        formation = FormationCandidat.objects.get()
        self.assertEqual(formation.statut_validation, 'A_PRECISER')
        self.assertEqual(formation.specialite_texte, 'Cybersécurité')
        self.assertEqual(formation.description, 'Mémoire : site web dynamique')
        self.assertEqual(reponse.data['specialite_texte'], 'Cybersécurité')
        self.assertEqual(DemandeAjout.objects.get().type, 'SPECIALITE')

    def test_choisir_une_vraie_specialite_sort_de_l_attente(self):
        self.poster(diplome_ref=self.licence.pk, specialite_texte='Cybersécurité', specialite_autre='Cybersécurité')
        formation = FormationCandidat.objects.get()
        self.modifier(formation, diplome_ref=self.licence.pk, specialite_ref=self.specialite.pk, specialite_texte='')
        formation.refresh_from_db()
        self.assertEqual(formation.statut_validation, 'DECLARE')
        self.assertEqual(formation.specialite_texte, '')
