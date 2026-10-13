// En-tête compact du tableau de bord : logo, nom, badges (vérifié, premium), mini-stats et boutons d'action.
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { authService } from "../../../Services/authService";
import { mediaUrl } from "../../../utils/mediaUrl";
import { tw } from "../../../theme";

export const EnteteDashboard = ({
  entreprise,
  offres,
  isPremium,
  premiumExpire,
  stats,
  navigate,
  handleExportExcelGlobal,
}) => (
  <div className={`${tw.cardColors} rounded-2xl p-4 md:p-5 mb-5`}>
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

      {/* Logo + nom + badges */}
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${tw.surfaceSubtle} border ${tw.borderBase} flex items-center justify-center overflow-hidden shrink-0`}>
          {entreprise?.logo
            ? <img src={mediaUrl(entreprise.logo)} alt="Logo" className="w-full h-full object-cover" />
            : <Building2 size={18} className={tw.textMuted} />}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-lg font-extrabold ${tw.textStrong}`}>{entreprise?.nom_entreprise}</h1>
            {entreprise?.est_approuvee
              ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgSuccessSoft} ${tw.textSuccess} text-xs font-semibold rounded-full`}><CheckCircle size={11} /> Vérifié</span>
              : <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgWarningSoft} ${tw.textWarning} text-xs font-semibold rounded-full`}><AlertCircle size={11} /> En attente</span>}
            {isPremium
              ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.bgTealSoft} ${tw.textTeal} text-xs font-bold rounded-full border ${tw.borderTeal200}`}>
                  ⭐ Premium{premiumExpire && <span className="font-normal opacity-70"> · {premiumExpire}</span>}
                </span>
              : <Link to="/recruteurs/premium" className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft700} text-xs font-medium rounded-full transition-colors hover:bg-teal-50 hover:text-teal-700`}>🔒 Premium</Link>}
          </div>

          {/* Mini stats inline — grille 2×2 mobile, ligne desktop */}
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-0 mt-2">
            {[
              { val: stats.total,        label: "candidatures",  color: tw.textMuted700 },
              { val: stats.nouvelles,    label: "nouvelles",     color: tw.scoreTextSuccess },
              { val: stats.enTraitement, label: "en traitement", color: tw.scoreTextWarning },
              { val: stats.pertinentes,  label: "+80% IA",       color: tw.textTeal },
            ].map(({ val, label, color }, i) => (
              <Fragment key={label}>
                <span className={`text-xs py-0.5 sm:py-0 sm:pr-4 ${tw.textMuted700}`}>
                  <span className={`font-bold text-sm ${color}`}>{val}</span> {label}
                </span>
                {i < 3 && <span className={`hidden sm:inline pr-4 ${tw.textSlate200}`}>|</span>}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Boutons d'action + lien vitrine */}
      <div className="flex items-center gap-2 flex-wrap">
        {entreprise?.slug && entreprise?.est_approuvee && (
          <Link
            to={`/entreprise/${entreprise.slug}`}
            className={`flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-sm font-medium rounded-lg transition-colors ${tw.surface} ${tw.textMuted} ${tw.hoverSurfaceMuted}`}
          >
            <Building2 size={14} /> Ma vitrine
          </Link>
        )}
        {offres?.length > 0 && (
          <button
            onClick={handleExportExcelGlobal}
            className={`flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-sm font-medium rounded-lg transition-colors ${tw.surface} ${tw.textMuted} ${tw.hoverSurfaceMuted}`}
          >
            <Download size={14} /> Exporter Excel
          </button>
        )}
        {authService.peutFaire("UTILISATEUR") && entreprise?.est_approuvee && (
          <>
            <button
              onClick={() => navigate("/cvtheque")}
              className={`flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-sm font-semibold rounded-lg transition-colors ${tw.surface} ${tw.textMuted700} ${tw.hoverSurfaceMuted}`}
            >
              <Search size={14} /> CV
            </button>
            <button
              onClick={() => navigate("/creer-offre")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ${tw.bgTealSolid}`}
            >
              <Plus size={14} /> Publier une offre
            </button>
          </>
        )}
        {authService.peutFaire("UTILISATEUR") && !entreprise?.est_approuvee && (
          <div className="text-right">
            <button disabled className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg cursor-not-allowed ${tw.buttonNeutralSoft}`}>
              <Plus size={14} /> Publier une offre
            </button>
            <p className={`text-xs font-medium mt-1 ${tw.scoreTextWarning}`}>Validation admin requise</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
