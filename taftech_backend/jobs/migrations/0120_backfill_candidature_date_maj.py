from django.db import migrations
from django.db.models import F


def backfill_date_maj(apps, schema_editor):
    """La migration 0119 (AddField auto_now=True) a rempli date_maj avec l'instant
    de la migration pour toutes les candidatures déjà en base — donnant l'impression
    fausse que toutes venaient d'être mises à jour. On réaligne sur date_postulation
    (pas de vraie mise à jour connue avant ce déploiement), .update() bypass auto_now."""
    Candidature = apps.get_model('jobs', 'Candidature')
    Candidature.objects.update(date_maj=F('date_postulation'))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0119_candidature_date_maj'),
    ]

    operations = [
        migrations.RunPython(backfill_date_maj, noop),
    ]
