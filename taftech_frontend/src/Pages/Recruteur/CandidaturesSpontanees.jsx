import InfoBanner from "../../Components/InfoBanner";
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import toast from "react-hot-toast";
import { Trash2, Mail, Phone, Copy, FileText, ChevronDown, ChevronUp, User } from "lucide-react";
import Select from "react-select";
import { selectStyles } from "../../theme";

const CandidaturesSpontanees = () => {
  const [spontanees, setSpontanees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});
  const toggleExpand = (id) => setExpandedIds(p => ({ ...p, [id]: !p[id] }));
  const [filtres, setFiltres] = useState({
    wilaya: "",
    diplome: "",
    specialite: "",
    lue: "",
  });
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [data, constData] = await Promise.all([
          jobsService.getCandidaturesSpontanees(),
          jobsService.getConstants(),
        ]);
        setSpontanees(data);
        setConstants(constData);
      } catch (err) {
        reportError("ECHEC_GET_SPONTANEES", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleMarquerLue = async (id) => {
    try {
      await jobsService.marquerSpontaneeCommentLue(id);
      setSpontanees(
        spontanees.map((s) => (s.id === id ? { ...s, lue: true } : s)),
      );
    } catch (err) {
      reportError("ECHEC_MARK_SPONTANEE_LUE", err);
      toast.error("Erreur.");
    }
  };

  const handleSupprimer = async (id) => {
    try {
      await jobsService.supprimerCandidatureSpontanee(id);
      setSpontanees(spontanees.filter((s) => s.id !== id));
      toast.success("Candidature supprimée.");
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_SPONTANEE", err);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const toTitleCase = (str) =>
    str ? str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "";

  if (loading)
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="flex gap-2 mt-2">
                <div className="h-4 bg-slate-100 rounded w-16" />
                <div className="h-4 bg-slate-100 rounded w-20" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-3/4 mt-2" />
            </div>
            <div className="space-y-2 w-20">
              <div className="h-8 bg-slate-200 rounded-lg" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );

  const spontaneesFiltrees = spontanees.filter((c) => {
    if (filtres.wilaya && c.wilaya !== filtres.wilaya) return false;
    if (filtres.diplome && c.diplome !== filtres.diplome) return false;
    if (filtres.specialite && c.specialite !== filtres.specialite) return false;
    if (filtres.lue === "lue" && !c.lue) return false;
    if (filtres.lue === "non_lue" && c.lue) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          Candidatures spontanées
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {spontanees.filter((s) => !s.lue).length} non lue(s) ·{" "}
          {spontaneesFiltrees.length} affichée(s)
        </p>
      </div>

      <div className="mb-6">
        <InfoBanner storageKey="candidatures_spontanees" title="Candidatures spontanées" color="teal">
          Ce sont des candidatures envoyées directement via la <strong>page publique de votre entreprise</strong>, sans lien avec une offre précise.
          Les nouvelles candidatures apparaissent avec un fond teal. Marquez-les comme lues après consultation. Vous pouvez filtrer par wilaya, diplôme ou secteur.
        </InfoBanner>
      </div>

      {/* FILTRES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-white border border-slate-200 rounded-xl p-4">
        <Select
          options={constants.wilayas}
          styles={selectStyles}
          isClearable
          placeholder="Wilaya..."
          onChange={(opt) =>
            setFiltres({ ...filtres, wilaya: opt ? opt.value : "" })
          }
        />
        <Select
          options={constants.diplomes}
          styles={selectStyles}
          isClearable
          placeholder="Diplôme..."
          onChange={(opt) =>
            setFiltres({ ...filtres, diplome: opt ? opt.value : "" })
          }
        />
        <Select
          options={constants.secteurs}
          styles={selectStyles}
          isClearable
          placeholder="Spécialité..."
          onChange={(opt) =>
            setFiltres({ ...filtres, specialite: opt ? opt.value : "" })
          }
        />
        <Select
          options={[
            { value: "lue", label: "Lues" },
            { value: "non_lue", label: "Non lues" },
          ]}
          styles={selectStyles}
          isClearable
          placeholder="Statut..."
          onChange={(opt) =>
            setFiltres({ ...filtres, lue: opt ? opt.value : "" })
          }
        />
      </div>

      {spontaneesFiltrees.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <User size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 mb-1">Aucune candidature spontanée</p>
          <p className="text-xs text-slate-500">Partagez la page publique de votre entreprise pour en recevoir.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {spontaneesFiltrees.map((c) => {
            const isExpanded = expandedIds[c.id];
            const lettreEstLongue = c.lettre_motivation && c.lettre_motivation.length > 160;
            const diplomeLabel = constants.diplomes.find(d => d.value === c.diplome)?.label || c.diplome;
            const specialiteLabel = constants.secteurs.find(s => s.value === c.specialite)?.label || c.specialite;

            return (
              <div
                key={c.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${!c.lue ? "border-teal-200" : "border-slate-200"}`}
              >
                {/* Bande non lue */}
                {!c.lue && <div className="h-1 bg-teal-500" />}

                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Fix 4 — Nom normalisé + Fix 7 — date longue */}
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {toTitleCase(`${c.nom} ${c.prenom}`)}
                      </p>
                      {!c.lue && <span className="w-2 h-2 bg-teal-600 rounded-full shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2">
                      {new Date(c.date_envoi).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>

                    {/* Fix 2 — Email + téléphone cliquables */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {c.email && (
                        <div className="flex items-center gap-1">
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-medium rounded-lg hover:bg-teal-100 transition-colors">
                            <Mail size={11} /> {c.email}
                          </a>
                          <button onClick={() => navigator.clipboard.writeText(c.email)} className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors" title="Copier">
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                      {c.telephone && (
                        <div className="flex items-center gap-1">
                          <a href={`tel:${c.telephone}`} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors">
                            <Phone size={11} /> {c.telephone}
                          </a>
                          <button onClick={() => navigator.clipboard.writeText(c.telephone)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Copier">
                            <Copy size={10} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fix 3 — Labels diplôme / spécialité */}
                    <div className="flex flex-wrap gap-1.5">
                      {c.wilaya && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md">{c.wilaya.split(" - ")[1] || c.wilaya}</span>
                      )}
                      {c.diplome && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md">{diplomeLabel}</span>
                      )}
                      {c.specialite && (
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[10px] font-medium rounded-md">{specialiteLabel}</span>
                      )}
                    </div>

                    {/* Fix 5 — Lettre expandable */}
                    {c.lettre_motivation && (
                      <div className="mt-3">
                        <p className={`text-xs text-slate-600 italic leading-relaxed ${!isExpanded && lettreEstLongue ? "line-clamp-2" : ""}`}>
                          "{c.lettre_motivation}"
                        </p>
                        {lettreEstLongue && (
                          <button
                            onClick={() => toggleExpand(c.id)}
                            className="flex items-center gap-1 text-[10px] text-teal-700 font-semibold mt-1 hover:underline"
                          >
                            {isExpanded ? <><ChevronUp size={11} /> Voir moins</> : <><ChevronDown size={11} /> Voir plus</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {c.cv && (
                      <a
                        href={mediaUrl(c.cv)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                      >
                        <FileText size={12} /> CV
                      </a>
                    )}
                    {!c.lue && (
                      <button
                        onClick={() => handleMarquerLue(c.id)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                      >
                        Marquer lue
                      </button>
                    )}
                    {/* Fix 1 — Confirmation inline */}
                    {confirmDeleteId === c.id ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleSupprimer(c.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidaturesSpontanees;
