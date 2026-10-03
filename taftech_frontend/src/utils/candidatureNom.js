// Identité d'un candidat telle qu'au moment de sa candidature (instantané `profil_snapshot`),
// avec repli sur le compte actuel pour les candidatures sans instantané. Le recruteur doit voir
// le nom sous lequel le candidat a postulé, même si le compte a été renommé depuis.
export const identiteCandidature = (c) => {
  const snap = c?.profil_snapshot;
  const live = c?.candidat;
  return {
    first_name: snap?.first_name ?? live?.first_name ?? "",
    last_name: snap?.last_name ?? live?.last_name ?? "",
  };
};

export const nomCandidature = (c) => {
  const { first_name, last_name } = identiteCandidature(c);
  return `${first_name} ${last_name}`.trim();
};
