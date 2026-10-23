"""`specialites_requises_detail` d'une offre porte le domaine de chaque spécialité, le total de ses spécialités
sélectionnables et, quand il en manque une ou deux, leur libellé : c'est ce qui permet à la page publique
d'écrire « Master 2 en Informatique » (domaine entièrement coché) ou « … (sauf Esthétique) » sans lister les
spécialités une par une. Champs ajoutés seulement : `id` et `libelle` restent inchangés."""
from django.test import TestCase

from jobs.models import DomaineFormation, SpecialiteFormation
from jobs.serializers.offres import detail_specialites_requises


def _domaine(code, libelle):
    return DomaineFormation.objects.create(code=code, libelle=libelle, systeme="superieur")


def _specialite(code, libelle, domaine, **extra):
    return SpecialiteFormation.objects.create(code=code, libelle=libelle, cle_recherche=libelle.lower(), domaine=domaine, **extra)


class DetailSpecialitesDomaineTest(TestCase):
    def setUp(self):
        self.info = _domaine("D-INFO", "Informatique")
        self.a = _specialite("S-A", "Réseaux", self.info)
        self.b = _specialite("S-B", "Génie logiciel", self.info)
        self.c = _specialite("S-C", "Bases de données", self.info)

    def test_garde_id_et_libelle(self):
        detail = detail_specialites_requises([self.a])
        self.assertEqual((detail[0]["id"], detail[0]["libelle"]), (self.a.id, "Réseaux"))

    def test_porte_le_domaine_et_son_total(self):
        detail = detail_specialites_requises([self.a, self.b, self.c])
        self.assertEqual(detail[0]["domaine_id"], self.info.id)
        self.assertEqual(detail[0]["domaine_libelle"], "Informatique")
        self.assertEqual(detail[0]["domaine_total"], 3)

    def test_domaine_entier_sans_non_retenues(self):
        detail = detail_specialites_requises([self.a, self.b, self.c])
        self.assertTrue(all(d["domaine_non_retenues"] == [] for d in detail))

    def test_une_ou_deux_non_retenues_sont_nommees(self):
        detail = detail_specialites_requises([self.a, self.b])
        self.assertEqual(detail[0]["domaine_non_retenues"], ["Bases de données"])

    def test_au_dela_de_deux_non_retenues_liste_vide(self):
        for i in range(3):
            _specialite(f"S-X{i}", f"Autre {i}", self.info)
        detail = detail_specialites_requises([self.a])
        self.assertEqual(detail[0]["domaine_total"], 6)
        self.assertEqual(detail[0]["domaine_non_retenues"], [])

    def test_le_total_ignore_autre_preciser_et_les_non_selectionnables(self):
        _specialite("SP-AUTRE", "Autre, préciser", self.info)
        _specialite("S-CACHEE", "Spécialité cachée", self.info, selectionnable=False)
        detail = detail_specialites_requises([self.a, self.b, self.c])
        self.assertEqual(detail[0]["domaine_total"], 3)

    def test_liste_vide(self):
        self.assertEqual(detail_specialites_requises([]), [])
