"""Empreinte des données envoyées à l'IA : sert à reconnaître qu'une analyse n'a pas besoin d'être
recalculée (mêmes données, même prompt, même modèle) et à renvoyer le résultat déjà stocké, sans
appel au fournisseur ni décompte de quota. Un hash SHA-256 ne contient aucune donnée personnelle."""
import hashlib

SEPARATEUR = "\x1f"  # caractère de contrôle : ne peut pas se confondre avec le contenu d'un champ


def empreinte_ia(*morceaux) -> str:
    return hashlib.sha256(SEPARATEUR.join(str(m) for m in morceaux).encode("utf-8")).hexdigest()
