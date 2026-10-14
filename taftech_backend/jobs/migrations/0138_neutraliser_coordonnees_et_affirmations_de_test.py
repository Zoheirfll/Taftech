"""Correction client n°21 : retire des textes déjà en base (pages CGU / Confidentialité / Formation
recruteur, FAQ, avantages de palier) les coordonnées de test et deux affirmations non justifiées
(« 100 % conforme », « plateforme de paiement agréée », « serveurs localisés en Algérie »).

Remplacements EXACTS : un texte déjà modifié par l'admin n'est jamais touché. Les coordonnées
réelles s'affichent désormais depuis Admin → Mentions légales et coordonnées (source unique)."""
from django.db import migrations

PAGES = {
    'cgu': [
        (" ou à l'adresse taftech963@gmail.com.", "."),
    ],
    'confidentialite': [
        ("<p>TafTech — Oran, Algérie — taftech963@gmail.com — 0770 123 440</p>",
         "<p>TafTech — nos coordonnées figurent sur la page Contact et dans les mentions légales.</p>"),
        ("contactez-nous par e-mail (taftech963@gmail.com) ou téléphone (0770 123 440).",
         "contactez-nous via la page Contact."),
    ],
    'formation-recruteur': [
        ("contactez-nous à taftech963@gmail.com pour toute question.",
         "contactez-nous via la page Contact pour toute question."),
    ],
}

FAQ = [
    ("TAFTECH est 100% conforme à la loi algérienne 18-07 sur la protection des données personnelles. "
     "Les données sont stockées sur des serveurs localisés en Algérie. Aucune donnée n'est revendue à des tiers.",
     "TAFTECH traite les données personnelles dans le cadre de la loi algérienne 18-07 relative à la protection "
     "des données à caractère personnel. Aucune donnée n'est revendue à des tiers."),
    ("Oui. Le paiement est traité par Chargily Pay, la plateforme de paiement algérienne agréée. "
     "TAFTECH ne stocke aucune information bancaire.",
     "Oui. Le paiement est traité par Chargily Pay, plateforme de paiement algérienne. "
     "TAFTECH ne stocke aucune information bancaire."),
    ("Oui, tous les paiements sont 100% sécurisés via notre prestataire de paiement en ligne.",
     "Oui, les paiements sont traités par notre prestataire de paiement en ligne."),
]

AVANTAGES = [
    ("Réponse sous 24h par email à taftech963@gmail.com.", "Réponse sous 24h par email."),
]


def neutraliser(apps, schema_editor):
    PageStatique = apps.get_model('jobs', 'PageStatique')
    for slug, remplacements in PAGES.items():
        for page in PageStatique.objects.filter(slug=slug):
            contenu = page.contenu_html
            for ancien, nouveau in remplacements:
                contenu = contenu.replace(ancien, nouveau)
            if contenu != page.contenu_html:
                # update() : évite save() du vrai modèle (nettoyage HTML) hors de la migration.
                PageStatique.objects.filter(pk=page.pk).update(contenu_html=contenu)

    FaqItem = apps.get_model('jobs', 'FaqItem')
    for ancien, nouveau in FAQ:
        FaqItem.objects.filter(reponse=ancien).update(reponse=nouveau)

    try:
        PremiumAvantage = apps.get_model('jobs', 'PremiumAvantage')
    except LookupError:
        return
    for ancien, nouveau in AVANTAGES:
        PremiumAvantage.objects.filter(description=ancien).update(description=nouveau)


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0137_mentions_legales_informations_societe'),
    ]

    operations = [
        migrations.RunPython(neutraliser, migrations.RunPython.noop),
    ]
