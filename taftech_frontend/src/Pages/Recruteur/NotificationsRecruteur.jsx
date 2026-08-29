import InfoBanner from "../../Components/InfoBanner";
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { confirmToast } from "../../utils/confirmToast";
import {
  Bell,
  Inbox,
  UserCheck,
  Award,
  Mail,
  CheckCheck,
  Trash2,
} from "lucide-react";

const getStyleForType = (type) => {
  switch (type) {
    case "CANDIDATURE_SPONTANEE":
      return { Icon: Inbox, color: tw.textBlue600, bg: tw.bgBlueSoft };
    case "NOUVELLE_CANDIDATURE":
      return { Icon: UserCheck, color: tw.textPrimary, bg: tw.bgPrimarySoft };
    case "CANDIDAT_RECOMMANDE":
      return { Icon: Award, color: tw.textOrangeStrong, bg: tw.bgOrangeSoft };
    default:
      return { Icon: Bell, color: tw.textMuted, bg: tw.surfaceMuted };
  }
};

const NotificationsRecruteur = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await jobsService.getNotifications();
        setNotifications(data);
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors du chargement."));
        reportError("ECHEC_CHARGEMENT_NOTIFS_RECRUTEUR", error);
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
        setSelectedNotif((prev) => ({ ...prev, lue: true }));
      } catch (error) {
        reportError("ECHEC_MARK_READ_NOTIF_RECRUTEUR", error);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await jobsService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
      setSelectedNotif((prev) => (prev ? { ...prev, lue: true } : prev));
    } catch (error) {
      toast.error(apiErrMsg(error, "Erreur lors du marquage."));
      reportError("ECHEC_MARK_ALL_READ_NOTIF_RECRUTEUR", error);
    }
  };

  const handleDelete = (notif, e) => {
    e.stopPropagation();
    confirmToast("Supprimer définitivement cette notification ?", async () => {
      try {
        await jobsService.deleteNotification(notif.id);
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        setSelectedNotif((prev) => (prev?.id === notif.id ? null : prev));
        toast.success("Notification supprimée.");
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors de la suppression."));
        reportError("ECHEC_DELETE_NOTIF_RECRUTEUR", error);
      }
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  const unreadCount = notifications.filter((n) => !n.lue).length;
  const selectedStyle = selectedNotif ? getStyleForType(selectedNotif.type_notif) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className={tw.pageTitleGrand}>Boîte de réception</h1>
          {unreadCount > 0 && (
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${tw.badgeDangerSolid}`}>
              {unreadCount} non lues
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${tw.textPrimary} hover:underline`}
          >
            <CheckCheck size={16} /> Tout marquer lu
          </button>
        )}
      </div>

      <InfoBanner storageKey="notifications_recruteur" title="Votre centre de notifications">
        Retrouvez ici tous les événements de recrutement : nouvelles candidatures spontanées, nouvelles candidatures sur vos offres, et candidats recommandés (score IA ≥80%).
        Toute l'équipe reçoit ces notifications. Cliquez sur un message pour le marquer comme lu.
      </InfoBanner>

      <div className="flex flex-col md:flex-row gap-4 h-[600px]">
        <div className={`w-full md:w-2/5 ${tw.card} rounded-2xl overflow-hidden flex flex-col`}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bell size={32} className={`${tw.textSubtle} mb-3`} />
              <p className={`text-sm font-medium ${tw.textStrong}`}>Aucune notification</p>
              <p className={`text-xs ${tw.textMuted700} mt-1`}>
                Vous serez averti ici dès qu'un événement de recrutement survient.
              </p>
            </div>
          ) : (
            <div className={`overflow-y-auto flex-1 divide-y ${tw.divideBase}`}>
              {notifications.map((notif) => {
                const { Icon, color, bg } = getStyleForType(notif.type_notif);
                const isSelected = selectedNotif?.id === notif.id;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleReadMessage(notif)}
                    className={`p-4 cursor-pointer transition-colors ${tw.hoverSurfaceMuted} border-l-2 ${
                      isSelected
                        ? `${tw.bgPrimarySoft} ${tw.borderPrimary}`
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p
                            className={`text-sm truncate ${!notif.lue ? `font-semibold ${tw.textStrong}` : `font-medium ${tw.textMuted}`}`}
                          >
                            {notif.titre}
                          </p>
                          {!notif.lue && (
                            <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ml-2 ${tw.bgPrimary}`} />
                          )}
                        </div>
                        <p className={`text-xs ${tw.textMuted} truncate`}>{notif.message}</p>
                        <p className={`text-[10px] ${tw.textMuted} mt-1`}>
                          {new Date(notif.date_creation).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(notif, e)}
                        title="Supprimer"
                        className={`self-start p-1.5 rounded-lg shrink-0 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 transition-colors`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`flex-1 ${tw.card} rounded-2xl overflow-y-auto`}>
          {selectedNotif ? (
            <div className="p-6">
              <div className={`flex items-start justify-between gap-4 mb-6 pb-6 border-b ${tw.borderSubtle}`}>
                <div className="flex items-center gap-4">
                  {selectedStyle && (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedStyle.bg}`}>
                      <selectedStyle.Icon size={22} className={selectedStyle.color} />
                    </div>
                  )}
                  <div>
                    <h2 className={`text-xl font-extrabold ${tw.textStrong}`}>{selectedNotif.titre}</h2>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                      Reçu le{" "}
                      {new Date(selectedNotif.date_creation).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(selectedNotif, e)}
                  title="Supprimer"
                  className={`p-2 rounded-lg shrink-0 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 transition-colors`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className={`text-sm ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>
                {selectedNotif.message}
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Mail size={36} className={`${tw.textSubtle} mb-3`} />
              <p className={`text-sm font-medium ${tw.textStrong}`}>Sélectionnez une notification</p>
              <p className={`text-xs ${tw.textMuted700} mt-1`}>Cliquez sur une notification à gauche pour la lire.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsRecruteur;
