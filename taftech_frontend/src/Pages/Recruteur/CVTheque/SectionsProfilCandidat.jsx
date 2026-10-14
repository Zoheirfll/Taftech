// Sections du profil détaillé d'un candidat : expériences, formations, bio, compétences, langues, CV et documents partagés.
import React from "react";
import { Calendar, ChevronRight, FileText } from "lucide-react";
import { tw } from "../../../theme";
import { candidatFichierUrl, documentPartageFichierUrl } from "../../../utils/mediaUrl";
import { formatDatePrecise } from "../../../utils/cvDates";

const SectionExperiences = ({ candidat }) => (
  <div className={`p-6 border-b ${tw.borderSubtle}`}>
    <h3 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${tw.textMuted}`}>
      Expériences professionnelles
    </h3>
    {candidat.experiences_detail?.length > 0 ? (
      <div className="space-y-4">
        {candidat.experiences_detail.map((exp) => (
          <div
            key={exp.id}
            className={`pl-4 border-l-2 ${tw.borderTeal100}`}
          >
            <p className={`text-sm font-semibold ${tw.textStrong}`}>
              {exp.titre_poste}
            </p>
            <p className={`text-sm mt-0.5 ${tw.textMuted}`}>
              {exp.entreprise}
              {exp.metier_libelle && (
                <span className={`font-normal ${tw.textMuted}`}>
                  {" "}· {exp.metier_libelle}
                </span>
              )}
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${tw.textMuted}`}>
              <Calendar size={11} />
              {formatDatePrecise(exp.date_debut, exp.date_debut_precision)} —{" "}
              {exp.date_fin
                ? formatDatePrecise(exp.date_fin, exp.date_fin_precision)
                : "Aujourd'hui"}
            </p>
            {exp.description && (
              <p className={`text-xs mt-2 leading-relaxed whitespace-pre-line ${tw.textMuted}`}>
                {exp.description}
              </p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className={`text-sm italic ${tw.textMuted}`}>
        Aucune expérience renseignée
      </p>
    )}
  </div>
);

const SectionFormations = ({ candidat }) => (
  <div className={`p-6 border-b ${tw.borderSubtle}`}>
    <h3 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${tw.textMuted}`}>
      Formations
    </h3>
    {candidat.formations_detail?.length > 0 ? (
      <div className="space-y-4">
        {candidat.formations_detail.map((form) => (
          <div
            key={form.id}
            className={`pl-4 border-l-2 ${tw.borderTeal100}`}
          >
            <p className={`text-sm font-semibold ${tw.textStrong}`}>
              {form.diplome_ref_libelle || form.diplome || "Diplôme non précisé"}
            </p>
            {(form.diplome_ref_libelle || form.specialite_ref_libelle) && (
              <p className="flex flex-wrap items-center gap-1 mt-1">
                {form.diplome_ref_libelle && (
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${tw.bgPrimarySoft} ${tw.textPrimaryStrong}`}>
                    {form.diplome_ref_libelle}
                  </span>
                )}
                {form.specialite_ref_libelle && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-50 text-teal-700">
                    {form.specialite_ref_libelle}
                  </span>
                )}
                {form.statut && form.statut !== "OBTENU" && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700">
                    {form.statut === "EN_COURS" ? "En cours" : form.statut === "INTERROMPU" ? "Interrompu" : form.statut}
                  </span>
                )}
              </p>
            )}
            {form.description && (
              <p className={`text-xs font-medium mt-1 ${tw.textTeal}`}>
                {form.description}
              </p>
            )}
            <p className={`text-sm mt-0.5 ${tw.textMuted}`}>
              {form.etablissement}
            </p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${tw.textMuted}`}>
              <Calendar size={11} />
              {form.date_debut ? `${formatDatePrecise(form.date_debut, form.date_debut_precision)} — ` : ""}
              {form.date_fin
                ? formatDatePrecise(form.date_fin, form.date_fin_precision)
                : "En cours"}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className={`text-sm italic ${tw.textMuted}`}>
        Aucune formation renseignée
      </p>
    )}
  </div>
);

const SectionCompetences = ({ candidat, ouverte, onToggle }) => (
  <div className={`border-b ${tw.borderSubtle}`}>
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-6 py-3 transition-colors ${tw.hoverSurfaceMuted}`}
    >
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${tw.textMuted}`}>Compétences</h3>
      <ChevronRight size={14} className={`${tw.textMuted} transition-transform ${ouverte ? "rotate-90" : ""}`} />
    </button>
    {ouverte && (
      <div className="px-6 pb-4">
        {candidat.competences ? (
          <div className="flex flex-wrap gap-1.5">
            {candidat.competences.split(",").filter(c => c.trim()).map((c, i) => (
              <span key={i} className={`px-2.5 py-1 text-xs rounded-md ${tw.chipTealSoft}`}>{c.trim()}</span>
            ))}
          </div>
        ) : <p className={`text-sm italic ${tw.textMuted}`}>Non renseignées</p>}
      </div>
    )}
  </div>
);

const SectionLangues = ({ candidat, ouverte, onToggle }) => (
  <div className={`border-b ${tw.borderSubtle}`}>
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-6 py-3 transition-colors ${tw.hoverSurfaceMuted}`}
    >
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${tw.textMuted}`}>Langues</h3>
      <ChevronRight size={14} className={`${tw.textMuted} transition-transform ${ouverte ? "rotate-90" : ""}`} />
    </button>
    {ouverte && (
      <div className="px-6 pb-4">
        {candidat.langues ? (
          <div className="flex flex-wrap gap-1.5">
            {candidat.langues.split(",").filter(l => l.trim()).map((l, i) => {
              const [name, level] = l.split(":");
              return (
                <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md ${tw.tagSlateSoft700}`}>
                  {name?.trim()}{level && <span className={tw.textMuted700}>· {level.trim()}</span>}
                </span>
              );
            })}
          </div>
        ) : <p className={`text-sm italic ${tw.textMuted}`}>Non renseignées</p>}
      </div>
    )}
  </div>
);

