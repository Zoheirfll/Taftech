"""Lien entre les demandes d'ajout de métier et le profil du candidat (21/10/2026) : un métier proposé via
« Je ne trouve pas mon métier » reste sélectionné sur l'expérience ou le profil en attendant la décision de
l'admin, comme une spécialité « Autre » sur une formation.

Règle de sécurité : ce lien n'est JAMAIS un critère de calcul. Le matching ne lit que `metier` et
`metier_souhaite` (champs officiels) ; tant que la demande n'est pas acceptée ou rattachée, ces champs restent
vides. Accepté ou rattaché : le métier officiel est posé et le lien retiré ; refusé : le lien reste pour afficher
le motif au candidat, sans aucun effet sur le score."""
from ..models import Appellation, DemandeAjout, ExperienceCandidat, Metier, ProfilCandidat


def demande_metier_utilisable(demande, utilisateur):
    """Une demande de métier encore ouverte dont `utilisateur` est l'un des demandeurs : la seule qu'un
    candidat peut lier à son profil (jamais la demande d'un autre compte, ni d'un autre type)."""
    return (
        demande is not None
        and demande.type == DemandeAjout.TYPE_METIER
        and demande.statut == DemandeAjout.STATUT_A_EXAMINER
        and demande.demandeurs.filter(pk=utilisateur.pk).exists()
    )


def resume_demande_metier(demande):
    """Ce que le candidat voit de sa proposition : libellé, statut et, si elle est refusée, le motif."""
    if demande is None:
        return None
    return {
        'id': demande.pk, 'libelle': demande.libelle, 'statut': demande.statut,
        'motif_refus': demande.motif_refus if demande.statut == DemandeAjout.STATUT_REFUSEE else '',
    }


def appliquer_metier_aux_candidats(demande, metier_id):
    """Décision acceptée ou rattachée : les expériences et profils liés reçoivent le métier officiel (et
    l'appellation créée par la décision), le lien est retiré et le cache de scores des candidats concernés
    est vidé pour que le calcul voie le nouveau métier tout de suite."""
    from ..matching_cache import invalider_scores_candidat

    metier = Metier.objects.get(pk=metier_id)
    appellation = Appellation.objects.filter(code=f"TAF-DA-{demande.pk}", metier=metier).first()
    candidats = set()

    for experience in ExperienceCandidat.objects.filter(demande_metier=demande).select_related('profil__user'):
        experience.metier = metier
        experience.appellation = appellation
        experience.demande_metier = None
        experience.save(update_fields=['metier', 'appellation', 'demande_metier'])
        candidats.add(experience.profil.user)

    for profil in ProfilCandidat.objects.filter(demande_metier=demande).select_related('user'):
        profil.metier, profil.metier_appellation, profil.demande_metier = metier, appellation, None
        profil.save(update_fields=['metier', 'metier_appellation', 'demande_metier'])
        candidats.add(profil.user)

    for profil in ProfilCandidat.objects.filter(demande_metier_souhaite=demande).select_related('user'):
        profil.metier_souhaite, profil.metier_souhaite_appellation, profil.demande_metier_souhaite = metier, appellation, None
        profil.save(update_fields=['metier_souhaite', 'metier_souhaite_appellation', 'demande_metier_souhaite'])
        candidats.add(profil.user)

    for utilisateur in candidats:
        invalider_scores_candidat(utilisateur)
