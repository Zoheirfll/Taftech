import InfoBanner from "../../Components/InfoBanner";
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import {
  Inbox,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Bell,
  Info,
} from "lucide-react";

const getStyleForType = (type) => {
  switch (type) {
    case "ENTRETIEN":
      return { Icon: Calendar, color: "text-orange-600", bg: "bg-orange-50" };
    case "RETENU":
      return {
        Icon: CheckCircle,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      };
    case "REFUS":
      return { Icon: XCircle, color: "text-red-600", bg: "bg-red-50" };
    case "ALERTE":
      return { Icon: Bell, color: "text-indigo-600", bg: "bg-indigo-50" };
    default:
      return { Icon: Info, color: "text-blue-600", bg: "bg-blue-50" };
  }
};

const BoiteReception = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await jobsService.getNotifications();
        setNotifications(data);
      } catch (error) {
        toast.error("Erreur lors du chargement.");
        reportError("ECHEC_CHARGEMENT_INBOX", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleReadMessage = async (notif) => {
    setSelectedNotif(notif);
    if (!notif.lue) {
      try {
        await jobsService.markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, lue: true } : n)),
        );
      } catch (error) {
        reportError("ECHEC_MARK_READ_NOTIF", error);
      }
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  const unreadCount = notifications.filter((n) => !n.lue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Boîte de réception
          </h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount} non lus
            </span>
          )}
        </div>
        <Link
          to="/mes-candidatures"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Mes candidatures →
        </Link>
      </div>

      <InfoBanner storageKey="boite_reception" title="Votre boîte de réception">
        Retrouvez ici toutes les notifications liées à vos candidatures : invitations à un entretien, décisions finales, messages du recruteur.
        Les messages non lus apparaissent en <strong>gras</strong>. Cliquez sur un message pour le marquer comme lu.
      </InfoBanner>

      <div className="flex flex-col md:flex-row gap-4 h-[600px]">
        {/* LISTE GAUCHE */}
        <div className="w-full md:w-2/5 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Inbox size={32} className="text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-900">Boîte vide</p>
              <p className="text-xs text-slate-700 mt-1">
                Aucun message pour le moment.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {notifications.map((notif) => {
                const { Icon, color, bg } = getStyleForType(notif.type_notif);
                const isSelected = selectedNotif?.id === notif.id;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleReadMessage(notif)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 border-l-2 ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-500"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}
                      >
                        <Icon size={16} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p
                            className={`text-sm truncate ${!notif.lue ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}
                          >
                            {notif.titre}
                          </p>
                          {!notif.lue && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5 ml-2" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1">
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

        {/* DÉTAIL DROITE */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-y-auto">
          {selectedNotif ? (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                {(() => {
                  const { Icon, color, bg } = getStyleForType(
                    selectedNotif.type_notif,
                  );
                  return (
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}
                    >
                      <Icon size={22} className={color} />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {selectedNotif.titre}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
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
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedNotif.message}
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Mail size={36} className="text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-900">
                Sélectionnez un message
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Cliquez sur un message à gauche pour le lire.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoiteReception;
