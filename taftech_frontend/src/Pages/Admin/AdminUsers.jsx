import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const chargerUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminUsers(currentPage, searchTerm);

      if (data.results) {
        setUsers(data.results);
        setTotalPages(Math.ceil(data.count / 5));
      } else {
        setUsers(data);
      }
    } catch (err) {
      toast.error("Erreur de chargement des utilisateurs.");
      reportError("ECHEC_CHARGEMENT_USERS_ADMIN", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      chargerUsers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [chargerUsers]);

  const handleToggleBlock = async (id, isActif) => {
    const action = isActif ? "bloquer" : "débloquer";
    if (window.confirm(`Voulez-vous vraiment ${action} cet utilisateur ?`)) {
      try {
        await jobsService.moderateUser(id);
        chargerUsers();
        toast.success(
          isActif
            ? "Utilisateur bloqué."
            : "Utilisateur débloqué avec succès !",
        );
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser({ ...selectedUser, is_active: !isActif });
        }
      } catch (err) {
        toast.error("Erreur lors de la modification du statut.");
        reportError("ECHEC_MODERATION_USER", err);
      }
    }
  };

  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier en cours...");
    try {
      const blob = await jobsService.exportUtilisateurs();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "utilisateurs_taftech.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error("Erreur lors de l'exportation.");
      reportError("ECHEC_EXPORT_EXCEL_USERS", err);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const getMediaUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `http://127.0.0.1:8000${path}`;
  };

  const renderTags = (data) => {
    if (!data)
      return (
        <span className="text-gray-400 italic text-xs">Non renseigné</span>
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Utilisateurs Inscrits
          </h2>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">
            Gestion de la communauté
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          <button
            onClick={handleExport}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-black px-6 py-3 rounded-[1.5rem] hover:bg-green-700 hover:-translate-y-1 transition-all shadow-md text-sm"
          >
            📊 EXPORTER EXCEL
          </button>

          <div className="relative group w-full md:w-auto">
            <input
              type="text"
              placeholder="Chercher nom ou email..."
              className="w-full md:w-80 p-4 pl-12 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
              <th className="p-6">Identité</th>
              <th className="p-6">Rôle</th>
              <th className="p-6">Inscription</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && users.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="p-20 text-center font-black text-blue-600 animate-pulse uppercase text-xs"
                >
                  Synchronisation...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50/50 transition ${!user.is_active ? "bg-red-50/30" : ""}`}
                >
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-sm border border-white">
                        {user.profil_candidat?.photo_profil ? (
                          <img
                            src={getMediaUrl(user.profil_candidat.photo_profil)}
                            alt="Profil"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs uppercase">
                            {user.first_name?.[0]}
                            {user.last_name?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 uppercase text-sm">
                          {user.last_name} {user.first_name}
                        </p>
                        <p className="text-[10px] text-blue-500 font-bold mt-1">
                          ✉️ {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.role === "CANDIDAT" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-6 text-xs text-gray-500 font-bold">
                    {new Date(user.date_joined).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-6 text-right space-x-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl font-black text-[10px] transition"
                    >
                      INSPECTER
                    </button>
                    <button
                      onClick={() => handleToggleBlock(user.id, user.is_active)}
                      className={`px-4 py-2 rounded-xl font-black text-[10px] transition ${user.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-600 text-white shadow-md hover:bg-green-700"}`}
                    >
                      {user.is_active ? "BLOQUER" : "DÉBLOQUER"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="p-20 text-center text-gray-400 font-bold italic"
                >
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-6 py-2 font-black text-xs rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-30 transition shadow-sm"
          >
            ← PRÉCÉDENT
          </button>
          <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-lg uppercase tracking-widest">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages || loading}
            className="px-6 py-2 font-black text-xs rounded-xl bg-white border border-gray-200 text-gray-700 disabled:opacity-30 transition shadow-sm"
          >
            SUIVANT →
          </button>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 overflow-hidden shadow-sm border border-gray-200">
                  {selectedUser.profil_candidat?.photo_profil ? (
                    <img
                      src={getMediaUrl(
                        selectedUser.profil_candidat.photo_profil,
                      )}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase">
                    {selectedUser.last_name} {selectedUser.first_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-gray-500 font-bold text-sm">
                      @{selectedUser.username}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${selectedUser.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {selectedUser.is_active ? "ACTIF" : "BLOQUÉ"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center transition font-black"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">
                  Contact & Compte
                </p>
                <p className="font-bold text-sm text-gray-800 mt-1">
                  📧 {selectedUser.email}
                </p>
                <p className="font-bold text-sm text-gray-800 mt-1">
                  📞 {selectedUser.telephone || "Non renseigné"}
                </p>
                <p className="font-bold text-sm text-blue-600 mt-1 uppercase text-xs">
                  Rôle : {selectedUser.role}
                </p>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">
                  Légal & Identité
                </p>
                <p className="font-bold text-sm text-gray-800 mt-1">
                  NIN :{" "}
                  <span className="font-mono">
                    {selectedUser.nin || "Non renseigné"}
                  </span>
                </p>
                <p className="font-bold text-sm text-gray-800 mt-1">
                  Né(e) le : {selectedUser.date_naissance || "Non renseigné"}
                </p>
                <p className="text-[10px] mt-2 font-black text-green-700 bg-green-50 inline-block px-2 py-1 rounded uppercase tracking-tighter">
                  {selectedUser.consentement_loi_18_07
                    ? "✅ Loi 18-07 Acceptée"
                    : "❌ Loi 18-07 Non Acceptée"}
                </p>
              </div>
            </div>

            {selectedUser.role === "CANDIDAT" &&
              selectedUser.profil_candidat && (
                <div className="space-y-8">
                  <h3 className="font-black text-xl text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-tight">
                    Dossier Candidat Complet
                  </h3>

                  <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-50 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                        Titre Professionnel
                      </p>
                      <p className="font-black text-blue-700 text-lg uppercase">
                        {selectedUser.profil_candidat.titre_professionnel ||
                          "Non défini"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                        Diplôme Principal & Localisation
                      </p>
                      <p className="font-black text-blue-700 text-sm uppercase">
                        {selectedUser.profil_candidat.diplome || "Non défini"}{" "}
                        {selectedUser.profil_candidat.specialite &&
                          `(${selectedUser.profil_candidat.specialite})`}
                      </p>
                      <p className="text-xs text-blue-600 mt-1 font-bold uppercase">
                        📍 {selectedUser.profil_candidat.wilaya || "Wilaya N/A"}{" "}
                        {selectedUser.profil_candidat.commune
                          ? `- ${selectedUser.profil_candidat.commune}`
                          : ""}
                      </p>
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-3 pt-4 border-t border-blue-100">
                      <span className="bg-white border border-blue-100 text-gray-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                        🛡️ Militaire :{" "}
                        {selectedUser.profil_candidat.service_militaire?.replace(
                          /_/g,
                          " ",
                        ) || "N/A"}
                      </span>
                      <span className="bg-white border border-blue-100 text-gray-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                        🚗 Permis :{" "}
                        {selectedUser.profil_candidat.permis_conduire
                          ? "Oui"
                          : "Non"}
                      </span>
                      <span className="bg-white border border-blue-100 text-gray-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest">
                        ✈️ Passeport :{" "}
                        {selectedUser.profil_candidat.passeport_valide
                          ? "Valide"
                          : "Non"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      Préférences de recherche
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 p-4 rounded-xl">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Secteur
                        </p>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">
                          {selectedUser.profil_candidat.secteur_souhaite?.replace(
                            /_/g,
                            " ",
                          ) || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Salaire
                        </p>
                        <p className="text-xs font-black text-blue-600">
                          {selectedUser.profil_candidat.salaire_souhaite ||
                            "À discuter"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Mobilité
                        </p>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">
                          {selectedUser.profil_candidat.mobilite?.replace(
                            /_/g,
                            " ",
                          ) || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Statut Actuel
                        </p>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">
                          {selectedUser.profil_candidat.situation_actuelle?.replace(
                            /_/g,
                            " ",
                          ) || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                      Expériences Professionnelles
                    </h4>
                    {selectedUser.profil_candidat.experiences_detail &&
                    selectedUser.profil_candidat.experiences_detail.length >
                      0 ? (
                      <div className="space-y-4">
                        {selectedUser.profil_candidat.experiences_detail.map(
                          (exp) => (
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
                                📅 {exp.date_debut} —{" "}
                                {exp.date_fin || "Aujourd'hui"}
                              </p>
                              <p className="text-xs text-gray-600 mt-2 font-medium">
                                {exp.description}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-xs italic text-gray-400">
                        Aucune expérience structurée.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                      Formations
                    </h4>
                    {selectedUser.profil_candidat.formations_detail &&
                    selectedUser.profil_candidat.formations_detail.length >
                      0 ? (
                      <div className="space-y-4">
                        {selectedUser.profil_candidat.formations_detail.map(
                          (form) => (
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
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-xs italic text-gray-400">
                        Aucune formation structurée.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                        Compétences
                      </h4>
                      {renderTags(selectedUser.profil_candidat.competences)}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                        Langues
                      </h4>
                      {renderTags(selectedUser.profil_candidat.langues)}
                    </div>
                  </div>

                  {selectedUser.profil_candidat.cv_pdf && (
                    <div className="text-center pt-4">
                      <a
                        href={getMediaUrl(selectedUser.profil_candidat.cv_pdf)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-xl shadow-gray-200 hover:-translate-y-1"
                      >
                        📄 TÉLÉCHARGER LE CV PDF
                      </a>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
