import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { mediaUrl as getMediaUrl } from "../../utils/mediaUrl";
import { jobsService } from "../../Services/jobsService";
import Select from "react-select";
import { selectStyles, tw } from "../../theme";
import { reportError } from "../../utils/errorReporter";
import Seo from "../../Components/Seo";
import CarteSurDemande from "../../Components/CarteSurDemande";
import EnteteEntreprise from "../../Components/EnteteEntreprise";
import FieldError from "../../Components/FieldError";
import { useErreursChamps } from "../../utils/useErreursChamps";
import { jobUrl } from "../../utils/slugify";
import { contratsTexte, lieuxTexte } from "../../utils/lieuxContrats";
import { libellesDiplomesCompacts } from "../../utils/groupesDiplomes";
import { joindre } from "../../utils/listeFrancaise";
import { notifier } from "../../utils/notifier";
import {
  MapPin,
  Briefcase,
  Send,
  FileText,
  X,
  Clock,
  Globe,
  Users,
  GraduationCap,
} from "lucide-react";

const LinkedinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);

const TAILLES_LABELS = {
  TPE: "1 à 10 employés",
  PE:  "11 à 50 employés",
  ME:  "51 à 200 employés",
  GE:  "201 à 500 employés",
  TGE: "Plus de 500 employés",
};

