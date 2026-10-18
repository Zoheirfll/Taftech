// Détails du profil TAFTECH d'un candidat : préférences, expériences, formations, compétences et langues.
import { Briefcase, GraduationCap, Calendar } from "lucide-react";
import { tw } from "../../../../theme";
import { formatDatePrecise } from "../../../../utils/cvDates";

export const ProfilCandidatDetails = ({ candidatData, formatText }) => (
  <>
    <div>
      <h4 className={`${tw.sectionLabel} mb-3`}>
        Préférences
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Métier souhaité",
            value: candidatData.metier_souhaite || "Non renseigné",
          },
          {
            label: "Prétentions",
            value: candidatData.salaire_souhaite || "À discuter",
          },
          {
            label: "Mobilité",
            value: formatText(candidatData.mobilite),
          },
          {
            label: "Situation",
            value: formatText(candidatData.situation_actuelle),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className={`${tw.surfaceMuted} p-3 rounded-lg border ${tw.borderSubtle}`}
          >
            <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase mb-1`}>
              {label}
            </p>
            <p className="text-xs font-semibold text-slate-800">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>

    {candidatData.experiences?.length > 0 && (
      <div>
        <h4 className={`${tw.sectionLabel} mb-3 flex items-center gap-2`}>
          <Briefcase size={12} /> Expériences
        </h4>
        <div className="space-y-3">
          {candidatData.experiences.map((exp) => (
            <div
              key={exp.id}
              className="pl-4 border-l-2 border-teal-100"
            >
              <p className={`text-sm font-semibold ${tw.textStrong}`}>
                {exp.titre_poste}
              </p>
              <p className={`text-sm ${tw.textTeal}`}>
                {exp.entreprise}
                {exp.metier_libelle && <span className={`${tw.textMuted} font-normal ml-1`}>· {exp.metier_libelle}</span>}
              </p>
              <p className={`text-xs ${tw.textMuted} mt-0.5 flex items-center gap-1`}>
                <Calendar size={10} />
                {formatDatePrecise(exp.date_debut, exp.date_debut_precision)} — {exp.date_fin ? formatDatePrecise(exp.date_fin, exp.date_fin_precision) : "Aujourd'hui"}
              </p>
              {exp.description && (
                <p className={`text-xs mt-2 leading-relaxed whitespace-pre-line ${tw.textMuted}`}>
                  {exp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    {candidatData.formations?.length > 0 && (
      <div>
        <h4 className={`${tw.sectionLabel} mb-3 flex items-center gap-2`}>
          <GraduationCap size={12} /> Formations
        </h4>
        <div className="space-y-3">
          {candidatData.formations.map((form) => (
            <div
              key={form.id}
              className={`pl-4 border-l-2 ${tw.borderBase}`}
            >
              <p className={`text-sm font-semibold ${tw.textStrong}`}>
                {form.diplome || "Diplôme non précisé"}
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
                <p className={`text-xs ${tw.textTeal} font-medium mt-1`}>
                  {form.description}
                </p>
              )}
              <p className={`text-sm ${tw.textMuted700}`}>
                {form.etablissement}
              </p>
              {(form.date_debut || form.date_fin) && (
                <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                  {form.date_debut ? `${formatDatePrecise(form.date_debut, form.date_debut_precision)} — ` : ""}{form.date_fin ? formatDatePrecise(form.date_fin, form.date_fin_precision) : "En cours"}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    {(candidatData.competences || candidatData.langues) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidatData.competences && (
          <div>
            <h4 className={`${tw.sectionLabel} mb-3`}>
              Compétences
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidatData.competences_detail?.length > 0
                ? candidatData.competences_detail.map((c) => (
                    <span
                      key={c.id}
                      className={`px-2.5 py-1 ${tw.chipTealSoft} text-xs rounded-md flex items-center gap-1`}
                    >
                      {c.label}
                      <span className="opacity-70 text-[10px]">{c.niveau_libelle}</span>
                    </span>
                  ))
                : candidatData.competences
                    .split(",")
                    .filter(Boolean)
                    .map((c, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1 ${tw.chipTealSoft} text-xs rounded-md`}
                      >
                        {c.trim()}
                      </span>
                    ))}
            </div>
          </div>
        )}
        {candidatData.langues && (
          <div>
            <h4 className={`${tw.sectionLabel} mb-3`}>
              Langues
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidatData.langues
                .split(",")
                .filter(Boolean)
                .map((l, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 ${tw.tagSlateSoft} text-xs rounded-md`}
                  >
                    {l.trim()}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    )}
  </>
);
