"""
Nettoie MetierReferentiel :
1. Corrige l'encodage corrompu (UTF-8 stocke en latin-1)
2. Reconstruit le titre masculin propre depuis le format ROME slash
3. Supprime doublons, titres trop courts/longs, sigles

Usage :
    python manage.py nettoyer_referentiel --dry-run
    python manage.py nettoyer_referentiel
"""
import re
from django.core.management.base import BaseCommand
from jobs.models import MetierReferentiel


def reparer_encodage(s):
    """Corrige UTF-8 stocke comme latin-1 : 'g?n?ral' -> 'général'"""
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s  # deja correct


def extraire_masculin(titre):
    """
    Extrait la forme masculine depuis le format ROME slash.

    Regle : si parts[0] a moins de mots que parts[1], parts[1] contient
    la suite partagee -> on saute son premier mot (feminin) et on appende le reste.
    Sinon parts[0] est deja la forme masculine complete.

    Exemples :
      "Acheteur/Acheteuse"
        parts[0]=1 mot, parts[1]=1 mot -> meme longueur -> "Acheteur"

      "Agent/Agente comptable d'etablissement..."
        parts[0]=1 mot, parts[1]=3 mots -> reconstruire
        -> "Agent" + "comptable d'etablissement..." = "Agent comptable d'etablissement..."

      "Acheteur approvisionneur/Acheteuse approvisionneuse"
        parts[0]=2 mots, parts[1]=2 mots -> meme longueur -> "Acheteur approvisionneur"

      "Adjoint/Adjointe au directeur/a la directrice RH"
        parts[0]=1 mot, parts[1]=3 mots -> reconstruire
        -> "Adjoint" + "au directeur" = "Adjoint au directeur"
    """
    if '/' not in titre:
        return titre

    parts = [p.strip() for p in titre.split('/')]
    masc = parts[0]
    suite_fem = parts[1]
    mots_masc = masc.split()
    mots_suite = suite_fem.split()

    if len(mots_masc) < len(mots_suite):
        # parts[1] contient le mot feminin + la suite partagee
        shared = ' '.join(mots_suite[1:])
        if shared:
            masc = masc + ' ' + shared

    # parts[2+] : variantes feminines du reste -> ignorer
    return masc.strip()


def nettoyer_titre(titre):
    """Retourne le titre nettoyé ou None si à supprimer."""
    # 1. Reparer encodage
    t = reparer_encodage(titre).strip()

    # 2. Supprimer patterns H/F, m/f/d, F/H AVANT extraction du slash
    t = re.sub(r'\s*[\(\[]?\s*[HhFfMm]\s*/\s*[HhFfMm](?:/[dD])?\s*[\)\]]?\s*', ' ', t).strip()
    # Supprimer parentheses avec contenu long type "(m/f/d - 3 ans d'expérience...)"
    t = re.sub(r'\s*\([mfhMFH][^)]{0,80}\)', '', t).strip()

    # 3. Supprimer ville en fin de titre (pattern Emploitic: "Titre - Alger", "Titre Sétif")
    VILLES = r'(Alger|Oran|Constantine|Annaba|Blida|Tlemcen|Sétif|Setif|Batna|Béjaïa|Bejaia|Tizi Ouzou|Boumerdes|Tipaza|Médéa|Chlef|Mostaganem|Sidi Bel Abbes|Ouargla|Biskra|Djelfa|Skikda|Jijel|Mila|Guelma|Relizane|Msila|Laghouat|Saida|Bouira|Khenchela|Souk Ahras)'
    t = re.sub(rf'\s*[-–]\s*{VILLES}\s*$', '', t, flags=re.IGNORECASE).strip()
    t = re.sub(rf'\s+{VILLES}\s*$', '', t, flags=re.IGNORECASE).strip()

    # 4. Nettoyer tirets résiduels (ex: "Titre- -" ou "Titre -")
    t = re.sub(r'\s*-\s*-\s*', ' ', t).strip()
    t = re.sub(r'\s*-\s*$', '', t).strip()
    t = re.sub(r'^\s*-\s*', '', t).strip()

    # 5. Extraire masculin
    t = extraire_masculin(t)

    # 3. Supprimer sigle en fin (-DAF-, -RH-, etc.)
    t = re.sub(r'\s*-[A-Z]{2,8}-\s*$', '', t).strip()

    # 4. Supprimer parentheses d'explication en fin ("(lapins)", "(H/F)", "(oursins)")
    t = re.sub(r'\s*\([^)]{1,40}\)\s*$', '', t).strip()

    # 5. Nettoyer espaces multiples
    t = re.sub(r'\s+', ' ', t).strip()

    # 6. Supprimer si trop court ou trop long
    if len(t) < 4 or len(t) > 100:
        return None

    # 7. Supprimer si contient des chiffres (codes, references)
    if re.search(r'\d', t):
        return None

    return t


class Command(BaseCommand):
    help = "Nettoie les titres de MetierReferentiel"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        tous = list(MetierReferentiel.objects.all())
        self.stdout.write(f"Total avant : {len(tous)}")

        a_supprimer_ids = []
        a_modifier = []       # (obj, nouveau_titre)
        titres_vus = {}       # titre_normalise -> id

        encoding_fixes = 0

        for obj in tous:
            titre_propre = nettoyer_titre(obj.titre)

            if titre_propre is None:
                a_supprimer_ids.append(obj.id)
                continue

            cle = titre_propre.lower().strip()

            if cle in titres_vus:
                a_supprimer_ids.append(obj.id)
                continue

            titres_vus[cle] = obj.id

            if titre_propre != obj.titre:
                a_modifier.append((obj, titre_propre))
                repare = reparer_encodage(obj.titre)
                if repare != obj.titre:
                    encoding_fixes += 1

        self.stdout.write(f"A modifier  : {len(a_modifier)} (dont {encoding_fixes} encodages)")
        self.stdout.write(f"A supprimer : {len(a_supprimer_ids)}")
        self.stdout.write(f"Total apres : {len(tous) - len(a_supprimer_ids)}")

        if dry_run:
            self.stdout.write("\n--- Exemples : slash -> masculin ---")
            exemples_slash = [(o, n) for o, n in a_modifier if '/' in o.titre][:15]
            for obj, nouveau in exemples_slash:
                print(f"  AVANT: {obj.titre}")
                print(f"  APRES: {nouveau}")
                print()

            self.stdout.write("--- Exemples : encodage corrige ---")
            exemples_enc = [(o, n) for o, n in a_modifier if reparer_encodage(o.titre) != o.titre][:10]
            for obj, nouveau in exemples_enc:
                print(f"  AVANT: {obj.titre}")
                print(f"  APRES: {nouveau}")
                print()

            self.stdout.write("--- Exemples supprimes ---")
            ids_set = set(a_supprimer_ids[:15])
            for obj in tous:
                if obj.id in ids_set:
                    print(f"  DEL: {obj.titre}")
            return

        from django.db import transaction
        with transaction.atomic():
            for obj, nouveau in a_modifier:
                obj.titre = nouveau
                obj.save(update_fields=["titre"])
            MetierReferentiel.objects.filter(id__in=a_supprimer_ids).delete()

        total_final = MetierReferentiel.objects.count()
        self.stdout.write(f"OK termine. Total final : {total_final}")
