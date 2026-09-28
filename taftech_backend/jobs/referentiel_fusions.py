"""Consolidation du référentiel v2 (secteurs/domaines métiers + spécialités de formation) —
session 27/09/2026, demande utilisateur : "pas de répétition ni de redondance, combiner si
nécessaire, travail minutieux, tout est utilisé pour le matching".

Trois responsabilités, toutes exprimées en CODES STABLES du fichier client (jamais en pk, qui
change quand `import_referentiel_v2` recrée une ligne supprimée) :

1. `GROUPES_OPERATIONS` — fusions/déplacements de secteurs et domaines (`GroupeMetier`),
   appliqués une fois par `manage.py consolider_referentiel`.
2. `SPECIALITES_FUSIONS` — doublons de `SpecialiteFormation` (code doublon -> code conservé).
   Consommé aussi PENDANT l'import (voir `code_specialite_canonique`) : le classeur client
   attribue un code différent à la même spécialité pour chaque niveau de diplôme (CAP/BT/BTS
   de la Formation Pro), alors que le couple diplôme+spécialité est déjà porté par
   `DiplomeSpecialite`. Sans cette résolution à l'import, un réimport recréerait la fiche
   doublon ET tenterait de recréer un `DiplomeSpecialite` dont le `code` (unique) est déjà
   porté par le couple fusionné -> IntegrityError, import cassé.
3. Instantané de hiérarchie cible (`jobs/data/referentiel_hierarchie_cible.json`) — l'écart
   entre la base consolidée et le classeur client (parents/libellés de groupes, groupe et
   canonique des métiers, groupes supprimés), réécrit après chaque consolidation et REJOUÉ à
   la fin de chaque `import_referentiel_v2`. Couvre aussi les fusions antérieures
   (25-26/09/2026), dont certaines faites à la main en shell et jamais rejouables jusqu'ici :
   avant cet instantané, tout réimport annulait silencieusement ces fusions.

Impact matching (`matcher.metiers_compatibles`) — la raison de chaque choix ci-dessous :
- même `groupe_principal` (sous-domaine, ou domaine si métier direct) -> 0.85 ;
- même secteur racine -> 0.45 ;
- libellés identiques -> 1.0 via le filet fuzzy, quelle que soit la hiérarchie.
Déplacer un domaine intact ne touche donc que le bonus 0.45. Fusionner deux groupes ne
rapproche au niveau 0.85 que les métiers de sous-groupes HOMONYMES (fusionnés récursivement) :
chaque fusion de sous-domaine ci-dessous a été vérifiée métier par métier (mêmes postes réels).
"""
import json
import os
import re
import unicodedata

from django.db import transaction

CHEMIN_INSTANTANE = os.path.join(os.path.dirname(__file__), 'data', 'referentiel_hierarchie_cible.json')


def _norm(s):
    s = unicodedata.normalize('NFKD', (s or '').strip().lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s)


