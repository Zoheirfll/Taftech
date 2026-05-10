import React, { useState, useEffect } from "react";
import { jobsService } from "../Services/jobsService";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportError } from "../utils/errorReporter"; // 👇 Import télémétrie

const BoiteReception = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await jobsService.getNotifications();
      setNotifications(data);
    } catch (error) {
      toast.error("Erreur lors du chargement de vos messages.");
      // 🛑 Télémétrie ajoutée
      reportError("ECHEC_CHARGEMENT_INBOX", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReadMessage = async (notif) => {
    setSelectedNotif(notif);

    // Si le message n'est pas encore lu, on dit au Backend de le marquer comme lu
    if (!notif.lue) {
      try {
        await jobsService.markNotificationAsRead(notif.id);
        // On met à jour l'affichage localement pour enlever le point bleu
        setNotifications((prevNotifs) =>
          prevNotifs.map((n) => (n.id === notif.id ? { ...n, lue: true } : n)),
        );
      } catch (error) {
        // 🛑 Télémétrie ajoutée
        reportError("ECHEC_MARK_READ_NOTIF", error);
      }
    }
  };

  const getStyleForType = (type) => {
    switch (type) {
      case "ENTRETIEN":
        return { icon: "📅", color: "text-orange-600", bg: "bg-orange-100" };
      case "RETENU":
        return { icon: "🎉", color: "text-green-600", bg: "bg-green-100" };
      case "REFUS":
        return { icon: "🛑", color: "text-red-600", bg: "bg-red-100" };
      case "ALERTE":
        return { icon: "🔔", color: "text-purple-600", bg: "bg-purple-100" };
      default:
        return { icon: "ℹ️", color: "text-blue-600", bg: "bg-blue-100" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse font-bold text-blue-600">
          Chargement de votre messagerie...
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.lue).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          📥 Boîte de réception
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
              {unreadCount} non lus
            </span>
          )}
        </h1>
        <Link
          to="/mes-candidatures"
          className="text-blue-600 font-bold hover:underline"
        >
          Voir mes candidatures ➔
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* LISTE DES MESSAGES (GAUCHE) */}
        <div className="w-full md:w-1/3 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-[600px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-medium">
              Votre boîte de réception est vide pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notif) => {
                const style = getStyleForType(notif.type_notif);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleReadMessage(notif)}
                    className={`p-5 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedNotif?.id === notif.id
                        ? "bg-blue-50 border-l-4 border-blue-600"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color} text-lg`}
                      >
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4
                            className={`text-sm truncate ${!notif.lue ? "font-black text-gray-900" : "font-bold text-gray-600"}`}
                          >
                            {notif.titre}
                          </h4>
                          {!notif.lue && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0"></span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate ${!notif.lue ? "font-bold text-gray-700" : "font-medium text-gray-500"}`}
                        >
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">
                          {new Date(notif.date_creation).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* LECTURE DU MESSAGE (DROITE) */}
        <div className="w-full md:w-2/3 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px]">
          {selectedNotif ? (
            <div className="animate-fadeIn">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${getStyleForType(selectedNotif.type_notif).bg} ${getStyleForType(selectedNotif.type_notif).color}`}
                >
                  {getStyleForType(selectedNotif.type_notif).icon}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {selectedNotif.titre}
                  </h2>
                  <p className="text-sm font-bold text-gray-500 mt-1">
                    Reçu le{" "}
                    {new Date(selectedNotif.date_creation).toLocaleDateString(
                      "fr-FR",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>
              <div className="prose max-w-none text-gray-700 font-medium whitespace-pre-line leading-relaxed">
                {selectedNotif.message}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
              <span className="text-6xl mb-4">📬</span>
              <p className="font-bold">Sélectionnez un message pour le lire.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoiteReception;
