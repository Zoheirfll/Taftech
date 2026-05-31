import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter";
import { Send } from "lucide-react";

const AdminBroadcast = () => {
  const [formData, setFormData] = useState({
    type_envoi: "NEWSLETTER",
    sujet: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sujet.trim() || !formData.message.trim())
      return toast.error("Le sujet et le message sont obligatoires.");
    if (
      !window.confirm(
        `Envoyer cet email à tous les abonnés "${formData.type_envoi}" ?`,
      )
    )
      return;
    setIsSending(true);
    try {
      const response = await api.post("jobs/admin/broadcast-email/", formData);
      toast.success(response.data.message || "Emails envoyés !");
      setFormData({ ...formData, sujet: "", message: "" });
    } catch (error) {
      reportError("ECHEC_ENVOI_BROADCAST", error);
      toast.error(error.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setIsSending(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Diffusion d'emails
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Envoyez des communications ciblées aux candidats.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block">
              Audience cible *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: "NEWSLETTER",
                  label: "Newsletter",
                  desc: "Conseils, actus TafTech et événements.",
                },
                {
                  value: "EXCLUSIF",
                  label: "Offres exclusives",
                  desc: "Offres partenaires spécifiques.",
                },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.type_envoi === value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"}`}
                >
                  <input
                    type="radio"
                    name="type_envoi"
                    value={value}
                    checked={formData.type_envoi === value}
                    onChange={(e) =>
                      setFormData({ ...formData, type_envoi: e.target.value })
                    }
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Sujet *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Les 5 compétences les plus recherchées en 2026..."
              className={inputClass}
              value={formData.sujet}
              onChange={(e) =>
                setFormData({ ...formData, sujet: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Corps du message *
            </label>
            <textarea
              required
              rows="7"
              placeholder="Rédigez votre email ici..."
              className={inputClass + " resize-none"}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Les emails seront envoyés en copie cachée (BCC) pour protéger la
              vie privée.
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
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