# ---------------------------------------------------------------------------
# 1. SECTEURS / DOMAINES
# ---------------------------------------------------------------------------
# ('fusionner', source, cible) : le contenu de source passe dans cible (sous-groupes homonymes
#     fusionnés récursivement, métier homonyme relié via metier_canonique, le reste reparenté
#     intact), puis source est supprimé.
# ('deplacer', groupe, nouveau_parent) : reparentage intact.
# ('renommer', groupe, libelle)
GROUPES_OPERATIONS = [
    # --- Audit : le secteur autonome doublait le domaine Finance > Audit ---
    ('fusionner', 'TSUB-CE1EE6121988', 'TSUB-5885130D42BD'),  # Gouvernance (Contrôleur Interne) -> Finance>Audit>Contrôle Interne
    ('fusionner', 'TSUB-D58A17CD165D', 'TSUB-5885130D42BD'),  # Risques (Responsable Contrôle Interne) -> idem
    ('fusionner', 'TSUB-01DC22072342', 'TSUB-63E6F8F50D31'),  # Audit (Auditeur Interne) -> Finance>Audit>Audit Interne
    ('fusionner', 'TDOM-E3AAC77FCC66', 'TDOM-007FB12D1551'),  # Audit Interne (reste : Opérationnel, Financier) -> Finance>Audit
    ('fusionner', 'TDOM-95073C41C2FD', 'TDOM-007FB12D1551'),  # Contrôle Interne (vidé) -> Finance>Audit
    ('fusionner', 'TSEC-B81F37A043A6', 'TSEC-EAB762A03FD9'),  # secteur Audit -> Finance
    # --- Paie : un seul domaine, sous Ressources Humaines ---
    ('fusionner', 'TDOM-599EE508248A', 'TDOM-EF97303695E0'),  # Finance>Paie -> RH>Paie (Gestionnaire de Paie rejoint Gestionnaire de Paie RH)
    # --- Emballage = conditionnement, déjà couvert par Imprimerie & Packaging ---
    ('fusionner', 'TDOM-4AAA73E1FED3', 'TDOM-3F1D2D317A33'),  # Emballage>Production -> Packaging
    ('fusionner', 'TSEC-A3819ADB0F8B', 'TSEC-729CCAD1C0DC'),
    # --- Mines & Carrières = "Extraction solide" du secteur officiel B ---
    ('fusionner', 'TSEC-31059CAD8E98', 'NSEC-B'),
    # --- Énergie + Pétrole & Gaz -> secteur officiel B (Énergie, extraction et hydrocarbure) ---
    ('deplacer', 'TDOM-9153E7E27927', 'NSEC-M'),  # Médecine Nucléaire était rangée sous Énergie -> Santé
    ('fusionner', 'TSEC-660365ACD08C', 'NSEC-B'),
    ('fusionner', 'TSEC-1B69769639C0', 'NSEC-B'),
    # --- Bureau d'études / Construction Numérique / Topographie -> BTP (doublons de domaines BTP) ---
    ('fusionner', 'TDOM-C97CF82A91F6', 'TDOM-0140E3A5844C'),  # Ingénierie -> BTP>Bureau d'Études (BIM fusionné)
    ('fusionner', 'TSEC-A1DA41DC7DDA', 'NSEC-F'),
    ('fusionner', 'TSUB-0C0113C71164', 'TSUB-8A07A98C640C'),  # BIM>Direction (BIM Manager) -> BTP>Bureau d'Études>BIM
    ('fusionner', 'TSUB-0F8B41D64C71', 'TSUB-8A07A98C640C'),  # BIM>Coordination
    ('fusionner', 'TSUB-CA077308ED9B', 'TSUB-8A07A98C640C'),  # BIM>Modélisation
    ('fusionner', 'TSEC-E3534A60C8E9', 'NSEC-F'),             # Construction Numérique (vidé)
    ('fusionner', 'TSUB-C7F3DCFE69C7', 'TSUB-2887011833CC'),  # Levés -> Levés Topographiques (Géomètre Topographe)
    ('fusionner', 'TSUB-13FA3C1FB8D3', 'TSUB-724C7413A5C4'),  # Chantier -> Implantation (Topographe Chantier)
    ('fusionner', 'TDOM-C6CF34AFE567', 'TDOM-75606B6B6A75'),  # Topographie (reste : DAO) -> BTP>Topographie
    ('fusionner', 'TSUB-7EA5ABDF39DB', 'TSUB-DE04E4B8EB73'),  # Géomatique (Ingénieur SIG) -> BTP>Topographie>SIG
    ('fusionner', 'TSUB-D768990AB6A8', 'TSUB-DE04E4B8EB73'),  # Cartographie (Analyste SIG) -> idem
    ('fusionner', 'TSEC-35892E057AF8', 'NSEC-F'),             # Topographie & Géomatique (vidé)
    # --- Facility Management = Services Généraux ---
    ('fusionner', 'TDOM-83721E8C9715', 'TDOM-1E69CE1C36B6'),  # FM>Exploitation -> FM>Exploitation Technique
    ('renommer', 'TDOM-1E69CE1C36B6', 'Facility Management'),
    ('fusionner', 'TSEC-8F773F1D0420', 'TSEC-3A5565748ABD'),
    ('fusionner', 'TDOM-14E956B1378D', 'TDOM-59BBA97E696B'),  # Moyens généraux -> Services Généraux
    # --- Gestion des Déchets -> Environnement ---
    ('fusionner', 'TSEC-A4511012C618', 'TSEC-7175905AE92E'),
    # --- Robotique, Utilités Industrielles -> Industrie ---
    ('fusionner', 'TSEC-58F3D2DE8561', 'NSEC-C'),
    ('fusionner', 'TDOM-F029412388DC', 'TDOM-84C3A21C8997'),  # Utilités>Exploitation -> Utilités>Maintenance
    ('renommer', 'TDOM-84C3A21C8997', 'Utilités industrielles'),
    ('fusionner', 'TSEC-BED30497BD22', 'NSEC-C'),
    # --- Distribution = "Grande distribution" du Commerce officiel ; E-commerce -> Commerce & Marketing ---
    ('fusionner', 'TDOM-1564D34BCAEC', 'NDOM-G17'),
    ('fusionner', 'TDOM-3BF5A98FB716', 'NDOM-G17'),
    ('fusionner', 'TDOM-C294F781ECAD', 'NDOM-G17'),
    ('fusionner', 'TSEC-933548450302', 'NSEC-G'),
    ('fusionner', 'TSEC-55AC0B9A6376', 'TSEC-B5617C76F0C1'),
    # --- Achats : un seul secteur (était éclaté entre Achats, Logistique et Support à l'entreprise) ---
    ('fusionner', 'TSUB-84D47D3F3602', 'TSUB-59262B01D320'),  # Achats Nationaux (Acheteur) -> Achats>Approvisionnement>Achats
    ('fusionner', 'TSUB-A7A8D2F584FF', 'TSUB-87F6C3429233'),  # Catégorie (Category Manager) -> Achats>Management>Catégorie
    ('fusionner', 'TSUB-FCFC9EC769C6', 'TSUB-7D5069E60DE1'),  # Achats Stratégiques -> Stratégie Achats (Responsable Achats)
    ('deplacer', 'TDOM-0ACA56116731', 'TSEC-C18016BA15C1'),   # Logistique>Achats (reste : Sourcing) -> secteur Achats
    ('fusionner', 'NDOM-L11', 'TDOM-0ACA56116731'),           # Support à l'entreprise>Achats -> idem
    # --- Support à l'entreprise (L) : domaines qui existent déjà comme secteurs à part entière ---
    ('deplacer', 'NDOM-L12', 'TSEC-EAB762A03FD9'),  # Comptabilité et finance -> Finance
    ('deplacer', 'NDOM-L15', 'TSEC-D4AA98B50484'),  # Ressources humaines -> Ressources Humaines
    ('deplacer', 'NDOM-L17', 'TSEC-B5617C76F0C1'),  # Stratégie commerciale et marketing -> Commerce & Marketing
    # --- Services à la personne (P) ---
    ('deplacer', 'NDOM-P16', 'TSEC-ED7C7AD4A000'),    # Droit -> Juridique
    ('fusionner', 'NDOM-P17', 'TDOM-9FDF0E6AC0CD'),   # Sécurité privée -> Sécurité>Sécurité Privée
    # --- Domaines homonymes dans un même secteur (fusion TSEC->officiel des 25-26/09) ---
    ('fusionner', 'TDOM-7B2572662D32', 'NDOM-K12'),   # Assurance -> Assurances
    ('fusionner', 'TDOM-3B1AA899F238', 'NDOM-O13'),   # Formation Professionnelle -> Formation et enseignement professionnels
    ('fusionner', 'TDOM-A21538EE301B', 'NDOM-O14'),   # Enseignement -> Enseignement et éducation
    ('fusionner', 'TDOM-89B484A8B99E', 'NDOM-O11'),   # Direction -> Direction d'établissement et d'enseignement
    ('fusionner', 'TSUB-180045A8D201', 'NDOM-H15'),   # Restauration>Salle -> Service en restauration
    ('fusionner', 'TSUB-8B0BCF6E1A7E', 'NDOM-H15'),   # Restauration>Bar -> idem
    ('fusionner', 'TSUB-AA99F0EBDBED', 'NDOM-H14'),   # Restauration>Cuisine -> Production culinaire
    ('fusionner', 'TDOM-CC9EE4C97BFC', 'NDOM-H15'),   # Restauration (vidé)
    ('fusionner', 'TDOM-03753B6809FF', 'NDOM-H13'),   # Hébergement (Housekeeping) -> Personnel d'étage
    ('fusionner', 'TDOM-6FACF3742875', 'NDOM-H12'),   # Réception -> Accueil en hôtellerie
    ('fusionner', 'TDOM-DD633FD21422', 'NDOM-H11'),   # Direction Hôtelière -> Gestion et direction d'établissement
    ('fusionner', 'TDOM-D8E6CCF07001', 'NDOM-J11'),   # Communication -> Édition et communication
    ('fusionner', 'TDOM-5E38B21388F9', 'NDOM-J12'),   # Audiovisuel -> Images et sons
    ('fusionner', 'TDOM-38CB6107F186', 'NDOM-M11'),   # Médecine -> Praticiens médicaux
    ('fusionner', 'TDOM-F4E946A30860', 'NDOM-M15'),   # Soins Infirmiers -> Soins paramédicaux
]


