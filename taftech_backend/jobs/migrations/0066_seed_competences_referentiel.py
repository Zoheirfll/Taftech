from django.db import migrations


# Liste de démarrage — compétences génériques les plus courantes sur le marché algérien
# (techniques + transverses), pour que l'autocomplete ne soit pas vide au lancement.
# L'admin peut en ajouter/retirer librement ensuite via le panel.
COMPETENCES_DEPART = [
    "Microsoft Excel", "Microsoft Word", "Microsoft PowerPoint", "Comptabilité",
    "Gestion de projet", "Communication", "Travail en équipe", "Leadership",
    "Résolution de problèmes", "Négociation", "Anglais professionnel", "Français professionnel",
    "Arabe professionnel", "Python", "JavaScript", "Java", "PHP", "SQL", "React", "Django",
    "Gestion du temps", "Sens de l'organisation", "Autonomie", "Rigueur", "Adaptabilité",
    "Service client", "Vente", "Marketing digital", "Réseaux sociaux", "SEO",
    "Ressources humaines", "Recrutement", "Droit du travail", "Génie civil", "AutoCAD",
    "Électricité industrielle", "Maintenance mécanique", "Logistique", "Supply chain",
    "Contrôle qualité", "Sécurité au travail (HSE)",
]


def seed(apps, schema_editor):
    CompetenceReferentiel = apps.get_model('jobs', 'CompetenceReferentiel')
    if CompetenceReferentiel.objects.exists():
        return
    CompetenceReferentiel.objects.bulk_create([
        CompetenceReferentiel(label=label, actif=True) for label in COMPETENCES_DEPART
    ])


def reverse_seed(apps, schema_editor):
    apps.get_model('jobs', 'CompetenceReferentiel').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0065_competencereferentiel'),
    ]

    operations = [
        migrations.RunPython(seed, reverse_seed),
    ]
