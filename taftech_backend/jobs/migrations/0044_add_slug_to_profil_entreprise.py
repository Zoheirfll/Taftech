from django.db import migrations, models
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    ProfilEntreprise = apps.get_model('jobs', 'ProfilEntreprise')
    for entreprise in ProfilEntreprise.objects.all():
        base = slugify(entreprise.nom_entreprise) or f"entreprise-{entreprise.pk}"
        slug = base
        n = 1
        while ProfilEntreprise.objects.filter(slug=slug).exclude(pk=entreprise.pk).exists():
            slug = f"{base}-{n}"
            n += 1
        entreprise.slug = slug
        entreprise.save()


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0043_add_equipe_action_log'),
    ]

    operations = [
        # 1. Ajouter le champ sans unique (crée le _like index une seule fois)
        migrations.AddField(
            model_name='profilentreprise',
            name='slug',
            field=models.SlugField(blank=True, max_length=180, verbose_name='Slug URL'),
        ),
        # 2. Peupler les slugs existants
        migrations.RunPython(populate_slugs, migrations.RunPython.noop),
        # 3. Ajouter la contrainte unique séparément (pas d'AlterField qui recrée le _like)
        migrations.RunSQL(
            sql='ALTER TABLE jobs_profilentreprise ADD CONSTRAINT jobs_profilentreprise_slug_unique UNIQUE (slug)',
            reverse_sql='ALTER TABLE jobs_profilentreprise DROP CONSTRAINT IF EXISTS jobs_profilentreprise_slug_unique',
        ),
    ]
