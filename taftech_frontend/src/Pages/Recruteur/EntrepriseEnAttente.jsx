import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { authService } from "../../Services/authService";
import { tw } from "../../theme";

// Seul écran accessible à un recruteur dont l'entreprise n'est pas encore validée : aucun
// menu, aucune page de l'espace recruteur (le serveur refuse aussi toutes les routes métier).
// `actualiser` relit le statut : dès l'approbation, le garde laisse passer vers le tableau de bord.
const EntrepriseEnAttente = ({ nomEntreprise, actualiser }) => {
  const navigate = useNavigate();
  const [verification, setVerification] = useState(false);

  const handleActualiser = async () => {
    setVerification(true);
    try {
      await actualiser();
    } finally {
      setVerification(false);
    }
  };

  const handleDeconnexion = () => {
    authService.logout();
    navigate("/recruteurs/connexion");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="text-center space-y-5 max-w-md w-full">
        <div className={`w-20 h-20 ${tw.bgWarningSoft} border-2 ${tw.borderWarning} rounded-2xl flex items-center justify-center mx-auto`}>
          <Clock size={36} className={tw.textWarning} />
        </div>
        <div>
          <h1 className={tw.pageTitlePetit}>Compte en cours de validation</h1>
          {nomEntreprise && <p className={`${tw.bodyText} mt-1`}>{nomEntreprise}</p>}
        </div>
        <div className={`${tw.bgTealSoft} border ${tw.borderTeal100} rounded-2xl p-5 text-left`}>
          <p className={`${tw.bodyText} leading-relaxed`}>
            Pour garantir la qualité des entreprises sur TAFTECH, votre compte est vérifié par nos administrateurs (analyse du Registre de Commerce).
            <br /><br />
            L'espace recruteur sera ouvert dès l'approbation <span className={`font-semibold ${tw.textTeal}`}>(sous 24-48h)</span>. Vous recevrez un email.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleActualiser}
            disabled={verification}
            className={`flex-1 flex items-center justify-center gap-2 ${tw.bgTealSolid} font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50`}
          >
            <RefreshCw size={15} className={verification ? "animate-spin" : ""} />
            Actualiser mon statut
          </button>
          <button
            type="button"
            onClick={handleDeconnexion}
            className={`flex-1 flex items-center justify-center gap-2 border ${tw.borderSubtle} ${tw.textMuted700} font-semibold py-2.5 rounded-xl transition-colors text-sm hover:bg-slate-50`}
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntrepriseEnAttente;
