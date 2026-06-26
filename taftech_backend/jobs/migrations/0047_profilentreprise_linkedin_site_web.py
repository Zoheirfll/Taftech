from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0046_experiencecandidat_secteur'),
    ]

    operations = [
        migrations.AddField(
            model_name='profilentreprise',
            name='linkedin',
            field=models.URLField(blank=True, null=True, verbose_name='Lien LinkedIn entreprise'),
        ),
        migrations.AddField(
            model_name='profilentreprise',
            name='site_web',
            field=models.URLField(blank=True, null=True, verbose_name="Site web de l'entreprise"),
        ),
    ]
