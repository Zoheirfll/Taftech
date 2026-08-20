from django.db import migrations


FAQ_ITEMS = [
    ("GENERAL", 0, "Comment postuler à une offre d'emploi ?",
     "Créez un profil candidat gratuit, complétez vos expériences et votre CV, puis postulez directement depuis la page de l'offre — en un clic si votre profil est complet."),
    ("GENERAL", 1, "Vos services sont-ils gratuits pour les candidats ?",
     "Oui, l'inscription, la recherche d'offres, le matching IA et la candidature sont entièrement gratuits pour les candidats."),
    ("GENERAL", 2, "Comment fonctionne le matching IA ?",
     "Notre algorithme compare votre profil (spécialité, diplôme, expérience, région, compétences) à chaque offre et calcule un score de compatibilité en temps réel."),
    ("GENERAL", 3, "Comment une entreprise peut-elle publier une offre ?",
     "Inscrivez votre entreprise, attendez la validation par notre équipe, puis publiez vos offres depuis votre tableau de bord recruteur."),

    ("RECRUTEUR", 0, "L'inscription est-elle gratuite ?",
     "Oui, la création de compte et la publication d'offres sont gratuites au lancement. Certaines fonctionnalités avancées (CVthèque, analyse IA) nécessitent un abonnement Premium."),
    ("RECRUTEUR", 1, "Combien de temps faut-il pour valider mon entreprise ?",
     "La validation de votre registre de commerce prend généralement moins de 24h ouvrables. Vous recevez un email de confirmation dès que votre compte est approuvé."),
    ("RECRUTEUR", 2, "Comment fonctionne le score de matching IA ?",
     "Chaque candidature reçoit un score de 0 à 100% basé sur 5 critères : spécialité (25pts), diplôme (20pts), expérience (20pts), région (20pts) et compétences (15pts). L'algorithme utilise la correspondance sémantique et les synonymes métier."),
    ("RECRUTEUR", 3, "Mes données et celles des candidats sont-elles sécurisées ?",
     "TAFTECH est 100% conforme à la loi algérienne 18-07 sur la protection des données personnelles. Les données sont stockées sur des serveurs localisés en Algérie. Aucune donnée n'est revendue à des tiers."),
    ("RECRUTEUR", 4, "Puis-je inviter des collaborateurs sur mon espace recruteur ?",
     "Oui, avec l'abonnement Premium vous pouvez inviter des membres avec des rôles distincts (Admin, Utilisateur, Invité) pour gérer les offres et candidatures en équipe."),
    ("RECRUTEUR", 5, "Que se passe-t-il si une offre est rejetée par la modération ?",
     "Vous recevez une notification avec le motif de rejet. Vous pouvez corriger l'offre directement depuis votre tableau de bord et la resoumettre en un clic."),

    ("PREMIUM", 0, "Que se passe-t-il à l'expiration de mon abonnement ?",
     "Votre accès aux fonctionnalités Premium (CVthèque, analyse IA) est suspendu. Vos données et offres restent intactes. Les membres de votre équipe ne peuvent plus se connecter jusqu'au renouvellement."),
    ("PREMIUM", 1, "Puis-je prolonger mon abonnement avant qu'il expire ?",
     "Oui. La durée s'ajoute à la fin de votre abonnement actuel — vous ne perdez aucun jour."),
    ("PREMIUM", 2, "Le paiement est-il sécurisé ?",
     "Oui. Le paiement est traité par Chargily Pay, la plateforme de paiement algérienne agréée. TAFTECH ne stocke aucune information bancaire."),
    ("PREMIUM", 3, "Quand mon accès Premium est-il activé ?",
     "L'activation est automatique après confirmation du paiement, en quelques secondes via le système webhook de Chargily."),
]


def backfill(apps, schema_editor):
    FaqItem = apps.get_model('jobs', 'FaqItem')
    if FaqItem.objects.exists():
        return
    for categorie, ordre, question, reponse in FAQ_ITEMS:
        FaqItem.objects.create(
            categorie=categorie, ordre=ordre, question=question, reponse=reponse, actif=True,
        )


def reverse_backfill(apps, schema_editor):
    apps.get_model('jobs', 'FaqItem').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0063_faqitem'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse_backfill),
    ]
