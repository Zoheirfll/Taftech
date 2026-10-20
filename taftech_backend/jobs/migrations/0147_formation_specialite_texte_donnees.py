"""Reprise des données : avant 0146, le texte de « Autre spécialité » vivait dans `description`.

Seules les formations dont la spécialité est réellement en attente (vrai diplôme, aucune spécialité de
référence, statut « à préciser ») reçoivent leur texte dans `specialite_texte`. `description` n'est jamais
modifiée (instantané figé : aucune dépendance au code applicatif)."""
from django.db import migrations

LONGUEUR_MAX = 200


def copier_texte_specialite(apps, schema_editor):
    Formation = apps.get_model('jobs', 'FormationCandidat')
    en_attente = Formation.objects.filter(
        statut_validation='A_PRECISER', specialite_ref__isnull=True, diplome_ref__isnull=False,
    ).exclude(description__isnull=True).exclude(description='')
    for formation in en_attente:
        texte = ' '.join(formation.description.split())[:LONGUEUR_MAX]
        Formation.objects.filter(pk=formation.pk).update(specialite_texte=texte)


class Migration(migrations.Migration):
    dependencies = [('jobs', '0146_formation_specialite_texte')]

    operations = [migrations.RunPython(copier_texte_specialite, migrations.RunPython.noop)]