class _Journal:
    def __init__(self, ecrire=None):
        self.ecrire = ecrire or (lambda s: None)
        self.lignes = []

    def __call__(self, s):
        self.lignes.append(s)
        self.ecrire(s)


def _fusionner_groupe(source, cible, log):
    """Fusion récursive générique (secteur, domaine ou sous-domaine). Voir docstring module."""
    from .models import GroupeMetier, Metier, ProfilEntreprise

    cible_metiers = {_norm(m.libelle): m for m in Metier.objects.filter(groupe_principal=cible)}
    for m in Metier.objects.filter(groupe_principal=source):
        homonyme = cible_metiers.get(_norm(m.libelle))
        # Toujours relier à la RACINE canonique, et jamais créer de cycle : le classeur client
        # redirige déjà certains doublons (ex: Acheteur TAF-000518 -> TAF-000217) — relier
        # l'autre sens produisait A -> B -> A (bug trouvé en relisant la 1re exécution).
        racine_cible = (homonyme.metier_canonique or homonyme) if homonyme else None
        racine_m = m.metier_canonique or m
        if homonyme and racine_cible.pk != racine_m.pk:
            log(f"      métier relié : {m.libelle!r} ({m.code}) -> canonique {racine_cible.code}")
            # Les métiers qui redirigeaient vers m suivent (jamais de chaîne à 2 sauts).
            Metier.objects.filter(metier_canonique=m).update(metier_canonique=racine_cible)
            m.metier_canonique = racine_cible
            # groupe_principal a on_delete=SET_NULL : réaligné avant suppression de la source.
            m.groupe_principal = cible
            m.save(update_fields=['metier_canonique', 'groupe_principal'])
        else:
            log(f"      métier déplacé : {m.libelle!r} ({m.code}) -> {cible.libelle!r}")
            m.groupe_principal = cible
            m.save(update_fields=['groupe_principal'])

    enfants_cible = {_norm(g.libelle): g for g in GroupeMetier.objects.filter(parent=cible)}
    for enfant in list(GroupeMetier.objects.filter(parent=source)):
        homonyme = enfants_cible.get(_norm(enfant.libelle))
        if homonyme:
            log(f"    sous-groupe fusionné : {enfant.libelle!r} ({enfant.code}) -> {homonyme.code}")
            _fusionner_groupe(enfant, homonyme, log)
        else:
            log(f"    sous-groupe reparenté : {enfant.libelle!r} ({enfant.code}) -> sous {cible.libelle!r}")
            enfant.parent = cible
            enfant.save(update_fields=['parent'])

    # Un secteur supprimé ne doit jamais laisser une entreprise sur un code secteur mort
    # (ProfilEntreprise.secteur_activite stocke GroupeMetier.code_source, pas une FK).
    if source.type_groupe == 'secteur_source' and source.code_source and cible.code_source:
        n = ProfilEntreprise.objects.filter(secteur_activite=source.code_source).update(secteur_activite=cible.code_source)
        if n:
            log(f"    {n} entreprise(s) : secteur {source.code_source} -> {cible.code_source}")

    source.delete()


