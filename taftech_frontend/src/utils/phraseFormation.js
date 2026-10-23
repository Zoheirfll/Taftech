// Phrase de formation d'une offre, lue par le candidat (« Master 2 en Informatique ») et montrée en aperçu
// au recruteur : une seule logique pour les deux, jamais une série de pastilles de spécialités.
// Règles : un domaine entièrement coché s'écrit par son nom ; s'il manque une ou deux spécialités,
// « Domaine (sauf X et Y) » ; sinon on cite les spécialités gardées, plafonnées à 5 (« et N autres »).
// La phrase ne promet jamais plus que ce qui est coché (pas de « ou domaine similaire »).

import { regrouperDiplomes } from "./groupesDiplomes";
import { joindre } from "./listeFrancaise";

export const MAX_SPECIALITES_CITEES = 5;
export const MAX_EXCLUSIONS = 2;

const memeId = (a, b) => String(a) === String(b);

/** Phrase de la partie « spécialités » : domaines entiers, « sauf », ou spécialités citées (plafonnées). */
const partieFormation = (specialites) => {
  const groupes = new Map();
  const isolees = [];
  specialites.forEach((s) => {
    if (s.domaine_id == null || !s.domaine_libelle) {
      isolees.push(s.libelle);
      return;
    }
    groupes.set(s.domaine_id, [...(groupes.get(s.domaine_id) || []), s]);
  });

  const domaines = [];
  const citees = [];
  groupes.forEach((choisies) => {
    const { domaine_libelle: libelle, domaine_total: total, domaine_non_retenues: manquantes = [] } = choisies[0];
    if (total && choisies.length >= total) {
      domaines.push(libelle);
    } else if (total && manquantes.length > 0 && manquantes.length <= MAX_EXCLUSIONS
      && manquantes.length < choisies.length && manquantes.length === total - choisies.length) {
      domaines.push(`${libelle} (sauf ${joindre(manquantes, "et")})`);
    } else {
      citees.push(...choisies.map((s) => s.libelle));
    }
  });

  const toutes = [...citees, ...isolees];
  const reste = toutes.length - MAX_SPECIALITES_CITEES;
  const visibles = reste > 0
    ? [...toutes.slice(0, MAX_SPECIALITES_CITEES), `${reste} autre${reste > 1 ? "s" : ""}`]
    : toutes;
  return joindre([...domaines, ...visibles], "et");
};

/** « Master 2 en Informatique », « Licence ou Master en Réseaux et Génie logiciel », « Formation en … ». */
export const phraseFormation = ({ diplomes = [], specialites = [] } = {}) => {
  const diplomesTexte = joindre(regrouperDiplomes(diplomes).map((e) => e.libelle), "ou");
  const formation = partieFormation(specialites);
  if (diplomesTexte && formation) return `${diplomesTexte} en ${formation}`;
  if (diplomesTexte) return diplomesTexte;
  return formation ? `Formation en ${formation}` : "";
};

/**
 * Prépare les spécialités choisies dans le formulaire au format de la phrase (même forme que celle
 * fournie par l'API pour une offre publiée) : domaine, total de ses spécialités sélectionnables, et
 * les spécialités non retenues quand il en manque peu. `nomenclature` = spécialités sélectionnables.
 */
export const enrichirSpecialites = (choisies, nomenclature, domaines) =>
  choisies.map((s) => {
    const connue = nomenclature.find((n) => memeId(n.id, s.id));
    if (!connue) return s;
    const duDomaine = nomenclature.filter((n) => memeId(n.domaine_id, connue.domaine_id));
    const manquantes = duDomaine.filter((n) => !choisies.some((c) => memeId(c.id, n.id)));
    return {
      ...s,
      domaine_id: connue.domaine_id,
      domaine_libelle: (domaines.find((d) => memeId(d.id, connue.domaine_id)) || {}).libelle,
      domaine_total: duDomaine.length,
      domaine_non_retenues: manquantes.length <= MAX_EXCLUSIONS ? manquantes.map((n) => n.libelle) : [],
    };
  });
