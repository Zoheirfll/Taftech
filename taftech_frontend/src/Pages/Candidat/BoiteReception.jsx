import InfoBanner from "../../Components/InfoBanner";
import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
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
      return { Icon: Calendar, color: tw.textOrangeStrong, bg: tw.bgOrangeSoft };
    case "RETENU":
      return {
        Icon: CheckCircle,
        color: tw.textSuccessIcon,
        bg: tw.bgSuccessSoft,
      };
    case "REFUS":
      return { Icon: XCircle, color: tw.textError, bg: tw.bgErrorSoft };
    case "ALERTE":
      return { Icon: Bell, color: tw.textPrimary, bg: tw.bgPrimarySoft };
    default:
      return { Icon: Info, color: tw.textBlue600, bg: tw.bgBlueSoft };
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
        setSelectedNotif((prev) => ({ ...prev, lue: true }));
      } catch (error) {
        reportError("ECHEC_MARK_READ_NOTIF", error);
      }
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className={tw.pageTitleGrand}>
            Boîte de réception
          </h1>
          {unreadCount > 0 && (
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${tw.badgeDangerSolid}`}>
              {unreadCount} non lus
            </span>
          )}
        </div>
      </div>

      <InfoBanner storageKey="boite_reception" title="Votre boîte de réception">
        Retrouvez ici toutes les notifications liées à vos candidatures : invitations à un entretien, décisions finales, messages du recruteur.
        Les messages non lus apparaissent en <strong>gras</strong>. Cliquez sur un message pour le marquer comme lu.
      </InfoBanner>

      <div className="flex flex-col md:flex-row gap-4 h-[600px]">
        {/* LISTE GAUCHE */}
        <div className={`w-full md:w-2/5 ${tw.card} rounded-2xl overflow-hidden flex flex-col`}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Inbox size={32} className={`${tw.textSubtle} mb-3`} />
              <p className={`text-sm font-medium ${tw.textStrong}`}>Boîte vide</p>
              <p className={`text-xs ${tw.textMuted700} mt-1`}>
                Aucun message pour le moment.
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
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}
                      >
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
                        <p className={`text-xs ${tw.textMuted} truncate`}>
                          {notif.message}
                        </p>
                        <p className={`text-[10px] ${tw.textMuted} mt-1`}>
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
        <div className={`flex-1 ${tw.card} rounded-2xl overflow-y-auto`}>
          {selectedNotif ? (
            <div className="p-6">
              <div className={`flex items-center gap-4 mb-6 pb-6 border-b ${tw.borderSubtle}`}>
                {selectedStyle && (
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedStyle.bg}`}
                  >
                    <selectedStyle.Icon size={22} className={selectedStyle.color} />
                  </div>
                )}
                <div>
                  <h2 className={`text-xl font-extrabold ${tw.textStrong}`}>
                    {selectedNotif.titre}
                  </h2>
                  <p className={`text-xs ${tw.textMuted} mt-0.5`}>
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
              <p className={`text-sm ${tw.textMuted700} leading-relaxed whitespace-pre-line`}>
                {selectedNotif.message}
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Mail size={36} className={`${tw.textSubtle} mb-3`} />
              <p className={`text-sm font-medium ${tw.textStrong}`}>
                Sélectionnez un message
              </p>
              <p className={`text-xs ${tw.textMuted700} mt-1`}>
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
