import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Search, Inbox, Settings } from "lucide-react";
import { authService } from "../Services/authService";
import { useStatutEntreprise, STATUT_ENTREPRISE } from "../utils/useStatutEntreprise";
import { useDroitsPalier, estVerrouille } from "../utils/useDroitsPalier";
import CadenasPalier from "./CadenasPalier";

const ITEMS = [
  { to: "/dashboard", label: "Tableau", icon: LayoutDashboard, minRole: "INVITE" },
  { to: "/creer-offre", label: "Publier", icon: Briefcase, minRole: "UTILISATEUR", palierRequis: "peut_publier_offre" },
  { to: "/cvtheque", label: "CVthèque", icon: Search, minRole: "UTILISATEUR", palierRequis: "acces_cvtheque" },
  { to: "/candidatures-spontanees", label: "Spontanées", icon: Inbox, minRole: "UTILISATEUR" },
  { to: "/parametres", label: "Paramètres", icon: Settings, minRole: "INVITE" },
];

// Bottom nav mobile — recruteur/membre d'équipe connecté. Filtrée par rôle (INVITE
// n'a pas accès à Publier/CVthèque), même logique que le dropdown de NavbarRecruteur.
const BottomNavRecruteur = () => {
  const location = useLocation();
  const { statut } = useStatutEntreprise();
  // Un cadenas s'affiche quand un droit du palier vaut explicitement `false` (rien tant qu'inconnu).
  const droitsPalier = useDroitsPalier(authService.isRecruteurOuMembre() && statut === STATUT_ENTREPRISE.OK);
  const items = ITEMS;
  const isActive = (to) => location.pathname.startsWith(to);

  // Entreprise en attente de validation : aucune page à atteindre, donc pas de navigation.
  if (statut === STATUT_ENTREPRISE.EN_ATTENTE) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md rounded-t-2xl shadow-[0_-6px_24px_-4px_rgba(15,23,42,0.12)] flex items-stretch px-1 pt-1.5"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.375rem)" }}
    >
      {items.map(({ to, label, icon: Icon, palierRequis, minRole }) => {
        const active = isActive(to);
        return (
          <Link key={to} to={to} className="flex-1 flex flex-col items-center justify-center gap-1 py-1 min-h-[54px]">
            <span
              className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${
                active ? "bg-teal-50" : ""
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={`transition-colors duration-200 ${active ? "text-teal-700" : "text-slate-400"}`}
              />
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-[10.5px] leading-none transition-colors duration-200 ${
                active ? "font-bold text-teal-700" : "font-medium text-slate-500"
              }`}
            >
              {label}
              {!authService.peutFaire(minRole)
                ? <CadenasPalier size={9} raison="Réservé à un rôle supérieur dans l'équipe" />
                : estVerrouille(droitsPalier, palierRequis) && <CadenasPalier size={9} />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNavRecruteur;
