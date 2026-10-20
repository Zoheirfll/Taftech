"""Empreinte des données envoyées à l'IA : sert à reconnaître qu'une analyse n'a pas besoin d'être
recalculée (mêmes données, même prompt, même modèle) et à renvoyer le résultat déjà stocké, sans
appel au fournisseur ni décompte de quota. Un hash SHA-256 ne contient aucune donnée personnelle."""
import hashlib

SEPARATEUR = "\x1f"  # caractère de contrôle : ne peut pas se confondre avec le contenu d'un champ

# À incrémenter chaque fois que les règles de nettoyage (patterns, employeurs, établissements…)
# sont durcies : un résultat produit avec d'anciennes règles n'est alors plus resservi tel quel.
VERSION_NETTOYAGE = "2026-10-19-2"


def empreinte_ia(*morceaux) -> str:
    contenu = SEPARATEUR.join([VERSION_NETTOYAGE, *(str(m) for m in morceaux)])
    return hashlib.sha256(contenu.encode("utf-8")).hexdigest()
