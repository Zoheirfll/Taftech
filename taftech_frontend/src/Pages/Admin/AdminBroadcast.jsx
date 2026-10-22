import React, { useState } from "react";
import { notifier } from "../../utils/notifier";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import { Send, Megaphone } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";

const AUDIENCES = {
  NEWSLETTER: "Newsletter",
  EXCLUSIF: "Offres exclusives",
};

const AdminBroadcast = () => {
  const [formData, setFormData] = useState({
    type_envoi: "NEWSLETTER",
    sujet: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sujet.trim() || !formData.message.trim())
      return notifier.erreur("Champs manquants", "Le sujet et le message sont obligatoires.");
    confirmToast(
      `Envoyer « ${formData.sujet.trim()} » à tous les candidats abonnés à « ${AUDIENCES[formData.type_envoi]} » ? L'envoi est immédiat et ne peut pas être annulé.`,
      async () => {
        setIsSending(true);
        try {
          const response = await api.post("jobs/admin/broadcast-email/", formData);
          notifier.succes("Messages envoyés", response.data.message);
          setFormData({ ...formData, sujet: "", message: "" });
        } catch (error) {
          reportError("ECHEC_ENVOI_BROADCAST", error);
          notifier.echec("Envoi impossible", error);
        } finally {
          setIsSending(false);
        }
      },
    );
  };

  const inputClass = tw.input;

  return (
    <div className="max-w-2xl space-y-6">
      <AdminPageHeader
        icon={Megaphone}
        color="teal"
        title="Diffusion d'emails"
        subtitle="Envoyez des communications ciblées aux candidats."
        aideKey="diffusion"
        aide={[
          "Seuls les candidats ayant accepté ce type d'email dans leurs paramètres le reçoivent (Newsletter ou Offres exclusives) — conformité loi 18-07.",
          "Les destinataires sont en copie cachée (BCC) : aucun candidat ne voit l'adresse des autres.",
          "L'envoi est immédiat et définitif : relisez le sujet et le message avant de confirmer.",
          "Pour une annonce visible sur le site (et non par email), utilisez plutôt « Bannières » → bandeau d'annonce.",
        ]}
      />

      <div className={`${tw.card} p-6`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-2 block`}>
              Audience cible *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  value: "NEWSLETTER",
                  label: "Newsletter",
                  desc: "Conseils, actus TAFTECH et événements.",
                },
                {
                  value: "EXCLUSIF",
                  label: "Offres exclusives",
                  desc: "Offres partenaires spécifiques.",
                },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.type_envoi === value ? `${tw.borderPrimary} ${tw.bgPrimarySoft}` : tw.borderBaseHoverPrimary}`}
                >
                  <input
                    type="radio"
                    name="type_envoi"
                    value={value}
                    checked={formData.type_envoi === value}
                    onChange={(e) =>
                      setFormData({ ...formData, type_envoi: e.target.value })
                    }
                    className={`mt-0.5 ${tw.accentPrimary}`}
                  />
                  <div>
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>
                      {label}
                    </p>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              Sujet *
            </label>
            <input
              type="text"
              required
              className={inputClass}
              value={formData.sujet}
              onChange={(e) =>
                setFormData({ ...formData, sujet: e.target.value })
              }
            />
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>
              Corps du message *
            </label>
            <textarea
              required
              rows="7"
              placeholder="Rédigez votre email ici..."
              className={inputClass + " resize-y"}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            />
            <p className={`text-[11px] ${tw.textMuted} mt-1 text-right tabular-nums`}>
              {formData.message.length} caractère{formData.message.length > 1 ? "s" : ""}
            </p>
            <p className={`text-xs ${tw.textMuted} mt-1.5`}>
              Les emails seront envoyés en copie cachée (BCC) pour protéger la
              vie privée.
            </p>
          </div>

          <div className={`flex justify-end pt-2 border-t ${tw.borderSubtle}`}>
            <button
              type="submit"
              disabled={isSending}
              className={`flex items-center gap-2 px-5 py-2.5 ${tw.buttonDark} text-sm font-semibold rounded-lg disabled:opacity-60 ${tw.focusRing}`}
            >
              {isSending ? (
                <>
                  <div className={`w-4 h-4 ${tw.spinnerWhiteSolid}`}></div>{" "}
                  Envoi...
                </>
              ) : (
                <>
                  <Send size={15} /> Envoyer la campagne
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminBroadcast;
