from django.db import migrations


def backfill_abonnements_manquants(apps, schema_editor):
    """Filet de sécurité avant suppression du système Premium legacy (est_premium/
    premium_expire_at) : la migration 0080 avait déjà basculé toutes les entreprises
    est_premium=True vers un AbonnementEntreprise(palier=BUSINESS) au moment de son
    exécution, mais toute activation Premium legacy faite APRÈS 0080 (via
    AdminDemandesPremiumAPIView ou l'ancien webhook Chargily nb_mois, tous deux encore
    actifs jusqu'à cette session) n'a pas forcément créé d'AbonnementEntreprise. On
    rejoue le même backfill idempotent (get_or_create) juste avant de supprimer les
    champs legacy, pour ne perdre aucun compte réellement premium.

    Texte/valeurs dupliqués en dur ici (pas d'import du code applicatif) — pattern déjà
    établi dans ce projet pour toute migration de données (voir migration 0080, 0075
    documentées dans CLAUDE.md)."""
    Palier = apps.get_model('jobs', 'Palier')
    AbonnementEntreprise = apps.get_model('jobs', 'AbonnementEntreprise')
    ProfilEntreprise = apps.get_model('jobs', 'ProfilEntreprise')

    business, _ = Palier.objects.get_or_create(
        nom='BUSINESS',
        defaults=dict(
            prix_mensuel_da=22900, prix_annuel_da=274800,
            limite_offres=None, limite_cv_mois=None, acces_coordonnees=True,
            acces_ia_recommandes=True, acces_ia_avancee=True, acces_equipe=True,
            support_label='Prioritaire + dédié', ordre=3, actif=True,
        ),
    )

    for entreprise in ProfilEntreprise.objects.filter(est_premium=True):
        AbonnementEntreprise.objects.get_or_create(
            entreprise=entreprise,
            defaults={
                'palier': business,
                'date_expiration': entreprise.premium_expire_at,
            },
        )


def reverse_noop(apps, schema_editor):
    # Backfill à sens unique — même pattern que 0080/0062/0064/0066/0070.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0089_offreemploi_date_cloture'),
    ]

    operations = [
        migrations.RunPython(backfill_abonnements_manquants, reverse_noop),
    ]
