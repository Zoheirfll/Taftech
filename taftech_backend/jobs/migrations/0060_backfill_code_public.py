import random
import string

from django.db import migrations


def generer_codes(apps, schema_editor):
    OffreEmploi = apps.get_model('jobs', 'OffreEmploi')
    alphabet = string.ascii_lowercase + string.digits
    codes_utilises = set(
        OffreEmploi.objects.exclude(code_public__isnull=True).values_list('code_public', flat=True)
    )
    for offre in OffreEmploi.objects.filter(code_public__isnull=True):
        code = ''.join(random.choices(alphabet, k=6))
        while code in codes_utilises:
            code = ''.join(random.choices(alphabet, k=6))
        codes_utilises.add(code)
        offre.code_public = code
        offre.save(update_fields=['code_public'])


def inverser(apps, schema_editor):
    OffreEmploi = apps.get_model('jobs', 'OffreEmploi')
    OffreEmploi.objects.update(code_public=None)


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0059_offreemploi_code_public'),
    ]

    operations = [
        migrations.RunPython(generer_codes, inverser),
    ]