def appliquer_operations_groupes(log, operations=GROUPES_OPERATIONS):
    from .models import GroupeMetier

    groupes = lambda code: GroupeMetier.objects.filter(code=code).first()
    for op, a, b in operations:
        ga = groupes(a)
        if op == 'renommer':
            if ga and ga.libelle != b:
                log(f"  renommé : {ga.libelle!r} -> {b!r} ({a})")
                ga.libelle = b
                ga.save(update_fields=['libelle'])
            continue
        gb = groupes(b)
        if ga is None:
            log(f"  [déjà fait] {op} {a} -> {b}")
            continue
        if gb is None:
            raise ValueError(f"Cible introuvable pour {op} {a} -> {b} : consolidation interrompue.")
        if op == 'deplacer':
            if ga.parent_id != gb.pk:
                log(f"  déplacé : {ga.libelle!r} ({a}) -> sous {gb.libelle!r} ({b})")
                ga.parent = gb
                ga.save(update_fields=['parent'])
            else:
                log(f"  [déjà fait] deplacer {a} -> {b}")
        elif op == 'fusionner':
            log(f"  FUSION : {ga.libelle!r} ({a}) -> {gb.libelle!r} ({b})")
            _fusionner_groupe(ga, gb, log)
        else:
            raise ValueError(f"Opération inconnue : {op}")


