// Colonne de droite de la CVthèque : en-tête du candidat sélectionné, coordonnées, puis sections du profil.
import React from "react";
import { notifier } from "../../../utils/notifier";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  User,
  Star,
  Copy,
  ExternalLink,
} from "lucide-react";
import { tw } from "../../../theme";
import { nomWilaya } from "../../../utils/wilaya";
import { candidatFichierUrl } from "../../../utils/mediaUrl";
import { getStatutActivite } from "./cvthequeUtils";
import { SectionsProfilCandidat } from "./SectionsProfilCandidat";

const EnTeteDetail = ({ candidat, onToggleFavori }) => {
  const statut = getStatutActivite(candidat.last_login);
  return (
    <div className={`p-6 border-b ${tw.borderSubtle}`}>
      <div className="flex items-start gap-4">
        <div className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${tw.surfaceSubtle}`}>
          {candidat.photo_profil ? (
            <img
              src={candidatFichierUrl(candidat.user_id, "photo")}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={32} className={tw.textMuted} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-xl font-bold ${tw.textStrong}`}>
                {candidat.titre_professionnel ||
                  "Profil candidat"}
              </h2>
              <p className={`text-sm mt-1 ${tw.textMuted}`}>
                {candidat.last_name || candidat.first_name
                  ? `${candidat.last_name ?? ""} ${candidat.first_name ?? ""}`.trim()
                  : "Identité masquée — débloquez le profil pour la voir"}
              </p>
            </div>
            {/* BOUTON FAVORI */}
            <button
              onClick={(e) => onToggleFavori(candidat, e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border ${tw.borderBase} rounded-lg text-xs font-medium transition-colors ${tw.hoverSurfaceMuted}`}
            >
              <Star
                size={14}
                className={
                  candidat.is_favori
                    ? tw.starFavoriActive
                    : tw.textMuted
                }
              />
              {candidat.is_favori ? "En favori" : "Favori"}
            </button>
          </div>

          {/* BADGE ACTIVITÉ */}
          {statut && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statut.color}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statut.dot}`}
                />
                {statut.label}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {candidat.wilaya && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                <MapPin size={12} />
                {nomWilaya(candidat.wilaya)}
                {candidat.commune &&
                  ` · ${candidat.commune}`}
              </span>
            )}
            {(candidat.diplome_ref_libelle || candidat.diplome) && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                <GraduationCap size={12} />
                {candidat.diplome_ref_libelle || candidat.diplome}
              </span>
            )}
            {candidat.metier_libelle && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                <Briefcase size={12} />
                {candidat.metier_libelle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BlocCoordonnees = ({ candidat, debloquageEnCours, onDeverrouiller }) => (
  <div className={`p-6 border-b ${tw.borderSubtle}`}>
    <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${tw.textMuted}`}>Coordonnées</h3>
    <div className="flex flex-wrap gap-2">
      {candidat.email && (
        <a
          href={`mailto:${candidat.email}`}
          className={`inline-flex items-center gap-2 px-3 py-2 border ${tw.borderTeal200} text-sm font-semibold rounded-lg transition-colors ${tw.pillTeal}`}
        >
          <Mail size={14} /> {candidat.email}
        </a>
      )}
      {candidat.telephone && (
        <a
          href={`tel:${candidat.telephone}`}
          className={`inline-flex items-center gap-2 px-3 py-2 border ${tw.borderBase} text-sm font-semibold rounded-lg transition-colors ${tw.pillSlate}`}
        >
          <Phone size={14} /> {candidat.telephone}
        </a>
      )}
      {candidat.email && (
        <button
          onClick={() => { navigator.clipboard.writeText(candidat.email); notifier.succes("Email copié"); }}
          className={`inline-flex items-center gap-1.5 px-3 py-2 border ${tw.borderBase} text-xs font-medium rounded-lg transition-colors ${tw.surface} ${tw.textMuted700} ${tw.hoverSurfaceMuted}`}
          title="Copier l'email"
        >
          <Copy size={13} /> Copier
        </button>
      )}
      {candidat.linkedin && (
        <a
          href={candidat.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${tw.linkedinChip}`}
        >
          <ExternalLink size={13} /> LinkedIn
        </a>
      )}
      {!candidat.est_debloque && (
        <button
          onClick={() => onDeverrouiller(candidat)}
          disabled={debloquageEnCours === candidat.user_id}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${tw.bgTealSolid}`}
        >
          🔓 {debloquageEnCours === candidat.user_id ? "Déblocage..." : "Débloquer ce profil (1 crédit)"}
        </button>
      )}
      {candidat.est_debloque && !candidat.email && !candidat.telephone && (
        <p className={`text-sm italic ${tw.textMuted}`}>Coordonnées non renseignées par le candidat.</p>
      )}
    </div>
  </div>
);

export const PanneauDetailCandidat = ({
  detailRef,
  candidat,
  documentsPartages,
  openSections,
  toggleSection,
  debloquageEnCours,
  onToggleFavori,
  onDeverrouiller,
}) => (
  <div className="lg:col-span-7" ref={detailRef}>
    {candidat ? (
      <div className={`relative ${tw.cardColors} rounded-xl overflow-hidden`}>
        <EnTeteDetail candidat={candidat} onToggleFavori={onToggleFavori} />
        <BlocCoordonnees
          candidat={candidat}
          debloquageEnCours={debloquageEnCours}
          onDeverrouiller={onDeverrouiller}
        />
        <SectionsProfilCandidat
          candidat={candidat}
          documentsPartages={documentsPartages}
          openSections={openSections}
          toggleSection={toggleSection}
          debloquageEnCours={debloquageEnCours}
          onDeverrouiller={onDeverrouiller}
        />
      </div>
    ) : (
      <div className={`${tw.cardColors} rounded-xl p-12 text-center`}>
        <User size={40} className={`${tw.textSubtle} mx-auto mb-4`} />
        <p className={`text-sm font-medium ${tw.textStrong}`}>
          Sélectionnez un profil
        </p>
        <p className={`text-xs mt-1 ${tw.textMuted}`}>
          Cliquez sur un candidat à gauche pour voir son profil détaillé
        </p>
      </div>
    )}
  </div>
);
