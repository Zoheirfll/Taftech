import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import { selectStyles } from "../../theme";
import { reportError } from "../../utils/errorReporter";
import {
  MapPin,
  Briefcase,
  Users,
  Building2,
  ArrowLeft,
  Send,
  FileText,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const TAILLES_ENTREPRISE_LABELS = {
  TPE: "1 à 10 employés",
  PE: "11 à 50 employés",
  ME: "51 à 200 employés",
  GE: "201 à 500 employés",
  TGE: "Plus de 500 employés",
};

const EntreprisePublic = () => {
  const { id } = useParams();
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    wilaya: "",
    diplome: "",
    specialite: "",
    lettre_motivation: "",
    cv: null,
  });

  useEffect(() => {
    const fetchEntreprise = async () => {
      try {
        const data = await jobsService.getEntreprisePublic(id);
        setEntreprise(data);
        const constData = await jobsService.getConstants();
        setConstants(constData);
      } catch (err) {
        setError("Cette entreprise n'existe pas ou n'est plus disponible.");
        reportError("ECHEC_CHARGEMENT_ENTREPRISE_PUBLIC", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntreprise();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cv) return toast.error("Veuillez joindre votre CV.");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => {
        if (form[key]) formData.append(key, form[key]);
      });
      await jobsService.envoyerCandidatureSpontanee(id, formData);
      toast.success("Candidature spontanée envoyée !");
      setShowModal(false);
      setForm({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        lettre_motivation: "",
        cv: null,
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-700 font-medium">{error}</p>
        <Link
          to="/offres"
          className="text-sm text-teal-700 font-semibold hover:underline"
        >
          Voir toutes les offres
        </Link>
      </div>
    );

  if (!entreprise) return null;

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link
        to="/offres"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Retour aux offres
      </Link>

      {/* EN-TÊTE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
        <div className="h-28 bg-gradient-to-r from-teal-700 to-teal-900" />
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-5 items-start md:items-end -mt-12 mb-6">
            <div className="w-24 h-24 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {entreprise.logo_url ? (
                <img
                  src={getMediaUrl(entreprise.logo_url)}
                  alt={entreprise.nom_entreprise}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <Building2 size={32} className="text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {entreprise.nom_entreprise}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                  <Briefcase size={12} />{" "}
                  {entreprise.secteur_activite || "Secteur non défini"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                  <MapPin size={12} /> {entreprise.wilaya_siege}
                  {entreprise.commune_siege
                    ? ` · ${entreprise.commune_siege}`
                    : ""}
                </span>
                {entreprise.taille_entreprise && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-medium rounded-md">
                    <Users size={12} />{" "}
                    {TAILLES_ENTREPRISE_LABELS[entreprise.taille_entreprise] ||
                      entreprise.taille_entreprise}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Présentation
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {entreprise.description || "Aucune description fournie."}
            </p>
          </div>

          {/* BOUTON CANDIDATURE SPONTANÉE */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
          >
            <Send size={15} /> Candidature spontanée
          </button>
        </div>
      </div>

      {/* OFFRES */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Offres disponibles
          </h2>
          <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full">
            {entreprise.offres_actives?.length || 0}
          </span>
        </div>
        {entreprise.offres_actives?.length > 0 ? (
          <div className="space-y-3">
            {entreprise.offres_actives.map((offre) => (
              <div
                key={offre.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-sm transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <Link
                    to={`/jobs/${offre.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-teal-700 transition-colors"
                  >
                    {offre.titre}
                  </Link>
                  <div className="flex gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} />
                      {offre.wilaya}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Briefcase size={11} />
                      {offre.type_contrat}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/jobs/${offre.id}`}
                  className="shrink-0 px-4 py-2 bg-teal-50 text-teal-800 text-xs font-semibold rounded-lg hover:bg-teal-700 hover:text-white transition-colors"
                >
                  Voir l'offre →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
            <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">
              Aucune offre ouverte
            </p>
            <p className="text-xs text-slate-500 mt-1">
              L'entreprise ne recrute pas en ce moment.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-800 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors mx-auto"
            >
              <Send size={13} /> Envoyer une candidature spontanée
            </button>
          </div>
        )}
      </div>

      {/* MODAL CANDIDATURE SPONTANÉE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Candidature spontanée
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {entreprise.nom_entreprise}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Nom *
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Prénom *
                  </label>
                  <input
                    required
                    className={inputClass}
                    value={form.prenom}
                    onChange={(e) =>
                      setForm({ ...form, prenom: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={form.telephone}
                    onChange={(e) =>
                      setForm({ ...form, telephone: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Wilaya
                    </label>
                    <Select
                      options={constants.wilayas}
                      styles={selectStyles}
                      placeholder="Wilaya..."
                      onChange={(opt) =>
                        setForm({ ...form, wilaya: opt ? opt.value : "" })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Diplôme
                    </label>
                    <Select
                      options={constants.diplomes}
                      styles={selectStyles}
                      placeholder="Diplôme..."
                      onChange={(opt) =>
                        setForm({ ...form, diplome: opt ? opt.value : "" })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Spécialité
                    </label>
                    <Select
                      options={constants.secteurs}
                      styles={selectStyles}
                      placeholder="Secteur..."
                      onChange={(opt) =>
                        setForm({ ...form, specialite: opt ? opt.value : "" })
                      }
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  CV (PDF, DOC) *
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center relative cursor-pointer hover:border-teal-400 transition-colors group">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    required
                    onChange={(e) =>
                      setForm({ ...form, cv: e.target.files[0] })
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText
                    size={22}
                    className="text-slate-300 mx-auto mb-1.5"
                  />
                  <p className="text-sm font-medium text-slate-600 group-hover:text-teal-700 transition-colors">
                    {form.cv ? form.cv.name : "Cliquez ou glissez votre CV"}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Lettre de motivation (optionnelle)
                </label>
                <textarea
                  rows="3"
                  className={inputClass + " resize-none"}
                  placeholder="Pourquoi souhaitez-vous rejoindre cette entreprise ?"
                  value={form.lettre_motivation}
                  onChange={(e) =>
                    setForm({ ...form, lettre_motivation: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    "Envoi..."
                  ) : (
                    <>
                      <Send size={14} /> Envoyer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntreprisePublic;
