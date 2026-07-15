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
  Clock,
  Calendar,
  Globe,
} from "lucide-react";

const LinkedinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);
import toast from "react-hot-toast";

const TAILLES_LABELS = {
  TPE: "1 à 10 employés",
  PE:  "11 à 50 employés",
  ME:  "51 à 200 employés",
  GE:  "201 à 500 employés",
  TGE: "Plus de 500 employés",
};

const EntreprisePublic = () => {
  const { slug } = useParams();
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [], diplomes: [] });
  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "",
    wilaya: "", diplome: "", specialite: "", lettre_motivation: "", cv: null,
  });

  useEffect(() => {
    const fetchEntreprise = async () => {
      try {
        const [data, constData] = await Promise.all([
          jobsService.getEntreprisePublic(slug),
          jobsService.getConstants(),
        ]);
        setEntreprise(data);
        setConstants(constData);
      } catch (err) {
        setError("Cette entreprise n'existe pas ou n'est plus disponible.");
        reportError("ECHEC_CHARGEMENT_ENTREPRISE_PUBLIC", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntreprise();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cv) return toast.error("Veuillez joindre votre CV.");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => { if (form[key]) formData.append(key, form[key]); });
      await jobsService.envoyerCandidatureSpontanee(slug, formData);
      toast.success("Candidature spontanée envoyée !");
      setShowModal(false);
      setForm({ nom: "", prenom: "", email: "", telephone: "", lettre_motivation: "", cv: null });
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-700 font-medium">{error}</p>
        <Link to="/offres" className="text-sm text-teal-700 font-semibold hover:underline">Voir toutes les offres</Link>
      </div>
    );

  if (!entreprise) return null;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const role = localStorage.getItem("userRole");
  const backLink = role === "RECRUTEUR"
    ? { to: "/dashboard", label: "Retour au dashboard" }
    : { to: "/offres", label: "Retour aux offres" };

  const secteurLabel = constants.secteurs.find((s) => s.value === entreprise.secteur_activite)?.label
    || entreprise.secteur_activite || "Secteur non défini";

  // Wilaya : "31 - Oran" → "Oran". Déduplique si commune identique à la ville
  const wilayaVille = entreprise.wilaya_siege?.split(" - ")[1] || entreprise.wilaya_siege || "";
  const communeAffichee = entreprise.commune_siege && entreprise.commune_siege !== wilayaVille
    ? entreprise.commune_siege : null;
  const lieuAffiche = communeAffichee ? `${wilayaVille} · ${communeAffichee}` : wilayaVille;

  const tailleLabel = TAILLES_LABELS[entreprise.taille_entreprise] || entreprise.taille_entreprise;

  const expLabel = (val) =>
    constants.experiences?.find((e) => e.value === val)?.label || val;

  const CONTRAT_BADGES = {
    CDI:    "bg-teal-50 text-teal-700 border-teal-200",
    CDD:    "bg-amber-50 text-amber-700 border-amber-200",
    STAGE:  "bg-indigo-50 text-indigo-700 border-indigo-200",
    FREELANCE: "bg-slate-100 text-slate-700 border-slate-200",
    INTERIM:"bg-orange-50 text-orange-700 border-orange-200",
  };

  // Tronque le secteur à 35 chars pour le hero
  const secteurCourt = secteurLabel.length > 25
    ? secteurLabel.slice(0, 23) + "…"
    : secteurLabel;

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("fr-DZ", { day: "numeric", month: "short" });
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">

      {/* ── RETOUR ──────────────────────────────────────────────────────────── */}
      <Link
        to={backLink.to}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> {backLink.label}
      </Link>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
        {/* Bandeau teal : logo + nom + bouton */}
        <div className="bg-linear-to-br from-teal-700 to-teal-900 px-6 md:px-8 py-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-white rounded-2xl border-2 border-white/30 shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              {entreprise.logo_url
                ? <img src={getMediaUrl(entreprise.logo_url)} alt={entreprise.nom_entreprise} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                : <Building2 size={28} className="text-slate-300" />}
            </div>
            <div className="text-white min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight truncate">{entreprise.nom_entreprise}</h1>
              <div className="flex items-center gap-2 mt-1.5 text-teal-100 text-sm overflow-hidden">
                <span className="flex items-center gap-1 shrink-0"><Briefcase size={13} /> {secteurCourt}</span>
                <span className="text-teal-400 shrink-0">·</span>
                <span className="flex items-center gap-1 shrink-0"><MapPin size={13} /> {lieuAffiche}</span>
                {tailleLabel && (
                  <>
                    <span className="text-teal-400 shrink-0">·</span>
                    <span className="flex items-center gap-1 shrink-0"><Users size={13} /> {tailleLabel}</span>
                  </>
                )}
              </div>
            </div>
            {/* Bouton dans le hero, aligné à droite */}
            <button
              onClick={() => setShowModal(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold rounded-xl transition-colors shrink-0 backdrop-blur-sm"
            >
              <Send size={14} /> Candidature spontanée
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="px-6 md:px-8 pb-8 pt-5">
          {/* Bouton mobile seulement */}
          <div className="sm:hidden mb-5">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors shadow-sm"
            >
              <Send size={14} /> Candidature spontanée
            </button>
          </div>

          {/* Liens web */}
          {(entreprise.linkedin || entreprise.site_web) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {entreprise.linkedin && (
                <a
                  href={entreprise.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-semibold rounded-lg border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 transition-colors"
                >
                  <LinkedinIcon /> LinkedIn
                </a>
              )}
              {entreprise.site_web && (
                <a
                  href={entreprise.site_web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <Globe size={13} /> Site web
                </a>
              )}
            </div>
          )}

          {/* Présentation */}
          {entreprise.description && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Présentation</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {entreprise.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── OFFRES ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900">Offres disponibles</h2>
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
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/jobs/${offre.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-teal-700 transition-colors"
                  >
                    {offre.titre}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${CONTRAT_BADGES[offre.type_contrat] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {offre.type_contrat}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-700">
                      <MapPin size={11} /> {offre.wilaya?.split(" - ")[1] || offre.wilaya}
                    </span>
                    {offre.experience_requise && (
                      <span className="flex items-center gap-1 text-xs text-slate-700">
                        <Clock size={11} /> {expLabel(offre.experience_requise)}
                      </span>
                    )}
                    {offre.date_publication && (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar size={11} /> {formatDate(offre.date_publication)}
                      </span>
                    )}
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
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
              <Briefcase size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Aucune offre ouverte</p>
            <p className="text-xs text-slate-600 mb-4">L'entreprise ne recrute pas en ce moment.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-800 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors"
            >
              <Send size={13} /> Envoyer une candidature spontanée
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL CANDIDATURE SPONTANÉE ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Candidature spontanée</h3>
                <p className="text-xs text-slate-700 mt-0.5">{entreprise.nom_entreprise}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Nom *</label>
                  <input required className={inputClass} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Prénom *</label>
                  <input required className={inputClass} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Email *</label>
                  <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Téléphone</label>
                  <input type="tel" className={inputClass} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Wilaya</label>
                  <Select options={constants.wilayas} styles={selectStyles} placeholder="Wilaya..." onChange={(opt) => setForm({ ...form, wilaya: opt ? opt.value : "" })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Diplôme</label>
                  <Select options={constants.diplomes} styles={selectStyles} placeholder="Diplôme..." onChange={(opt) => setForm({ ...form, diplome: opt ? opt.value : "" })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Spécialité</label>
                  <Select options={constants.secteurs} styles={selectStyles} placeholder="Secteur..." onChange={(opt) => setForm({ ...form, specialite: opt ? opt.value : "" })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">CV (PDF, DOC) *</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center relative cursor-pointer hover:border-teal-400 transition-colors group">
                  <input type="file" accept=".pdf,.doc,.docx" required onChange={(e) => setForm({ ...form, cv: e.target.files[0] })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <FileText size={22} className="text-slate-300 mx-auto mb-1.5" />
                  <p className="text-sm font-medium text-slate-600 group-hover:text-teal-700 transition-colors">
                    {form.cv ? form.cv.name : "Cliquez ou glissez votre CV"}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Lettre de motivation (optionnelle)</label>
                <textarea
                  rows="3"
                  className={inputClass + " resize-none"}
                  placeholder="Pourquoi souhaitez-vous rejoindre cette entreprise ?"
                  value={form.lettre_motivation}
                  onChange={(e) => setForm({ ...form, lettre_motivation: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? "Envoi..." : <><Send size={14} /> Envoyer</>}
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
