from django.db import migrations


def seed_paliers_et_migrer_premium(apps, schema_editor):
    Palier = apps.get_model('jobs', 'Palier')
    AbonnementEntreprise = apps.get_model('jobs', 'AbonnementEntreprise')
    ProfilEntreprise = apps.get_model('jobs', 'ProfilEntreprise')

    # Texte dupliqué en dur ici (pas d'import du code applicatif) — une migration doit rester
    # un instantané figé, indépendant d'une future modification des valeurs par défaut dans le
    # code (même principe que la migration 0075 documentée dans CLAUDE.md).
    PALIERS = [
        dict(nom='STARTER', prix_mensuel_da=5900, prix_annuel_da=70800,
             limite_offres=5, limite_cv_mois=10, acces_coordonnees=False,
             acces_ia_recommandes=False, acces_ia_avancee=False, acces_equipe=False,
             support_label='Essentiel', ordre=1, actif=True),
        dict(nom='PRO', prix_mensuel_da=12900, prix_annuel_da=154800,
             limite_offres=15, limite_cv_mois=None, acces_coordonnees=True,
             acces_ia_recommandes=True, acces_ia_avancee=False, acces_equipe=False,
             support_label='Prioritaire', ordre=2, actif=True),
        dict(nom='BUSINESS', prix_mensuel_da=22900, prix_annuel_da=274800,
             limite_offres=None, limite_cv_mois=None, acces_coordonnees=True,
             acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True,
             support_label='Prioritaire + dédié', ordre=3, actif=True),
        dict(nom='ENTERPRISE', prix_mensuel_da=None, prix_annuel_da=None,
             limite_offres=None, limite_cv_mois=None, acces_coordonnees=True,
             acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True,
             support_label='Dédié 24/7', ordre=4, actif=True),
    ]
    for data in PALIERS:
        Palier.objects.get_or_create(nom=data['nom'], defaults=data)

    business = Palier.objects.get(nom='BUSINESS')
    for entreprise in ProfilEntreprise.objects.filter(est_premium=True):
        AbonnementEntreprise.objects.get_or_create(
            entreprise=entreprise,
            defaults={
                'palier': business,
                'date_expiration': entreprise.premium_expire_at,
            },
        )


def reverse_noop(apps, schema_editor):
    # Pas de suppression automatique en reverse — reproduire un seed/backfill est une opération
    # à sens unique, cohérent avec le pattern déjà établi dans ce projet (migrations 0062/0064/0066/0070).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0079_palier_abonnemententreprise'),
    ]

    operations = [
        migrations.RunPython(seed_paliers_et_migrer_premium, reverse_noop),
    ]
