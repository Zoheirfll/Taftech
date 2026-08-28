import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { Plus, Trash2, X, Save } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import { apiErrMsg } from "../../utils/apiErrMsg";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const STATUT_LABELS = { CONFIRME: "Confirmé", ANNULE: "Annulé", PASSE: "Passé" };
const TABS = [
  { key: "creneaux", label: "Créneaux récurrents" },
  { key: "jours_bloques", label: "Jours bloqués" },
  { key: "rendez_vous", label: "Rendez-vous" },
];

const inputClass = (tw) => `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

const AdminRendezVous = () => {
  const [tab, setTab] = useState("creneaux");
  const [config, setConfig] = useState({ delai_min_reservation_heures: 24, horizon_max_jours: 30 });
  const [creneaux, setCreneaux] = useState([]);
  const [joursBloques, setJoursBloques] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalCreneau, setShowModalCreneau] = useState(false);
  const [formCreneau, setFormCreneau] = useState({ jour_semaine: 0, heure_debut: "09:00", heure_fin: "17:00", duree_creneau_minutes: 30 });
  const [showModalJour, setShowModalJour] = useState(false);
  const [formJour, setFormJour] = useState({ date: "", motif: "" });

  const inputCls = inputClass(tw);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, cr, jb, rv] = await Promise.all([
        jobsService.getAdminConfigRdv(),
        jobsService.getAdminDisponibilites(),
        jobsService.getAdminJoursBloques(),
        jobsService.getAdminRendezVous(),
      ]);
      setConfig(c);
      setCreneaux(cr);
      setJoursBloques(jb);
      setRdvs(rv);
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_RDV_DATA", err);
      toast.error(apiErrMsg(err, "Erreur de chargement."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveConfig = async () => {
    try {
      const updated = await jobsService.updateAdminConfigRdv(config);
      setConfig(updated);
      toast.success("Configuration mise à jour !");
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN_CONFIG_RDV", err);
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
    }
  };

  const handleAddCreneau = async (e) => {
    e.preventDefault();
    try {
      await jobsService.creerAdminDisponibilite(formCreneau);
      toast.success("Créneau ajouté !");
      setShowModalCreneau(false);
      setFormCreneau({ jour_semaine: 0, heure_debut: "09:00", heure_fin: "17:00", duree_creneau_minutes: 30 });
      fetchAll();
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_DISPONIBILITE", err);
      toast.error(apiErrMsg(err, "Erreur lors de l'ajout."));
    }
  };

  const handleDeleteCreneau = (id) => {
    confirmToast("Supprimer ce créneau récurrent ?", async () => {
      try {
        await jobsService.supprimerAdminDisponibilite(id);
        setCreneaux((prev) => prev.filter((c) => c.id !== id));
        toast.success("Créneau supprimé.");
      } catch (err) {
        reportError("ECHEC_SUPPRIMER_ADMIN_DISPONIBILITE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const handleAddJourBloque = async (e) => {
    e.preventDefault();
    if (!formJour.date) return toast.error("Une date est requise.");
    try {
      await jobsService.creerAdminJourBloque(formJour);
      toast.success("Jour bloqué ajouté !");
      setShowModalJour(false);
      setFormJour({ date: "", motif: "" });
      fetchAll();
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_JOUR_BLOQUE", err);
      toast.error(apiErrMsg(err, "Erreur lors de l'ajout."));
    }
  };

  const handleDeleteJourBloque = (id) => {
    confirmToast("Supprimer ce jour bloqué ?", async () => {
      try {
        await jobsService.supprimerAdminJourBloque(id);
        setJoursBloques((prev) => prev.filter((j) => j.id !== id));
        toast.success("Jour bloqué supprimé.");
      } catch (err) {
        reportError("ECHEC_SUPPRIMER_ADMIN_JOUR_BLOQUE", err);
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
      }
    });
  };

  const handleChangerStatutRdv = async (id, statut) => {
    try {
      await jobsService.modifierAdminRendezVous(id, { statut });
      setRdvs((prev) => prev.map((r) => (r.id === id ? { ...r, statut } : r)));
      toast.success("Rendez-vous mis à jour.");
    } catch (err) {
      reportError("ECHEC_MODIFIER_ADMIN_RENDEZ_VOUS", err);
      toast.error(apiErrMsg(err, "Erreur lors de la mise à jour."));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className={tw.pageTitle}>Rendez-vous</h1>
        <p className={`${tw.pageSubtitle} mt-0.5`}>
          Configurez l'agenda du conseiller et gérez les demandes de rendez-vous.
        </p>
      </div>

      <div className={`${tw.card} p-5 flex flex-col sm:flex-row gap-4 sm:items-end`}>
        <div className="flex-1">
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Délai minimum de réservation (heures)</label>
          <input
            type="number" min="0" className={inputCls}
            value={config.delai_min_reservation_heures}
            onChange={(e) => setConfig({ ...config, delai_min_reservation_heures: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Horizon maximum (jours)</label>
          <input
            type="number" min="1" className={inputCls}
            value={config.horizon_max_jours}
            onChange={(e) => setConfig({ ...config, horizon_max_jours: e.target.value })}
          />
        </div>
        <button onClick={handleSaveConfig} className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm`}>
          <Save size={15} /> Enregistrer
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${tab === t.key ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted} ${tw.hoverSurfaceSubtle}`}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "creneaux" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className={`flex justify-between items-center px-5 py-3 border-b ${tw.borderSubtle}`}>
            <h2 className={`text-sm font-bold ${tw.textStrong}`}>Créneaux récurrents (gabarit hebdomadaire)</h2>
            <button onClick={() => setShowModalCreneau(true)} className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.bgPrimarySolidHover} text-white text-xs font-semibold rounded-lg`}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-5 py-3">Jour</th>
                  <th className="px-5 py-3">Horaires</th>
                  <th className="px-5 py-3">Durée créneau</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase}`}>
                {loading ? (
                  <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
                ) : creneaux.length === 0 ? (
                  <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun créneau configuré.</td></tr>
                ) : (
                  creneaux.map((c) => (
                    <tr key={c.id} className={tw.rowHover}>
                      <td className="px-5 py-3 text-sm font-medium">{c.jour_libelle || JOURS[c.jour_semaine]}</td>
                      <td className="px-5 py-3 text-sm">{c.heure_debut} - {c.heure_fin}</td>
                      <td className="px-5 py-3 text-sm">{c.duree_creneau_minutes} min</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDeleteCreneau(c.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "jours_bloques" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className={`flex justify-between items-center px-5 py-3 border-b ${tw.borderSubtle}`}>
            <h2 className={`text-sm font-bold ${tw.textStrong}`}>Jours bloqués</h2>
            <button onClick={() => setShowModalJour(true)} className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.bgPrimarySolidHover} text-white text-xs font-semibold rounded-lg`}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className={`divide-y ${tw.divideBase}`}>
            {loading ? (
              <p className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</p>
            ) : joursBloques.length === 0 ? (
              <p className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun jour bloqué.</p>
            ) : (
              joursBloques.map((j) => (
                <div key={j.id} className="flex justify-between items-center px-5 py-3">
                  <div>
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>{j.date}</p>
                    {j.motif && <p className={`text-xs ${tw.textMuted700}`}>{j.motif}</p>}
                  </div>
                  <button onClick={() => handleDeleteJourBloque(j.id)} className={`p-2 ${tw.textMuted} hover:${tw.textError} hover:${tw.bgErrorSoft} rounded-lg transition-colors`}><Trash2 size={14} /></button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "rendez_vous" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-5 py-3">Candidat</th>
                  <th className="px-5 py-3">Date / heure</th>
                  <th className="px-5 py-3">Motif</th>
                  <th className="px-5 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase}`}>
                {loading ? (
                  <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>Chargement...</td></tr>
                ) : rdvs.length === 0 ? (
                  <tr><td colSpan="4" className={`py-12 text-center text-sm ${tw.textMuted} italic`}>Aucun rendez-vous.</td></tr>
                ) : (
                  rdvs.map((r) => (
                    <tr key={r.id} className={tw.rowHover}>
                      <td className="px-5 py-3">
                        <p className={`text-sm font-medium ${tw.textStrong}`}>{r.candidat_nom}</p>
                        <p className={`text-xs ${tw.textMuted700}`}>{r.candidat_email}</p>
                      </td>
                      <td className="px-5 py-3 text-sm">{new Date(r.date_heure).toLocaleString("fr-FR")}</td>
                      <td className="px-5 py-3 text-sm max-w-xs truncate">{r.motif || "—"}</td>
                      <td className="px-5 py-3 text-center">
                        <select
                          className="text-xs font-semibold rounded-full border px-2 py-1"
                          value={r.statut}
                          onChange={(e) => handleChangerStatutRdv(r.id, e.target.value)}
                        >
                          {Object.entries(STATUT_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModalCreneau && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Ajouter un créneau récurrent</h3>
              <button onClick={() => setShowModalCreneau(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddCreneau} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Jour de la semaine *</label>
                <select required className={inputCls} value={formCreneau.jour_semaine} onChange={(e) => setFormCreneau({ ...formCreneau, jour_semaine: Number(e.target.value) })}>
                  {JOURS.map((j, i) => <option key={j} value={i}>{j}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Heure de début *</label>
                  <input type="time" required className={inputCls} value={formCreneau.heure_debut} onChange={(e) => setFormCreneau({ ...formCreneau, heure_debut: e.target.value })} />
                </div>
                <div>
                  <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Heure de fin *</label>
                  <input type="time" required className={inputCls} value={formCreneau.heure_fin} onChange={(e) => setFormCreneau({ ...formCreneau, heure_fin: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Durée d'un créneau (minutes)</label>
                <input type="number" min="5" className={inputCls} value={formCreneau.duree_creneau_minutes} onChange={(e) => setFormCreneau({ ...formCreneau, duree_creneau_minutes: Number(e.target.value) })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModalCreneau(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalJour && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Bloquer un jour</h3>
              <button onClick={() => setShowModalJour(false)} className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors`}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddJourBloque} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Date *</label>
                <input type="date" required className={inputCls} value={formJour.date} onChange={(e) => setFormJour({ ...formJour, date: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Motif (optionnel)</label>
                <input className={inputCls} value={formJour.motif} onChange={(e) => setFormJour({ ...formJour, motif: e.target.value })} placeholder="Ex: Congé, jour férié..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModalJour(false)} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRendezVous;
