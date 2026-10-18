"""Étape 1 des demandes d'ajout au référentiel : service (création avec garde-fous, trois décisions,
effets sur les formations, notifications). Types gérés : DIPLOME et SPECIALITE."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.test import TestCase

from jobs.demandes_ajout import (
    DemandeRefusee, accepter_demande, creer_demande, rattacher_demande, refuser_demande,
)
from jobs.demandes_ajout.regles import MAX_EXPLICITES_OUVERTES, MAX_IMPLICITES_PAR_JOUR
from jobs.models import (
    AliasDiplome, AliasSpecialite, DemandeAjout, DiplomeSpecialite, DomaineFormation, FiliereFormation,
    FormationCandidat, Notification, OffreEmploi, ProfilCandidat, ProfilEntreprise, SpecialiteFormation, TypeDiplome,
)
from jobs.referentiel_utils import normaliser_recherche

User = get_user_model()
D = DemandeAjout


def _candidat(nom):
    utilisateur = User.objects.create_user(username=nom, email=f"{nom}@test.dz", role='CANDIDAT')
    ProfilCandidat.objects.create(user=utilisateur)
    return utilisateur


class ReferentielTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.licence = TypeDiplome.objects.create(code='D-LIC', libelle='Licence', systeme='superieur_lmd')
        self.autre = TypeDiplome.objects.create(code='D-AUTRE', libelle='Autre diplôme à préciser', systeme='autre')
        self.domaine = DomaineFormation.objects.create(code='DOM-1', libelle='Informatique', systeme='superieur_lmd')
        self.domaine_autre = DomaineFormation.objects.create(code='D-AUTRE', libelle='Domaine non répertorié', systeme='autre')
        self.specialite = SpecialiteFormation.objects.create(
            code='SP-1', domaine=self.domaine, libelle='Génie logiciel', cle_recherche=normaliser_recherche('Génie logiciel'),
        )
        DiplomeSpecialite.objects.create(code='DS-1', diplome=self.licence, specialite=self.specialite)
        self.candidat = _candidat('cand')
        self.candidat2 = _candidat('cand2')
        self.admin = User.objects.create_user(username='adm', email='adm@test.dz', role='ADMIN', is_staff=True)

    def demande(self, libelle='Licence professionnelle', type_demande=D.TYPE_DIPLOME, utilisateur=None, explicite=True):
        return creer_demande(utilisateur or self.candidat, type_demande, libelle, explicite=explicite)[0]


class CreationTests(ReferentielTestCase):
    def test_creation_enregistre_la_demande_sans_toucher_au_referentiel(self):
        avant = (TypeDiplome.objects.count(), AliasDiplome.objects.count())
        demande, deja = creer_demande(self.candidat, 'DIPLOME', '  Licence   professionnelle ', 'niveau bac+3')
        self.assertFalse(deja)
        self.assertEqual(
            (demande.statut, demande.explicite, demande.origine, demande.contexte, demande.libelle),
            (D.STATUT_A_EXAMINER, True, 'CANDIDAT', 'niveau bac+3', 'Licence professionnelle'),
        )
        self.assertEqual(demande.cle_recherche, normaliser_recherche('Licence professionnelle'))
        self.assertEqual(list(demande.demandeurs.all()), [self.candidat])
        self.assertEqual((TypeDiplome.objects.count(), AliasDiplome.objects.count()), avant)

    def test_un_recruteur_donne_l_origine_recruteur(self):
        recruteur = User.objects.create_user(username='rh', email='rh@test.dz', role='RECRUTEUR')
        self.assertEqual(self.demande(utilisateur=recruteur).origine, 'RECRUTEUR')

    def test_une_demande_identique_rejoint_la_demande_ouverte(self):
        premiere = self.demande('Licence professionnelle')
        seconde, deja = creer_demande(self.candidat2, 'DIPLOME', 'LICENCE professionnelle')
        self.assertTrue(deja)
        self.assertEqual(seconde.pk, premiere.pk)
        self.assertEqual(D.objects.count(), 1)
        self.assertEqual(premiere.demandeurs.count(), 2)

    def test_le_meme_compte_ne_compte_qu_une_fois(self):
        premiere = self.demande('Licence professionnelle')
        creer_demande(self.candidat, 'DIPLOME', 'Licence professionnelle')
        self.assertEqual(premiere.demandeurs.count(), 1)

    def test_un_clic_explicite_rend_explicite_une_demande_implicite(self):
        implicite = self.demande('Licence professionnelle', explicite=False)
        self.assertFalse(implicite.explicite)
        creer_demande(self.candidat2, 'DIPLOME', 'Licence professionnelle', explicite=True)
        implicite.refresh_from_db()
        self.assertTrue(implicite.explicite)

    def test_les_deux_types_sont_independants(self):
        self.demande('Informatique de gestion', D.TYPE_DIPLOME)
        self.demande('Informatique de gestion', D.TYPE_SPECIALITE)
        self.assertEqual(D.objects.count(), 2)

    def test_entree_deja_presente_refusee_libelle_ou_alias(self):
        AliasDiplome.objects.create(code='AL-1', diplome=self.licence, libelle='Lic.', cle_recherche='lic')
        for libelle in ('licence', 'LICENCE', 'Lic.'):
            with self.assertRaises(DemandeRefusee) as ctx:
                creer_demande(self.candidat, 'DIPLOME', libelle)
            self.assertEqual(ctx.exception.code, 'ENTREE_EXISTANTE')
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat, 'SPECIALITE', 'genie logiciel')
        self.assertEqual(ctx.exception.code, 'ENTREE_EXISTANTE')
        self.assertEqual(D.objects.count(), 0)

    def test_le_placeholder_autre_diplome_n_est_pas_une_entree_existante(self):
        demande, _ = creer_demande(self.candidat, 'DIPLOME', 'Autre diplôme à préciser')
        self.assertEqual(demande.statut, D.STATUT_A_EXAMINER)

    def test_libelle_invalide(self):
        for libelle in ('ab', '12345', 'contact@exemple.dz', 'www.exemple.dz', '0555 12 34 56 78', 'un ' * 13):
            with self.assertRaises(DemandeRefusee) as ctx:
                creer_demande(self.candidat, 'DIPLOME', libelle)
            self.assertEqual(ctx.exception.code, 'LIBELLE_INVALIDE', libelle)

    def test_contexte_trop_long(self):
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat, 'DIPLOME', 'Licence professionnelle', 'x' * 301)
        self.assertEqual(ctx.exception.code, 'CONTEXTE_TROP_LONG')

    def test_type_inconnu_refuse(self):
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat, 'INCONNU', 'Technicien drone')
        self.assertEqual(ctx.exception.code, 'TYPE_INCONNU')

    def test_un_libelle_refuse_n_est_jamais_re_propose(self):
        demande = self.demande('Licence professionnelle')
        refuser_demande(demande, self.admin, 'Pas un diplôme officiel')
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat2, 'DIPLOME', 'licence PROFESSIONNELLE')
        self.assertEqual(ctx.exception.code, 'DEJA_REFUSEE')

    def test_quota_de_demandes_explicites_ouvertes(self):
        for i in range(MAX_EXPLICITES_OUVERTES):
            self.demande(f'Diplôme maison numéro {chr(97 + i)}')
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat, 'DIPLOME', 'Diplôme maison supplémentaire')
        self.assertEqual(ctx.exception.code, 'TROP_DE_DEMANDES')
        # Un autre compte n'est pas concerné.
        self.demande('Diplôme maison supplémentaire', utilisateur=self.candidat2)

    def test_une_demande_traitee_libere_le_quota(self):
        demandes = [self.demande(f'Diplôme maison numéro {chr(97 + i)}') for i in range(MAX_EXPLICITES_OUVERTES)]
        refuser_demande(demandes[0], self.admin, 'Hors périmètre')
        self.demande('Diplôme maison supplémentaire')

    def test_quota_de_demandes_implicites_sur_24_heures(self):
        D.objects.bulk_create([
            D(type='DIPLOME', libelle=f'Entrée {i}', cle_recherche=f'entree {i}', explicite=False,
              origine='CANDIDAT', premier_demandeur=self.candidat)
            for i in range(MAX_IMPLICITES_PAR_JOUR)
        ])
        with self.assertRaises(DemandeRefusee) as ctx:
            creer_demande(self.candidat, 'DIPLOME', 'Licence professionnelle', explicite=False)
        self.assertEqual(ctx.exception.code, 'TROP_DE_DEMANDES')
        # Rejoindre une demande déjà ouverte ne compte pas dans ce plafond.
        D.objects.filter(cle_recherche='entree 0').update(premier_demandeur=self.candidat2)
        creer_demande(self.candidat, 'DIPLOME', 'Licence professionnelle', explicite=False)

    def test_la_base_interdit_deux_demandes_ouvertes_identiques(self):
        self.demande('Licence professionnelle')
        with self.assertRaises(IntegrityError), transaction.atomic():
            D.objects.create(type='DIPLOME', libelle='x', cle_recherche=normaliser_recherche('Licence professionnelle'),
                             origine='CANDIDAT')


class AcceptationTests(ReferentielTestCase):
    def test_accepter_un_diplome_cree_l_entree_officielle(self):
        demande = self.demande('Licence professionnelle')
        acceptee = accepter_demande(demande, self.admin, parent='superieur_lmd')
        diplome = TypeDiplome.objects.get(code=f'TAF-DIP-{demande.pk}')
        self.assertEqual((diplome.libelle, diplome.systeme, diplome.selectionnable), ('Licence professionnelle', 'superieur_lmd', True))
        self.assertEqual(
            (acceptee.statut, acceptee.entree_id, acceptee.entree_libelle, acceptee.traite_par),
            (D.STATUT_ACCEPTEE, diplome.pk, 'Licence professionnelle', self.admin),
        )
        self.assertIsNotNone(acceptee.date_decision)

    def test_le_libelle_corrige_garde_l_ecriture_d_origine_comme_alias(self):
        demande = self.demande('licence pro')
        accepter_demande(demande, self.admin, libelle='Licence professionnelle', parent='superieur_lmd')
        diplome = TypeDiplome.objects.get(code=f'TAF-DIP-{demande.pk}')
        self.assertEqual(diplome.libelle, 'Licence professionnelle')
        alias = AliasDiplome.objects.get(diplome=diplome)
        self.assertEqual(alias.cle_recherche, normaliser_recherche('licence pro'))

    def test_accepter_un_diplome_exige_un_systeme_connu(self):
        demande = self.demande('Licence professionnelle')
        for parent in (None, '', 'inconnu', 'autre'):
            with self.assertRaises(ValueError):
                accepter_demande(demande, self.admin, parent=parent)
        demande.refresh_from_db()
        self.assertEqual(demande.statut, D.STATUT_A_EXAMINER)
        self.assertFalse(TypeDiplome.objects.filter(code__startswith='TAF-').exists())

    def test_accepter_un_libelle_deja_officiel_est_refuse(self):
        demande = self.demande('Licence professionnelle')
        with self.assertRaises(ValueError):
            accepter_demande(demande, self.admin, libelle='Licence', parent='superieur_lmd')

    def test_accepter_une_specialite_cree_l_entree_et_les_couples(self):
        filiere = FiliereFormation.objects.create(code='FIL-1', domaine=self.domaine, libelle='Réseaux', cle_recherche='reseaux')
        demande = self.demande('Cybersécurité', D.TYPE_SPECIALITE)
        acceptee = accepter_demande(
            demande, self.admin, parent=self.domaine.pk,
            options={'filiere_id': filiere.pk, 'diplomes_ids': [self.licence.pk]},
        )
        specialite = SpecialiteFormation.objects.get(code=f'TAF-SPE-{demande.pk}')
        self.assertEqual((specialite.domaine, specialite.filiere, specialite.selectionnable), (self.domaine, filiere, True))
        self.assertEqual(specialite.cle_recherche, normaliser_recherche('Cybersécurité'))
        self.assertTrue(DiplomeSpecialite.objects.filter(diplome=self.licence, specialite=specialite).exists())
        self.assertEqual((acceptee.statut, acceptee.entree_id), (D.STATUT_ACCEPTEE, specialite.pk))

    def test_accepter_une_specialite_controle_domaine_filiere_et_diplomes(self):
        autre_domaine = DomaineFormation.objects.create(code='DOM-2', libelle='Santé', systeme='superieur_lmd')
        filiere_autre = FiliereFormation.objects.create(code='FIL-2', domaine=autre_domaine, libelle='Soins', cle_recherche='soins')
        demande = self.demande('Cybersécurité', D.TYPE_SPECIALITE)
        cas = [
            {'parent': None},
            {'parent': self.domaine_autre.pk},
            {'parent': 99999},
            {'parent': self.domaine.pk, 'options': {'filiere_id': filiere_autre.pk}},
            {'parent': self.domaine.pk, 'options': {'diplomes_ids': [99999]}},
            {'parent': self.domaine.pk, 'options': {'diplomes_ids': [self.autre.pk]}},
        ]
        for arguments in cas:
            with self.assertRaises(ValueError, msg=str(arguments)):
                accepter_demande(demande, self.admin, **arguments)
        self.assertFalse(SpecialiteFormation.objects.filter(code__startswith='TAF-').exists())


class RattachementTests(ReferentielTestCase):
    def test_rattacher_un_diplome_cree_un_alias(self):
        demande = self.demande('Licence pro')
        rattachee = rattacher_demande(demande, self.admin, self.licence.pk)
        alias = AliasDiplome.objects.get(code=f'TAF-AD-{demande.pk}')
        self.assertEqual((alias.diplome, alias.cle_recherche), (self.licence, normaliser_recherche('Licence pro')))
        self.assertEqual((rattachee.statut, rattachee.entree_id, rattachee.entree_libelle), (D.STATUT_RATTACHEE, self.licence.pk, 'Licence'))

    def test_rattacher_une_specialite_cree_un_alias(self):
        demande = self.demande('Développement logiciel', D.TYPE_SPECIALITE)
        rattacher_demande(demande, self.admin, self.specialite.pk)
        alias = AliasSpecialite.objects.get(code=f'TAF-AS-{demande.pk}')
        self.assertEqual((alias.specialite, alias.type_alias), (self.specialite, 'demande'))

    def test_cible_invalide_refusee(self):
        demande = self.demande('Licence pro')
        for cible in (None, 0, 99999, self.autre.pk):
            with self.assertRaises(ValueError):
                rattacher_demande(demande, self.admin, cible)
        self.assertFalse(AliasDiplome.objects.filter(code__startswith='TAF-').exists())

    def test_cible_masquee_refusee(self):
        TypeDiplome.objects.filter(pk=self.licence.pk).update(selectionnable=False)
        with self.assertRaises(ValueError):
            rattacher_demande(self.demande('Licence pro'), self.admin, self.licence.pk)


class RefusEtTransitionsTests(ReferentielTestCase):
    def test_refus_avec_motif_obligatoire(self):
        demande = self.demande()
        for motif in (None, '', '  ', 'non', 'x' * 501):
            with self.assertRaises(ValueError):
                refuser_demande(demande, self.admin, motif)
        refusee = refuser_demande(demande, self.admin, 'Existe déjà sous un autre nom')
        self.assertEqual((refusee.statut, refusee.motif_refus, refusee.traite_par), (D.STATUT_REFUSEE, 'Existe déjà sous un autre nom', self.admin))

    def test_une_demande_refusee_peut_etre_reexaminee(self):
        demande = self.demande('Licence pro')
        refuser_demande(demande, self.admin, 'Trop vague')
        rattachee = rattacher_demande(demande, self.admin, self.licence.pk)
        self.assertEqual((rattachee.statut, rattachee.motif_refus), (D.STATUT_RATTACHEE, ''))

    def test_une_demande_acceptee_ou_rattachee_est_terminale(self):
        acceptee = accepter_demande(self.demande('Licence professionnelle'), self.admin, parent='superieur_lmd')
        rattachee = rattacher_demande(self.demande('Licence pro'), self.admin, self.licence.pk)
        for demande in (acceptee, rattachee):
            with self.assertRaises(ValueError):
                refuser_demande(demande, self.admin, 'Trop tard')
            with self.assertRaises(ValueError):
                rattacher_demande(demande, self.admin, self.licence.pk)
            with self.assertRaises(ValueError):
                accepter_demande(demande, self.admin, parent='superieur_lmd')


class NotificationTests(ReferentielTestCase):
    def test_une_demande_explicite_notifie_tous_les_demandeurs(self):
        demande = self.demande('Licence pro')
        creer_demande(self.candidat2, 'DIPLOME', 'Licence pro')
        rattacher_demande(demande, self.admin, self.licence.pk)
        notifications = Notification.objects.filter(titre='Demande rattachée')
        self.assertEqual({n.destinataire for n in notifications}, {self.candidat, self.candidat2})
        self.assertIn('Licence', notifications.first().message)

    def test_le_refus_envoie_le_motif(self):
        refuser_demande(self.demande(), self.admin, 'Hors périmètre')
        message = Notification.objects.get(destinataire=self.candidat).message
        self.assertIn('Hors périmètre', message)

    def test_une_demande_implicite_ne_notifie_personne(self):
        demande = self.demande('Licence professionnelle', explicite=False)
        accepter_demande(demande, self.admin, parent='superieur_lmd')
        self.assertFalse(Notification.objects.exists())


class EffetsTests(ReferentielTestCase):
    def formation(self, diplome='Licence pro', **champs):
        return FormationCandidat.objects.create(
            profil=self.candidat.profil_candidat, diplome=diplome, etablissement='Université', statut='OBTENU', **champs,
        )

    def test_rattacher_un_diplome_met_a_jour_les_formations_liees(self):
        demande = self.demande('Licence pro')
        liee = self.formation(diplome_ref=self.autre, demande_diplome=demande)
        autre_formation = self.formation(diplome='Master', diplome_ref=self.autre)
        rattacher_demande(demande, self.admin, self.licence.pk)
        liee.refresh_from_db()
        autre_formation.refresh_from_db()
        self.assertEqual(liee.diplome_ref, self.licence)
        self.assertEqual(liee.statut_validation, 'DECLARE')
        self.assertEqual(autre_formation.diplome_ref, self.autre)

    def test_accepter_une_specialite_met_a_jour_les_formations_liees(self):
        demande = self.demande('Cybersécurité', D.TYPE_SPECIALITE)
        liee = self.formation(diplome_ref=self.licence, demande_specialite=demande)
        accepter_demande(demande, self.admin, parent=self.domaine.pk)
        liee.refresh_from_db()
        self.assertEqual(liee.specialite_ref.code, f'TAF-SPE-{demande.pk}')

    def test_refuser_un_diplome_marque_les_formations_liees_refusees(self):
        demande = self.demande('Licence pro')
        liee = self.formation(diplome_ref=self.autre, demande_diplome=demande)
        refuser_demande(demande, self.admin, 'Pas un diplôme')
        liee.refresh_from_db()
        self.assertEqual(
            (liee.statut_validation, liee.motif_refus, liee.refusee_par), ('REFUSEE', 'Pas un diplôme', self.admin),
        )
        self.assertIsNotNone(liee.date_refus)

    def test_refuser_une_specialite_ne_touche_pas_a_la_formation(self):
        demande = self.demande('Cybersécurité', D.TYPE_SPECIALITE)
        liee = self.formation(diplome_ref=self.licence, demande_specialite=demande)
        refuser_demande(demande, self.admin, 'Trop vague')
        liee.refresh_from_db()
        self.assertEqual(liee.statut_validation, 'DECLARE')

    def test_aucune_decision_ne_modifie_une_offre(self):
        entreprise = ProfilEntreprise.objects.create(
            user=User.objects.create_user(username='rh', email='rh@test.dz', role='RECRUTEUR'),
            nom_entreprise='ACME', registre_commerce='RC1', est_approuvee=True,
        )
        OffreEmploi.objects.create(
            entreprise=entreprise, titre='Poste', wilaya='16 - Alger', experience_requise='DEBUTANT', statut_moderation='APPROUVEE',
        )
        avant = list(OffreEmploi.objects.values())
        accepter_demande(self.demande('Licence professionnelle'), self.admin, parent='superieur_lmd')
        rattacher_demande(self.demande('Licence pro'), self.admin, self.licence.pk)
        refuser_demande(self.demande('Master pro'), self.admin, 'Hors périmètre')
        self.assertEqual(list(OffreEmploi.objects.values()), avant)

    def test_une_demande_ne_change_aucune_formation_avant_decision(self):
        demande = self.demande('Licence pro')
        liee = self.formation(diplome_ref=self.autre, demande_diplome=demande)
        liee.refresh_from_db()
        self.assertEqual(liee.diplome_ref, self.autre)
        self.assertEqual(demande.statut, D.STATUT_A_EXAMINER)
