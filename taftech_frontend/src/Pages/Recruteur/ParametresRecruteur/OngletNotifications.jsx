// Onglet "Notifications" des Paramètres : email de refus automatique, message personnalisable et aperçu.
import React from "react";
import { Save, Eye, EyeOff } from "lucide-react";
import { tw } from "../../../theme";

export const OngletNotifications = ({ p }) => {
  const { notifForm, setNotifForm } = p;
  return (
    <div className={`${tw.card} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${tw.borderSubtle}`}>
        <h2 className={`text-base font-semibold ${tw.textStrong}`}>
          Notifications aux candidats
        </h2>
        <p className={`text-xs ${tw.textMuted700} mt-0.5`}>
          Configurez les emails automatiques envoyés à vos candidats.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Toggle */}
        <div className={`flex items-start justify-between gap-4 p-4 ${tw.surfaceMuted} rounded-xl border ${tw.borderSubtle}`}>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${tw.textStrong}`}>
              Email de refus automatique
            </p>
            <p className={`text-xs ${tw.textMuted700} mt-1 leading-relaxed`}>
              Un email est envoyé automatiquement aux candidats refusés. Une
              réponse, même négative, améliore votre image employeur.
            </p>
          </div>
          <button
            onClick={() =>
              setNotifForm({
                ...notifForm,
                email_refus_auto: !notifForm.email_refus_auto,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              notifForm.email_refus_auto ? tw.toggleTrackOn : tw.toggleTrackOff
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full ${tw.surface} shadow transition duration-200 ${
                notifForm.email_refus_auto
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Message personnalisable */}
        {notifForm.email_refus_auto && (
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className={tw.sectionLabel}>
                Message de refus
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] ${tw.textMuted} mr-1`}>Cliquez pour insérer :</span>
                {["{prenom}", "{titre_offre}", "{nom_entreprise}"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => p.insererVariable(v)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${tw.variablePillTeal}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {p.showApercu ? (
              <div className={`w-full px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap min-h-[11rem] ${tw.surfaceMuted} border ${tw.borderBase} ${tw.textMuted700}`}>
                {p.apercuMessage || <span className={`${tw.textMuted} italic`}>Aucun message.</span>}
              </div>
            ) : (
              <textarea
                ref={p.textareaRef}
                rows="8"
                value={notifForm.message_refus_auto}
                onChange={(e) => setNotifForm({ ...notifForm, message_refus_auto: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl text-sm resize-none font-mono ${tw.inputTeal}`}
              />
            )}

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={() => p.setShowApercu(!p.showApercu)}
                className={`flex items-center gap-1.5 text-xs font-medium ${tw.textTeal} hover:underline`}
              >
                {p.showApercu ? <><EyeOff size={12} /> Modifier</> : <><Eye size={12} /> Aperçu</>}
              </button>
              <span className={`text-[10px] ${tw.textMuted}`}>
                {notifForm.message_refus_auto.length} caractères
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={p.sauvegarderNotifs}
            disabled={p.saving}
            className={`flex items-center gap-2 px-5 py-3 ${tw.bgTealSolid} text-base font-bold rounded-xl transition-colors disabled:opacity-50`}
          >
            <Save size={15} />
            {p.saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
};
