from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0094_backfill_credits_mois'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='palier',
            name='limite_cv_mois',
        ),
    ]
