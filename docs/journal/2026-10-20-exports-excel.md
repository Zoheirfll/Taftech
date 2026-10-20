# Journal du 20/10/2026 — Exports Excel à jour et exportables partout

Demande : « mettre à jour l'export Excel des utilisateurs TafTech et tous les exports, je les veux à jour et tout exportable ».

## Décisions de l'utilisateur
- Portée : **toutes les listes de données** (pas les contenus éditoriaux : articles, FAQ, bannières, pages).
- Utilisateurs : colonnes **complètes avec date de naissance et adresse**. Le NIN avait d'abord été exclu ; **ajouté sur demande de l'utilisateur** (« il manque le nin »), dans cet export seulement, avec mention dans la trace d'audit.
- L'export **suit les filtres de la liste** affichée.

## Fait
- `jobs/views/admin_filtres.py` : filtres partagés liste/export (utilisateurs, offres, entreprises, candidatures, journal d'audit, rendez-vous) ; `demandes_ajout_filtrees` dans `views/demandes_ajout.py`. Les listes existantes les utilisent (298 tests backend verts).
- `jobs/views/admin_exports.py` : 9 exports (4 existants enrichis + demandes d'ajout, demandes premium, rendez-vous, journal d'audit, erreurs système), trace dans le journal d'audit.
- `export_xlsx._valeur_cellule` : les `Decimal` restent numériques.
- Export recruteur (`recruteur_exports.py`) : colonnes enrichies depuis le profil figé, sans adresse / naissance / sexe / NIN ; nom de fichier assaini.
- Frontend : `Components/BoutonExportExcel.jsx` + `adminService.exporterListe` ; boutons sur les 9 pages ; 4 anciennes méthodes `exportXxx` retirées.

## Défauts trouvés par les tests
- Compte sans profil candidat : 24 cellules vides au lieu de 23 (colonnes décalées pour les recruteurs).
- Score IA exporté en texte (`Decimal`).
- L'ancien export des utilisateurs incluait les super-administrateurs absents de la liste.

## Non fait
- Pas d'export des paiements d'abonnement (aucune page de liste correspondante) ni des contenus éditoriaux.
- Export recruteur limité aux candidatures (liste des offres du recruteur non ajoutée).
