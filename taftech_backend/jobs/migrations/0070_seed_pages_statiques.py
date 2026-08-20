from django.db import migrations


CGU_HTML = """
<p><strong>Version provisoire en attente de finalisation juridique complète (raison sociale, immatriculation).</strong> Le contenu ci-dessous reflète le fonctionnement actuel de TafTech et sera mis à jour dès que ces informations seront disponibles.</p>
<h2>Article 1 : Présentation de la plateforme</h2>
<p>TafTech est une plateforme de recrutement en ligne mettant en relation des candidats et des entreprises en Algérie, via un système de matching assisté par intelligence artificielle.</p>
<h2>Article 2 : Objet des CGU</h2>
<p>Les présentes Conditions Générales d'Utilisation ont pour objet de définir les modalités d'accès et d'utilisation de la plateforme TafTech par les candidats et les recruteurs.</p>
<h2>Article 3 : Services proposés</h2>
<p>Pour les candidats : création de profil, recherche d'offres, candidature en ligne, alertes emploi, suggestions de carrière. Pour les recruteurs : publication d'offres, gestion des candidatures, accès à la CVthèque (fonctionnalités Premium).</p>
<h2>Article 4 : Acceptation et mises à jour</h2>
<p>L'inscription sur TafTech implique l'acceptation pleine et entière des présentes CGU. Ces conditions peuvent être mises à jour ; les utilisateurs seront informés de toute modification substantielle.</p>
<h2>Article 5 : Comptes et responsabilités des utilisateurs</h2>
<p>Chaque utilisateur est responsable de l'exactitude des informations fournies et de la confidentialité de ses identifiants de connexion. Toute utilisation frauduleuse doit être signalée immédiatement.</p>
<h2>Article 6 : Propriété intellectuelle</h2>
<p>La marque TafTech, son logo et l'ensemble des éléments graphiques et techniques de la plateforme sont protégés. Les contenus publiés par les utilisateurs (CV, offres) restent leur propriété.</p>
<h2>Article 7 : Protection des données</h2>
<p>Le traitement des données personnelles est décrit en détail dans notre Politique de confidentialité, conforme à la loi algérienne n° 18-07.</p>
<h2>Article 8 : Responsabilités</h2>
<p>TafTech agit en tant qu'intermédiaire technique et ne garantit pas l'issue d'un recrutement. La véracité des offres publiées relève de la responsabilité des entreprises recruteuses.</p>
<h2>Article 9 : Résiliation des comptes</h2>
<p>Tout utilisateur peut demander la suppression de son compte à tout moment via les paramètres de son profil ou en contactant notre support.</p>
<h2>Article 10 : Contact</h2>
<p>Pour toute question relative aux présentes CGU, contactez-nous via la page Contact ou à l'adresse taftech963@gmail.com.</p>
<h2>Article 11 : Droit applicable</h2>
<p>Les présentes CGU sont soumises au droit algérien. Tout litige relève de la compétence des juridictions algériennes.</p>
""".strip()

CONFIDENTIALITE_HTML = """
<p>Chez TafTech, nous accordons une grande importance à la protection de vos données personnelles. Cette politique décrit quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits, conformément à la loi algérienne n° 18-07 relative à la protection des données à caractère personnel.</p>
<h2>1. Définitions</h2>
<ul>
<li><strong>Données personnelles</strong> : toute information se rapportant à une personne physique identifiée ou identifiable.</li>
<li><strong>Candidat</strong> : utilisateur inscrit sur TafTech qui postule à des offres d'emploi.</li>
<li><strong>Recruteur</strong> : utilisateur représentant une entreprise qui publie des offres et consulte des profils.</li>
<li><strong>Traitement</strong> : toute opération portant sur des données personnelles (collecte, stockage, utilisation...).</li>
</ul>
<h2>2. Responsable du traitement</h2>
<p>TafTech — Oran, Algérie — taftech963@gmail.com — 0770 123 440</p>
<h2>3. Catégories de données collectées</h2>
<p><strong>Données d'identification</strong> : nom, prénom, adresse e-mail, numéro de téléphone, date de naissance, NIN, adresse/wilaya/commune, photo de profil.</p>
<p><strong>Données professionnelles</strong> : titre professionnel, CV (PDF), compétences et langues, expériences professionnelles, formations et diplômes, lettre de motivation, secteur et spécialité souhaités.</p>
<p><strong>Données techniques</strong> : adresse IP, cookies d'authentification (session), journal des erreurs techniques, historique de connexion.</p>
<h2>4. Utilisation des cookies</h2>
<p>TafTech utilise uniquement des cookies techniques nécessaires au fonctionnement du site : maintien de votre session de connexion et sécurité de l'authentification. Nous n'utilisons pas de cookies publicitaires ou de traçage tiers.</p>
<h2>5. Durée de conservation des données</h2>
<p><strong>Candidats</strong> : suppression automatique après 5 ans d'inactivité du compte.</p>
<p><strong>Recruteurs / Entreprises</strong> : suppression automatique après 10 ans d'inactivité du compte.</p>
<h2>6. Vos droits</h2>
<p>Droit d'accès à vos données, droit de rectification, droit à l'effacement, droit à la limitation du traitement, droit à la portabilité, droit d'opposition.</p>
<p>Pour exercer vos droits, contactez-nous par e-mail (taftech963@gmail.com) ou téléphone (0770 123 440).</p>
<p>Conforme à la loi algérienne n° 18-07 relative à la protection des données à caractère personnel.</p>
""".strip()

