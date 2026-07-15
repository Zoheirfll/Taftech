import React, { useState } from "react";
import toast from "react-hot-toast";
import { Mail, Phone, MapPin, Clock, ChevronDown } from "lucide-react";
import { authService } from "../../Services/authService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";

const MOTIFS = [
  "Recherche d'emploi",
  "Services de recrutement",
  "Partenariat",
  "Informations sur la plateforme",
  "Support technique",
  "Autre",
];

const FAQ = [
  {
    q: "Comment postuler à une offre d'emploi ?",
    a: "Créez un profil candidat gratuit, complétez vos expériences et votre CV, puis postulez directement depuis la page de l'offre — en un clic si votre profil est complet.",
  },
  {
    q: "Vos services sont-ils gratuits pour les candidats ?",
    a: "Oui, l'inscription, la recherche d'offres, le matching IA et la candidature sont entièrement gratuits pour les candidats.",
  },
  {
    q: "Comment fonctionne le matching IA ?",
    a: "Notre algorithme compare votre profil (spécialité, diplôme, expérience, région, compétences) à chaque offre et calcule un score de compatibilité en temps réel.",
  },
  {
    q: "Comment une entreprise peut-elle publier une offre ?",
    a: "Inscrivez votre entreprise, attendez la validation par notre équipe, puis publiez vos offres depuis votre tableau de bord recruteur.",
  },
];

const ContactezNous = () => {
  const [form, setForm] = useState({ nom: "", email: "", entreprise: "", motif: "", objet: "", message: "" });
  const [accepte, setAccepte] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accepte) {
      toast.error("Merci d'accepter l'utilisation de vos données.");
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.envoyerContact(form);
      toast.success("Votre message a bien été envoyé !");
      setForm({ nom: "", email: "", entreprise: "", motif: "", objet: "", message: "" });
      setAccepte(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi.");
      reportError("ECHEC_FORM_CONTACT", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = `w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`;

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-extrabold ${tw.textOnDark} tracking-tight mb-1`}>
            Contactez-<span className={tw.textPrimaryOnDark}>nous</span>
          </h1>
          <p className={`${tw.textPrimaryOnDark} text-base`}>
            Une question ? Notre équipe vous répond rapidement.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className={`${tw.cardColors} rounded-2xl p-6 flex-1 space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Nom *</label>
              <input name="nom" required value={form.nom} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Email *</label>
              <input type="email" name="email" required value={form.email} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Entreprise</label>
              <input name="entreprise" placeholder="Entreprise" value={form.entreprise} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Motif de contact *</label>
              <select name="motif" required value={form.motif} onChange={handleChange} className={inputClass}>
                <option value="">Motif de contact</option>
                {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Objet *</label>
            <input name="objet" placeholder="Objet" required value={form.objet} onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Message *</label>
            <textarea name="message" placeholder="Message" required rows="5" value={form.message} onChange={handleChange} className={`${inputClass} resize-none`} />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-0.5" />
            <span className={`text-xs ${tw.textMuted700}`}>
              J'accepte que mes données soient utilisées pour traiter ma demande *
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}
          >
            {isSubmitting ? "Envoi en cours..." : "Envoyer"}
          </button>
        </form>

        {/* SIDEBAR */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className={`${tw.cardColors} rounded-2xl p-5 space-y-3`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${tw.textMuted}`}>Coordonnées</p>
            <p className={`flex items-center gap-2 text-sm ${tw.textMuted700}`}><Mail size={15} className={`${tw.textPrimary} shrink-0`} /> taftech963@gmail.com</p>
            <p className={`flex items-center gap-2 text-sm ${tw.textMuted700}`}><Phone size={15} className={`${tw.textPrimary} shrink-0`} /> 0770 123 440</p>
            <p className={`flex items-center gap-2 text-sm ${tw.textMuted700}`}><MapPin size={15} className={`${tw.textPrimary} shrink-0`} /> Oran, Algérie</p>
          </div>

          <div className={`${tw.cardColors} rounded-2xl p-5`}>
            <p className={`flex items-center gap-2 text-sm font-bold ${tw.textStrong} mb-2`}>
              <Clock size={16} className={tw.textPrimary} /> Horaires d'ouverture
            </p>
            <p className={`text-sm ${tw.textMuted700}`}>Dimanche - Jeudi : 08h00 - 17h00</p>
            <p className={`text-sm ${tw.textMuted700}`}>Vendredi - Samedi : Fermé</p>
          </div>

          <div className={`${tw.cardColors} rounded-2xl p-5`}>
            <p className={`text-sm font-bold ${tw.textStrong} mb-3`}>Questions fréquentes</p>
            <div className="space-y-1">
              {FAQ.map((f, i) => (
                <div key={f.q} className={`border-b ${tw.borderSubtle} last:border-0 py-2.5`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                  >
                    <span className={`text-sm font-semibold ${tw.textStrong}`}>{f.q}</span>
                    <ChevronDown size={14} className={`${tw.textMuted} shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <p className={`text-xs ${tw.textMuted700} mt-2 leading-relaxed`}>{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactezNous;
