import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService"; // Utilisation de jobsService

const Settings = () => {
  // --- STATE POUR LES NOTIFICATIONS ---
  const [notifications, setNotifications] = useState({
    notif_offres_exclusives: false,
    notif_newsletter: false,
    notif_mise_a_jour: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE POUR LE MOT DE PASSE ---
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });

  // --- 1. CHARGER LES PARAMÈTRES AU DÉMARRAGE ---
  useEffect(() => {
    const fetchParametres = async () => {
      try {
        const data = await jobsService.getParametres();
        setNotifications(data);
      } catch (error) {
        toast.error("Erreur lors du chargement de vos paramètres.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchParametres();
  }, []);

  // --- 2. GÉRER LE CLIC SUR UN SWITCH ---
  const handleToggle = async (field) => {
    // Optimistic UI : on inverse tout de suite pour l'utilisateur
    const updatedNotifications = {
      ...notifications,
      [field]: !notifications[field],
    };
    setNotifications(updatedNotifications);

    try {
      // On sauvegarde dans la base de données via jobsService
      await jobsService.updateParametres(updatedNotifications);
      toast.success("Préférence enregistrée !");
    } catch (error) {
      setNotifications(notifications); // Rollback en cas d'erreur
      toast.error("Échec de la sauvegarde.");
      console.error(error);
    }
  };

  // --- 3. GÉRER LE MOT DE PASSE (Simulé pour l'instant) ---
  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error("Les nouveaux mots de passe ne correspondent pas.");
    }
    // Ici, il faudra connecter une route backend "accounts/change-password/"
    toast.success("Demande de changement envoyée (Backend à connecter)");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fadeIn">
      <h1 className="text-3xl font-black text-gray-900 tracking-tight">
        Paramètres
      </h1>

      {/* BLOC NOTIFICATIONS */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-gray-800 mb-6">
          Gérer mes notifications
        </h2>
        <div className="space-y-6">
          {/* Switch 1 */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="font-bold text-gray-800 text-sm">
                Offres exclusives
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Reçois des offres spéciales de nos partenaires.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notifications.notif_offres_exclusives}
                onChange={() => handleToggle("notif_offres_exclusives")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Switch 2 */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="font-bold text-gray-800 text-sm">
                Actualité et newsletter
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Découvre les tendances du marché et astuces pro.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notifications.notif_newsletter}
                onChange={() => handleToggle("notif_newsletter")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Switch 3 - MODIFIÉ POUR CLARTÉ */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="font-bold text-gray-800 text-sm">
                Rappels de mise à jour du profil
              </p>
              <p className="text-xs text-gray-400 font-medium">
                Recevez un email amical si votre CV n'a pas été actualisé depuis
                un certain temps. Un profil à jour attire plus de recruteurs !
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notifications.notif_mise_a_jour}
                onChange={() => handleToggle("notif_mise_a_jour")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </section>

      {/* BLOC MOT DE PASSE */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-black text-gray-800 mb-6">
          Modifier mon mot de passe
        </h2>
        <form
          onSubmit={handleUpdatePassword}
          className="flex flex-col md:flex-row gap-4"
        >
          <input
            type="password"
            placeholder="Mot de passe actuel"
            className="flex-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setPasswords({ ...passwords, old: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Nouveau"
            className="flex-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setPasswords({ ...passwords, new: e.target.value })
            }
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all"
          >
            MODIFIER
          </button>
        </form>
      </section>

      {/* BLOC SUPPRESSION */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-red-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-red-600">Gérer mon compte</h2>
          <p className="text-xs text-gray-400 font-medium">
            Attention, cette action est irréversible.
          </p>
        </div>
        <button
          className="text-red-500 font-black text-sm hover:underline uppercase tracking-widest"
          onClick={() => toast.error("Action désactivée pour l'instant.")}
        >
          Supprimer mon compte
        </button>
      </section>
    </div>
  );
};

export default Settings;