QUI_SOMMES_NOUS_HTML = """
<h2>Notre mission</h2>
<p>Nous œuvrons à établir un pont solide entre les chercheurs d'emploi et les entreprises algériennes en quête de talents. Notre engagement est de fournir un service de recrutement rapide, transparent et conforme à la réglementation nationale.</p>
<p>Nous croyons que chaque candidat mérite l'opportunité de révéler son potentiel, et que chaque entreprise mérite de trouver le talent qui la fera progresser.</p>
<h2>Nos valeurs</h2>
<ul>
<li><strong>Professionnalisme</strong> : nous maintenons les plus hauts standards de qualité dans notre service de mise en relation.</li>
<li><strong>Transparence</strong> : une communication claire et honnête avec les candidats et les entreprises.</li>
<li><strong>Conformité</strong> : respect strict de la loi algérienne n° 18-07 sur la protection des données personnelles.</li>
<li><strong>Expertise</strong> : une connaissance approfondie du marché de l'emploi algérien et de ses spécificités.</li>
<li><strong>Innovation</strong> : un algorithme de matching intelligent pour rapprocher les bons profils des bonnes offres.</li>
<li><strong>Engagement</strong> : un dévouement total à la réussite des candidats et des entreprises qui nous font confiance.</li>
</ul>
<h2>Nos services</h2>
<ul>
<li><strong>Matching par intelligence artificielle</strong> : score de compatibilité calculé automatiquement entre chaque candidat et chaque offre.</li>
<li><strong>CVthèque pour recruteurs</strong> : accès aux profils candidats avec filtres avancés et classement par pertinence (offre Premium).</li>
<li><strong>Alertes emploi personnalisées</strong> : notification par email dès qu'une offre correspond au profil du candidat.</li>
<li><strong>Suggestions de carrière</strong> : recommandations d'orientation basées sur le profil et les compétences du candidat.</li>
<li><strong>Bulletin de candidature PDF</strong> : génération d'un bulletin récapitulatif pour chaque candidature retenue.</li>
<li><strong>Gestion d'équipe recruteur</strong> : invitation de collaborateurs avec rôles et permissions au sein d'une même entreprise.</li>
</ul>
""".strip()

PAGES = [
    ("cgu", "Conditions Générales d'Utilisation", CGU_HTML),
    ("confidentialite", "Politique de confidentialité", CONFIDENTIALITE_HTML),
    ("qui-sommes-nous", "Qui sommes-nous", QUI_SOMMES_NOUS_HTML),
]


def seed(apps, schema_editor):
    PageStatique = apps.get_model('jobs', 'PageStatique')
    for slug, titre, html in PAGES:
        if not PageStatique.objects.filter(slug=slug).exists():
            PageStatique.objects.create(slug=slug, titre=titre, contenu_html=html)


def reverse_seed(apps, schema_editor):
    PageStatique = apps.get_model('jobs', 'PageStatique')
    PageStatique.objects.filter(slug__in=['cgu', 'confidentialite', 'qui-sommes-nous']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0069_pagestatique'),
    ]

    operations = [
        migrations.RunPython(seed, reverse_seed),
    ]
