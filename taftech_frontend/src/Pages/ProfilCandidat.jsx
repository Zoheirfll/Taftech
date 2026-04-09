import React, { useState, useEffect } from "react";
import { profilService } from "../Services/profilService";

const ProfilCandidat = () => {
  const [profil, setProfil] = useState({
    titre_professionnel: "",
    cv_pdf: null,
  });
  const [fichier, setFichier] = useState(null); // Stocke le PDF sélectionné
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const data = await profilService.getProfil();
        setProfil(data);
      } catch (err) {
        console.error("Erreur de chargement", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfil();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    // CRUCIAL : Pour envoyer un fichier, on doit utiliser l'objet FormData
    const formData = new FormData();

    if (profil.titre_professionnel) {
      formData.append("titre_professionnel", profil.titre_professionnel);
    }
    // Si l'utilisateur a sélectionné un nouveau fichier, on l'ajoute au colis
    if (fichier) {
      formData.append("cv_pdf", fichier);
    }

    try {
      const data = await profilService.updateProfil(formData);
      setStatus({
        type: "success",
        message: "Profil et CV enregistrés avec succès !",
      });
      setProfil(data.profil); // Met à jour l'affichage avec le nouveau lien
      setFichier(null); // On vide le champ fichier
    } catch (error) {
      setStatus({
        type: "error",
        message: "Erreur lors de l'enregistrement.",
        error,
      });
    }
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold text-blue-600">
        Chargement de votre profil...
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto p-8 mt-10 bg-white rounded-xl shadow-md border-t-4 border-blue-600">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
        Mon Profil Candidat
      </h2>

      {status.message && (
        <div
          className={`p-4 rounded-md mb-6 font-medium ${status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titre Professionnel
          </label>
          <input
            type="text"
            placeholder="Ex: Développeur React, Comptable..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={profil.titre_professionnel || ""}
            onChange={(e) =>
              setProfil({ ...profil, titre_professionnel: e.target.value })
            }
          />
        </div>

        <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Mon CV (Format PDF)
          </label>

          {/* Affichage du CV existant s'il y en a un */}
          {profil.cv_pdf && (
            <div className="mb-4 text-sm bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
              <span className="text-gray-600 font-medium">
                CV actuel en ligne
              </span>
              <a
                href={`http://127.0.0.1:8000${profil.cv_pdf}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-bold hover:underline"
              >
                Voir le PDF
              </a>
            </div>
          )}

          <input
            type="file"
            accept=".pdf"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition"
            onChange={(e) => setFichier(e.target.files[0])}
          />
          <p className="text-xs text-gray-400 mt-2">
            Sélectionnez un fichier pour remplacer l'ancien.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200"
        >
          Enregistrer mon profil
        </button>
      </form>
    </div>
  );
};

export default ProfilCandidat;
