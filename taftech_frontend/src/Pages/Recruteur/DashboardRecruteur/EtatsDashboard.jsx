// États du tableau de bord recruteur hors contenu normal : squelette de chargement, abonnement expiré, erreur.
import { tw } from "../../../theme";

export const SqueletteDashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`${tw.card} rounded-2xl p-5 animate-pulse space-y-2`}>
          <div className={`h-3 w-1/2 ${tw.surfaceSubtle} rounded`} />
          <div className={`h-6 w-1/3 ${tw.surfaceSubtle} rounded`} />
        </div>
      ))}
    </div>
    <div className={`${tw.card} rounded-2xl overflow-hidden`}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex items-center gap-4 px-5 py-4 animate-pulse ${i > 0 ? `border-t ${tw.borderBase}` : ""}`}>
          <div className={`h-4 flex-1 ${tw.surfaceSubtle} rounded`} />
          <div className={`h-4 w-16 ${tw.surfaceSubtle} rounded`} />
          <div className={`h-4 w-12 ${tw.surfaceSubtle} rounded`} />
          <div className={`h-4 w-14 ${tw.surfaceSubtle} rounded`} />
        </div>
      ))}
    </div>
  </div>
);

export const PremiumExpire = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
    <div className={`w-16 h-16 rounded-2xl ${tw.bgWarningSoft} border ${tw.borderWarning} flex items-center justify-center text-3xl`}>⭐</div>
    <h2 className={`text-xl font-bold ${tw.textSlate800}`}>Abonnement Premium expiré</h2>
    <p className={`text-sm max-w-sm ${tw.bodyText}`}>
      L'abonnement Premium de votre entreprise a expiré. Votre accès est suspendu jusqu'au renouvellement.
      Contactez le propriétaire du compte.
    </p>
  </div>
);

export const ErreurDashboard = ({ message }) => (
  <div className={`max-w-4xl mx-auto mt-10 p-6 ${tw.bgErrorSoft} ${tw.textError700} rounded-xl text-center text-sm font-medium`}>
    {message}
  </div>
);