const EntreprisePublic = () => {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  // Onglet initial : `?onglet=offres` (lien depuis la page d'une offre), sinon la présentation de l'entreprise.
  const [activeTab, setActiveTab] = useState(params.get("onglet") === "offres" ? "offres" : "entreprise");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { erreurs, exiger, definir, depuisReponse, effacer, attributs } = useErreursChamps();
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
    const manque = exiger(
      { ...form, cv: form.cv ? "joint" : "" },
      {
        nom: "Le nom est obligatoire.",
        prenom: "Le prénom est obligatoire.",
        email: "L'adresse e-mail est obligatoire.",
        cv: "Veuillez joindre votre CV.",
      },
    );
    if (manque) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      definir({ email: "Adresse e-mail invalide." });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => { if (form[key]) formData.append(key, form[key]); });
      await jobsService.envoyerCandidatureSpontanee(slug, formData);
      notifier.succes("Candidature spontanée envoyée");
      setShowModal(false);
      setForm({ nom: "", prenom: "", email: "", telephone: "", lettre_motivation: "", cv: null });
      definir({});
    } catch (err) {
      depuisReponse(err);
      notifier.erreur("Envoi impossible", err.response?.data?.error || "Veuillez réessayer dans quelques instants.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-700 font-medium">{error}</p>
        <Link to="/offres" className="text-sm text-indigo-600 font-semibold hover:underline">Voir toutes les offres</Link>
      </div>
    );

  if (!entreprise) return null;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const secteurLabel = entreprise.secteur_activite_libelle || entreprise.secteur_activite || "";

  // Wilaya : "31 - Oran" → "Oran". Déduplique si commune identique à la ville
  const wilayaVille = entreprise.wilaya_siege?.split(" - ")[1] || entreprise.wilaya_siege || "";
  const communeAffichee = entreprise.commune_siege && entreprise.commune_siege !== wilayaVille
    ? entreprise.commune_siege : null;
  const lieuAffiche = communeAffichee ? `${wilayaVille} · ${communeAffichee}` : wilayaVille;
  const lieuCarte = entreprise.adresse_complete || [communeAffichee, wilayaVille, "Algérie"].filter(Boolean).join(", ");

  const tailleLabel = TAILLES_LABELS[entreprise.taille_entreprise] || entreprise.taille_entreprise;
  const nbOffres = entreprise.nombre_offres_actives ?? entreprise.offres_actives?.length ?? 0;

  const expLabel = (val) =>
    constants.experiences?.find((e) => e.value === val)?.label || val;

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("fr-DZ", { day: "numeric", month: "short" });
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const boutonCandidature = (classe) => (
    <button type="button" onClick={() => setShowModal(true)} className={`${classe} ${tw.bgPrimarySolid} items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors`}>
      <Send size={14} /> Candidature spontanée
    </button>
  );

  return (
    <div>
      <Seo
        title={entreprise.nom_entreprise}
        description={
          entreprise.description
            ? entreprise.description.replace(/\s+/g, " ").trim()
            : `${entreprise.nom_entreprise} recrute sur TafTech — découvrez ses offres d'emploi en Algérie.`
        }
        image={entreprise.banniere_url ? getMediaUrl(entreprise.banniere_url) : getMediaUrl(entreprise.logo_url)}
      />
      <h1 className="sr-only">{entreprise.nom_entreprise}</h1>

      {/* ── EN-TÊTE : bannière, logo, nom, secteur, ville, onglets (même composant que la page d'une offre) ── */}
      <EnteteEntreprise
        entreprise={{ ...entreprise, secteur_libelle: secteurLabel }}
        lieu={lieuAffiche}
        onglets={[
          { cle: "entreprise", libelle: "Entreprise" },
          { cle: "offres", libelle: `Offres d'emploi (${nbOffres})` },
        ]}
        ongletActif={activeTab}
        onSelectOnglet={setActiveTab}
        action={boutonCandidature("hidden sm:inline-flex")}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="sm:hidden mb-4">{boutonCandidature("inline-flex")}</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── COLONNE GAUCHE ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {/* Onglet Entreprise : présentation, culture, liens, chiffres, photos */}
            {activeTab === "entreprise" && (
              <div className={`${tw.cardColors} rounded-xl p-6 space-y-6`}>
                {entreprise.description && (
                  <section>
                    <h2 className={`text-base font-extrabold ${tw.textStrong} mb-2`}>Présentation</h2>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{entreprise.description}</p>
                  </section>
                )}
                {entreprise.culture_entreprise && (
                  <section>
                    <h2 className={`text-base font-extrabold ${tw.textStrong} mb-2`}>Culture d'entreprise</h2>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{entreprise.culture_entreprise}</p>
                  </section>
                )}
                {(entreprise.linkedin || entreprise.site_web) && (
                  <div className="flex flex-wrap gap-4">
                    {entreprise.linkedin && (
                      <a href={entreprise.linkedin} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                        <LinkedinIcon /> LinkedIn
                      </a>
                    )}
                    {entreprise.site_web && (
                      <a href={entreprise.site_web} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                        <Globe size={14} /> Site web
                      </a>
                    )}
                  </div>
                )}
                <div className={`flex flex-wrap items-center gap-6 pt-5 border-t ${tw.borderSubtle}`}>
                  <div>
                    <p className={`text-xl font-extrabold ${tw.textStrong}`}>{nbOffres}</p>
                    <p className="text-xs text-slate-600">Offres en ligne</p>
                  </div>
                  {tailleLabel && (
                    <div>
                      <p className={`text-xl font-extrabold ${tw.textStrong}`}>{tailleLabel}</p>
                      <p className="text-xs text-slate-600">Employés</p>
                    </div>
                  )}
                  {entreprise.annee_creation && (
                    <div>
                      <p className={`text-xl font-extrabold ${tw.textStrong}`}>{new Date().getFullYear() - entreprise.annee_creation} ans</p>
                      <p className="text-xs text-slate-600">D'existence</p>
                    </div>
                  )}
                </div>
                {entreprise.photos?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {entreprise.photos.map((p) => (
                      <img
                        key={p.id}
                        src={getMediaUrl(p.image)}
                        alt={p.legende || ""}
                        title={p.legende || ""}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Onglet Offres d'emploi : une ligne détaillée par offre, comme sur Emploitic */}
            {activeTab === "offres" && (
              entreprise.offres_actives?.length > 0 ? (
                <div className={`${tw.cardColors} rounded-xl overflow-hidden`}>
                  <h2 className={`px-6 py-4 text-base font-extrabold ${tw.textStrong} border-b ${tw.borderSubtle}`}>Offres d'emploi</h2>
                  {entreprise.offres_actives.map((offre) => {
                    // Deux niveaux au plus puis « N autres » : la ligne reste courte (détail complet sur la page de l'offre).
                    const diplomes = joindre(libellesDiplomesCompacts(offre.diplomes_requis_detail || []), "ou");
                    return (
                      <Link
                        key={offre.id}
                        to={jobUrl(offre, entreprise.slug)}
                        className={`block px-6 py-5 border-b last:border-b-0 ${tw.borderSubtle} hover:bg-slate-50 transition-colors`}
                      >
                        <p className={`text-base font-bold ${tw.textStrong}`}>{offre.titre}</p>
                        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs ${tw.textMuted700}`}>
                          {offre.date_publication && (
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(offre.date_publication)}</span>
                          )}
                          {offre.nombre_postes > 0 && (
                            <span className="flex items-center gap-1">
                              <Users size={12} /> {offre.nombre_postes} poste{offre.nombre_postes > 1 ? "s" : ""} ouvert{offre.nombre_postes > 1 ? "s" : ""}
                            </span>
                          )}
                          {offre.experience_requise && (
                            <span className="flex items-center gap-1">
                              <Briefcase size={12} /> {expLabel(offre.experience_requise)}
                              {offre.experience_annees > 0 ? ` (environ ${offre.experience_annees} an${offre.experience_annees > 1 ? "s" : ""})` : ""}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><MapPin size={12} /> {lieuxTexte(offre)}</span>
                          {diplomes && (
                            <span className="flex items-center gap-1"><GraduationCap size={12} /> {diplomes}</span>
                          )}
                          <span className="font-semibold">{contratsTexte(offre)}</span>
                        </div>
                      </Link>
                    );
                  })}
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-800 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Send size={13} /> Envoyer une candidature spontanée
                  </button>
                </div>
              )
            )}
          </div>

          {/* ── COLONNE DROITE : secteur, taille, lieu, carte (chargée au clic) ─────────────── */}
          <aside className="space-y-4">
            {(secteurLabel || tailleLabel) && (
              <div className={`${tw.cardColors} rounded-xl grid grid-cols-2 text-center text-sm font-semibold ${tw.textStrong}`}>
                {secteurLabel && (
                  <div className={`p-5 flex flex-col items-center gap-2 ${tailleLabel ? `border-r ${tw.borderSubtle}` : "col-span-2"}`}>
                    <Briefcase size={22} aria-hidden="true" />
                    {secteurLabel}
                  </div>
                )}
                {tailleLabel && (
                  <div className={`p-5 flex flex-col items-center gap-2 ${secteurLabel ? "" : "col-span-2"}`}>
                    <Users size={22} aria-hidden="true" />
                    {tailleLabel}
                  </div>
                )}
              </div>
            )}
            {(entreprise.adresse_complete || wilayaVille) && (
              <div className={`${tw.cardColors} rounded-xl overflow-hidden`}>
                <p className={`px-5 py-4 text-sm font-semibold flex items-center gap-2 ${tw.textStrong}`}>
                  <MapPin size={16} aria-hidden="true" /> {[communeAffichee, wilayaVille, "Algérie"].filter(Boolean).join(", ")}
                </p>
                <CarteSurDemande lieu={lieuCarte} />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lieuCarte)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Ouvrir dans Google Maps →
                </a>
              </div>
            )}
          </aside>
        </div>
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
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Nom *</label>
                  <input required {...attributs("nom")} className={inputClass} value={form.nom} onChange={(e) => { setForm({ ...form, nom: e.target.value }); effacer("nom"); }} />
                  <FieldError id="err-nom" message={erreurs.nom} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Prénom *</label>
                  <input required {...attributs("prenom")} className={inputClass} value={form.prenom} onChange={(e) => { setForm({ ...form, prenom: e.target.value }); effacer("prenom"); }} />
                  <FieldError id="err-prenom" message={erreurs.prenom} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">Email *</label>
                  <input required type="email" {...attributs("email")} className={inputClass} value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); effacer("email"); }} />
                  <FieldError id="err-email" message={erreurs.email} />
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
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center relative cursor-pointer hover:border-indigo-400 transition-colors group">
                  <input type="file" accept=".pdf,.doc,.docx" required {...attributs("cv")} onChange={(e) => { setForm({ ...form, cv: e.target.files[0] }); effacer("cv"); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <FileText size={22} className="text-slate-300 mx-auto mb-1.5" />
                  <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
                    {form.cv ? form.cv.name : "Cliquez ou glissez votre CV"}
                  </p>
                </div>
                <FieldError id="err-cv" message={erreurs.cv} />
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
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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
