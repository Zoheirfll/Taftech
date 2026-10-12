// En-tête du détail d'une candidature : photo, identité, tags, menu de changement de statut, chronologie, entretien et bulletin.
import React from "react";
import {
  Zap,
  MapPin,
  GraduationCap,
  Briefcase,
  Download,
  Calendar,
  User,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { authService } from "../../../../Services/authService";
import { candidatFichierUrl } from "../../../../utils/mediaUrl";
import CandidatureTimeline from "../../../../Components/CandidatureTimeline";
import { tw } from "../../../../theme";
import { STATUTS_LABELS, STATUTS_STYLES } from "./constantesDetail";

export const EnteteCandidature = ({
  selectedCandidature,
  candidatData,
  candidatUserId,
  formatText,
  handleStatusChange,
  handleDownloadBulletin,
}) => {
  const [showStatutMenu, setShowStatutMenu] = React.useState(false);
  const statutMenuRef = React.useRef(null);

  React.useEffect(() => {
    if (!showStatutMenu) return;
    const handler = (e) => {
      if (statutMenuRef.current && !statutMenuRef.current.contains(e.target)) {
        setShowStatutMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showStatutMenu]);

  return (
    <div className={`p-6 border-b ${tw.borderSubtle}`}>
      <div className="flex items-start gap-4">
        <div className={`w-16 h-16 rounded-xl ${tw.surfaceSubtle} flex items-center justify-center overflow-hidden flex-shrink-0`}>
          {candidatData?.photo_profil ? (
            <img
              src={candidatFichierUrl(candidatUserId, "photo")}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : selectedCandidature.est_rapide ? (
            <Zap size={24} className={tw.textAmber500} />
          ) : (
            <User size={24} className={tw.textMuted} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-bold ${tw.textStrong}`}>
            {(() => {
              const n = candidatData
                ? `${candidatData.last_name} ${candidatData.first_name}`
                : `${selectedCandidature.nom_rapide} ${selectedCandidature.prenom_rapide}`;
              return n.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            })()}
          </h2>
          <p className={`text-sm ${tw.textMuted700} mt-0.5`}>
            {candidatData?.titre_professionnel ||
              (selectedCandidature.est_rapide
                ? "Candidature rapide"
                : "Candidat TAFTECH")}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {candidatData?.wilaya && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft} text-xs rounded-md`}>
                <MapPin size={11} />
                {candidatData.wilaya}
              </span>
            )}
            {candidatData?.adresse && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft} text-xs rounded-md`}>
                <MapPin size={11} />
                {candidatData.adresse}
              </span>
            )}
            {(candidatData?.diplome_ref_libelle || candidatData?.niveau_scolaire_ref_libelle || candidatData?.diplome) && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft} text-xs rounded-md`}>
                <GraduationCap size={11} />
                {candidatData.diplome_ref_libelle || candidatData.niveau_scolaire_ref_libelle || candidatData.diplome}
              </span>
            )}
            {candidatData?.metier && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft} text-xs rounded-md`}>
                <Briefcase size={11} />
                {candidatData.metier}
              </span>
            )}
            {candidatData?.date_naissance && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${tw.tagSlateSoft} text-xs rounded-md`}>
                <Calendar size={11} />
                Né(e) le {new Date(candidatData.date_naissance).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
          {candidatData && (candidatData.service_militaire || candidatData.permis_conduire || candidatData.passeport_valide || candidatData.vehicule_personnel) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {candidatData.service_militaire && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${candidatData.service_militaire === "DEGAGE" ? "bg-emerald-50 text-emerald-700" : tw.tagSlateSoft}`}>
                  Militaire : {formatText(candidatData.service_militaire)}
                </span>
              )}
              {[
                { label: "Permis", active: candidatData.permis_conduire },
                { label: "Passeport", active: candidatData.passeport_valide },
                { label: "Véhicule", active: candidatData.vehicule_personnel },
              ].filter(({ active }) => active).map(({ label }) => (
                <span key={label} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  ✓ {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="relative shrink-0" ref={statutMenuRef}>
          <button
            type="button"
            onClick={() => authService.peutFaire("UTILISATEUR") && setShowStatutMenu(p => !p)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${STATUTS_STYLES[selectedCandidature.statut]} ${authService.peutFaire("UTILISATEUR") ? "cursor-pointer hover:brightness-95" : "cursor-default opacity-70"}`}
          >
            {STATUTS_LABELS[selectedCandidature.statut]}
            {authService.peutFaire("UTILISATEUR") && <ChevronDown size={12} className={showStatutMenu ? "rotate-180 transition-transform" : "transition-transform"} />}
          </button>
          {showStatutMenu && authService.peutFaire("UTILISATEUR") && (
            <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[200px] py-1">
              {Object.entries(STATUTS_LABELS).map(([key, label]) => {
                const estActif = key === selectedCandidature.statut;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => { handleStatusChange(selectedCandidature.id, key); setShowStatutMenu(false); }}
                    className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 ${estActif ? "bg-slate-50" : ""}`}
                  >
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${STATUTS_STYLES[key]}`}>
                      {label}
                    </span>
                    {estActif && <CheckCircle size={14} className={tw.textSuccess} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={`mt-4 pt-4 border-t ${tw.borderSubtle}`}>
        <CandidatureTimeline statut={selectedCandidature.statut} />
      </div>

      {selectedCandidature.statut === "ENTRETIEN" &&
        selectedCandidature.date_entretien && (
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 ${tw.bgOrangeSoft} rounded-lg border ${tw.borderOrange100}`}>
            <Calendar size={14} className={tw.textOrangeStrong} />
            <p className={`text-xs font-medium ${tw.textOrange}`}>
              Entretien le{" "}
              {new Date(selectedCandidature.date_entretien).toLocaleString(
                "fr-FR",
                {
                  day: "2-digit",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </p>
          </div>
        )}

      {selectedCandidature.statut === "RETENU" && (
        <div className={`mt-3 flex items-center justify-between px-4 py-3 ${tw.bgSuccessSoft} rounded-lg border ${tw.borderSuccess}`}>
          <p className={`text-xs font-semibold ${tw.textSuccessStrong}`}>
            Candidat retenu — Bulletin disponible
          </p>
          <button
            onClick={() => handleDownloadBulletin(selectedCandidature.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.buttonSuccessSolid} text-xs font-medium rounded-lg transition-colors`}
          >
            <Download size={12} /> Télécharger
          </button>
        </div>
      )}
    </div>
  );
};
