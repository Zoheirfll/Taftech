import React, { useState, useEffect } from "react";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  X,
  Mail,
  Crown,
  Shield,
  User,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { tw } from "../../theme";

const ROLES_LABELS = {
  PROPRIETAIRE: {
    label: "Propriétaire",
    color: tw.roleBadgeColors.PROPRIETAIRE,
    icon: Crown,
  },
  ADMIN: {
    label: "Administrateur",
    color: tw.roleBadgeColors.ADMIN,
    icon: Shield,
  },
  UTILISATEUR: {
    label: "Utilisateur",
    color: tw.roleBadgeColors.UTILISATEUR,
    icon: User,
  },
  INVITE: {
    label: "Invité",
    color: tw.roleBadgeColors.INVITE,
    icon: User,
  },
};

const ROLES_INVITABLES = ["ADMIN", "UTILISATEUR", "INVITE"];

const RoleBadge = ({ role }) => {
  const {
    label,
    color,
    icon: Icon,
  } = ROLES_LABELS[role] || ROLES_LABELS.INVITE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[11px] font-semibold ${color}`}
    >
      <Icon size={11} /> {label}
    </span>
  );
};

const MonEquipe = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ email: "", role: "UTILISATEUR" });
  const [roleEdit, setRoleEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const d = await jobsService.getEquipe();
      setData(d);
    } catch (err) {
      toast.error("Erreur de chargement.");
      reportError("ECHEC_GET_EQUIPE", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const estProprietaire = data?.mon_role === "PROPRIETAIRE";
  const peutVoirAudit = data?.mon_role === "PROPRIETAIRE" || data?.mon_role === "ADMIN";

  const chargerAudit = async () => {
    if (auditLog.length > 0) { setShowAudit((v) => !v); return; }
    setAuditLoading(true);
    setShowAudit(true);
    try {
      const logs = await jobsService.getEquipeAuditLog();
      setAuditLog(logs);
    } catch (err) {
      reportError("ECHEC_GET_AUDIT_LOG", err);
      toast.error("Impossible de charger le journal.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleInviter = async () => {
    if (!form.email.trim()) return toast.error("Email obligatoire.");
    setSaving(true);
    try {
      await jobsService.inviterMembre(
        form.email.trim().toLowerCase(),
        form.role,
      );
      toast.success(`Invitation envoyée à ${form.email} !`);
      setModal(null);
      charger();
    } catch (err) {
      reportError("ECHEC_INVITER_MEMBRE", err);
      const msg = err.response?.data?.error || "Erreur lors de l'invitation.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChanger = async () => {
    setSaving(true);
    try {
      await jobsService.changerRoleMembre(modal.data.id, roleEdit);
      toast.success("Rôle mis à jour.");
      setModal(null);
      charger();
    } catch (err) {
      reportError("ECHEC_CHANGER_ROLE_MEMBRE", err);
      toast.error(err.response?.data?.error || "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const handleRetirer = async () => {
    setSaving(true);
    try {
      await jobsService.retirerMembre(modal.data.id);
      toast.success("Membre retiré.");
      setModal(null);
      charger();
    } catch (err) {
      reportError("ECHEC_RETIRER_MEMBRE", err);
      toast.error(err.response?.data?.error || "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnnulerInvitation = async (id) => {
    try {
      await jobsService.annulerInvitation(id);
      toast.success("Invitation annulée.");
      charger();
    } catch (err) {
      reportError("ECHEC_ANNULER_INVITATION", err);
      toast.error("Impossible d'annuler l'invitation.");
    }
  };

  const ACTIONS_ICONS = {
    CONNEXION: "🔐",
    CREER_OFFRE: "📝",
    MODIFIER_OFFRE: "✏️",
    CLOTURER_OFFRE: "🔒",
    STATUT_CANDIDATURE: "🔄",
    EVALUER_CANDIDATURE: "⭐",
    INVITER_MEMBRE: "📧",
    RETIRER_MEMBRE: "🚪",
    CHANGER_ROLE: "🔑",
    AUTRE: "•",
  };

  if (loading)
    return (
      <div className={`flex justify-center py-16 ${tw.textPrimary} text-sm font-medium animate-pulse`}>
        Chargement de l'équipe...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-extrabold ${tw.textStrong} flex items-center gap-2`}>
            <Users size={22} className={tw.textPrimary} /> Mon équipe
          </h2>
          <p className={`text-sm ${tw.textMuted700} mt-1`}>
            {data?.membres?.length || 0} membre
            {(data?.membres?.length || 0) > 1 ? "s" : ""}
          </p>
        </div>
        {estProprietaire && (
          <button
            onClick={() => {
              setForm({ email: "", role: "UTILISATEUR" });
              setModal({ mode: "inviter" });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-bold rounded-xl transition-colors shadow-sm`}
          >
            <Plus size={15} /> Inviter un membre
          </button>
        )}
      </div>

      {/* Table membres */}
      <div className={`${tw.card} rounded-2xl overflow-hidden`}>
        <table className="w-full text-left">
          <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-5 py-3">Membre</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">Depuis</th>
              {estProprietaire && (
                <th className="px-5 py-3 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {data?.membres?.map((m) => (
              <tr
                key={m.user_id}
                className={`hover:bg-slate-50 transition-colors ${m.est_moi ? tw.rowSelectedIndigoFaint : ""}`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${tw.avatarCircleIndigo} flex items-center justify-center shrink-0 text-sm font-bold`}>
                      {(m.first_name?.[0] || m.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${tw.textStrong}`}>
                        {m.last_name} {m.first_name}
                        {m.est_moi && (
                          <span className={`ml-2 text-[10px] font-semibold ${tw.youBadge} px-1.5 py-0.5 rounded-full`}>
                            Vous
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`px-5 py-4 text-sm ${tw.textMuted}`}>{m.email}</td>
                <td className="px-5 py-4">
                  <RoleBadge role={m.role} />
                </td>
                <td className={`px-5 py-4 text-sm ${tw.textMuted}`}>
                  {m.date_ajout}
                </td>
                {estProprietaire && (
                  <td className="px-5 py-4 text-right">
                    {m.role !== "PROPRIETAIRE" && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setRoleEdit(m.role);
                            setModal({ mode: "role", data: m });
                          }}
                          className={`p-2 ${tw.iconButtonSlateSoft} rounded-lg transition-colors`}
                          title="Changer le rôle"
                        >
                          <Edit2 size={13} />
                        </button>
                        {!m.est_moi && (
                          <button
                            onClick={() =>
                              setModal({ mode: "retirer", data: m })
                            }
                            className={`p-2 ${tw.dangerPillSoft} rounded-lg transition-colors`}
                            title="Retirer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invitations en attente */}
      {estProprietaire && data?.invitations?.length > 0 && (
        <div className={`${tw.card} rounded-2xl p-5`}>
          <p className={`text-sm font-bold ${tw.textMuted700} mb-4 flex items-center gap-2`}>
            <Clock size={15} className={tw.textAmber500} /> Invitations en
            attente ({data.invitations.length})
          </p>
          <div className="space-y-2">
            {data.invitations.map((inv) => (
              <div
                key={inv.id}
                className={`flex items-center justify-between py-2.5 px-4 ${tw.surfaceMuted} rounded-xl border ${tw.borderSubtle}`}
              >
                <div className="flex items-center gap-3">
                  <Mail size={14} className={tw.textMuted} />
                  <span className={`text-sm font-medium ${tw.textMuted700}`}>
                    {inv.email}
                  </span>
                  <RoleBadge role={inv.role} />
                  {inv.est_expiree && (
                    <span className={`text-[10px] font-semibold ${tw.expiredBadge} px-2 py-0.5 rounded-full`}>
                      Expirée
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-2 text-xs ${tw.textMuted}`}>
                  <span>Expire le {inv.expire_at}</span>
                  <button
                    onClick={() => handleAnnulerInvitation(inv.id)}
                    className={`p-1.5 ${tw.textMuted} hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors`}
                    title="Annuler"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Résumé permissions */}
      <div className={`${tw.card} rounded-2xl p-5`}>
        <p className={`text-sm font-bold ${tw.textMuted700} mb-4`}>
          Résumé des permissions
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={`text-left py-2 pr-4 text-xs ${tw.textMuted} font-semibold`}>
                  Fonctionnalité
                </th>
                {["PROPRIETAIRE", "ADMIN", "UTILISATEUR", "INVITE"].map((r) => (
                  <th
                    key={r}
                    className={`text-center py-2 px-3 text-xs ${tw.textMuted} font-semibold`}
                  >
                    {ROLES_LABELS[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { label: "Gérer l'équipe", acces: [true, true, false, false] },
                {
                  label: "Premium / facturation",
                  acces: [true, false, false, false],
                },
                {
                  label: "Paramètres entreprise",
                  acces: [true, true, false, false],
                },
                {
                  label: "Créer / modifier offres",
                  acces: [true, true, true, false],
                },
                {
                  label: "Gérer candidatures",
                  acces: [true, true, true, false],
                },
                { label: "CVthèque", acces: [true, true, true, false] },
                {
                  label: "Consulter candidatures",
                  acces: [true, true, true, true],
                },
              ].map(({ label, acces }) => (
                <tr key={label}>
                  <td className={`py-2.5 pr-4 text-sm ${tw.textMuted}`}>
                    {label}
                  </td>
                  {acces.map((ok, i) => (
                    <td key={i} className="text-center py-2.5 px-3">
                      {ok ? (
                        <span className={`${tw.permCheck} text-base`}>✓</span>
                      ) : (
                        <span className={`${tw.permCross} text-base`}>✕</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — Inviter */}
      {modal?.mode === "inviter" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-md w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
              <h2 className={`text-lg font-bold ${tw.textStrong}`}>
                Inviter un membre
              </h2>
              <button
                onClick={() => setModal(null)}
                className={`p-1.5 ${tw.textMuted} hover:text-slate-700 hover:bg-slate-100 rounded-lg`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>
                  Adresse email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`}
                  placeholder="collaborateur@entreprise.dz"
                  autoFocus
                />
              </div>
              <div>
                <label className={`text-xs font-semibold ${tw.textMuted} mb-1 block`}>
                  Rôle
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`}
                >
                  {ROLES_INVITABLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLES_LABELS[r].label}
                    </option>
                  ))}
                </select>
              </div>
              <p className={`text-xs ${tw.textMuted}`}>
                Un email d'invitation valable 72h sera envoyé. La personne peut
                avoir un compte TAFTECH existant ou en créer un.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-semibold rounded-xl transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={handleInviter}
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60`}
              >
                {saving ? "Envoi..." : "Envoyer l'invitation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Changer rôle */}
      {modal?.mode === "role" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-sm w-full shadow-2xl`}>
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
              <h2 className={`text-lg font-bold ${tw.textStrong}`}>
                Changer le rôle
              </h2>
              <button
                onClick={() => setModal(null)}
                className={`p-1.5 ${tw.textMuted} hover:text-slate-700 hover:bg-slate-100 rounded-lg`}
              >
                <X size={18} />
              </button>
            </div>
            <p className={`text-sm ${tw.textMuted} mb-4`}>{modal.data.email}</p>
            <select
              value={roleEdit}
              onChange={(e) => setRoleEdit(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg text-sm mb-5 ${tw.inputColorsMuted}`}
            >
              {ROLES_INVITABLES.map((r) => (
                <option key={r} value={r}>
                  {ROLES_LABELS[r].label}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-semibold rounded-xl`}
              >
                Annuler
              </button>
              <button
                onClick={handleChanger}
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-bold rounded-xl disabled:opacity-60`}
              >
                {saving ? "..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Retirer */}
      {modal?.mode === "retirer" && (
        <div className={`${tw.modalOverlay} p-4`}>
          <div className={`${tw.surface} rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center`}>
            <div className={`w-12 h-12 ${tw.iconCircleError} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Trash2 size={20} className={tw.textError} />
            </div>
            <h2 className={`text-lg font-bold ${tw.textStrong} mb-2`}>
              Retirer ce membre ?
            </h2>
            <p className={`text-sm ${tw.textMuted700} mb-6`}>
              <span className={`font-semibold ${tw.textMuted700}`}>
                {modal.data.email}
              </span>{" "}
              n'aura plus accès à votre espace recruteur.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className={`flex-1 py-2.5 ${tw.cancelPillGray} text-sm font-semibold rounded-xl`}
              >
                Annuler
              </button>
              <button
                onClick={handleRetirer}
                disabled={saving}
                className={`flex-1 py-2.5 ${tw.buttonDangerSolid} text-sm font-bold rounded-xl disabled:opacity-60`}
              >
                {saving ? "..." : "Retirer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOURNAL D'ACTIVITÉ — PROPRIETAIRE et ADMIN uniquement */}
      {peutVoirAudit && (
        <div className={`${tw.card} rounded-2xl overflow-hidden`}>
          <button
            onClick={chargerAudit}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity size={16} className={tw.textPrimary} />
              <span className={`text-sm font-semibold ${tw.textStrong}`}>Journal d'activité</span>
              <span className={`px-2 py-0.5 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs rounded-full font-medium`}>
                100 derniers événements
              </span>
            </div>
            {showAudit ? <ChevronUp size={16} className={tw.textMuted} /> : <ChevronDown size={16} className={tw.textMuted} />}
          </button>

          {showAudit && (
            <div className="border-t border-slate-100">
              {auditLoading ? (
                <div className={`py-10 text-center text-sm ${tw.textMuted} animate-pulse`}>Chargement…</div>
              ) : auditLog.length === 0 ? (
                <div className={`py-10 text-center text-sm ${tw.textMuted}`}>Aucune activité enregistrée.</div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                  {auditLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                      <span className="text-base shrink-0 mt-0.5">{ACTIONS_ICONS[log.action] || "•"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${tw.textStrong}`}>{log.action_display}</span>
                          {log.detail && (
                            <span className={`text-xs ${tw.textMuted700} truncate`}>— {log.detail}</span>
                          )}
                        </div>
                        <p className={`text-[11px] ${tw.textMuted} mt-0.5`}>
                          {log.membre_nom !== "—" ? log.membre_nom : log.membre_email} · {log.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonEquipe;