# ---------------------------------------------------------------------------
# 2. SPÉCIALITÉS DE FORMATION
# ---------------------------------------------------------------------------
# (code doublon, code conservé). Fiche conservée = celle qui porte le plus de liens (métiers,
# relations, alias), puis la plus ancienne. Les 32 premières lignes sont des doublons EXACTS
# (même libellé, même domaine) : 27 viennent de la Formation Pro (une fiche par niveau
# CAP/CMP/BT/BTS — les niveaux restent portés par les couples DiplomeSpecialite), 5 sont des
# doublons d'import du même Master. Les 13 suivantes sont des variantes orthographiques
# vérifiées une à une. Volontairement NON fusionnées : les options distinctes (Usinage/
# Outillage, Flexo/Offset, Prise de son/de vue...), "Économie monétaire et bancaire" vs
# "...et financière", et les doublons ENTRE domaines (thèmes éditoriaux v1 vs spécialités
# académiques, déjà reliés par RelationSpecialite — décision client du 25/09/2026).
SPECIALITES_FUSIONS = [
    ('FP-PEC1203', 'FP-PEC0703'),  # Aquariophilie BT -> CAP
    ('FP-AGR0710', 'FP-AGR0702'),  # Arboriculture
    ('FP-TAG0704', 'FP-TAG0716'),  # Assurances
    ('FP-TAG0720', 'FP-TAG0716'),  # Assurances
    ('FP-TAG0715', 'FP-TAG0703'),  # Banque
    ('FP-TAG0719', 'FP-TAG0703'),  # Banque
    ('FP-TAG0709', 'FP-TAG0702'),  # Comptabilité
    ('FP-AGR0709', 'FP-AGR0701'),  # Cultures maraîchères
    ('FP-AGR1213', 'FP-AGR1207'),  # Cultures médicinales, aromatiques et condimentaires
    ('SP-322402B3F712', 'SP-CAC609AEB322'),  # Didactique des langues étrangères
    ('SP-ACB9E1D04031', 'SP-F5390A5BB692'),  # Économie et gestion des entreprises
    ('FP-ELE0714', 'FP-ELE0702'),  # Électricité industrielle
    ('FP-ELE1205', 'FP-ELE0705'),  # Électromécanique
    ('FP-ELE0718', 'FP-ELE0709'),  # Électronique industrielle
    ('FP-ELE0712', 'FP-ELE1202'),  # Électrotechnique
    ('FP-ELE0708', 'FP-ELE1202'),  # Électrotechnique
    ('SP-913A7407A726', 'SP-10BCBE0036CE'),  # Énergies renouvelables en électrotechnique
    ('SP-7AB35C2B9531', 'SP-D8F0C941E370'),  # Énergies renouvelables en mécanique
    ('FP-AGR0712', 'FP-AGR0704'),  # Grandes cultures
    ('FP-HRT0709', 'FP-HRT0707'),  # Hôtellerie / Option : Réception
    ('SP-5D9A972DB783', 'SP-3351D22E0980'),  # Littérature et civilisation
    ('SP-E38A29CA212F', 'SP-3351D22E0980'),  # Littérature et civilisation
    ('FP-MME0718', 'FP-MME0714'),  # Maintenance des engins de chantier
    ('FP-ELE1215', 'FP-ELE1209'),  # Maintenance des systèmes mécaniques automatisés
    ('FP-CMS0713', 'FP-CMS0709'),  # Maintenance industrielle en construction mécanique et sidérurgique
    ('FP-CMS0716', 'FP-CMS0710'),  # Productique mécanique / Option : Usinage
    ('SP-F744C268D8CA', 'SP-B60000E8E458'),  # Psychologie de l'éducation
    ('SP-A99F8E12EF68', 'SP-15AFA53F84F4'),  # Sciences du langage
    ('FP-AGR1212', 'FP-AGR1206'),  # Sylviculture
    ('FP-HRT0713', 'FP-HRT0708'),  # Tourisme / Option : Agence de voyage
    ('FP-AGR1211', 'FP-AGR1205'),  # Viticulture
    ('FP-BTP0721', 'FP-BTP1207'),  # Voieries et réseaux divers
    # variantes orthographiques
    ('SP-6C3D45AF73A7', 'SP-336EDEC39B7C'),  # Mathematique -> Mathématiques
    ('SP-BE4A08F78F24', 'SP-903D29C18B5A'),  # Alimentation, nutrition et pathologie(s)
    ('SP-528D1C672D78', 'SP-56354E606B06'),  # Entreprenariat -> Entrepreneuriat
    ('SP-7063924A51A9', 'SP-46364AF493BE'),  # Finance des banques et (des) assurances
    ('SP-21CD1C90D1E7', 'SP-DAA4B317CB7D'),  # Psychologie du travail et d'organisation
    ('SP-6A5EAA549CA6', 'SP-DAA4B317CB7D'),  # Psychologie du travail et organisation
    ('SP-BF48BB05E686', 'SP-A4B700B95D7E'),  # Systèmes et/des télécommunications
    ('SP-7A6998923679', 'SP-02CF31AE4D07'),  # Telecommunication -> Télécommunications
    ('SP-6D3255484CF0', 'SP-D572AA13F941'),  # Littérature arabe (de) moderne et contemporaine
    ('FP-ACP1804', 'FP-ACP1802'),  # Technicien/Technique de conservation du patrimoine bâti (BT/CMP)
    ('FP-HTR1807', 'FP-HRT0703'),  # (Hôtellerie -) Restauration / Option : Cuisine traditionnelle (BTS/CAP)
    ('FP-CML1205', 'FP-CML0710'),  # Dessin (d'étude) en construction métallique (BT/CMP)
    ('SP-AE184B7C3425', 'SP-8C93893C2E81'),  # Droit privé(DD) -> Droit privé
]
_FUSIONS_SPE = dict(SPECIALITES_FUSIONS)

