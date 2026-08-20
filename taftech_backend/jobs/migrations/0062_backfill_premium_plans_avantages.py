from django.db import migrations


PLANS = [
    (1, "1 mois", 2000, False, 0),
    (3, "3 mois", 6000, False, 1),
    (6, "6 mois", 11040, True, 2),
    (12, "12 mois", 19920, False, 3),
]

AVANTAGES = [
    ("Mail", "Coordonnées candidats", "Email et téléphone visibles directement dans chaque profil de la CVthèque.", 0),
    ("Download", "Téléchargement des CV", "Téléchargez le CV PDF de n'importe quel candidat en un clic.", 1),
    ("SlidersHorizontal", "Recherche avancée", "Filtrez par diplôme, mobilité, langues, compétences, disponibilité et plus encore.", 2),
    ("Sparkles", "Analyses IA", "Score de matching détaillé et résumé automatique de chaque candidature.", 3),
    ("Heart", "Profils favoris", "Enregistrez vos candidats préférés pour les retrouver en un clic.", 4),
    ("Headset", "Support prioritaire", "Réponse sous 24h par email à taftech963@gmail.com.", 5),
]


def backfill(apps, schema_editor):
    PremiumPlan = apps.get_model('jobs', 'PremiumPlan')
    PremiumAvantage = apps.get_model('jobs', 'PremiumAvantage')

    if not PremiumPlan.objects.exists():
        for nb_mois, label, prix_da, populaire, ordre in PLANS:
            PremiumPlan.objects.create(
                nb_mois=nb_mois, label=label, prix_da=prix_da,
                populaire=populaire, actif=True, ordre=ordre,
            )

    if not PremiumAvantage.objects.exists():
        for icone, titre, description, ordre in AVANTAGES:
            PremiumAvantage.objects.create(
                icone=icone, titre=titre, description=description,
                ordre=ordre, actif=True,
            )


def reverse_backfill(apps, schema_editor):
    apps.get_model('jobs', 'PremiumPlan').objects.all().delete()
    apps.get_model('jobs', 'PremiumAvantage').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0061_premiumavantage_premiumplan'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse_backfill),
    ]
