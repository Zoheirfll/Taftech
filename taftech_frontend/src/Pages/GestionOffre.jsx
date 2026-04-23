import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";

const GestionOffre = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offre, setOffre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidature, setSelectedCandidature] = useState(null);

  useEffect(() => {
    const fetchOffre = async () => {
      try {
        const dashData = await jobsService.getDashboard();
        const foundOffre = dashData.offres.find((o) => o.id === parseInt(id));
        if (foundOffre) {
          setOffre(foundOffre);
        } else {
          toast.error("Offre introuvable.");
          navigate("/dashboard");
        }
      } catch (err) {
        toast.error("Erreur de chargement.");
        console.log(err);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchOffre();
  }, [id, navigate]);

  // --- ACTIONS SÉCURISÉES ---

  const changerStatut = async (candidatureId, nouveauStatut, nomCandidat) => {
    const actionStr = nouveauStatut === "ACCEPTEE" ? "accepter" : "refuser";
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir ${actionStr} la candidature de ${nomCandidat} ?`,
      )
    ) {
      return;
    }

    try {
      await jobsService.updateStatutCandidature(candidatureId, nouveauStatut);
      setOffre({
        ...offre,
        candidatures: offre.candidatures.map((c) =>
          c.id === candidatureId ? { ...c, statut: nouveauStatut } : c,
        ),
      });
      toast.success(`Candidature ${actionStr}e avec succès.`);
      if (selectedCandidature && selectedCandidature.id === candidatureId) {
        setSelectedCandidature({
          ...selectedCandidature,
          statut: nouveauStatut,
        });
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
      console.log(err);
    }
  };

  const supprimerCandidature = async (candidatureId) => {
    if (
      !window.confirm(
        "ATTENTION : Voulez-vous supprimer DÉFINITIVEMENT cette candidature ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    try {
      await jobsService.deleteCandidature(candidatureId);
      setOffre({
        ...offre,
        candidatures: offre.candidatures.filter((c) => c.id !== candidatureId),
      });
      toast.success("Candidature supprimée de votre espace.");
      setSelectedCandidature(null); // On ferme la modale si elle était ouverte
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
      console.log(err);
    }
  };

  const handleCloturer = async () => {
    if (
      !window.confirm(
        "Voulez-vous vraiment clôturer cette offre ? Elle n'acceptera plus de nouveaux candidats.",
      )
    ) {
      return;
    }
    try {
      await jobsService.cloturerOffre(offre.id);
      setOffre({ ...offre, est_cloturee: true });
      toast.success("Offre clôturée et archivée !");
    } catch (err) {
      toast.error("Erreur lors de la clôture.");
      console.log(err);
    }
  };

  // --- HELPERS ---
  const getBadgeStyle = (statut) => {
    const styles = {
      ACCEPTEE: "bg-green-100 text-green-700 border-green-200",
      REFUSEE: "bg-red-100 text-red-700 border-red-200",
      EN_ATTENTE: "bg-blue-50 text-blue-600 border-blue-100",
    };
    return styles[statut] || styles.EN_ATTENTE;
  };

  const getMediaUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `http://127.0.0.1:8000${path}`;
  };

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    return text
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
  };

  const renderTags = (data) => {
    if (!data)
      return (
        <span className="text-gray-400 italic text-xs">
          Aucun renseignement
        </span>
      );
    return data
      .split(",")
      .filter((i) => i)
      .map((item, idx) => (
        <span
          key={idx}
          className="bg-gray-100 text-gray-700 text-[10px] font-black uppercase px-2 py-1 rounded-md border border-gray-200 mr-2 mb-2 inline-block"
        >
          {item.trim()}
        </span>
      ));
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600 animate-pulse">
        Chargement de l'offre...
      </div>
    );
  if (!offre) return null;

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans">
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-6 text-gray-400 hover:text-gray-900 font-bold text-sm flex items-center gap-2 transition"
      >
        ← Retour au Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            {offre.titre}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400">
              Publiée le{" "}
              {new Date(offre.date_publication).toLocaleDateString("fr-FR")}
            </span>
            {offre.est_cloturee ? (
              <span className="bg-gray-800 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                Archivée
              </span>
            ) : (
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-green-200">
                Ouverte
              </span>
            )}
          </div>
        </div>

        {!offre.est_cloturee && (
          <button
            onClick={handleCloturer}
            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white font-black py-3 px-6 rounded-xl transition shadow-sm"
          >
            🔒 CLÔTURER L'OFFRE
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">
            Candidatures reçues ({offre.candidatures.length})
          </h2>
        </div>

        {offre.candidatures.length === 0 ? (
          <div className="p-16 text-center text-gray-400 font-medium italic">
            Aucun candidat pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-4 text-left w-1/3">Candidat</th>
                  <th className="pb-4 text-center w-1/4">Dossier Complet</th>
                  <th className="pb-4 text-center">Statut</th>
                  <th className="pb-4 text-right">Décision / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {offre.candidatures.map((cand) => (
                  <tr key={cand.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-sm">
                          {cand.candidat.photo_profil ? (
                            <img
                              src={getMediaUrl(cand.candidat.photo_profil)}
                              alt="Profil"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              {cand.candidat.first_name?.[0]}
                              {cand.candidat.last_name?.[0]}
                            </>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm uppercase">
                            {cand.candidat.last_name} {cand.candidat.first_name}
                          </p>
                          <p className="text-xs text-blue-600 font-bold">
                            {cand.candidat.titre_professionnel || "Candidat"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 align-middle text-center">
                      <button
                        onClick={() => setSelectedCandidature(cand)}
                        className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                      >
                        👁️ Voir le profil
                      </button>
                    </td>

                    <td className="py-4 align-middle text-center">
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase ${getBadgeStyle(cand.statut)}`}
                      >
                        {cand.statut.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-4 text-right align-middle">
                      <div className="flex justify-end gap-2">
                        {cand.statut === "EN_ATTENTE" && (
                          <>
                            <button
                              onClick={() =>
                                changerStatut(
                                  cand.id,
                                  "ACCEPTEE",
                                  cand.candidat.first_name,
                                )
                              }
                              className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 border border-green-200 rounded-lg hover:bg-green-500 hover:text-white transition shadow-sm"
                              title="Accepter"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() =>
                                changerStatut(
                                  cand.id,
                                  "REFUSEE",
                                  cand.candidat.first_name,
                                )
                              }
                              className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm"
                              title="Refuser"
                            >
                              ✕
                            </button>
                          </>
                        )}

                        {cand.statut === "REFUSEE" && (
                          <button
                            onClick={() => supprimerCandidature(cand.id)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-200 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition shadow-sm"
                            title="Supprimer définitivement"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCandidature && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-gray-900">
                Dossier de candidature
              </h2>
              <button
                onClick={() => setSelectedCandidature(null)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-bold shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-white">
              <div className="flex flex-col md:flex-row items-center gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-50">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-gray-400 text-3xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                  {selectedCandidature.candidat.photo_profil ? (
                    <img
                      src={getMediaUrl(
                        selectedCandidature.candidat.photo_profil,
                      )}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="font-black text-gray-900 text-2xl uppercase tracking-tight">
                    {selectedCandidature.candidat.last_name}{" "}
                    {selectedCandidature.candidat.first_name}
                  </h3>
                  <p className="text-blue-600 font-bold mb-2">
                    {selectedCandidature.candidat.titre_professionnel ||
                      "Candidat"}
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start text-xs text-gray-600 font-bold mt-2">
                    <span>📧 {selectedCandidature.candidat.email}</span>
                    <span>
                      📞{" "}
                      {selectedCandidature.candidat.telephone ||
                        "Non renseigné"}
                    </span>
                  </div>

                  {/* LA PARTIE ADMINISTRATIVE AJOUTÉE */}
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded">
                      🛡️{" "}
                      {formatText(
                        selectedCandidature.candidat.service_militaire,
                      )}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded">
                      🚗{" "}
                      {selectedCandidature.candidat.permis_conduire
                        ? "Permis B"
                        : "Sans permis"}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded">
                      ✈️{" "}
                      {selectedCandidature.candidat.passeport_valide
                        ? "Passeport OK"
                        : "Pas de passeport"}
                    </span>
                  </div>
                </div>

                {selectedCandidature.statut === "EN_ATTENTE" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() =>
                        changerStatut(
                          selectedCandidature.id,
                          "ACCEPTEE",
                          selectedCandidature.candidat.first_name,
                        )
                      }
                      className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 font-black shadow-lg shadow-green-100 transition"
                    >
                      ACCEPTER
                    </button>
                    <button
                      onClick={() =>
                        changerStatut(
                          selectedCandidature.id,
                          "REFUSEE",
                          selectedCandidature.candidat.first_name,
                        )
                      }
                      className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-black shadow-lg shadow-red-100 transition"
                    >
                      REFUSER
                    </button>
                  </div>
                )}
                {selectedCandidature.statut !== "EN_ATTENTE" && (
                  <span
                    className={`text-xs font-black px-4 py-2 rounded-full border ${getBadgeStyle(selectedCandidature.statut)}`}
                  >
                    STATUT : {selectedCandidature.statut.replace("_", " ")}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Préférences
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Secteur
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      {formatText(
                        selectedCandidature.candidat.secteur_souhaite,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Prétentions
                    </p>
                    <p className="text-xs font-black text-blue-600">
                      {selectedCandidature.candidat.salaire_souhaite ||
                        "À discuter"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Mobilité
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      {formatText(selectedCandidature.candidat.mobilite)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Dispo
                    </p>
                    <p className="text-xs font-black text-gray-900">
                      {formatText(
                        selectedCandidature.candidat.situation_actuelle,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    CV au format PDF
                  </h4>
                  {selectedCandidature.candidat.cv_pdf ? (
                    <a
                      href={getMediaUrl(selectedCandidature.candidat.cv_pdf)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition shadow-lg"
                    >
                      📄 OUVRIR LE CV
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-gray-400">
                      Aucun CV joint
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Lettre de motivation
                  </h4>
                  {selectedCandidature.lettre_motivation_file ? (
                    <div className="mt-2">
                      <a
                        href={getMediaUrl(
                          selectedCandidature.lettre_motivation_file,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-black transition shadow-lg"
                      >
                        📁 OUVRIR LE FICHIER
                      </a>
                    </div>
                  ) : selectedCandidature.lettre_motivation ? (
                    <p className="text-xs text-gray-600 font-medium whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto pr-2">
                      {selectedCandidature.lettre_motivation}
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-gray-400">
                      Aucune lettre fournie.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                  Expériences Professionnelles
                </h4>
                {selectedCandidature.candidat.experiences &&
                selectedCandidature.candidat.experiences.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidature.candidat.experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="pl-4 border-l-2 border-blue-200"
                      >
                        <p className="font-black text-gray-800 text-sm">
                          {exp.titre_poste}{" "}
                          <span className="text-blue-600">
                            @ {exp.entreprise}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 mb-2 bg-white inline-block">
                          📅 {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">Non renseigné</p>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                  Formations
                </h4>
                {selectedCandidature.candidat.formations &&
                selectedCandidature.candidat.formations.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCandidature.candidat.formations.map((form) => (
                      <div
                        key={form.id}
                        className="pl-4 border-l-2 border-indigo-200"
                      >
                        <p className="font-black text-gray-800 text-sm">
                          {form.diplome}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 bg-white inline-block">
                          🎓 {form.etablissement} | 📅 {form.date_debut} —{" "}
                          {form.date_fin}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">Non renseigné</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Compétences
                  </h4>
                  {renderTags(selectedCandidature.candidat.competences)}
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Langues
                  </h4>
                  {renderTags(selectedCandidature.candidat.langues)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionOffre;
