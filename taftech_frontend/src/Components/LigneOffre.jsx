import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Briefcase, Bookmark, GraduationCap, Building2, Clock } from "lucide-react";
import { tw } from "../theme";
import { jobUrl } from "../utils/slugify";
import { mediaUrl as getMediaUrl } from "../utils/mediaUrl";
import { contratsTexte, lieuxTexte } from "../utils/lieuxContrats";
import { libellesDiplomesCompacts } from "../utils/groupesDiplomes";
import { joindre } from "../utils/listeFrancaise";

// Niveau d'étude de la ligne : diplômes regroupés par niveau (« Master / Ingéniorat (Bac +5) »), deux au plus puis
// « N autres », pour ne pas alourdir la ligne (la page de l'offre garde le détail complet).
const diplomesTexte = (job) => joindre(libellesDiplomesCompacts(job.diplomes_requis_detail || []), "ou");

// Années d'expérience que le score attend (`experience_annees`) : « environ 3 ans », jamais une fourchette inventée.
const anneesTexte = (annees) => (annees > 0 ? ` (environ ${annees} an${annees > 1 ? "s" : ""})` : "");

const tempsDepuis = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `il y a ${Math.floor(diff / 86400)}j`;
  return `il y a ${Math.floor(diff / 2592000)} mois`;
};

const LogoEntreprise = ({ url }) => {
  const [err, setErr] = React.useState(false);
  return (
    <div className={`w-12 h-12 rounded-xl border ${tw.borderBase} ${tw.surfaceMuted} flex items-center justify-center shrink-0 overflow-hidden`}>
      {url && !err ? (
        <img src={url} alt="" loading="lazy" width={48} height={48} className="w-full h-full object-contain p-1" onError={() => setErr(true)} />
      ) : (
        <Building2 size={22} className={tw.textMuted} />
      )}
    </div>
  );
};

// Ligne d'offre unique du site (page Offres, offres par région, offres par secteur).
// `libelleExperience` : (valeur) => libellé ; `onToggleFavori` / `estSauvegardee` : favoris du compte.
const LigneOffre = ({ job, estSauvegardee, onToggleFavori, libelleExperience }) => {
  const logoUrl = getMediaUrl(job.entreprise?.logo_url);
  return (
    <div className={`${tw.surface} ${tw.jobCardBorderHover} border rounded-2xl p-4 md:p-5 hover:shadow-md transition-all`}>
      <div className="flex items-start gap-3 md:gap-4">
        <LogoEntreprise url={logoUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Link to={jobUrl(job)} className={`text-base font-bold ${tw.textStrong} ${tw.hoverTextPrimary} transition-colors leading-snug`}>
                {job.titre}
              </Link>
              <div className="mt-0.5">
                {job.entreprise ? (
                  <Link to={`/entreprise/${job.entreprise.slug}`} className={`text-sm ${tw.textPrimary} hover:underline font-semibold`}>
                    {job.entreprise.nom_entreprise}
                  </Link>
                ) : (
                  <span className={`text-sm ${tw.textMuted700} font-medium`}>Entreprise anonyme</span>
                )}
              </div>
              {job.date_publication && (
                <p className={`text-xs ${tw.textMuted} mt-1 flex items-center gap-1`}>
                  <Clock size={10} /> {tempsDepuis(job.date_publication)}
                </p>
              )}
            </div>
            <button
              onClick={() => onToggleFavori(job.id)}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${estSauvegardee ? tw.bookmarkActive : tw.bookmarkInactive}`}
              title={estSauvegardee ? "Retirer des favoris" : "Sauvegarder"}
            >
              <Bookmark size={15} className={estSauvegardee ? tw.fillAmber500 : ""} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
              <MapPin size={11} />
              {lieuxTexte(job)}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
              <Briefcase size={11} /> {libelleExperience(job.experience_requise)}{anneesTexte(job.experience_annees)}
            </span>
            {diplomesTexte(job) && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.tagNeutralSolid} text-xs font-medium rounded-lg`}>
                <GraduationCap size={11} /> {diplomesTexte(job)}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-semibold rounded-lg`}>
              {contratsTexte(job)}
            </span>
            {job.nombre_postes > 0 && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${tw.bgSuccessSoft} ${tw.textSuccess} text-xs font-semibold rounded-lg`}>
                {job.nombre_postes} poste{job.nombre_postes > 1 ? "s" : ""} ouvert{job.nombre_postes > 1 ? "s" : ""}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {job.est_cloturee && <span className={tw.jobCardBadgeCloturee}>Offre clôturée</span>}
              <Link to={jobUrl(job)} className={`px-4 py-1.5 ${tw.bgPrimarySolid} text-xs font-semibold rounded-lg transition-colors`}>
                Voir l'offre
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LigneOffre;