const BlocCVEtDocuments = ({ candidat, documentsPartages, debloquageEnCours, onDeverrouiller }) => (
  <>
    {candidat.cv_pdf && candidat.est_debloque && (
      <div className="px-6 pb-6">
        <a
          href={candidatFichierUrl(candidat.user_id, "cv")}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${tw.buttonDark}`}
        >
          <FileText size={16} />
          Télécharger le CV complet
        </a>
      </div>
    )}
    {candidat.cv_pdf && !candidat.est_debloque && (
      <div className="px-6 pb-6">
        <button
          onClick={() => onDeverrouiller(candidat)}
          disabled={debloquageEnCours === candidat.user_id}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${tw.buttonDark}`}
        >
          <FileText size={16} />
          Débloquer pour voir le CV (1 crédit)
        </button>
      </div>
    )}
    {documentsPartages.length > 0 && (
      <div className="px-6 pb-6 flex flex-wrap gap-2">
        {documentsPartages.map((doc) => (
          <a
            key={doc.id}
            href={documentPartageFichierUrl(candidat.user_id, doc.id)}
            target="_blank"
            rel="noreferrer"
            title={`${doc.nom_personnalise || doc.type_document || "Document partagé"} · Partagé par le candidat le ${new Date(doc.date_partage).toLocaleDateString("fr-FR")}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors min-w-0 max-w-40"
          >
            <FileText size={12} className="shrink-0" />
            <span className="truncate">{doc.nom_personnalise || doc.type_document || "Document partagé"}</span>
          </a>
        ))}
      </div>
    )}
  </>
);

export const SectionsProfilCandidat = ({
  candidat,
  documentsPartages,
  openSections,
  toggleSection,
  debloquageEnCours,
  onDeverrouiller,
}) => (
  <>
    <SectionExperiences candidat={candidat} />
    <SectionFormations candidat={candidat} />

    {/* Bio */}
    {candidat.bio && (
      <div className={`px-6 py-4 border-b ${tw.borderSubtle} ${tw.surfaceMutedLight}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${tw.textMuted700}`}>À propos</p>
        <p className={`text-sm leading-relaxed ${tw.bodyText}`}>{candidat.bio}</p>
      </div>
    )}

    <SectionCompetences
      candidat={candidat}
      ouverte={openSections.competences}
      onToggle={() => toggleSection("competences")}
    />
    <SectionLangues
      candidat={candidat}
      ouverte={openSections.langues}
      onToggle={() => toggleSection("langues")}
    />
    <BlocCVEtDocuments
      candidat={candidat}
      documentsPartages={documentsPartages}
      debloquageEnCours={debloquageEnCours}
      onDeverrouiller={onDeverrouiller}
    />
  </>
);
