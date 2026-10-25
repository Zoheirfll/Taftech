// Carte d'un candidat dans la liste de gauche de la CVthèque (avatar, score, tags, favori, invitation).
import React, { useRef, useState } from "react";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  User,
  Sparkles,
  CheckCircle2,
  Star,
  Zap,
  Send,
  Lock,
  Unlock,
} from "lucide-react";
import { tw } from "../../../theme";
import { candidatFichierUrl } from "../../../utils/mediaUrl";
import { isRecent, getStatutActivite } from "./cvthequeUtils";

const SEUIL_BALAYAGE = 90; // px de glissement horizontal au-delà desquels le geste est pris en compte
const DECALAGE_MAX = 140;

export const CarteCandidat = ({
  candidat,
  isSelected,
  offreId,
  constants,
  accesCoordonnees,
  onSelect,
  onToggleFavori,
  onIgnorer,
  onOuvrirInvitation,
}) => {
  const recent = isRecent(candidat.date_joined);
  const statutActivite = getStatutActivite(candidat.last_login);

  // Balayage tactile : droite = favori, gauche = masquer de la liste. Le défilement vertical reste
  // géré par le navigateur (touch-action: pan-y) ; le geste n'est retenu que s'il est surtout horizontal.
  const [decalage, setDecalage] = useState(0);
  const depart = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    depart.current = { x: t.clientX, y: t.clientY, horizontal: null };
  };
  const onTouchMove = (e) => {
    if (!depart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - depart.current.x;
    const dy = t.clientY - depart.current.y;
    if (depart.current.horizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      depart.current.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (depart.current.horizontal) setDecalage(Math.max(-DECALAGE_MAX, Math.min(DECALAGE_MAX, dx)));
  };
  const onTouchEnd = () => {
    const dx = decalage;
    depart.current = null;
    setDecalage(0);
    if (dx >= SEUIL_BALAYAGE && !candidat.is_favori) onToggleFavori(candidat, { stopPropagation() {} });
    else if (dx <= -SEUIL_BALAYAGE && onIgnorer) onIgnorer(candidat);
  };

  return (
    <div className="relative">
      {decalage !== 0 && (
        <div className={`absolute inset-0 rounded-xl flex items-center px-5 text-xs font-semibold ${
          decalage > 0 ? `justify-start ${tw.bgWarningSoft} ${tw.textWarning}` : `justify-end ${tw.surfaceMuted} ${tw.textMuted}`
        }`}>
          {decalage > 0 ? (candidat.is_favori ? "Déjà en favori" : "⭐ Ajouter aux favoris") : "Masquer ce profil"}
        </div>
      )}
    <div
      onClick={() => onSelect(candidat)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ transform: `translateX(${decalage}px)`, transition: decalage === 0 ? "transform 0.2s" : "none", touchAction: "pan-y" }}
      className={`relative cursor-pointer w-full text-left ${tw.surface} border rounded-xl overflow-hidden transition-all ${
        isSelected
          ? tw.borderTealSelected
          : tw.borderNeutralHover
      }`}
    >
      {/* Barre score IA à gauche */}
      {offreId && 'score_offre' in candidat && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          candidat.score_offre >= 70 ? tw.scoreBarHigh :
          candidat.score_offre >= 40 ? tw.scoreFillWarning : tw.scoreBarLowNeutral
        }`} />
      )}

      <div className={`p-4 ${offreId && 'score_offre' in candidat ? "pl-5" : ""}`}>
        <div className="flex gap-3 pr-7">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${tw.surfaceSubtle}`}>
            {!candidat.est_debloque ? (
              <span className={`w-full h-full flex items-center justify-center ${tw.bgTealSoft}`}><Lock size={16} className={tw.textTeal} /></span>
            ) : candidat.photo_profil ? (
              <img src={candidatFichierUrl(candidat.user_id, "photo")} alt="" loading="lazy" width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <User size={18} className={tw.textMuted} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Ligne 1 : titre + badges */}
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  {statutActivite && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statutActivite.dot}`} title={statutActivite.label} />}
                  <h3 className={`text-sm font-semibold truncate ${tw.textStrong}`}>{candidat.titre_professionnel || "Profil candidat"}</h3>
                </div>
                {candidat.last_name || candidat.first_name ? (
                  <p className={`text-xs truncate ${tw.textMuted700}`}>
                    {`${candidat.last_name ?? ""} ${candidat.first_name ?? ""}`.trim()}
                  </p>
                ) : (
                  <p className={`text-xs truncate flex items-center gap-1.5 ${tw.textMuted700}`}>
                    <span className="blur-[3px] select-none" aria-hidden="true">Xxxxxxxx Xxxxxx</span>
                    <span className={`text-[10px] font-medium ${tw.textTeal}`}>Débloquer pour voir l'identité</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                {offreId && 'score_offre' in candidat && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-md border ${
                    candidat.score_offre >= 70 ? tw.scoreHigh :
                    candidat.score_offre >= 40 ? tw.scoreMid :
                    tw.badgeNeutral
                  }`}><Zap size={9} />{candidat.score_offre}%</span>
                )}
                {candidat.est_debloque ? (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${tw.bgTealSoft} ${tw.textTeal800}`}><Unlock size={9} />Débloqué</span>
                ) : (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${tw.surfaceMuted} ${tw.textMuted}`}><Lock size={9} />Verrouillé</span>
                )}
                {recent && <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${tw.bgWarningSoft} ${tw.textWarning}`}><Sparkles size={9} />Nouveau</span>}
              </div>
            </div>

            {/* Ligne 2 : wilaya + diplôme + expérience */}
            <div className={`flex flex-wrap items-center gap-2 mt-1.5 text-xs ${tw.textMuted700}`}>
              {candidat.wilaya && <span className="flex items-center gap-0.5"><MapPin size={10} />{candidat.wilaya.split(" - ")[1] || candidat.wilaya}</span>}
              {candidat.adresse && <span className="flex items-center gap-0.5"><MapPin size={10} />{candidat.adresse}</span>}
              {(candidat.diplome_ref_libelle || candidat.diplome) && <span className="flex items-center gap-0.5"><GraduationCap size={10} />{candidat.diplome_ref_libelle || constants.diplomes.find(d => d.value === candidat.diplome)?.label || candidat.diplome}</span>}
              {candidat.niveau_experience && <span className="flex items-center gap-0.5"><Briefcase size={10} />{candidat.niveau_experience}</span>}
            </div>

            {/* Ligne 3 : top 3 compétences */}
            {candidat.competences && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {candidat.competences.split(",").filter(c => c.trim()).slice(0, 3).map((c, i) => (
                  <span key={i} className={`px-1.5 py-0.5 text-[10px] rounded ${tw.tagSlateSoft}`}>{c.trim()}</span>
                ))}
                {candidat.competences.split(",").filter(c => c.trim()).length > 3 && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${tw.surfaceMuted} ${tw.textMuted}`}>+{candidat.competences.split(",").filter(c => c.trim()).length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bouton "Voir le profil" visible uniquement sur mobile */}
      {isSelected && (
        <div className="px-4 pb-3 lg:hidden">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tw.textTeal}`}>
            <CheckCircle2 size={12} /> Profil sélectionné — voir ci-dessous
          </span>
        </div>
      )}

      {/* ÉTOILE FAVORI */}
      <button
        onClick={(e) => onToggleFavori(candidat, e)}
        title={candidat.is_favori ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`absolute top-3 right-3 p-1 rounded-md transition-colors group/star ${tw.hoverSurfaceSubtle}`}
      >
        <Star size={14} className={candidat.is_favori ? tw.starFavoriActive : tw.starFavoriInactiveGroupHover} />
      </button>

      {/* INVITER À POSTULER (Pro+, réservé à l'accès coordonnées) */}
      <button
        onClick={(e) => (accesCoordonnees ? onOuvrirInvitation(candidat, e) : e.stopPropagation())}
        disabled={!accesCoordonnees}
        title={accesCoordonnees ? "Inviter à postuler" : "Nécessite un abonnement Pro ou supérieur"}
        className={`absolute top-3 right-10 p-1 rounded-md transition-colors group/send ${accesCoordonnees ? tw.hoverSurfaceSubtle : "opacity-30 cursor-not-allowed"}`}
      >
        <Send size={14} className={tw.iconMuted} />
      </button>
    </div>
    </div>
  );
};
