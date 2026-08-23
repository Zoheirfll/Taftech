from django.db import migrations

TYPES_DEPART = ["CV", "Diplôme", "Attestation", "Lettre de motivation", "Certificat"]


def seed(apps, schema_editor):
    TypeDocument = apps.get_model('jobs', 'TypeDocument')
    for i, label in enumerate(TYPES_DEPART):
        TypeDocument.objects.get_or_create(label=label, defaults={'ordre': i})


def inverser(apps, schema_editor):
    TypeDocument = apps.get_model('jobs', 'TypeDocument')
    TypeDocument.objects.filter(label__in=TYPES_DEPART).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0076_configrendezvous_disponibiliterecurrente_jourbloque_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, inverser),
    ]
