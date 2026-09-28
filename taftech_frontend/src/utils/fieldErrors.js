// Extrait les erreurs par champ d'une réponse DRF ({champ: ["msg"]} ou {champ: "msg"}).
// Retourne {} si l'erreur n'est pas une erreur de validation par champ.
export const extraireErreursChamps = (err, champsConnus) => {
  const data = err?.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const res = {};
  Object.entries(data).forEach(([cle, val]) => {
    if (champsConnus && !champsConnus.includes(cle)) return;
    const msg = Array.isArray(val) ? val[0] : val;
    if (typeof msg === "string" && !["error", "detail", "message", "code"].includes(cle)) res[cle] = msg;
  });
  return res;
};
