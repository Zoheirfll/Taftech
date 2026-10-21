// Faut-il retirer la photo existante du profil à l'enregistrement de l'étape « Infos » ?
// Oui seulement si le candidat suit entièrement son nouveau CV (mode « Remplacer »), qu'un CV vient
// d'être analysé, que ce CV ne contient pas de photo et qu'il en existe déjà une sur le profil.
// En mode « Ajouter », l'ancienne photo est toujours conservée.
export const doitRetirerPhoto = ({ infosMode, cvAnalyse, photoEnAttente, profil }) =>
  infosMode === "remplacer" &&
  !!cvAnalyse &&
  !cvAnalyse.photo?.data &&
  !photoEnAttente &&
  !!profil?.photo_profil;