# Libellés propres pour les fiches conservées dont le libellé source est mal accentué/casé.
SPECIALITES_LIBELLES = {
    'SP-8C93893C2E81': 'Droit privé',
    'SP-CAC609AEB322': 'Didactique des langues étrangères',
    'SP-F5390A5BB692': 'Économie et gestion des entreprises',
    'SP-3351D22E0980': 'Littérature et civilisation',
    'SP-B60000E8E458': "Psychologie de l'éducation",
    'SP-15AFA53F84F4': 'Sciences du langage',
    'SP-D8F0C941E370': 'Énergies renouvelables en mécanique',
    'FP-HRT0703': 'Hôtellerie - Restauration / Option : Cuisine traditionnelle',
}


def code_specialite_canonique(code):
    """Résout un code de spécialité vers la fiche conservée (suit une chaîne éventuelle)."""
    vu = set()
    while code in _FUSIONS_SPE and code not in vu:
        vu.add(code)
        code = _FUSIONS_SPE[code]
    return code


def _fusionner_specialite(doublon, cible, log):
    from .models import (AliasSpecialite, DiplomeSpecialite, FormationCandidat, MetierFormation,
                         OffreEmploi, RelationSpecialite)

    for ds in DiplomeSpecialite.objects.filter(specialite=doublon):
        if DiplomeSpecialite.objects.filter(diplome_id=ds.diplome_id, specialite=cible).exists():
            ds.delete()  # couple déjà porté par la fiche conservée (aucune FK ne pointe sur DiplomeSpecialite)
        else:
            ds.specialite = cible
            ds.save(update_fields=['specialite'])

    cles_cible = set(AliasSpecialite.objects.filter(specialite=cible).values_list('cle_recherche', flat=True))
    for a in AliasSpecialite.objects.filter(specialite=doublon):
        if a.cle_recherche in cles_cible:
            a.delete()
        else:
            a.specialite = cible
            a.save(update_fields=['specialite'])
            cles_cible.add(a.cle_recherche)

    for mf in MetierFormation.objects.filter(specialite=doublon):
        if MetierFormation.objects.filter(metier_id=mf.metier_id, specialite=cible).exists():
            mf.delete()
        else:
            mf.specialite = cible
            mf.save(update_fields=['specialite'])

    for champ, autre in (('specialite_depart', 'specialite_arrivee'), ('specialite_arrivee', 'specialite_depart')):
        for rel in RelationSpecialite.objects.filter(**{champ: doublon}):
            autre_id = getattr(rel, f'{autre}_id')
            deja = RelationSpecialite.objects.filter(
                specialite_depart_id__in=[cible.pk, autre_id], specialite_arrivee_id__in=[cible.pk, autre_id],
            ).exclude(pk=rel.pk).exists()
            if autre_id == cible.pk or deja:
                rel.delete()
            else:
                setattr(rel, champ, cible)
                rel.save(update_fields=[champ])

    for offre in OffreEmploi.objects.filter(specialites_requises=doublon):
        offre.specialites_requises.remove(doublon)
        offre.specialites_requises.add(cible)
    n_fc = FormationCandidat.objects.filter(specialite_ref=doublon).update(specialite_ref=cible)

    log(f"  spécialité fusionnée : {doublon.libelle!r} ({doublon.code}) -> {cible.libelle!r} ({cible.code})"
        + (f" — {n_fc} formation(s) candidat repointée(s)" if n_fc else ""))
    doublon.delete()


