"""Date de fin d'expérience seule sur la ligne qui suit le titre (CV en colonnes).

Exemple : « DÉVELOPPEUR N8N Novembre 2025 » puis « Janvier 2026 ». L'IA laisse parfois cette fin vide
et l'écran la remplace alors par la date de début. Quand la fin est vide, la ligne située juste sous le
titre est une date seule et elle diffère du début : c'est la fin. Une date de fin déjà renseignée n'est
jamais modifiée, et un CV qui n'a qu'une seule date ne crée aucune fin."""
import re

_MOIS = (r"(?:janv(?:ier)?|f[ée]vr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t|"
         r"sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?)")
_DATE_SEULE = re.compile(
    rf"^(?:{_MOIS}\.?\s+\d{{4}}|\d{{1,2}}[/.\-]\d{{4}}|\d{{4}}|aujourd.?hui|pr[ée]sent|en cours|actuel(?:lement)?)$",
    re.IGNORECASE,
)


def _normaliser(texte):
    return re.sub(r"\s+", " ", texte or "").strip()


def _ligne_sous_le_titre(lignes, titre, debut):
    """Ligne qui suit celle du titre (éventuellement suivi de la date de début), ou None."""
    for i, ligne in enumerate(lignes[:-1]):
        if not ligne.lower().startswith(titre):
            continue
        reste = ligne[len(titre):].strip().lower()
        if reste in ("", debut):
            return lignes[i + 1]
    return None


_PLAGE_ANNEE_PARTAGEE = re.compile(
    rf"(?<!\w)(?P<debut>{_MOIS}\.?)\s{{0,3}}[-–—]\s{{0,3}}(?P<fin>{_MOIS}\.?)\s{{1,3}}(?P<annee>\d{{4}})(?!\d)",
    re.IGNORECASE,
)


def completer_annee_partagee(experiences, cv_brut):
    """« ORGANISATEUR DE CONDITIONNEMENT Sept. - Nov. 2020 » : l'année n'est écrite qu'une fois, pour les
    deux mois. L'IA ne garde alors que la fin et le début manque (l'écran bloque l'enregistrement).
    Quand le début n'a pas d'année, on le relit sur la ligne du titre ; une fin déjà renseignée n'est
    jamais modifiée (en place, comme `completer_dates_fin`)."""
    lignes = [_normaliser(ligne) for ligne in (cv_brut or "").split("\n")]
    for experience in experiences or []:
        if not isinstance(experience, dict) or re.search(r"\d{4}", experience.get("date_debut_raw") or ""):
            continue
        titre = _normaliser(experience.get("titre_poste")).lower()
        if not titre:
            continue
        for ligne in lignes:
            plage = ligne.lower().startswith(titre) and _PLAGE_ANNEE_PARTAGEE.search(ligne[len(titre):])
            if plage:
                experience["date_debut_raw"] = f"{plage['debut']} {plage['annee']}"
                if not experience.get("date_fin_raw"):
                    experience["date_fin_raw"] = f"{plage['fin']} {plage['annee']}"
                break


def completer_dates_fin(experiences, cv_brut):
    """Renseigne `date_fin_raw` (en place) quand la fin est seule sous le titre dans le CV brut."""
    lignes = [_normaliser(ligne) for ligne in (cv_brut or "").split("\n")]
    for experience in experiences or []:
        if not isinstance(experience, dict) or experience.get("date_fin_raw") or not experience.get("date_debut_raw"):
            continue
        titre = _normaliser(experience.get("titre_poste")).lower()
        if not titre:
            continue
        debut = _normaliser(experience["date_debut_raw"]).lower()
        suivante = _ligne_sous_le_titre(lignes, titre, debut)
        if suivante and _DATE_SEULE.match(suivante) and suivante.lower() != debut:
            experience["date_fin_raw"] = suivante
