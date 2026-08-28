import React, { useState, useEffect, useCallback } from "react";
import { adminService } from "../../Services/adminService";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { Star, Check } from "lucide-react";
import { tw } from "../../theme";
import { TooltipIcon } from "../../Components/Tooltip";

const AdminDemandesPremium = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nbMoisParDemande, setNbMoisParDemande] = useState({});
  const [palierParDemande, setPalierParDemande] = useState({});
  const [filtre, setFiltre] = useState("attente");
  const PALIERS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

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

  const handleActiver = async (demande) => {
    const nb_mois = nbMoisParDemande[demande.id] || demande.nb_mois;
    const palier = palierParDemande[demande.id] || "BUSINESS";
    try {
      await adminService.activerPremium(demande.id, nb_mois, palier);
      toast.success("Abonnement activé !");
      charger();
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'activation."));
      reportError("ECHEC_ACTIVER_PREMIUM_ADMIN", err);
    }
  };

  const demandesAffichees = demandes.filter((d) =>
    filtre === "attente" ? !d.est_traitee : filtre === "traitee" ? d.est_traitee : true
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={tw.pageTitle}>Demandes d'activation Premium</h1>
          <p className={`${tw.pageSubtitle} mt-0.5`}>
            Paiement manuel CIB/EDAHABIA — activez le Premium après vérification du reçu envoyé par le recruteur.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { key: "attente", label: "En attente" },
            { key: "traitee", label: "Traitées" },
            { key: "toutes", label: "Toutes" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltre(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filtre === f.key ? tw.bgPrimarySolid : `${tw.surfaceMuted} ${tw.textMuted}`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-5 py-3">Entreprise</th>
              <th className="px-5 py-3">Contact</th>
              <th className="px-5 py-3">
                <span className="inline-flex items-center gap-1">
                  Demande <TooltipIcon text="Durée demandée par le recruteur — l'admin choisit le palier et confirme la durée à l'activation." />
                </span>
              </th>
              <th className="px-5 py-3">Abonnement</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase}`}>
            {loading ? (
              <tr>
                <td colSpan="5" className={`py-12 text-center text-sm ${tw.textPrimary} animate-pulse font-medium`}>
                  Chargement...
                </td>
              </tr>
            ) : demandesAffichees.length === 0 ? (
              <tr>
                <td colSpan="5" className={`py-12 text-center text-sm ${tw.textMuted}`}>
                  Aucune demande à afficher.
                </td>
              </tr>
            ) : (
              demandesAffichees.map((d) => (
                <tr key={d.id} className={tw.rowHover}>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>{d.nom_entreprise}</p>
                    <p className={`text-xs ${tw.textMuted} mt-0.5`}>{d.date_demande}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-medium ${tw.textSlate800}`}>{d.email}</p>
                    <p className={`text-xs ${tw.textPrimary} mt-0.5`}>{d.telephone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className={`text-sm font-semibold ${tw.textStrong}`}>{d.nb_mois} mois demandés</p>
                    <p className={`text-xs ${tw.textMuted} mt-0.5 uppercase`}>{d.moyen_paiement}</p>
                  </td>
                  <td className="px-5 py-4">
                    {d.palier_actif ? (
                      <span className={`px-2.5 py-1 ${tw.bgWarningSoft} ${tw.textWarning} border ${tw.borderWarning} text-[10px] font-semibold rounded-full`}>
                        ⭐ {d.palier_actif} — expire {d.abonnement_expire_at || "jamais"}
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 ${tw.surfaceMuted} ${tw.textMuted} border ${tw.borderBase} text-[10px] font-semibold rounded-full`}>
                        Gratuit
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {d.est_traitee ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tw.textMuted}`}>
                        <Check size={14} /> Traitée le {d.date_traitement}
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={palierParDemande[d.id] || "BUSINESS"}
                          onChange={(e) =>
                            setPalierParDemande((prev) => ({ ...prev, [d.id]: e.target.value }))
                          }
                          className={`${tw.inputColorsWhite} rounded-lg text-xs px-2 py-1.5`}
                        >
                          {PALIERS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <select
                          value={nbMoisParDemande[d.id] || d.nb_mois}
                          onChange={(e) =>
                            setNbMoisParDemande((prev) => ({ ...prev, [d.id]: parseInt(e.target.value, 10) }))
                          }
                          className={`${tw.inputColorsWhite} rounded-lg text-xs px-2 py-1.5`}
                        >
                          {[1, 3, 6, 12].map((m) => (
                            <option key={m} value={m}>{m} mois</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleActiver(d)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 ${tw.buttonSuccessSolid} text-xs font-semibold rounded-lg transition-colors shadow-sm ${tw.focusRing}`}
                        >
                          <Star size={13} /> Activer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDemandesPremium;
