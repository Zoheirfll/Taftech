import React, { useState } from "react";
import { ShieldCheck, Eye, X } from "lucide-react";
import { tw } from "../theme";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";

const JETON = /(\[[A-ZÉÈ_ ]+\])/;

const TexteAvecJetons = ({ texte }) =>
  texte.split(JETON).map((morceau, i) =>
    JETON.test(morceau) ? (
      <mark key={i} className={`px-1 rounded ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
        {morceau}
      </mark>
    ) : (
      <React.Fragment key={i}>{morceau}</React.Fragment>
    ),
  );

export const ApercuDonneesIA = ({ fonction, fichier = null }) => {
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);

  const ouvrir = async () => {
    setOuvert(true);
    setChargement(true);
    setErreur(null);
    setApercu(null);
    try {
      setApercu(await jobsService.getApercuDonneesIA(fonction, fichier));
    } catch (err) {
      reportError("ECHEC_APERCU_DONNEES_IA_COMPOSANT", err);
      setErreur(err.response?.data?.error || "Impossible d'afficher l'aperçu pour le moment.");
    } finally {
      setChargement(false);
    }
  };

  const categories = apercu ? Object.entries(apercu.categories || {}) : [];

  return (
    <div className="text-left">
      <label className={`flex items-center gap-2 text-sm ${tw.textStrong}`}>
        <input
          type="checkbox"
          checked
          disabled
          readOnly
          aria-label="Masquer mes informations personnelles avant l'analyse IA"
        />
        <ShieldCheck size={16} className={tw.textSuccess} />
        Masquer mes informations personnelles avant l'analyse IA
      </label>
      <p className={`text-xs ${tw.textMuted} mt-1 mb-2`}>
        Ce masquage est toujours appliqué : votre nom, vos coordonnées et vos pièces d'identité ne sont jamais transmis.
      </p>
      <button type="button" onClick={ouvrir} className={`${tw.linkPrimary} text-sm font-semibold flex items-center gap-1`}>
        <Eye size={14} /> Voir les données qui seront transmises
      </button>

      {ouvert && (
        <div className={tw.modalOverlay} role="dialog" aria-modal="true" aria-label="Données transmises à l'IA">
          <div className={`${tw.modalPanel} w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6`}>
            <div className="flex items-start justify-between mb-4">
              <h3 className={tw.sectionHeading}>Données qui seront transmises à l'IA</h3>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className={`p-1 rounded ${tw.modalCloseButton}`}>
                <X size={18} />
              </button>
            </div>
            {chargement && <p className={`text-sm ${tw.textMuted}`}>Préparation de l'aperçu…</p>}
            {erreur && <p className={`text-sm ${tw.textError}`}>{erreur}</p>}
            {apercu && (
              <>
                <p className={`text-sm ${tw.bodyText} mb-2`}>
                  {categories.length === 0
                    ? "Aucune information personnelle n'a été détectée dans ce texte."
                    : "Informations masquées :"}
                </p>
                {categories.length > 0 && (
                  <ul className={`text-sm ${tw.textStrong} mb-4 list-disc pl-5`}>
                    {categories.map(([code, nombre]) => (
                      <li key={code}>
                        {nombre} × {apercu.libelles?.[code] || code}
                      </li>
                    ))}
                  </ul>
                )}
                <pre className={`text-xs whitespace-pre-wrap break-words ${tw.textStrong}`}>
                  <TexteAvecJetons texte={apercu.texte} />
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
