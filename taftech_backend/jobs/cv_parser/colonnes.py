"""Reconstruction des lignes de texte d'une page de PDF à partir des mots positionnés.

Une ligne ordinaire se lit de gauche à droite. Un tableau en colonnes (« Expertises clés »,
« Repères de performance ») se lit colonne par colonne, sinon ses lignes se mélangent
(« Management industriel Gestion de projets Industrialisation »).

Un tableau n'est reconnu que s'il a au moins MIN_COLONNES colonnes sur deux lignes consécutives :
« TITRE ………… date » (2 cellules), une frise date + texte ou un CV à 2 colonnes restent lus ligne par
ligne, où l'association date ↔ poste compte plus que la lecture en colonnes. Descendre MIN_COLONNES à 2
ne se décide qu'après validation sur un corpus de CV réels (règle du projet pour tout changement
d'extracteur).

Format d'entrée : `lignes` = [(y, [mot, ...]), ...] triées par y, avec mot = {"x0", "x1", "text"}."""

ECART_CELLULE = 14        # points : au-delà, deux mots d'une même ligne sont dans deux cellules
MIN_COLONNES = 3
TOLERANCE_X = 3           # points
FACTEUR_INTERLIGNE = 2.0  # le tableau s'arrête quand l'interligne dépasse 2 fois celui de ses deux premières lignes


def _cellules(mots):
    cellules = []
    for mot in sorted(mots, key=lambda m: m["x0"]):
        if cellules and mot["x0"] - cellules[-1]["x1"] <= ECART_CELLULE:
            cellules[-1] = {
                "x0": cellules[-1]["x0"],
                "x1": max(cellules[-1]["x1"], mot["x1"]),
                "texte": cellules[-1]["texte"] + " " + mot["text"],
            }
        else:
            cellules.append({"x0": mot["x0"], "x1": mot["x1"], "texte": mot["text"]})
    return cellules


def _texte_simple(cellules):
    return " ".join(c["texte"] for c in cellules)


def lignes_simples(lignes):
    """Une ligne de texte par ligne du PDF, mots de gauche à droite (lecture historique)."""
    return [_texte_simple(_cellules(mots)) for _, mots in lignes]


def _colonnes(groupe_de_cellules):
    """Colonnes = intervalles horizontaux fusionnés de toutes les cellules (une légende centrée sous
    un chiffre tombe dans la même colonne que lui)."""
    intervalles = sorted((c["x0"], c["x1"]) for cellules in groupe_de_cellules for c in cellules)
    colonnes = []
    for x0, x1 in intervalles:
        if colonnes and x0 < colonnes[-1][1]:
            colonnes[-1] = (colonnes[-1][0], max(colonnes[-1][1], x1))
        else:
            colonnes.append((x0, x1))
    return colonnes


def _dans_la_colonne(cellule, colonne):
    return cellule["x0"] >= colonne[0] - TOLERANCE_X and cellule["x1"] <= colonne[1] + TOLERANCE_X


def _nb_colonnes_chevauchees(cellule, colonnes):
    """Un texte plus large que les lignes du dessus déborde de sa colonne sans en toucher une autre ;
    une ligne pleine largeur, elle, en chevauche plusieurs."""
    return sum(1 for x0, x1 in colonnes if cellule["x0"] < x1 and cellule["x1"] > x0)


def _debut_de_tableau(a, b):
    """Deux lignes consécutives à MIN_COLONNES cellules ou plus dont toutes les cellules tombent
    dans les mêmes colonnes."""
    if min(len(a), len(b)) < MIN_COLONNES:
        return False
    return len(_colonnes([a, b])) == max(len(a), len(b))


def _fin_de_tableau(cellules, ys, debut):
    """Indice de la première ligne qui n'appartient plus au tableau commencé en `debut` : une ligne
    reste dans le tableau si elle tient dans une de ses colonnes (même seule : fin d'un texte plus
    long que les autres) et si l'interligne reste proche de celui du tableau."""
    interligne_max = FACTEUR_INTERLIGNE * (ys[debut + 1] - ys[debut])
    fin = debut + 2
    while fin < len(cellules):
        colonnes = _colonnes(cellules[debut:fin])
        tient = all(_nb_colonnes_chevauchees(c, colonnes) == 1 for c in cellules[fin])
        if ys[fin] - ys[fin - 1] > interligne_max or not tient:
            break
        fin += 1
    return fin


def _texte_tableau(lignes_de_cellules):
    sortie = []
    for colonne in _colonnes(lignes_de_cellules):
        for cellules in lignes_de_cellules:
            sortie.extend(c["texte"] for c in cellules if _dans_la_colonne(c, colonne))
    return sortie


def regrouper_lignes(lignes):
    """Lignes de texte de la page : lecture ligne par ligne, sauf les tableaux en colonnes lus
    colonne par colonne."""
    cellules = [_cellules(mots) for _, mots in lignes]
    ys = [y for y, _ in lignes]
    sortie, i = [], 0
    while i < len(lignes):
        if i + 1 < len(lignes) and _debut_de_tableau(cellules[i], cellules[i + 1]):
            fin = _fin_de_tableau(cellules, ys, i)
            sortie.extend(_texte_tableau(cellules[i:fin]))
            i = fin
        else:
            sortie.append(_texte_simple(cellules[i]))
            i += 1
    return sortie
