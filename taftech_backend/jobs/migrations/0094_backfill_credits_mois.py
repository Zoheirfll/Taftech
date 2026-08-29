from django.db import migrations


def backfill_credits_mois(apps, schema_editor):
    """Copie la valeur actuelle de limite_cv_mois vers le nouveau champ credits_mois avant
    suppression de l'ancien champ — le nombre de crédits mensuels d'un palier reste
    identique à son ancien quota de téléchargements CV, seule la sémantique change
    (crédit = accès complet, pas juste un téléchargement)."""
    Palier = apps.get_model('jobs', 'Palier')
    for palier in Palier.objects.all():
        palier.credits_mois = palier.limite_cv_mois
        palier.save(update_fields=['credits_mois'])


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0093_palier_credits_mois_add'),
    ]

    operations = [
        migrations.RunPython(backfill_credits_mois, reverse_noop),
    ]
