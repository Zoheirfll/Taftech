"""Ajoute à la page « Confidentialité » (contenu éditable en base) la section sur l'analyse par IA.

La page vit dans la base (Admin → Pages du site) : elle n'est donc pas modifiable par le code et
chaque environnement (développement, production) a la sienne. Cette commande est **idempotente**
(deuxième exécution : rien) et propose un `--dry-run`. À lancer en production seulement après
relecture juridique du texte. Ne dit jamais « anonyme » (la pseudonymisation n'est pas une
anonymisation) et n'affirme aucune autorisation de l'ANPDP (question ouverte pour l'employeur)."""
import re

from django.core.management.base import BaseCommand, CommandError

from jobs.models import AuditLog, PageStatique

MARQUEUR = "Analyse par intelligence artificielle"
TITRE_DROITS = "<h2>6. Vos droits</h2>"
TITRE_DROITS_RENUMEROTE = "<h2>7. Vos droits</h2>"

SECTION = (
    "<h2>6. Analyse par intelligence artificielle (facultative)</h2>\n"
    "<p>Pour analyser un CV, proposer des métiers ou donner des conseils personnalisés, TafTech envoie à un "
    "prestataire d'intelligence artificielle situé hors d'Algérie (Groq, États-Unis) une version de vos "
    "données dans laquelle votre nom, vos coordonnées, votre adresse, votre date de naissance, vos pièces "
    "d'identité et vos liens personnels sont masqués. Le prestataire n'en conserve aucune copie "
    "(rétention zéro des données).</p>\n"
    "<p>Avant chaque envoi, vous pouvez consulter le texte exact qui sera transmis. Il en va de même lorsqu'un "
    "recruteur auquel vous candidatez utilise l'analyse IA de votre candidature : votre nom n'est alors jamais "
    "transmis.</p>\n"
    "<p>Le calcul des correspondances entre votre profil et les offres est réalisé par TafTech, sans prestataire "
    "d'IA externe. Ces fonctions sont facultatives pour vous.</p>\n"
)
_SECTION_EXISTANTE = re.compile(r"<h2>6\. Analyse par intelligence artificielle.*?(?=<h2>|\Z)", re.S)


def inserer_section(contenu_html: str) -> str:
    """Retourne le contenu avec la section ajoutée avant « Vos droits » (renumérotée 7), ou en fin de
    page si ce titre a été modifié à la main par l'admin."""
    if TITRE_DROITS in contenu_html:
        return contenu_html.replace(TITRE_DROITS, SECTION + TITRE_DROITS_RENUMEROTE, 1)
    return contenu_html.rstrip() + "\n" + SECTION


class Command(BaseCommand):
    help = "Ajoute la section « Analyse par intelligence artificielle » à la page Confidentialité (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Affiche le résultat sans rien enregistrer.")

    def handle(self, *args, **options):
        page = PageStatique.objects.filter(slug='confidentialite').first()
        if page is None:
            raise CommandError("La page « confidentialite » n'existe pas dans cette base.")
        existante = _SECTION_EXISTANTE.search(page.contenu_html)
        if existante and existante.group(0).strip() == SECTION.strip():
            self.stdout.write("La section est déjà présente et à jour : rien à faire.")
            return
        if existante:
            # Ancienne version de la section (texte précisé depuis) : remplacée, le reste de la page est intact.
            nouveau = page.contenu_html[:existante.start()] + SECTION + page.contenu_html[existante.end():]
        elif MARQUEUR.lower() in page.contenu_html.lower():
            self.stdout.write("Un passage sur l'IA existe déjà sous une autre forme (modifié à la main) : rien fait.")
            return
        else:
            nouveau = inserer_section(page.contenu_html)
        if options['dry_run']:
            self.stdout.write(f"Dry-run : la page passerait de {len(page.contenu_html)} à {len(nouveau)} caractères.")
            self.stdout.write(SECTION)
            return
        page.contenu_html = nouveau
        page.save()
        AuditLog.objects.create(
            admin=None, action='AUTRE',
            detail="Section « Analyse par intelligence artificielle » ajoutée à la page Confidentialité (commande)",
        )
        self.stdout.write(self.style.SUCCESS("Section ajoutée à la page Confidentialité."))
