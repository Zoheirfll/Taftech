import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosConfig";
import { reportError } from "../../utils/errorReporter"; // Import de la télémétrie

const AdminBroadcast = () => {
  const [formData, setFormData] = useState({
    type_envoi: "NEWSLETTER", // Valeur par défaut
    sujet: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sujet.trim() || !formData.message.trim()) {
      return toast.error("Le sujet et le message sont obligatoires.");
    }

    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir envoyer cet email à tous les abonnés de la liste "${formData.type_envoi}" ?`,
      )
    ) {
      return;
    }

    setIsSending(true);
    try {
      const response = await api.post("jobs/admin/broadcast-email/", formData);
      toast.success(response.data.message || "Emails envoyés avec succès !");

      // On vide le formulaire après succès
      setFormData({ ...formData, sujet: "", message: "" });
    } catch (error) {
      // 🛑 Remplacement de console.error par la télémétrie
      reportError("ECHEC_ENVOI_BROADCAST", error);
      toast.error(
        error.response?.data?.error || "Erreur lors de l'envoi des emails.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Diffusion d'Emails (Broadcast)
        </h1>
        <p className="text-gray-500 font-medium mt-2">
          Envoyez des communications ciblées aux candidats en respectant leurs
          préférences de notification.
        </p>
      </div>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CIBLE DE L'ENVOI */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Audience Cible <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  formData.type_envoi === "NEWSLETTER"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-200"
                }`}
              >
                <input
                  type="radio"
                  name="type_envoi"
                  value="NEWSLETTER"
                  checked={formData.type_envoi === "NEWSLETTER"}
                  onChange={(e) =>
                    setFormData({ ...formData, type_envoi: e.target.value })
                  }
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3">
                  <span className="block text-sm font-black text-gray-900">
                    Actualités & Newsletter
                  </span>
                  <span className="block text-xs text-gray-500 font-medium">
                    Pour les conseils, actus TafTech et événements.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  formData.type_envoi === "EXCLUSIF"
                    ? "border-purple-600 bg-purple-50"
                    : "border-gray-200 hover:border-purple-200"
                }`}
              >
                <input
                  type="radio"
                  name="type_envoi"
                  value="EXCLUSIF"
                  checked={formData.type_envoi === "EXCLUSIF"}
                  onChange={(e) =>
                    setFormData({ ...formData, type_envoi: e.target.value })
                  }
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <div className="ml-3">
                  <span className="block text-sm font-black text-gray-900">
                    Offres Exclusives
                  </span>
                  <span className="block text-xs text-gray-500 font-medium">
                    Pour les offres partenaires très spécifiques.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SUJET */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Sujet de l'email <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Les 5 compétences les plus recherchées en 2026..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              value={formData.sujet}
              onChange={(e) =>
                setFormData({ ...formData, sujet: e.target.value })
              }
            />
          </div>

          {/* MESSAGE */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Corps du message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows="8"
              placeholder="Rédigez votre email ici..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            ></textarea>
            <p className="text-xs text-gray-400 mt-2">
              💡 Les emails seront envoyés en "Copie Cachée" (BCC) pour protéger
              la vie privée des candidats.
            </p>
          </div>

          {/* BOUTON D'ENVOI */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSending}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black text-sm text-white shadow-md transition-all ${
                isSending
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-black hover:-translate-y-1"
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ENVOI EN COURS...
                </>
              ) : (
                <>
                  <span>🚀</span> ENVOYER LA CAMPAGNE
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AdminBroadcast;