def appliquer_fusions_specialites(log):
    from .models import SpecialiteFormation

    fiches = {s.code: s for s in SpecialiteFormation.objects.filter(
        code__in=set(_FUSIONS_SPE) | set(_FUSIONS_SPE.values()) | set(SPECIALITES_LIBELLES))}
    for doublon_code in _FUSIONS_SPE:
        doublon = fiches.get(doublon_code)
        cible = fiches.get(code_specialite_canonique(doublon_code))
        if doublon is None:
            continue
        if cible is None:
            raise ValueError(f"Spécialité conservée introuvable pour {doublon_code}.")
        _fusionner_specialite(doublon, cible, log)
    # Après un réimport, les alias du doublon ont été rattachés directement à la fiche conservée
    # (code_specialite_canonique) : on retire les répétitions de clé de recherche.
    from .models import AliasSpecialite
    vus = set()
    for a in AliasSpecialite.objects.filter(specialite__code__in=set(_FUSIONS_SPE.values())).order_by('pk'):
        cle = (a.specialite_id, a.cle_recherche)
        if cle in vus:
            a.delete()
        else:
            vus.add(cle)
    for code, libelle in SPECIALITES_LIBELLES.items():
        s = fiches.get(code)
        if s and s.libelle != libelle:
            s.libelle = libelle
            s.save(update_fields=['libelle'])


# ---------------------------------------------------------------------------
# 3. INSTANTANÉ DE HIÉRARCHIE CIBLE (protection contre le réimport)
# ---------------------------------------------------------------------------
def _hierarchie_classeur(wb_met):
    from .management.commands.import_referentiel_v2 import sheet_rows, _s

    groupes = {}
    for r in sheet_rows(wb_met, 'GROUPES'):
        groupes[_s(r['groupe_id'])] = {'parent': _s(r.get('parent_id')) or None, 'libelle': _s(r['libelle_fr'])}
    metiers = {}
    for r in sheet_rows(wb_met, 'METIERS'):
        code = _s(r['metier_id'])
        canon = _s(r.get('metier_canonique_id')) or None
        metiers[code] = {'groupe': _s(r.get('groupe_principal_id')) or None,
                         'canonique': canon if canon != code else None}
    return groupes, metiers


