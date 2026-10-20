import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "../../Services/adminService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { Star, Check } from "lucide-react";
import { tw } from "../../theme";
import { TooltipIcon } from "../../Components/Tooltip";
import { confirmToast } from "../../utils/confirmToast";
import AdminPageHeader from "../../Components/AdminPageHeader";
import BoutonExportExcel from "../../Components/BoutonExportExcel";
import { AdminVide } from "../../Components/AdminEtat";
import SkeletonTableRows from "../../Components/SkeletonTableRows";

const PALIERS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];
const NOM_PALIER = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };
const DUREES_STANDARD = [1, 3, 6, 12];

const AdminDemandesPremium = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nbMoisParDemande, setNbMoisParDemande] = useState({});
  const [palierParDemande, setPalierParDemande] = useState({});
  const [filtre, setFiltre] = useState("attente");
  // Demande en cours d'activation — bloque le double clic, qui prolongeait l'abonnement deux fois.
  const [activationId, setActivationId] = useState(null);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getDemandesPremium();
      setDemandes(data || []);
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur de chargement."));
      reportError("ECHEC_CHARGEMENT_DEMANDES_PREMIUM", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleActiver = (demande) => {
    const nb_mois = nbMoisParDemande[demande.id] || demande.nb_mois;
    const palier = palierParDemande[demande.id] || "BUSINESS";
    // Activation = abonnement payant accordé : toujours confirmé avec un récapitulatif, jamais
    // en un seul clic (avant : aucune confirmation).
    confirmToast(
      `Activer l'abonnement ${NOM_PALIER[palier]} pour ${nb_mois} mois à « ${demande.nom_entreprise} » ? Vérifiez d'abord le reçu de paiement reçu par email.`,
      async () => {
        setActivationId(demande.id);
        try {
          await adminService.activerPremium(demande.id, nb_mois, palier);
          toast.success(`Abonnement ${NOM_PALIER[palier]} activé pour ${demande.nom_entreprise} !`);
          charger();
        } catch (err) {
          toast.error(apiErrMsg(err, "Erreur lors de l'activation."));
          reportError("ECHEC_ACTIVER_PREMIUM_ADMIN", err);
        } finally {
          setActivationId(null);
        }
      },
    );
  };

  const nbAttente = demandes.filter((d) => !d.est_traitee).length;
  const nbTraitees = demandes.length - nbAttente;

  const demandesAffichees = demandes.filter((d) =>
    filtre === "attente" ? !d.est_traitee : filtre === "traitee" ? d.est_traitee : true
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Star}
        color="amber"
        title="Demandes d'abonnement"
        subtitle="Paiement manuel CIB/EDAHABIA — activez l'abonnement après vérification du reçu envoyé par le recruteur."
        aideKey="demandes-abonnement"
        aide={[
          "Ces demandes viennent des recruteurs qui paient par virement (CIB/EDAHABIA) au lieu de Chargily. Les paiements Chargily s'activent tout seuls et n'apparaissent pas ici.",
          "Avant d'activer, vérifiez le reçu de paiement reçu sur l'email TafTech et que le montant correspond au palier et à la durée.",
          "Choisissez le palier (Starter, Pro, Business, Enterprise) et la durée, puis « Activer ». Un abonnement encore actif est prolongé à partir de sa date d'expiration, sans perte de jours.",
          "Une demande activée passe dans l'onglet « Traitées », avec sa date de traitement.",
          "« Exporter Excel » télécharge les demandes de l'onglet affiché ; l'export est tracé dans le journal d'audit.",
        ]}
        actions={
          <BoutonExportExcel
            ressource="demandes-premium"
            params={{ statut: filtre === "toutes" ? "" : filtre }}
            nomFichier="demandes_premium_taftech"
          />
        }
      />

      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filtrer les demandes">
        {[
          { key: "attente", label: "En attente", count: nbAttente },
          { key: "traitee", label: "Traitées", count: nbTraitees },
          { key: "toutes", label: "Toutes", count: demandes.length },
        ].map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filtre === f.key}
            onClick={() => setFiltre(f.key)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tw.focusRing} ${
              filtre === f.key ? tw.bgPrimarySolid : `${tw.surfaceMuted} ${tw.textMuted} ${tw.hoverSurfaceSubtleStrong}`
            }`}
          >
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filtre === f.key ? "bg-white/20" : `${tw.surface}`}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[760px]">
          <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-5 py-3">Entreprise</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">
                <span className="inline-flex items-center gap-1">
                  Demande <TooltipIcon text="Durée demandée par le recruteur — l'admin choisit le palier et confirme la durée à l'activation." />
                </span>
              </th>
              <th className="px-5 py-3">Abonnement actuel</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading ? (
              <SkeletonTableRows columns={5} />
            ) : demandesAffichees.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <AdminVide
                    icon={Star}
                    titre="Aucune demande à afficher."
                    texte={filtre === "attente" ? "Aucun paiement manuel n'attend de vérification pour le moment." : undefined}
                  />
                </td>
              </tr>
            ) : (
              demandesAffichees.map((d) => {
                const durees = DUREES_STANDARD.includes(d.nb_mois) ? DUREES_STANDARD : [...DUREES_STANDARD, d.nb_mois].sort((a, b) => a - b);
                return (
                <tr key={d.id} className={tw.rowHover}>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>{d.nom_entreprise}</p>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>Demandée le {d.date_demande}</p>
                  </td>
                  <td className="px-5 py-4">
                    <a href={`mailto:${d.email}`} className={`text-sm font-medium ${tw.textSlate800} hover:underline`}>{d.email}</a>
                    {d.telephone && <p className={`text-xs ${tw.textPrimary} mt-0.5`}>{d.telephone}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>{d.nb_mois} mois demandés</p>
                    <p className={`text-xs ${tw.textMuted} mt-0.5 uppercase`}>{d.moyen_paiement}</p>
                  </td>
                  <td className="px-5 py-4">
                    {d.palier_actif ? (
                      <span className={`px-2.5 py-1 ${tw.bgWarningSoft} ${tw.textWarning} border ${tw.borderWarning} text-[10px] font-semibold rounded-full whitespace-nowrap`}>
                        ⭐ {NOM_PALIER[d.palier_actif] || d.palier_actif} — expire {d.abonnement_expire_at || "jamais"}
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 ${tw.surfaceMuted} ${tw.textMuted} border ${tw.borderBase} text-[10px] font-semibold rounded-full`}>
                        Gratuit
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {d.est_traitee ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tw.textSuccess}`}>
                        <Check size={14} /> Traitée le {d.date_traitement}
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={palierParDemande[d.id] || "BUSINESS"}
                          onChange={(e) =>
                            setPalierParDemande((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          aria-label={`Palier à activer pour ${d.nom_entreprise}`}
                          className={`${tw.inputColorsWhite} rounded-lg text-xs px-2 py-1.5`}
                        >
                          {PALIERS.map((p) => (
                            <option key={p} value={p}>{NOM_PALIER[p]}</option>
                          ))}
                        </select>
                        <select
                          value={nbMoisParDemande[d.id] || d.nb_mois}
                          onChange={(e) =>
                            setNbMoisParDemande((prev) => ({ ...prev, [d.id]: parseInt(e.target.value, 10) }))
                          }
                          aria-label={`Durée à activer pour ${d.nom_entreprise}`}
                          className={`${tw.inputColorsWhite} rounded-lg text-xs px-2 py-1.5`}
                        >
                          {durees.map((m) => (
                            <option key={m} value={m}>{m} mois</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleActiver(d)}
                          disabled={activationId === d.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.buttonSuccessSolid} text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 ${tw.focusRing}`}
                        >
                          <Star size={13} /> {activationId === d.id ? "Activation..." : "Activer"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDemandesPremium;
