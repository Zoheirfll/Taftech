import React from "react";
import { useSearchParams } from "react-router-dom";
import { Layers, Coins, Cpu } from "lucide-react";
import AdminPaliers from "./AdminPaliers";
import AdminCreditPacks from "./AdminCreditPacks";
import AdminIAConfig from "./AdminIAConfig";
import AdminPageHeader from "../../Components/AdminPageHeader";

// Regroupe les 3 pages admin liées à la facturation/IA (auparavant 3 entrées séparées dans la
// sidebar) sous un seul écran à onglets — même sujet ("qu'est-ce que le recruteur paie et
// quelles limites IA vont avec"), plus simple à parcourir d'un seul tenant. Chaque onglet garde
// son composant existant (en-tête compact, pas de second grand titre), seule la navigation change.
const ONGLETS = [
  { key: "paliers", label: "Paliers & tarifs", icon: Layers, Component: AdminPaliers },
  { key: "credits", label: "Packs de crédits", icon: Coins, Component: AdminCreditPacks },
  { key: "ia", label: "Configuration & quotas IA", icon: Cpu, Component: AdminIAConfig },
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
      <AdminPageHeader
        icon={Layers}
        color="emerald"
        title="Abonnements & IA"
        subtitle="Tarification recruteur, packs de crédits CVthèque et paramètres/quotas IA — ce que paie un compte et ce qu'il peut consommer."
      />

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Sections Abonnements & IA">
        {ONGLETS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={ongletActif === key}
            onClick={() => changerOnglet(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t ${
              ongletActif === key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} /> {label}
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
