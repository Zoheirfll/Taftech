from django.db import migrations


def seed_faq_paliers(apps, schema_editor):
    FaqItem = apps.get_model('jobs', 'FaqItem')
    QUESTIONS = [
        dict(question="Puis-je changer de formule à tout moment ?",
             reponse="Oui, vous pouvez upgrader ou downgrader votre abonnement à tout moment depuis la page Abonnements & tarifs.",
             ordre=1),
        dict(question="Y a-t-il un engagement ?",
             reponse="Aucun engagement — résiliez quand vous le souhaitez. Votre palier reste actif jusqu'à la fin de la période déjà payée.",
             ordre=2),
        dict(question="Le paiement est-il sécurisé ?",
             reponse="Oui, tous les paiements sont 100% sécurisés via notre prestataire de paiement en ligne.",
             ordre=3),
        dict(question="Comment fonctionne le renouvellement ?",
             reponse="Votre abonnement se renouvelle automatiquement chaque mois ou chaque année selon la formule choisie, sauf désactivation du renouvellement automatique.",
             ordre=4),
        dict(question="Puis-je avoir une facture ?",
             reponse="Oui, une facture est générée automatiquement à chaque paiement, disponible dans la section Facturation.",
             ordre=5),
    ]
    for data in QUESTIONS:
        FaqItem.objects.get_or_create(
            categorie='PALIERS', question=data['question'],
            defaults={'reponse': data['reponse'], 'ordre': data['ordre'], 'actif': True},
        )


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0081_profilentreprise_mise_en_avant_accueil_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_faq_paliers, reverse_noop),
    ]
