from django.db import migrations

# (question, ancien texte exact, nouveau texte). On ne remplace que si l'admin n'a pas déjà
# modifié la réponse : un texte personnalisé n'est jamais écrasé.
CORRECTIONS = [
    (
        "L'inscription est-elle gratuite ?",
        "Oui, la création de compte et la publication d'offres sont gratuites au lancement. "
        "Certaines fonctionnalités avancées (CVthèque, analyse IA) nécessitent un abonnement Premium.",
        "Oui, la création de compte est gratuite. La formule Gratuite est permanente (ce n'est pas une "
        "offre de lancement) : elle permet de publier 1 offre active, sans limite de durée. Pour publier "
        "davantage d'offres et accéder à la CVthèque ou à l'analyse IA, choisissez une formule Starter, "
        "Pro ou Business (voir la page Abonnements & tarifs).",
    ),
    (
        "Puis-je inviter des collaborateurs sur mon espace recruteur ?",
        "Oui, avec l'abonnement Premium vous pouvez inviter des membres avec des rôles distincts "
        "(Admin, Utilisateur, Invité) pour gérer les offres et candidatures en équipe.",
        "Oui, avec une formule incluant la gestion d'équipe (Business ou Enterprise) vous pouvez inviter "
        "des membres avec des rôles distincts (Admin, Utilisateur, Invité) pour gérer les offres et "
        "candidatures en équipe.",
    ),
]


def corriger_faq(apps, schema_editor):
    FaqItem = apps.get_model("jobs", "FaqItem")
    for question, ancien, nouveau in CORRECTIONS:
        FaqItem.objects.filter(categorie="RECRUTEUR", question=question, reponse=ancien).update(reponse=nouveau)


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0131_competence_referentiel_statut"),
    ]

    operations = [
        migrations.RunPython(corriger_faq, migrations.RunPython.noop),
    ]
