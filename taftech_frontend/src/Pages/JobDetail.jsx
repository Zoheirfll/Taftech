import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { jobsService } from "../Services/jobsService";
import { authService } from "../Services/authService";
import toast from "react-hot-toast";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postulerStatus, setPostulerStatus] = useState("");

  // 👇 NOUVEL ÉTAT POUR EMPÊCHER LE DOUBLE ENVOI 👇
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Option 1 : TafTech
  const [lettreMotivation, setLettreMotivation] = useState("");

  // Option 2 : Rapide
  const [postulationMode, setPostulationMode] = useState(null); // 'taftech' | 'rapide' | null
  const [fastForm, setFastForm] = useState({
    nom_rapide: "",
    prenom_rapide: "",
    email_rapide: "",
    telephone_rapide: "",
    cv_rapide: null,
    lettre_motivation: "",
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await jobsService.getJobById(id);
        setJob(data);
      } catch (err) {
        setError("Offre introuvable ou retirée.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  // === OPTION 1 : VIA TAFTECH ===
  const handlePostulerTafTech = async () => {
    // Si on est déjà en train d'envoyer, on bloque !
    if (isSubmitting) return;

    if (
      !authService.isAuthenticated() ||
      authService.getUserRole() !== "CANDIDAT"
    ) {
      toast.error(
        "Vous devez être connecté en tant que candidat pour utiliser votre profil TafTech.",
      );
      navigate("/login");
      return;
    }

    setIsSubmitting(true); // On bloque le bouton

    try {
      await jobsService.postuler(id, { lettre_motivation: lettreMotivation });
      setPostulerStatus("success");
    } catch (err) {
      setPostulerStatus("error");
      toast.error(
        err.response?.data?.error || "Erreur lors de la postulation.",
      );
    } finally {
      setIsSubmitting(false); // On débloque le bouton quoi qu'il arrive
    }
  };

  const handleReviewClick = () => {
    if (
      !authService.isAuthenticated() ||
      authService.getUserRole() !== "CANDIDAT"
    ) {
      toast.error("Connectez-vous pour voir votre profil.");
      navigate("/login");
      return;
    }
    navigate(`/jobs/${id}/postuler`);
  };

  // === OPTION 2 : POSTULATION RAPIDE ===
  const handleFastFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "cv_rapide") {
      setFastForm({ ...fastForm, cv_rapide: files[0] });
    } else {
      setFastForm({ ...fastForm, [name]: value });
    }
  };

  const handlePostulerRapide = async (e) => {
    e.preventDefault();

    // Si on est déjà en train d'envoyer, on bloque !
    if (isSubmitting) return;

    if (!fastForm.cv_rapide) {
      toast.error("Veuillez joindre votre CV en format PDF ou Word.");
      return;
    }

    setIsSubmitting(true); // On bloque le bouton
    const toastId = toast.loading("Envoi de votre candidature rapide...");
    const formData = new FormData();
    Object.keys(fastForm).forEach((key) => {
      if (fastForm[key] !== null && fastForm[key] !== "") {
        formData.append(key, fastForm[key]);
      }
    });

    try {
      await jobsService.postulerRapide(id, formData);
      setPostulerStatus("success");
      toast.success("Candidature envoyée !", { id: toastId });
    } catch (err) {
      setPostulerStatus("error");
      toast.error(
        err.response?.data?.error ||
          "Erreur lors de l'envoi de la candidature.",
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false); // On débloque le bouton
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold text-blue-600 animate-pulse">
          Chargement de l'annonce...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-2xl text-red-600 font-black mb-4">😕 {error}</div>
        <Link to="/offres" className="text-blue-600 font-bold hover:underline">
          Retourner aux offres
        </Link>
      </div>
    );

  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 mt-6 font-sans">
      <Link
        to="/offres"
        className="text-blue-600 font-bold hover:underline mb-6 inline-flex items-center gap-2 transition hover:-translate-x-1"
      >
        ← Retour aux offres
      </Link>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* EN-TÊTE DE L'OFFRE */}
        <div className="bg-blue-600 p-8 md:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h1 className="text-3xl md:text-4xl font-black mb-4 relative z-10">
            {job.titre}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm font-bold mt-4 relative z-10">
            {job.entreprise ? (
              <Link
                to={`/entreprise/${job.entreprise.id}`}
                className="bg-white text-blue-800 px-4 py-1.5 rounded-full shadow-sm hover:bg-gray-100 hover:scale-105 transition-all cursor-pointer inline-block"
                title="Voir le profil de l'entreprise"
              >
                🏢 {job.entreprise.nom_entreprise}
              </Link>
            ) : (
              <span className="bg-white text-blue-800 px-4 py-1.5 rounded-full shadow-sm">
                🏢 Entreprise Anonyme
              </span>
            )}

            <span className="bg-blue-500 bg-opacity-50 px-4 py-1.5 rounded-full border border-blue-400">
              📍 {job.wilaya} {job.commune ? `- ${job.commune}` : ""}
            </span>
            <span className="bg-blue-500 bg-opacity-50 px-4 py-1.5 rounded-full border border-blue-400">
              📅 Publié le{" "}
              {new Date(job.date_publication).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-10">
          {/* ENCADRÉ DES CRITÈRES */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-6">
            {job.type_contrat && (
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Contrat
                </span>
                <span className="font-black text-gray-800">
                  {job.type_contrat}
                </span>
              </div>
            )}
            {job.experience_requise && (
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Expérience
                </span>
                <span className="font-black text-gray-800">
                  {job.experience_requise}
                </span>
              </div>
            )}
            {job.diplome && (
              <div>
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Diplôme requis
                </span>
                <span className="font-black text-gray-800">{job.diplome}</span>
              </div>
            )}
            {job.specialite && (
              <div className="col-span-2 md:col-span-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Spécialité
                </span>
                <span className="font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md inline-block mt-1">
                  {job.specialite}
                </span>
              </div>
            )}
            {job.salaire_propose && (
              <div className="col-span-2 md:col-span-1">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Salaire
                </span>
                <span className="font-black text-green-600">
                  {job.salaire_propose}
                </span>
              </div>
            )}
          </div>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span>{" "}
              Description du poste
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed font-medium">
              {job.description || "Aucune description globale fournie."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>{" "}
              Missions principales
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed font-medium">
              {job.missions || "Aucune mission détaillée."}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-600 rounded-full"></span>{" "}
              Profil recherché
            </h2>
            <p className="text-gray-600 whitespace-pre-line leading-relaxed font-medium">
              {job.profil_recherche || "Aucun profil spécifique renseigné."}
            </p>
          </section>

          {/* ========================================= */}
          {/* ZONE DE POSTULATION (LES 2 OPTIONS)       */}
          {/* ========================================= */}
          <div className="mt-12 bg-gray-50 p-8 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden">
            {/* ETAT : SUCCÈS OU ERREUR */}
            {postulerStatus === "success" ? (
              <div className="animate-slideDown text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  ✅
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-2">
                  Candidature envoyée !
                </h3>
                <p className="text-gray-500 font-medium">
                  Le recruteur a bien reçu votre profil. Bonne chance !
                </p>
              </div>
            ) : postulerStatus === "error" ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  ⚠️
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-2">
                  Oups...
                </h3>
                <p className="text-gray-500 font-medium mb-6">
                  Vous avez déjà postulé à cette offre, ou une erreur est
                  survenue.
                </p>
                <button
                  onClick={() => {
                    setPostulerStatus("");
                    setPostulationMode(null);
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              /* ÉTAT : CHOIX DU MODE DE POSTULATION */
              <div className="max-w-2xl mx-auto">
                <h3 className="font-black text-2xl text-gray-900 mb-6 text-center">
                  Prêt(e) à relever le défi ?
                </h3>

                {/* Écran 0 : Choix de l'option */}
                {!postulationMode && (
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setPostulationMode("taftech")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-8 rounded-2xl transition duration-200 text-lg shadow-xl hover:-translate-y-1"
                    >
                      🚀 Postuler avec mon profil TafTech
                      <p className="text-xs text-blue-200 font-medium mt-1">
                        Recommandé pour être analysé par notre IA de matching
                      </p>
                    </button>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-gray-300"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-400 font-bold text-sm uppercase">
                        OU
                      </span>
                      <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <button
                      onClick={() => setPostulationMode("rapide")}
                      className="w-full bg-gray-900 hover:bg-black text-white font-black py-5 px-8 rounded-2xl transition duration-200 text-lg shadow-xl hover:-translate-y-1"
                    >
                      ⚡ Postulation Rapide (Sans compte)
                      <p className="text-xs text-gray-400 font-medium mt-1">
                        Envoyez juste votre CV en quelques secondes
                      </p>
                    </button>
                  </div>
                )}

                {/* Écran 1 : Postuler via TafTech (Connecté) */}
                {postulationMode === "taftech" && (
                  <div className="animate-fadeIn">
                    <button
                      onClick={() => setPostulationMode(null)}
                      className="text-gray-400 hover:text-gray-900 font-bold text-sm mb-4 inline-block"
                    >
                      ← Changer d'option
                    </button>
                    <p className="text-gray-500 font-medium mb-6">
                      Les recruteurs auront accès à votre CV enregistré et à vos
                      compétences détaillées.
                    </p>
                    <textarea
                      value={lettreMotivation}
                      onChange={(e) => setLettreMotivation(e.target.value)}
                      placeholder="Rédigez une courte lettre de motivation (Optionnelle)..."
                      className="w-full p-4 mb-6 bg-white border border-gray-200 rounded-2xl focus:border-blue-500 outline-none resize-none font-medium text-gray-700 shadow-sm"
                      rows="4"
                    ></textarea>

                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                      <button
                        onClick={handlePostulerTafTech}
                        disabled={isSubmitting} // 👇 ON DÉSACTIVE ICI 👇
                        className={`text-white font-black py-4 px-8 rounded-2xl transition duration-200 text-lg shadow-xl w-full md:w-auto ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1"
                        }`}
                      >
                        {isSubmitting
                          ? "Envoi en cours..."
                          : "Envoyer ma candidature"}
                      </button>
                      <button
                        onClick={handleReviewClick}
                        disabled={isSubmitting} // 👇 ET ICI AUSSI 👇
                        className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-black py-4 px-8 rounded-2xl transition duration-200 text-lg shadow-sm hover:-translate-y-1 w-full md:w-auto flex items-center justify-center gap-2"
                      >
                        👁️ Vérifier mon profil
                      </button>
                    </div>
                  </div>
                )}

                {/* Écran 2 : Postulation Rapide (Visiteur) */}
                {postulationMode === "rapide" && (
                  <div className="animate-fadeIn text-left">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-gray-900 text-xl">
                        Postulation Rapide
                      </h4>
                      <button
                        onClick={() => setPostulationMode(null)}
                        className="text-gray-400 hover:text-red-500 font-black text-xl"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handlePostulerRapide} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2">
                            Nom *
                          </label>
                          <input
                            type="text"
                            name="nom_rapide"
                            required
                            onChange={handleFastFormChange}
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2">
                            Prénom *
                          </label>
                          <input
                            type="text"
                            name="prenom_rapide"
                            required
                            onChange={handleFastFormChange}
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-gray-900"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="email_rapide"
                            required
                            onChange={handleFastFormChange}
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2">
                            Téléphone *
                          </label>
                          <input
                            type="tel"
                            name="telephone_rapide"
                            required
                            onChange={handleFastFormChange}
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-gray-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-2">
                          Votre CV (PDF, DOC) *
                        </label>
                        <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center bg-white hover:border-gray-800 transition-colors relative cursor-pointer group">
                          <input
                            type="file"
                            name="cv_rapide"
                            accept=".pdf,.doc,.docx"
                            required
                            onChange={handleFastFormChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">
                            📄
                          </span>
                          <p className="text-sm font-bold text-gray-700">
                            {fastForm.cv_rapide
                              ? fastForm.cv_rapide.name
                              : "Cliquez ou glissez votre CV ici"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-2">
                          Lettre de motivation (Optionnelle)
                        </label>
                        <textarea
                          name="lettre_motivation"
                          onChange={handleFastFormChange}
                          rows="3"
                          className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium text-sm outline-none focus:border-gray-900"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting} // 👇 ET DÉSACTIVÉ ICI POUR LE RAPIDE 👇
                        className={`w-full text-white font-black py-4 rounded-xl transition duration-200 text-lg shadow-xl ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-gray-900 hover:bg-black hover:-translate-y-1"
                        }`}
                      >
                        {isSubmitting
                          ? "Envoi en cours..."
                          : "Envoyer ma candidature rapide"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
