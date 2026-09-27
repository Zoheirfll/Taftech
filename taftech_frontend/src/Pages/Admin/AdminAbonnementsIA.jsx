import React from "react";
import { useSearchParams } from "react-router-dom";
import { tw } from "../../theme";
import AdminPaliers from "./AdminPaliers";
import AdminCreditPacks from "./AdminCreditPacks";
import AdminIAConfig from "./AdminIAConfig";

// Regroupe les 3 pages admin liées à la facturation/IA (auparavant 3 entrées séparées dans la
// sidebar) sous un seul écran à onglets — même sujet ("qu'est-ce que le recruteur paie et
// quelles limites IA vont avec"), plus simple à parcourir d'un seul tenant. Chaque onglet garde
// son composant existant inchangé (aucune logique dupliquée), seule la navigation change.
const ONGLETS = [
  { key: "paliers", label: "Paliers & tarifs", Component: AdminPaliers },
  { key: "credits", label: "Packs de crédits", Component: AdminCreditPacks },
  { key: "ia", label: "Configuration & quotas IA", Component: AdminIAConfig },
];

const AdminAbonnementsIA = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ongletActif = ONGLETS.find((o) => o.key === searchParams.get("tab"))?.key || "paliers";

  const changerOnglet = (key) => {
    setSearchParams({ tab: key });
  };

  const Actif = ONGLETS.find((o) => o.key === ongletActif).Component;

  return (
    <div className="space-y-5">
      <div>
        <h1 className={tw.pageTitle}>Abonnements & IA</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>
          Tarification recruteur, packs de crédits CVthèque et paramètres/quotas IA — tout ce qui touche à ce que paie un compte et à ce qu'il peut consommer, au même endroit.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200" role="tablist" aria-label="Sections Abonnements & IA">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={ongletActif === o.key}
            onClick={() => changerOnglet(o.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              ongletActif === o.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <Actif />
      </div>
    </div>
  );
};

export default AdminAbonnementsIA;
