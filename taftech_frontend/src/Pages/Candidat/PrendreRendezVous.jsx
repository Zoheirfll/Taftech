import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { CalendarClock, Clock, X } from "lucide-react";
import InfoBanner from "../../Components/InfoBanner";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";

const STATUT_LABELS = { CONFIRME: "Confirmé", ANNULE: "Annulé", PASSE: "Passé" };
const STATUT_STYLE = { CONFIRME: tw.scoreHigh, ANNULE: tw.scoreLow, PASSE: tw.statusNeutralSoft };

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const formatHeure = (iso) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const PrendreRendezVous = () => {
  const [creneaux, setCreneaux] = useState([]);
  const [rendezVous, setRendezVous] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState(null);
  const [motif, setMotif] = useState("");
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [disponibilites, mesRdv] = await Promise.all([
          jobsService.getDisponibilitesRdv(),
          jobsService.getMesRendezVous(),
        ]);
        setCreneaux(disponibilites);
        setRendezVous(mesRdv);
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors du chargement."));
        reportError("ECHEC_CHARGEMENT_RENDEZ_VOUS", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const creneauxParJour = useMemo(() => {
    const groupes = {};
    creneaux.forEach((c) => {
      const jour = new Date(c).toDateString();
      if (!groupes[jour]) groupes[jour] = [];
      groupes[jour].push(c);
    });
    return Object.entries(groupes);
  }, [creneaux]);

  const rendezVousActifs = rendezVous.filter((r) => r.statut === "CONFIRME");

  const handleReserver = async () => {
    if (!selection) return;
    setReserving(true);
    try {
      const created = await jobsService.reserverRendezVous(selection, motif);
      setRendezVous((prev) => [created, ...prev]);
      setCreneaux((prev) => prev.filter((c) => c !== selection));
      setSelection(null);
      setMotif("");
      toast.success("Rendez-vous confirmé !");
    } catch (error) {
      reportError("ECHEC_RESERVATION_RDV_UI", error);
      toast.error(apiErrMsg(error, "Impossible de réserver ce créneau."));
    } finally {
      setReserving(false);
    }
  };

  const handleAnnuler = (id) => {
    confirmToast("Annuler ce rendez-vous ?", async () => {
      try {
        await jobsService.annulerRendezVous(id);
        setRendezVous((prev) => prev.map((r) => (r.id === id ? { ...r, statut: "ANNULE" } : r)));
        toast.success("Rendez-vous annulé.");
      } catch (error) {
        toast.error(apiErrMsg(error, "Erreur lors de l'annulation."));
        reportError("ECHEC_ANNULATION_RDV_UI", error);
      }
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.borderPrimary}`}></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={tw.pageTitleGrand}>Prendre rendez-vous</h1>
        <p className={`${tw.bodyTextGrand} mt-0.5`}>
          Réservez un créneau avec un conseiller TafTech.
        </p>
      </div>

      <InfoBanner storageKey="prendre_rendez_vous" title="Comment ça marche ?">
        Choisissez un créneau disponible ci-dessous et confirmez. Vous pouvez annuler un rendez-vous
        à tout moment depuis cette page.
      </InfoBanner>

      {rendezVousActifs.length > 0 && (
        <div className={`${tw.card} rounded-2xl overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
            <h2 className={`text-sm font-bold ${tw.textStrong}`}>Mes rendez-vous</h2>
          </div>
          <div className={`divide-y ${tw.divideBase}`}>
            {rendezVous.map((r) => (
              <div key={r.id} className="flex justify-between items-center px-5 py-4">
                <div>
                  <p className={`text-sm font-semibold ${tw.textStrong} capitalize`}>{formatDate(r.date_heure)} · {formatHeure(r.date_heure)}</p>
                  {r.motif && <p className={`text-xs ${tw.textMuted700} mt-0.5`}>{r.motif}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_STYLE[r.statut] || tw.statusNeutralSoft}`}>
                    {STATUT_LABELS[r.statut] || r.statut}
                  </span>
                  {r.statut === "CONFIRME" && (
                    <button
                      onClick={() => handleAnnuler(r.id)}
                      className={`p-1.5 rounded-lg transition-colors ${tw.deleteIconButton}`}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
          <h2 className={`text-sm font-bold ${tw.textStrong}`}>Créneaux disponibles</h2>
        </div>
        {creneauxParJour.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${tw.emptyStateIconCircle}`}>
              <CalendarClock size={24} />
            </div>
            <h3 className={`text-sm font-semibold ${tw.textStrong} mb-1`}>Aucun créneau disponible</h3>
            <p className={`text-xs ${tw.textMuted700} max-w-xs`}>Revenez plus tard ou contactez-nous.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {creneauxParJour.map(([jour, items]) => (
              <div key={jour}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${tw.textMuted700} capitalize`}>
                  {formatDate(items[0])}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelection(c)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        selection === c ? tw.buttonPrimary : tw.buttonSecondary
                      }`}
                    >
                      <Clock size={13} /> {formatHeure(c)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selection && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${tw.modalOverlayLight}`}>
          <div className={`${tw.surface} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden`}>
            <div className={`flex justify-between items-center px-6 py-4 border-b ${tw.borderSubtle}`}>
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Confirmer le rendez-vous</h3>
              <button
                onClick={() => setSelection(null)}
                className={`p-1.5 rounded-lg transition-colors ${tw.modalCloseButton}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className={`text-sm font-semibold ${tw.textStrong} capitalize`}>
                {formatDate(selection)} à {formatHeure(selection)}
              </p>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Motif (optionnel)</label>
                <textarea
                  className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`}
                  rows={3}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex: Aide à la rédaction de mon CV"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className={`flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={reserving}
                  onClick={handleReserver}
                  className={`flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors disabled:opacity-50`}
                >
                  {reserving ? "Confirmation..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrendreRendezVous;
