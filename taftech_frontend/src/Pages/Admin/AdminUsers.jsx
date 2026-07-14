import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { Search, Download, X } from "lucide-react";

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
      } else setUsers(data);
    } catch (err) {
      toast.error("Erreur de chargement.");
      reportError("ECHEC_CHARGEMENT_USERS_ADMIN", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    const delay = setTimeout(() => chargerUsers(), 300);
    return () => clearTimeout(delay);
  }, [chargerUsers]);

  const handleToggleBlock = async (id, isActif) => {
    if (
      window.confirm(
        `Voulez-vous vraiment ${isActif ? "bloquer" : "débloquer"} cet utilisateur ?`,
      )
    ) {
      try {
        await jobsService.moderateUser(id);
        chargerUsers();
        toast.success(
          isActif ? "Utilisateur bloqué." : "Utilisateur débloqué !",
        );
        if (selectedUser?.id === id)
          setSelectedUser({ ...selectedUser, is_active: !isActif });
      } catch (err) {
        toast.error("Erreur lors de la modification.");
        reportError("ECHEC_MODERATION_USER", err);
      }
    }
  };

  const handleExport = async () => {
    const toastId = toast.loading("Génération du fichier...");
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


  const renderTags = (data) => {
    if (!data)
      return (
        <span className="text-slate-400 italic text-xs">Non renseigné</span>
      );
    return (
      <div className="flex flex-wrap gap-1.5">
        {data
          .split(",")
          .filter((i) => i)
          .map((item, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
            >
              {item.trim()}
            </span>
          ))}
      </div>
    );
  };

  const formatField = (str) => str?.replace(/_/g, " ") || "N/A";

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Utilisateurs inscrits
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestion de la communauté TAFTECH.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download size={15} /> Exporter
          </button>
          <div className="relative flex-1 md:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Nom ou email..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <th className="px-5 py-3">Identité</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">Inscription</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && users.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="py-12 text-center text-sm text-indigo-600 animate-pulse font-medium"
                >
                  Chargement...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="py-12 text-center text-sm text-slate-400 italic"
                >
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-slate-50 transition-colors ${!user.is_active ? "bg-red-50/30" : ""}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden flex-shrink-0 border border-white shadow-sm">
                        {user.profil_candidat?.photo_profil ? (
                          <img
                            src={mediaUrl(user.profil_candidat.photo_profil)}
                            alt="Profil"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold">
                            {user.first_name?.[0]}
                            {user.last_name?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {user.last_name} {user.first_name}
                        </p>
                        <p className="text-xs text-indigo-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${user.role === "CANDIDAT" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500 font-medium">
                    {new Date(user.date_joined).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Inspecter
                      </button>
                      <button
                        onClick={() =>
                          handleToggleBlock(user.id, user.is_active)
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${user.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                      >
                        {user.is_active ? "Bloquer" : "Débloquer"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-xs font-medium text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                  {selectedUser.profil_candidat?.photo_profil ? (
                    <img
                      src={mediaUrl(
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
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedUser.last_name} {selectedUser.first_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-500">
                      @{selectedUser.username}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${selectedUser.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {selectedUser.is_active ? "Actif" : "Bloqué"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Contact & Compte
                </p>
                <p className="text-sm text-slate-800 font-medium">
                  📧 {selectedUser.email}
                </p>
                <p className="text-sm text-slate-800 font-medium mt-1">
                  📞 {selectedUser.telephone || "Non renseigné"}
                </p>
                <p className="text-xs text-indigo-600 font-semibold mt-1 uppercase">
                  {selectedUser.role}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Légal & Identité
                </p>
                <p className="text-sm text-slate-800 font-medium font-mono">
                  NIN: {selectedUser.nin || "N/A"}
                </p>
                <p className="text-sm text-slate-800 font-medium mt-1">
                  Adresse : {selectedUser.profil_candidat?.adresse || "N/A"}
                </p>
                <p className="text-sm text-slate-800 font-medium mt-1">
                  Né(e) le : {selectedUser.date_naissance || "N/A"}
                </p>
                <span
                  className={`inline-block mt-2 text-[10px] font-semibold px-2 py-1 rounded-full ${selectedUser.consentement_loi_18_07 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                >
                  {selectedUser.consentement_loi_18_07
                    ? "✅ Loi 18-07 acceptée"
                    : "❌ Loi 18-07 non acceptée"}
                </span>
              </div>
            </div>

            {selectedUser.role === "CANDIDAT" &&
              selectedUser.profil_candidat && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Dossier candidat
                  </h3>

                  <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                        Titre
                      </p>
                      <p className="text-sm font-bold text-indigo-800 mt-1">
                        {selectedUser.profil_candidat.titre_professionnel ||
                          "Non défini"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                        Diplôme & Localisation
                      </p>
                      <p className="text-sm font-bold text-indigo-800 mt-1">
                        {selectedUser.profil_candidat.diplome || "N/A"}
                      </p>
                      <p className="text-xs text-indigo-600 mt-0.5">
                        📍 {selectedUser.profil_candidat.wilaya || "N/A"}
                        {selectedUser.profil_candidat.commune
                          ? ` · ${selectedUser.profil_candidat.commune}`
                          : ""}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-2 pt-3 border-t border-indigo-100">
                      {[
                        {
                          label: `Militaire: ${formatField(selectedUser.profil_candidat.service_militaire)}`,
                        },
                        {
                          label: `Permis: ${selectedUser.profil_candidat.permis_conduire ? "Oui" : "Non"}`,
                        },
                        {
                          label: `Passeport: ${selectedUser.profil_candidat.passeport_valide ? "Valide" : "Non"}`,
                        },
                      ].map(({ label }) => (
                        <span
                          key={label}
                          className="text-[10px] font-medium px-2.5 py-1 bg-white border border-indigo-100 rounded-lg text-slate-700"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Préférences
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Secteur",
                          value: formatField(
                            selectedUser.profil_candidat.secteur_souhaite,
                          ),
                        },
                        {
                          label: "Salaire",
                          value:
                            selectedUser.profil_candidat.salaire_souhaite ||
                            "À discuter",
                        },
                        {
                          label: "Mobilité",
                          value: formatField(
                            selectedUser.profil_candidat.mobilite,
                          ),
                        },
                        {
                          label: "Statut",
                          value: formatField(
                            selectedUser.profil_candidat.situation_actuelle,
                          ),
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="bg-slate-50 p-3 rounded-lg border border-slate-100"
                        >
                          <p className="text-[10px] font-semibold text-slate-400 uppercase">
                            {label}
                          </p>
                          <p className="text-xs font-semibold text-slate-800 mt-1">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedUser.profil_candidat.experiences_detail?.length >
                    0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Expériences
                      </p>
                      <div className="space-y-3">
                        {selectedUser.profil_candidat.experiences_detail.map(
                          (exp) => (
                            <div
                              key={exp.id}
                              className="pl-4 border-l-2 border-indigo-100"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {exp.titre_poste}{" "}
                                <span className="text-indigo-600">
                                  @ {exp.entreprise}
                                </span>
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {exp.date_debut} —{" "}
                                {exp.date_fin || "Aujourd'hui"}
                              </p>
                              {exp.description && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {selectedUser.profil_candidat.formations_detail?.length >
                    0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Formations
                      </p>
                      <div className="space-y-3">
                        {selectedUser.profil_candidat.formations_detail.map(
                          (form) => (
                            <div
                              key={form.id}
                              className="pl-4 border-l-2 border-slate-200"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {form.diplome}
                              </p>
                              <p className="text-xs text-slate-500">
                                {form.etablissement} · {form.date_debut} —{" "}
                                {form.date_fin}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Compétences
                      </p>
                      {renderTags(selectedUser.profil_candidat.competences)}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Langues
                      </p>
                      {renderTags(selectedUser.profil_candidat.langues)}
                    </div>
                  </div>

                  {selectedUser.profil_candidat.cv_pdf && (
                    <div className="text-center pt-2">
                      <a
                        href={mediaUrl(selectedUser.profil_candidat.cv_pdf)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors shadow-sm"
                      >
                        📄 Télécharger le CV PDF
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