def calculer_instantane(wb_met):
    """Écart base consolidée <-> classeur client, en codes."""
    from .models import GroupeMetier, Metier

    groupes_xl, metiers_xl = _hierarchie_classeur(wb_met)
    code_par_pk = dict(GroupeMetier.objects.values_list('pk', 'code'))
    instantane = {'groupes': {}, 'groupes_supprimes': [], 'metiers': {}}

    for g in GroupeMetier.objects.all():
        xl = groupes_xl.get(g.code)
        if xl is None:
            continue  # groupe créé hors classeur (admin) : jamais touché par l'import
        parent = code_par_pk.get(g.parent_id)
        diff = {}
        if parent != xl['parent']:
            diff['parent'] = parent
        if g.libelle != xl['libelle']:
            diff['libelle'] = g.libelle
        if diff:
            instantane['groupes'][g.code] = diff
    codes_base = set(code_par_pk.values())
    instantane['groupes_supprimes'] = sorted(c for c in groupes_xl if c not in codes_base)

    metier_code_par_pk = dict(Metier.objects.values_list('pk', 'code'))
    for m in Metier.objects.all():
        xl = metiers_xl.get(m.code)
        if xl is None:
            continue
        actuel = {'groupe': code_par_pk.get(m.groupe_principal_id),
                  'canonique': metier_code_par_pk.get(m.metier_canonique_id)}
        if actuel['canonique'] == m.code:
            actuel['canonique'] = None
        if actuel != xl:
            instantane['metiers'][m.code] = actuel
    return instantane


def ecrire_instantane(instantane, chemin=CHEMIN_INSTANTANE):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(instantane, f, ensure_ascii=False, indent=1, sort_keys=True)


def rejouer_instantane(log, chemin=CHEMIN_INSTANTANE):
    """Réapplique l'état consolidé après un import (idempotent). Ne supprime un groupe que
    s'il est réellement vide : jamais de perte de métier, même si le classeur a évolué."""
    from .models import GroupeMetier, Metier

    if not os.path.exists(chemin):
        log("  aucun instantané de hiérarchie — rien à rejouer.")
        return
    with open(chemin, encoding='utf-8') as f:
        inst = json.load(f)

    groupes = {g.code: g for g in GroupeMetier.objects.all()}
    for code, diff in inst['groupes'].items():
        g = groupes.get(code)
        if g is None:
            continue
        champs = []
        if 'parent' in diff:
            parent = groupes.get(diff['parent']) if diff['parent'] else None
            if diff['parent'] and parent is None:
                log(f"  [!] parent {diff['parent']} introuvable pour {code}, ignoré")
            elif g.parent_id != (parent.pk if parent else None):
                g.parent = parent
                champs.append('parent')
        if 'libelle' in diff and g.libelle != diff['libelle']:
            g.libelle = diff['libelle']
            champs.append('libelle')
        if champs:
            g.save(update_fields=champs)

    metiers = {m.code: m for m in Metier.objects.all()}
    for code, cible in inst['metiers'].items():
        m = metiers.get(code)
        if m is None:
            continue
        groupe = groupes.get(cible['groupe']) if cible['groupe'] else None
        canon = metiers.get(cible['canonique']) if cible['canonique'] else None
        if (m.groupe_principal_id, m.metier_canonique_id) != (groupe.pk if groupe else None, canon.pk if canon else None):
            m.groupe_principal = groupe
            m.metier_canonique = canon
            m.save(update_fields=['groupe_principal', 'metier_canonique'])

    a_supprimer = [groupes[c] for c in inst['groupes_supprimes'] if c in groupes]
    progres = True
    while a_supprimer and progres:
        progres = False
        for g in list(a_supprimer):
            if not GroupeMetier.objects.filter(parent=g).exists() and not Metier.objects.filter(groupe_principal=g).exists():
                g.delete()
                a_supprimer.remove(g)
                progres = True
    for g in a_supprimer:
        log(f"  [!] groupe {g.code} {g.libelle!r} conservé : il contient encore des métiers/sous-groupes (classeur modifié ?)")
    log(f"  instantané rejoué : {len(inst['groupes'])} groupes, {len(inst['metiers'])} métiers, "
        f"{len(inst['groupes_supprimes'])} groupes fusionnés.")


def rejouer_consolidation(log):
    """Appelé à la fin de import_referentiel_v2 (même transaction)."""
    with transaction.atomic():
        rejouer_instantane(log)
        appliquer_fusions_specialites(log)
