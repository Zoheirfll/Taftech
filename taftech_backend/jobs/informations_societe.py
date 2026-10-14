"""Ligne de pied de page commune aux documents générés (factures, bulletins, exports PDF).

Composée uniquement à partir des informations société réellement renseignées dans l'admin
(correction client n°21) : aucune coordonnée codée en dur, aucun champ vide affiché."""
from xml.sax.saxutils import escape

from .models import MentionsLegalesEntreprise

MARQUE = "TAFTECH — Plateforme de recrutement"


def ligne_pied_de_page():
    """Texte prêt pour un `reportlab.platypus.Paragraph` (valeurs échappées : ReportLab interprète
    un mini-langage de balises, une adresse contenant « < » ou « & » casserait ou fausserait le PDF)."""
    infos = MentionsLegalesEntreprise.get_solo()
    elements = [infos.raison_sociale, infos.email_contact, infos.telephone, infos.adresse]
    return " | ".join([escape(MARQUE)] + [escape(e.strip()) for e in elements if e and e.strip()])
