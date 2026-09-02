from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0098_seed_credit_packs'),
    ]

    operations = [
        migrations.AddField(
            model_name='profilcandidat',
            name='sexe',
            field=models.CharField(blank=True, choices=[('HOMME', 'Homme'), ('FEMME', 'Femme')], max_length=10, null=True, verbose_name='Sexe'),
        ),
    ]
