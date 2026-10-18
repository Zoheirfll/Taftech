import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Seo from "../../Components/Seo";
import { tw } from "../../theme";

// Page de confirmation après un envoi (formulaire de contact). Elle n'est jamais indexée : sans
// envoi préalable elle ne sert à rien, et elle sert aussi de point de mesure pour les statistiques.
// Le seul paramètre accepté est `type` ; aucune donnée personnelle ne transite par l'URL.
const MESSAGES = {
  contact: {
    titre: "Message envoyé",
    texte: "Merci de nous avoir écrit. Nous vous répondrons par e-mail dans les meilleurs délais.",
  },
};
const PAR_DEFAUT = { titre: "Merci !", texte: "Votre demande a bien été prise en compte." };

const Merci = () => {
  const [params] = useSearchParams();
  const message = MESSAGES[params.get("type")] || PAR_DEFAUT;
  const espaceRecruteur = params.get("portail") === "recruteur";

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <Seo title="Merci" noindex />
      <CheckCircle2 size={48} className="text-emerald-600" />
      <h1 className={`${tw.pageTitleGrand} mt-4`}>{message.titre}</h1>
      <p className={`mt-2 text-base max-w-md ${tw.textMuted700}`}>{message.texte}</p>
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {espaceRecruteur ? (
          <Link to="/recruteurs" className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
            Retour à l'espace recruteur
          </Link>
        ) : (
          <>
            <Link to="/" className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
              Retour à l'accueil
            </Link>
            <Link to="/offres" className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200">
              Voir les offres
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Merci;
