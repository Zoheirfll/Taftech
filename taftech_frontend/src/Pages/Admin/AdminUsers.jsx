import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast"; // <-- IMPORT DU TOAST

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    chargerUsers();
  }, []);

  const chargerUsers = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getAdminUsers();
      setUsers(data);
    } catch (err) {
      toast.error("Erreur de chargement des utilisateurs.", err); // <-- TOAST ERROR
    } finally {
      setLoading(false);
    }
  };

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
        ); // <-- TOAST SUCCESS
      } catch (err) {
        toast.error(
          "Erreur lors de la modification du statut de l'utilisateur.",
          err,
        ); // <-- TOAST ERROR
      }
    }
  };

  if (loading)
    return (
      <div className="text-center p-20 font-bold animate-pulse text-blue-600">
        Chargement...
      </div>
    );

  return (
    <div>
      <h2 className="text-3xl font-black text-gray-900 mb-8">
        Utilisateurs Inscrits
      </h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs text-gray-400 uppercase tracking-widest">
              <th className="p-6">Identité</th>
              <th className="p-6">Rôle</th>
              <th className="p-6">Inscription</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-gray-50 transition ${!user.is_active ? "bg-red-50/50" : ""}`}
              >
                <td className="p-6">
                  <p className="font-black text-gray-900">
                    {user.last_name} {user.first_name}
                  </p>
                  <p className="text-xs text-gray-500 font-bold mt-1">
                    ✉️ {user.email}
                  </p>
                </td>
                <td className="p-6">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${user.role === "CANDIDAT" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-6 text-sm text-gray-500 font-medium">
                  {new Date(user.date_joined).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-6 text-right space-x-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-xs"
                  >
                    👁️ Voir
                  </button>
                  <button
                    onClick={() => handleToggleBlock(user.id, user.is_active)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs ${user.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-500 text-white"}`}
                  >
                    {user.is_active ? "Bloquer" : "Débloquer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FENÊTRE DE DÉTAILS COMPLETS DE L'UTILISATEUR */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {selectedUser.last_name} {selectedUser.first_name}
                </h2>
                <p className="text-blue-600 font-bold">
                  @{selectedUser.username} | {selectedUser.role}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-red-500 text-2xl font-black"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Contact
                </p>
                <p className="font-medium mt-1">📧 {selectedUser.email}</p>
                <p className="font-medium">
                  📞 {selectedUser.telephone || "Non renseigné"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border">
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Légal & Identité
                </p>
                <p className="font-medium mt-1">
                  NIN : {selectedUser.nin || "Non renseigné"}
                </p>
                <p className="font-medium">
                  Né(e) le : {selectedUser.date_naissance || "Non renseigné"}
                </p>
                <p className="text-xs mt-2 font-bold text-green-700">
                  {selectedUser.consentement_loi_18_07
                    ? "✅ Loi 18-07 Acceptée"
                    : "❌ Loi 18-07 Non Acceptée"}
                </p>
              </div>
            </div>

            {selectedUser.role === "CANDIDAT" &&
              selectedUser.profil_candidat && (
                <div className="space-y-4">
                  <h3 className="font-black text-lg text-gray-800 border-b pb-2">
                    Dossier Candidat
                  </h3>
                  <p>
                    <strong>Titre Pro :</strong>{" "}
                    {selectedUser.profil_candidat.titre_professionnel || "N/A"}
                  </p>
                  <p>
                    <strong>Diplôme :</strong>{" "}
                    {selectedUser.profil_candidat.diplome} (
                    {selectedUser.profil_candidat.specialite})
                  </p>

                  <div className="bg-blue-50 p-4 rounded-xl">
                    <strong>Compétences :</strong>{" "}
                    <p className="text-sm mt-1">
                      {selectedUser.profil_candidat.competences || "Aucune"}
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl whitespace-pre-line">
                    <strong>Expériences :</strong>{" "}
                    <p className="text-sm mt-1">
                      {selectedUser.profil_candidat.experiences || "Aucune"}
                    </p>
                  </div>

                  {selectedUser.profil_candidat.cv_pdf && (
                    <a
                      href={`http://127.0.0.1:8000${selectedUser.profil_candidat.cv_pdf}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700"
                    >
                      📄 Télécharger le CV
                    </a>
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
