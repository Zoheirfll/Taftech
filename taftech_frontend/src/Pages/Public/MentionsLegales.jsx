import React from "react";
import { tw } from "../../theme";
import Seo from "../../Components/Seo";
import { useInformationsSociete } from "../../utils/informationsSociete";

// Page « Mentions légales » : générée à partir des informations société (admin → Mentions
// légales), source unique avec les pieds de page, la page Contact et les factures. Seuls les champs
// réellement renseignés sont affichés : aucune fausse valeur, aucun texte à trous.
const SECTIONS = (i) => [
  {
    titre: "Éditeur du site",
    lignes: [
      ["Dénomination sociale", i.raison_sociale],
      ["Forme juridique", i.forme_juridique],
      ["Capital social", i.capital_social],
      ["Adresse du siège", i.adresse],
      ["Registre du commerce", i.registre_commerce],
      ["NIF", i.nif],
      ["NIS", i.nis],
      ["N° TVA", i.tva],
      ["Représentant légal", i.representant_legal],
    ],
  },
  { titre: "Directeur de la publication", lignes: [["Nom", i.directeur_publication]] },
  { titre: "Hébergeur du site", lignes: [["Hébergeur", i.hebergeur]] },
  {
    titre: "Contact",
    lignes: [
      ["E-mail", i.email_contact],
      ["Téléphone", i.telephone],
    ],
  },
];

const MentionsLegales = () => {
  const infos = useInformationsSociete();
  const sections = SECTIONS(infos)
    .map((s) => ({ ...s, lignes: s.lignes.filter(([, valeur]) => valeur) }))
    .filter((s) => s.lignes.length > 0);

  return (
    <div className={tw.pageBackground}>
      <Seo title="Mentions légales" />
      <div className={`${tw.pageContainer} max-w-3xl`}>
        <h1 className={`${tw.pageTitleGrand} mb-6`}>Mentions légales</h1>
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.titre} className={`${tw.cardColors} rounded-2xl p-5`}>
              <h2 className={`text-base font-bold ${tw.textStrong} mb-3`}>{s.titre}</h2>
              <dl className="space-y-1.5">
                {s.lignes.map(([libelle, valeur]) => (
                  <div key={libelle} className="flex flex-col sm:flex-row sm:gap-3 text-sm">
                    <dt className={`sm:w-52 shrink-0 font-medium ${tw.textMuted}`}>{libelle}</dt>
                    <dd className={tw.textMuted700}>{valeur}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MentionsLegales;
