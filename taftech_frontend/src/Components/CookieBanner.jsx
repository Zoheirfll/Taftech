import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { tw } from "../theme";

// Information sur les cookies. Ce n'est PAS une demande de consentement : le site ne dépose que
// des cookies strictement nécessaires (connexion httpOnly, protection CSRF), exemptés de
// consentement, la mesure d'audience est sans cookie (voir Analytics.jsx) et la carte Google ne se
// charge qu'après un clic (voir CarteSurDemande.jsx).
// ⚠️ Si un outil qui dépose des cookies (publicité, Google Analytics...) est ajouté un jour, cette
// bannière doit devenir un vrai choix « Accepter / Refuser » AVANT tout dépôt, et le texte être revu.
const CLE_STOCKAGE = "taftech_info_cookies_vue";

const dejaVue = () => {
  try {
    return localStorage.getItem(CLE_STOCKAGE) === "1";
  } catch {
    return false;
  }
};

const memoriser = () => {
  try {
    localStorage.setItem(CLE_STOCKAGE, "1");
  } catch {
    // stockage indisponible (navigation privée) : la bannière réapparaîtra, sans conséquence
  }
};

const CookieBanner = () => {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => !dejaVue());

  if (!visible || pathname.startsWith("/admin-taftech")) return null;

  const fermer = () => {
    memoriser();
    setVisible(false);
  };

  return (
    // bottom-16 sur mobile : au-dessus de la barre de navigation fixe du bas.
    <aside
      role="region"
      aria-label="Information sur les cookies"
      className={`${tw.card} shadow-lg fixed z-40 inset-x-3 bottom-16 md:bottom-4 md:left-4 md:right-auto md:max-w-md p-4`}
    >
      <p className={`text-sm leading-relaxed ${tw.textMuted700}`}>
        TafTech n'utilise que des cookies indispensables à son fonctionnement (connexion, sécurité) : aucun cookie
        publicitaire, aucune mesure d'audience par cookie. La carte Google ne se charge qu'après votre clic, et le
        service Google n'est contacté que sur les pages de connexion et d'inscription.{" "}
        <Link to="/confidentialite" className={`font-semibold underline ${tw.textPrimary}`}>
          En savoir plus
        </Link>
      </p>
      <button
        type="button"
        onClick={fermer}
        className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold ${tw.buttonDark} ${tw.focusRing}`}
      >
        J'ai compris
      </button>
    </aside>
  );
};

export default CookieBanner;
