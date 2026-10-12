// Écrans affichés avant la CVthèque : squelette de chargement et demande de consentement (loi 18-07).
import React from "react";
import { tw } from "../../../theme";

export const SqueletteCVTheque = () => (
  <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className={`${tw.cardColors} rounded-xl p-5 animate-pulse space-y-3`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${tw.surfaceSubtle}`} />
          <div className="flex-1 space-y-1.5">
            <div className={`h-3.5 w-2/3 ${tw.surfaceSubtle} rounded`} />
            <div className={`h-3 w-1/2 ${tw.surfaceSubtle} rounded`} />
          </div>
        </div>
        <div className={`h-3 w-full ${tw.surfaceSubtle} rounded`} />
        <div className={`h-3 w-3/4 ${tw.surfaceSubtle} rounded`} />
      </div>
    ))}
  </div>
);

export const EcranConsentementCVTheque = ({ consentChecked, setConsentChecked, consentLoading, onAccepter }) => (
  <div className="max-w-2xl mx-auto px-6 py-16">
    <div className={`${tw.cardColors} rounded-2xl shadow-sm p-8`}>
      <h2 className={`text-xl font-bold mb-2 ${tw.textStrong}`}>Avant d'accéder à la CVthèque</h2>
      <p className={`text-sm mb-6 ${tw.bodyText}`}>
        La CVthèque vous donne accès aux données personnelles de candidats. Merci de confirmer votre engagement avant de continuer.
      </p>
      <div className={`${tw.surfaceMuted} border ${tw.borderBase} rounded-xl p-4 mb-6`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className={`mt-0.5 w-4 h-4 cursor-pointer rounded ${tw.checkboxTeal}`}
          />
          <span className={`text-sm leading-relaxed ${tw.bodyText}`}>
            Je m'engage à traiter les données personnelles des candidats consultées dans la CVthèque
            uniquement dans le cadre du recrutement, et à ne pas les utiliser à d'autres fins,
            conformément à la loi n° 18-07 relative à la protection des données à caractère personnel.
          </span>
        </label>
      </div>
      <button
        disabled={!consentChecked || consentLoading}
        onClick={onAccepter}
        className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tw.bgTealSolid}`}
      >
        {consentLoading ? "Enregistrement..." : "J'accepte et je continue"}
      </button>
    </div>
  </div>
);
