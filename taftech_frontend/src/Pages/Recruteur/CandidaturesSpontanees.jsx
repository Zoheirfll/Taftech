import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import Select from "react-select";
import { selectStyles } from "../../theme";

const CandidaturesSpontanees = () => {
  const [spontanees, setSpontanees] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!window.confirm("Supprimer cette candidature ?")) return;
    try {
      await jobsService.supprimerCandidatureSpontanee(id);
      setSpontanees(spontanees.filter((s) => s.id !== id));
      toast.success("Candidature supprimée.");
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_SPONTANEE", err);
      toast.error("Erreur lors de la suppression.");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
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
          <p className="text-sm font-medium text-slate-900">
            Aucune candidature trouvée
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {spontaneesFiltrees.map((c) => (
            <div
              key={c.id}
              className={`bg-white border rounded-xl p-5 flex items-start justify-between gap-4 ${!c.lue ? "border-teal-200 bg-teal-50/30" : "border-slate-200"}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {c.nom} {c.prenom}
                  </p>
                  {!c.lue && (
                    <span className="w-2 h-2 bg-teal-700 rounded-full" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {c.email}
                  {c.telephone ? ` · ${c.telephone}` : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.wilaya && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md">
                      {c.wilaya}
                    </span>
                  )}
                  {c.diplome && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md">
                      {c.diplome}
                    </span>
                  )}
                  {c.specialite && (
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[10px] rounded-md">
                      {c.specialite}
                    </span>
                  )}
                </div>
                {c.lettre_motivation && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">
                    "{c.lettre_motivation}"
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-2">
                  {new Date(c.date_envoi).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {c.cv && (
                  <a
                    href={
                      c.cv.startsWith("http")
                        ? c.cv
                        : `http://127.0.0.1:8000${c.cv}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors text-center"
                  >
                    Voir CV
                  </a>
                )}
                {!c.lue && (
                  <button
                    onClick={() => handleMarquerLue(c.id)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Marquer lue
                  </button>
                )}
                <button
                  onClick={() => handleSupprimer(c.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidaturesSpontanees;
