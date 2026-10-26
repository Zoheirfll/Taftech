import { useSubmitLock } from "../../utils/useSubmitLock";
import React, { useState, useEffect, useCallback } from "react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { notifier } from "../../utils/notifier";
import { Plus, Trash2, X, Save, CalendarClock } from "lucide-react";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import BoutonExportExcel from "../../Components/BoutonExportExcel";
import FicheAdminModal from "../../Components/FicheAdminModal";
import SkeletonTableRows from "../../Components/SkeletonTableRows";
import { AdminVide } from "../../Components/AdminEtat";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const STATUT_LABELS = { CONFIRME: "Confirmé", ANNULE: "Annulé", PASSE: "Passé" };
const STATUT_COULEURS = {
  CONFIRME: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ANNULE: "bg-red-50 text-red-700 border-red-200",
  PASSE: "bg-slate-100 text-slate-600 border-slate-200",
};
const CRENEAU_VIDE = { jour_semaine: 0, heure_debut: "09:00", heure_fin: "17:00", duree_creneau_minutes: 30 };

// "09:00:00" → "09:00"
const hhmm = (h) => (h ? String(h).slice(0, 5) : "");
const aujourdhuiISO = () => new Date().toISOString().slice(0, 10);
const formatJour = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

const AdminRendezVous = () => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const [tab, setTab] = useState("creneaux");
  const [config, setConfig] = useState({ delai_min_reservation_heures: 24, horizon_max_jours: 30 });
  const [creneaux, setCreneaux] = useState([]);
  const [joursBloques, setJoursBloques] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showModalCreneau, setShowModalCreneau] = useState(false);
  const [formCreneau, setFormCreneau] = useState(CRENEAU_VIDE);
  const [showModalJour, setShowModalJour] = useState(false);
  const [formJour, setFormJour] = useState({ date: "", motif: "" });
  const [rdvDetail, setRdvDetail] = useState(null); // rendez-vous dont on affiche la fiche (clic sur la ligne)

  const inputCls = `w-full px-4 py-2.5 ${tw.inputColorsMuted} rounded-lg text-sm`;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, cr, jb, rv] = await Promise.all([
        jobsService.getAdminConfigRdv(),
        jobsService.getAdminDisponibilites(),
        jobsService.getAdminJoursBloques(),
        jobsService.getAdminRendezVous(),
      ]);
      const liste = (x) => (Array.isArray(x) ? x : x?.results || []);
      if (c) setConfig(c);
      setCreneaux(liste(cr));
      setJoursBloques(liste(jb));
      setRdvs(liste(rv));
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_RDV_DATA", err);
      notifier.echec("Chargement impossible", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fermerCreneau = useCallback(() => setShowModalCreneau(false), []);
  const fermerJour = useCallback(() => setShowModalJour(false), []);
  useEchapPourFermer(showModalCreneau, fermerCreneau);
  useEchapPourFermer(showModalJour, fermerJour);

  const handleSaveConfig = async () => {
    const delai = Number(config.delai_min_reservation_heures);
    const horizon = Number(config.horizon_max_jours);
    if (!Number.isFinite(delai) || delai < 0) return notifier.erreur("Délai invalide", "Le délai minimum doit être un nombre d'heures positif.");
    if (!Number.isFinite(horizon) || horizon < 1) return notifier.erreur("Horizon invalide", "L'horizon doit être d'au moins 1 jour.");
    setSavingConfig(true);
    try {
      const updated = await jobsService.updateAdminConfigRdv({
        ...config,
        delai_min_reservation_heures: delai,
        horizon_max_jours: horizon,
      });
      if (updated) setConfig(updated);
      notifier.succes("Configuration mise à jour");
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN_CONFIG_RDV", err);
      notifier.echec("Enregistrement impossible", err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddCreneau = async (e) => {
    e.preventDefault();
    // Un créneau qui finit avant de commencer ne génère aucun rendez-vous réservable.
    if (formCreneau.heure_fin <= formCreneau.heure_debut)
      return notifier.erreur("Horaires invalides", "L'heure de fin doit être après l'heure de début.");
    if (!formCreneau.duree_creneau_minutes || formCreneau.duree_creneau_minutes < 5)
      return notifier.erreur("Durée invalide", "La durée d'un créneau doit être d'au moins 5 minutes.");
    try {
      await jobsService.creerAdminDisponibilite(formCreneau);
      notifier.succes("Créneau ajouté");
      setShowModalCreneau(false);
      setFormCreneau(CRENEAU_VIDE);
      fetchAll();
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_DISPONIBILITE", err);
      notifier.echec("Ajout impossible", err);
    }
  };

  const handleDeleteCreneau = (id) => {
    confirmToast("Supprimer ce créneau récurrent ? Les rendez-vous déjà réservés sont conservés.", async () => {
      try {
        await jobsService.supprimerAdminDisponibilite(id);
        setCreneaux((prev) => prev.filter((c) => c.id !== id));
        notifier.succes("Créneau supprimé");
      } catch (err) {
        reportError("ECHEC_SUPPRIMER_ADMIN_DISPONIBILITE", err);
        notifier.echec("Suppression impossible", err);
      }
    });
  };

  const handleAddJourBloque = async (e) => {
    e.preventDefault();
    if (!formJour.date) return notifier.erreur("Date manquante", "Une date est requise.");
    if (formJour.date < aujourdhuiISO()) return notifier.erreur("Date invalide", "Impossible de bloquer une date passée.");
    try {
      await jobsService.creerAdminJourBloque(formJour);
      notifier.succes("Jour bloqué ajouté");
      setShowModalJour(false);
      setFormJour({ date: "", motif: "" });
      fetchAll();
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_JOUR_BLOQUE", err);
      notifier.echec("Ajout impossible", err);
    }
  };

  const handleDeleteJourBloque = (id) => {
    confirmToast("Supprimer ce jour bloqué ? Les candidats pourront de nouveau réserver ce jour-là.", async () => {
      try {
        await jobsService.supprimerAdminJourBloque(id);
        setJoursBloques((prev) => prev.filter((j) => j.id !== id));
        notifier.succes("Jour bloqué supprimé");
      } catch (err) {
        reportError("ECHEC_SUPPRIMER_ADMIN_JOUR_BLOQUE", err);
        notifier.echec("Suppression impossible", err);
      }
    });
  };

  const appliquerStatutRdv = async (id, statut) => {
    try {
      await jobsService.modifierAdminRendezVous(id, { statut });
      setRdvs((prev) => prev.map((r) => (r.id === id ? { ...r, statut } : r)));
      notifier.succes("Rendez-vous mis à jour");
    } catch (err) {
      reportError("ECHEC_MODIFIER_ADMIN_RENDEZ_VOUS", err);
      notifier.echec("Mise à jour impossible", err);
    }
  };

  // Annuler le rendez-vous d'un candidat se confirme toujours (avant : un changement de liste
  // déroulante suffisait, sans retour possible pour le candidat).
  const handleChangerStatutRdv = (rdv, statut) => {
    if (statut === "ANNULE") {
      confirmToast(`Annuler le rendez-vous de ${rdv.candidat_nom || "ce candidat"} ? Pensez à le prévenir par email.`, () =>
        appliquerStatutRdv(rdv.id, statut),
      );
    } else {
      appliquerStatutRdv(rdv.id, statut);
    }
  };

  const maintenant = new Date();
  const rdvsTries = [...rdvs].sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));
  const rdvsAVenir = rdvsTries.filter((r) => new Date(r.date_heure) >= maintenant);
  const rdvsPasses = rdvsTries.filter((r) => new Date(r.date_heure) < maintenant).reverse();
  const creneauxTries = [...creneaux].sort((a, b) => a.jour_semaine - b.jour_semaine || hhmm(a.heure_debut).localeCompare(hhmm(b.heure_debut)));
  const joursTries = [...joursBloques].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const TABS = [
    { key: "creneaux", label: "Créneaux récurrents", count: creneaux.length },
    { key: "jours_bloques", label: "Jours bloqués", count: joursBloques.length },
    { key: "rendez_vous", label: "Rendez-vous à venir", count: rdvsAVenir.filter((r) => r.statut === "CONFIRME").length },
  ];

  const ligneRdv = (r) => (
    <tr
      key={r.id}
      className={`${tw.rowHover} cursor-pointer`}
      tabIndex={0}
      onClick={() => setRdvDetail(r)}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setRdvDetail(r)}
    >
      <td className="px-5 py-3">
        <p className={`text-sm font-medium ${tw.textStrong}`}>{r.candidat_nom}</p>
        {r.candidat_email && (
          <a href={`mailto:${r.candidat_email}`} onClick={(e) => e.stopPropagation()} className={`text-xs ${tw.textPrimary} hover:underline`}>{r.candidat_email}</a>
        )}
      </td>
      <td className={`px-5 py-3 text-sm ${tw.textMuted700} whitespace-nowrap`}>
        {new Date(r.date_heure).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="px-5 py-3 text-sm max-w-xs truncate" title={r.motif || ""}>{r.motif || "—"}</td>
      <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <select
          aria-label={`Statut du rendez-vous de ${r.candidat_nom}`}
          className={`text-xs font-semibold rounded-full border px-2 py-1 ${STATUT_COULEURS[r.statut] || ""} ${tw.focusRing}`}
          value={r.statut}
          onChange={(e) => handleChangerStatutRdv(r, e.target.value)}
        >
          {Object.entries(STATUT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </td>
    </tr>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={CalendarClock}
        color="rose"
        title="Rendez-vous"
        subtitle="Configurez l'agenda du conseiller et gérez les rendez-vous pris par les candidats."
        aideKey="rendez-vous"
        aide={[
          "Créneaux récurrents : le gabarit de la semaine type (ex. mardi 9h-12h, créneaux de 30 min). Les créneaux réservables sont calculés automatiquement à partir de ce gabarit.",
          "Jours bloqués : congés ou jours fériés. Aucun créneau n'est proposé ces jours-là, même s'ils figurent dans le gabarit.",
          "Délai minimum : un candidat ne peut pas réserver moins de X heures à l'avance. Horizon : jusqu'à combien de jours à l'avance il peut réserver.",
          "Rendez-vous : changez le statut (Confirmé → Passé une fois le rendez-vous tenu). Annuler demande confirmation. Prévenez le candidat par email, il n'est pas notifié automatiquement.",
          "« Exporter les rendez-vous » télécharge tous les rendez-vous pris (candidat, date, motif, statut, notes) ; l'export est tracé dans le journal d'audit.",
        ]}
        actions={
          <BoutonExportExcel ressource="rendez-vous" nomFichier="rendez_vous_taftech" libelle="Exporter les rendez-vous" />
        }
      />

      <div className={`${tw.card} p-5`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${tw.textMuted} mb-3`}>Règles de réservation</p>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label htmlFor="rdv-delai" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Délai minimum de réservation (heures)</label>
            <input
              id="rdv-delai"
              type="number" min="0" className={inputCls}
              value={config.delai_min_reservation_heures}
              onChange={(e) => setConfig({ ...config, delai_min_reservation_heures: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="rdv-horizon" className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Horizon maximum (jours)</label>
            <input
              id="rdv-horizon"
              type="number" min="1" className={inputCls}
              value={config.horizon_max_jours}
              onChange={(e) => setConfig({ ...config, horizon_max_jours: e.target.value })}
            />
          </div>
          <button onClick={handleSaveConfig} disabled={savingConfig} className={`flex items-center justify-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 ${tw.focusRing}`}>
            <Save size={15} /> {savingConfig ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Sections rendez-vous">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${tw.focusRing} ${tab === t.key ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted} ${tw.hoverSurfaceSubtle}`}`}
          >
            {t.label}
            <span className={`px-1.5 rounded-full text-[10px] font-bold ${tab === t.key ? "bg-white/20" : "bg-slate-100"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "creneaux" && (
        <div className={`${tw.card} overflow-hidden`}>
          <div className={`flex justify-between items-center px-5 py-3 border-b ${tw.borderSubtle}`}>
            <h2 className={`text-sm font-bold ${tw.textStrong}`}>Créneaux récurrents (gabarit hebdomadaire)</h2>
            <button onClick={() => setShowModalCreneau(true)} className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.bgPrimarySolidHover} text-white text-xs font-semibold rounded-lg ${tw.focusRing}`}>
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
                  <SkeletonTableRows columns={4} />
                ) : creneauxTries.length === 0 ? (
                  <tr><td colSpan="4"><AdminVide icon={CalendarClock} titre="Aucun créneau configuré." texte="Sans créneau, les candidats ne peuvent réserver aucun rendez-vous." /></td></tr>
                ) : (
                  creneauxTries.map((c) => (
                    <tr key={c.id} className={tw.rowHover}>
                      <td className={`px-5 py-3 text-sm font-medium ${tw.textStrong}`}>{c.jour_libelle || JOURS[c.jour_semaine]}</td>
                      <td className="px-5 py-3 text-sm tabular-nums">{hhmm(c.heure_debut)} – {hhmm(c.heure_fin)}</td>
                      <td className="px-5 py-3 text-sm">{c.duree_creneau_minutes} min</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDeleteCreneau(c.id)} aria-label={`Supprimer le créneau du ${c.jour_libelle || JOURS[c.jour_semaine]}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
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
            <button onClick={() => setShowModalJour(true)} className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.bgPrimarySolidHover} text-white text-xs font-semibold rounded-lg ${tw.focusRing}`}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className={`divide-y ${tw.divideBase}`}>
            {loading ? (
              <div className="p-5 space-y-3">{[0, 1].map((i) => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
            ) : joursTries.length === 0 ? (
              <AdminVide icon={CalendarClock} titre="Aucun jour bloqué." />
            ) : (
              joursTries.map((j) => (
                <div key={j.id} className={`flex justify-between items-center px-5 py-3 ${String(j.date) < aujourdhuiISO() ? "opacity-50" : ""}`}>
                  <div>
                    <p className={`text-sm font-semibold ${tw.textStrong} first-letter:uppercase`}>{formatJour(j.date)}</p>
                    {j.motif && <p className={`text-xs ${tw.textMuted700}`}>{j.motif}</p>}
                  </div>
                  <button onClick={() => handleDeleteJourBloque(j.id)} aria-label={`Débloquer le ${formatJour(j.date)}`} title="Supprimer" className={`p-2 ${tw.textMuted} hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${tw.focusRing}`}><Trash2 size={14} /></button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "rendez_vous" && (
        <div className="space-y-5">
          {[
            { titre: "À venir", liste: rdvsAVenir, vide: "Aucun rendez-vous à venir." },
            { titre: "Passés", liste: rdvsPasses, vide: "Aucun rendez-vous passé." },
          ].map((bloc) => (
            <div key={bloc.titre} className={`${tw.card} overflow-hidden`}>
              <div className={`px-5 py-3 border-b ${tw.borderSubtle}`}>
                <h2 className={`text-sm font-bold ${tw.textStrong}`}>{bloc.titre} ({bloc.liste.length})</h2>
              </div>
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
                      <SkeletonTableRows columns={4} />
                    ) : bloc.liste.length === 0 ? (
                      <tr><td colSpan="4"><AdminVide icon={CalendarClock} titre={bloc.vide} /></td></tr>
                    ) : (
                      bloc.liste.map(ligneRdv)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {rdvDetail && (
        <FicheAdminModal
          titre={`Rendez-vous de ${rdvDetail.candidat_nom}`}
          badge={{ libelle: STATUT_LABELS[rdvDetail.statut] || rdvDetail.statut, classe: STATUT_COULEURS[rdvDetail.statut] || "" }}
          lignes={[
            { libelle: "Candidat", valeur: rdvDetail.candidat_nom },
            { libelle: "E-mail", valeur: rdvDetail.candidat_email },
            { libelle: "Date et heure", valeur: new Date(rdvDetail.date_heure).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
            { libelle: "Motif", valeur: rdvDetail.motif },
          ]}
          onClose={() => setRdvDetail(null)}
        />
      )}

      {showModalCreneau && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerCreneau()}>
          <div role="dialog" aria-modal="true" aria-label="Ajouter un créneau récurrent" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Ajouter un créneau récurrent</h3>
              <button onClick={fermerCreneau} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleAddCreneau)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Jour de la semaine *</label>
                <select required className={inputCls} value={formCreneau.jour_semaine} onChange={(e) => setFormCreneau({ ...formCreneau, jour_semaine: Number(e.target.value) })}>
                  {JOURS.map((j, i) => <option key={j} value={i}>{j}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {formCreneau.heure_fin > formCreneau.heure_debut && formCreneau.duree_creneau_minutes >= 5 && (() => {
                  const [h1, m1] = formCreneau.heure_debut.split(":").map(Number);
                  const [h2, m2] = formCreneau.heure_fin.split(":").map(Number);
                  const nb = Math.floor(((h2 * 60 + m2) - (h1 * 60 + m1)) / formCreneau.duree_creneau_minutes);
                  return <p className={`text-[11px] ${tw.textMuted} mt-1`}>Soit {nb} rendez-vous possible{nb > 1 ? "s" : ""} ce jour-là.</p>;
                })()}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerCreneau} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalJour && (
        <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && fermerJour()}>
          <div role="dialog" aria-modal="true" aria-label="Bloquer un jour" className={`${tw.surface} rounded-2xl p-7 max-w-lg w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-base font-bold ${tw.textStrong}`}>Bloquer un jour</h3>
              <button onClick={fermerJour} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg transition-colors ${tw.focusRing}`}><X size={18} /></button>
            </div>
            <form onSubmit={lockSubmit(handleAddJourBloque)} className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Date *</label>
                <input type="date" required min={aujourdhuiISO()} className={inputCls} value={formJour.date} onChange={(e) => setFormJour({ ...formJour, date: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs font-medium ${tw.textMuted} mb-1.5 block`}>Motif (optionnel)</label>
                <input className={inputCls} value={formJour.motif} onChange={(e) => setFormJour({ ...formJour, motif: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fermerJour} className={`flex-1 py-2.5 ${tw.surfaceSubtle} ${tw.textMuted} text-sm font-medium rounded-lg ${tw.hoverSurfaceSubtleStrong} transition-colors`}>Annuler</button>
                <button type="submit" disabled={submitBusy} className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50`}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRendezVous;
