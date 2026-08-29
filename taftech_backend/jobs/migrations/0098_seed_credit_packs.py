from django.db import migrations


PACKS = [
    dict(nom='Pack 10', credits=10, prix_da=2500, ordre=1, actif=True),
    dict(nom='Pack 25', credits=25, prix_da=5500, ordre=2, actif=True),
    dict(nom='Pack 50', credits=50, prix_da=9900, ordre=3, actif=True),
]


def seed_packs(apps, schema_editor):
    CreditPack = apps.get_model('jobs', 'CreditPack')
    for data in PACKS:
        CreditPack.objects.get_or_create(nom=data['nom'], defaults=data)


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0097_equipeactionlog_debloquer_candidat'),
    ]

    operations = [
        migrations.RunPython(seed_packs, reverse_noop),
    ]
