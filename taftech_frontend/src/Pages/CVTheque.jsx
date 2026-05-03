import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../Services/jobsService";
import Select from "react-select";
import toast from "react-hot-toast";

// Les options de durée d'expérience (en années/mois) qui seront envoyées au Backend
const OPTIONS_EXPERIENCE = [
  { value: "0.5", label: "6 mois et +" },
  { value: "1", label: "1 an et +" },
  { value: "2", label: "2 ans et +" },
  { value: "3", label: "3 ans et +" },
  { value: "5", label: "5 ans et +" },
  { value: "10", label: "10 ans et +" },
];

const CVTheque = () => {
  const [candidats, setCandidats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });

  // États pour les filtres
  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [diplome, setDiplome] = useState("");
  const [experience, setExperience] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCandidats, setTotalCandidats] = useState(0);

  const [selectedCandidat, setSelectedCandidat] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const loadConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (err) {
        toast.error("Erreur de chargement des filtres.");
        console.error(err);
      }
    };
    loadConstants();
  }, []);

  const chargerCandidats = useCallback(async () => {
    // Si tous les filtres sont vides, on n'affiche rien et on remet l'écran d'accueil
    if (!search && !wilaya && !specialite && !diplome && !experience) {
      setCandidats([]);
      setTotalCandidats(0);
      setTotalPages(1);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setHasSearched(true);
    setLoading(true);
    try {
      const filtres = { search, wilaya, specialite, diplome, experience };
      const data = await jobsService.searchCVtheque(filtres, currentPage);

      setCandidats(data.results || []);
      setTotalCandidats(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));
    } catch (error) {
      if (error.error) toast.error(error.error);
      setCandidats([]);
    } finally {
      setLoading(false);
    }
  }, [search, wilaya, specialite, diplome, experience, currentPage]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      chargerCandidats();
    }, 400); // Déclenchement auto 400ms après la dernière modification
    return () => clearTimeout(delayDebounce);
  }, [chargerCandidats]);

  const handleReset = () => {
    setSearch("");
    setWilaya("");
    setSpecialite("");
    setDiplome("");
    setExperience("");
    setCurrentPage(1);
  };

  const getMediaUrl = (path) =>
    path
      ? path.startsWith("http")
        ? path
        : `http://127.0.0.1:8000${path}`
      : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            CVthèque Premium
          </h2>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">
            Trouvez le candidat idéal pour votre entreprise
          </p>
        </div>
        {hasSearched && (
          <button
            onClick={handleReset}
            className="text-sm font-bold text-gray-500 hover:text-blue-600 transition underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* --- MOTEUR DE RECHERCHE --- */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-4">
          <input
            type="text"
            placeholder="Rechercher un poste, une compétence (ex: Ingénieur, React...)"
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-blue-500 transition-colors"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div>
          <Select
            options={constants.wilayas}
            placeholder="Wilaya"
            isClearable
            value={constants.wilayas.find((w) => w.value === wilaya) || null}
            onChange={(val) => {
              setWilaya(val ? val.value : "");
              setCurrentPage(1);
            }}
            className="font-bold text-sm"
          />
        </div>
        <div>
          <Select
            options={constants.secteurs}
            placeholder="Spécialité"
            isClearable
            value={
              constants.secteurs.find((s) => s.value === specialite) || null
            }
            onChange={(val) => {
              setSpecialite(val ? val.value : "");
              setCurrentPage(1);
            }}
            className="font-bold text-sm"
          />
        </div>
        <div>
          <Select
            options={constants.diplomes}
            placeholder="Diplôme requis"
            isClearable
            value={constants.diplomes.find((d) => d.value === diplome) || null}
            onChange={(val) => {
              setDiplome(val ? val.value : "");
              setCurrentPage(1);
            }}
            className="font-bold text-sm"
          />
        </div>
        <div>
          <Select
            options={OPTIONS_EXPERIENCE}
            placeholder="Expérience min."
            isClearable
            value={
              OPTIONS_EXPERIENCE.find((e) => e.value === experience) || null
            }
            onChange={(val) => {
              setExperience(val ? val.value : "");
              setCurrentPage(1);
            }}
            className="font-bold text-sm"
          />
        </div>
      </div>

      {/* --- RÉSULTATS --- */}
      {!hasSearched ? (
        <div className="bg-white p-20 text-center rounded-[2rem] border border-gray-100 shadow-sm mt-8">
          <span className="text-6xl block mb-4">🔍</span>
          <p className="text-xl font-black text-gray-900 mb-2">
            Prêt à trouver votre perle rare ?
          </p>
          <p className="text-sm font-medium text-gray-500">
            Utilisez la barre de recherche ou les filtres ci-dessus pour
            explorer notre base de talents.
          </p>
        </div>
      ) : loading ? (
        <div className="p-20 text-center font-black text-blue-600 animate-pulse uppercase tracking-widest text-xs">
          Analyse des profils en cours...
        </div>
      ) : candidats.length === 0 ? (
        <div className="bg-white p-20 text-center rounded-[2rem] border border-gray-100 mt-8">
          <p className="text-xl font-black text-gray-900 mb-2">
            Aucun talent trouvé
          </p>
          <p className="text-sm font-medium text-gray-500">
            Essayez d'élargir vos critères de recherche.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {totalCandidats} résultat(s) trouvé(s)
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {candidats.map((candidat) => (
              <div
                key={candidat.email}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="flex gap-4 items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-gray-500 overflow-hidden border border-gray-200 shrink-0">
                    {candidat.photo_profil ? (
                      <img
                        src={getMediaUrl(candidat.photo_profil)}
                        alt="Profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl uppercase">
                        {candidat.last_name?.[0]}
                        {candidat.first_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-lg uppercase">
                      {candidat.last_name} {candidat.first_name}
                    </h3>
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-tight">
                      {candidat.titre_professionnel || "Profil Général"}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 mt-1 uppercase">
                      📍 {candidat.wilaya || "Localisation N/A"} | 🎓{" "}
                      {candidat.diplome || "Diplôme N/A"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Compétences clés
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidat.competences ? (
                      candidat.competences
                        .split(",")
                        .slice(0, 4)
                        .map((comp, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter"
                          >
                            {comp.trim()}
                          </span>
                        ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Non renseignées
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => setSelectedCandidat(candidat)}
                    className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-black transition"
                  >
                    Voir Profil Complet
                  </button>

                  {candidat.cv_pdf && (
                    <a
                      href={getMediaUrl(candidat.cv_pdf)}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition text-center flex items-center justify-center"
                    >
                      📄 CV
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- PAGINATION --- */}
      {totalPages > 1 && hasSearched && (
        <div className="flex justify-center items-center gap-4 py-4 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-black text-xs hover:bg-gray-50 disabled:opacity-30"
          >
            ← PRÉCÉDENT
          </button>
          <span className="font-black text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-black text-xs hover:bg-gray-50 disabled:opacity-30"
          >
            SUIVANT →
          </button>
        </div>
      )}

      {/* --- MODAL (POP-UP) DU PROFIL COMPLET --- */}
      {selectedCandidat && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
            {/* Header Modal */}
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-sm border border-gray-200">
                  {selectedCandidat.photo_profil ? (
                    <img
                      src={getMediaUrl(selectedCandidat.photo_profil)}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase">
                    {selectedCandidat.last_name} {selectedCandidat.first_name}
                  </h2>
                  <p className="text-blue-600 font-bold text-sm uppercase">
                    {selectedCandidat.titre_professionnel || "Candidat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidat(null)}
                className="text-gray-400 hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center transition font-black"
              >
                ✕
              </button>
            </div>

            {/* Infos Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <p className="font-bold text-sm text-gray-800">
                📧 {selectedCandidat.email}
              </p>
              <p className="font-bold text-sm text-gray-800">
                📞 {selectedCandidat.telephone || "Non renseigné"}
              </p>
              <p className="font-bold text-sm text-gray-800">
                📍 {selectedCandidat.wilaya}{" "}
                {selectedCandidat.commune && `- ${selectedCandidat.commune}`}
              </p>
              <p className="font-bold text-sm text-gray-800">
                🎓 {selectedCandidat.diplome || "Non défini"}
              </p>
            </div>

            {/* Expériences */}
            <div className="mb-8">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Expériences Professionnelles
              </h4>
              {selectedCandidat.experiences_detail &&
              selectedCandidat.experiences_detail.length > 0 ? (
                <div className="space-y-4">
                  {selectedCandidat.experiences_detail.map((exp) => (
                    <div
                      key={exp.id}
                      className="pl-4 border-l-2 border-blue-200"
                    >
                      <p className="font-black text-gray-800 text-sm uppercase">
                        {exp.titre_poste}{" "}
                        <span className="text-blue-600">
                          @ {exp.entreprise}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">
                        📅 {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                      </p>
                      <p className="text-xs text-gray-600 mt-2 font-medium">
                        {exp.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-gray-400">
                  Aucune expérience détaillée.
                </p>
              )}
            </div>

            {/* Formations */}
            <div className="mb-8">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Formations
              </h4>
              {selectedCandidat.formations_detail &&
              selectedCandidat.formations_detail.length > 0 ? (
                <div className="space-y-4">
                  {selectedCandidat.formations_detail.map((form) => (
                    <div
                      key={form.id}
                      className="pl-4 border-l-2 border-indigo-200"
                    >
                      <p className="font-black text-gray-800 text-sm uppercase">
                        {form.diplome}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">
                        🎓 {form.etablissement} | 📅 {form.date_debut} —{" "}
                        {form.date_fin}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-gray-400">
                  Aucune formation détaillée.
                </p>
              )}
            </div>

            {/* Compétences et langues */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Compétences
                </h4>
                <p className="text-sm font-bold text-gray-700">
                  {selectedCandidat.competences || "Non renseignées"}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Langues
                </h4>
                <p className="text-sm font-bold text-gray-700">
                  {selectedCandidat.langues || "Non renseignées"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVTheque;
