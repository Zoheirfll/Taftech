// Liste lisible en français : « A », « A et B », « A, B ou C ». Si un élément contient lui-même une virgule ou « et »
// (« Informatique, données et numérique », « Réseaux et Systèmes Distribués »), la liste devient ambiguë : on sépare
// alors tous les éléments par un point-virgule.

export const joindre = (items, lien) => {
  if (items.length <= 1) return items.join("");
  if (items.some((item) => /,| et /.test(item))) return items.join(" ; ");
  return `${items.slice(0, -1).join(", ")} ${lien} ${items[items.length - 1]}`;
};
