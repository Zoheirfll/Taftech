// Catégories d'exigence impérative d'une offre. Seules les catégories autres que « Autre » ouvrent
// le filtre CVthèque correspondant (permis, véhicule, passeport, situation militaire) : ces
// données personnelles ne se filtrent que si l'offre les justifie par un critère professionnel.
export const CATEGORIES_EXIGENCE = [
  { value: "AUTRE", label: "Autre" },
  { value: "PERMIS_CONDUIRE", label: "Permis de conduire" },
  { value: "VEHICULE", label: "Véhicule personnel" },
  { value: "PASSEPORT", label: "Passeport valide" },
  { value: "SERVICE_NATIONAL", label: "Situation militaire" },
];

export const CATEGORIE_EXIGENCE_PAR_DEFAUT = "AUTRE";
