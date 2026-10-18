import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  Briefcase,
  Building2,
  Download,
  FileText,
  GraduationCap,
  PartyPopper,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { tw, colors } from "../../theme";
import { TooltipIcon } from "../../Components/Tooltip";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement } from "../../Components/AdminEtat";
import FunnelChart from "../../Components/FunnelChart";
import { EvolutionChart, DistributionChart } from "../../Components/StatsPeriodeGraphiques";

const nombre = (n) => new Intl.NumberFormat("fr-DZ").format(n ?? 0);
const montant = (n) => `${nombre(n)} DA`;

const versISO = (date) => {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
};

const periodeDepuisJours = (jours) => {
  const fin = new Date();
  const debut = new Date();
  debut.setDate(fin.getDate() - jours);
  return { debut: versISO(debut), fin: versISO(fin) };
};

const RACCOURCIS = [
  { label: "30 jours", jours: 30 },
  { label: "90 jours", jours: 90 },
  { label: "12 mois", jours: 365 },
];

const SERIES_ACTIVITE = [
  { cle: "offres", label: "Offres", couleur: colors.primary[600] },
  { cle: "candidatures", label: "Candidatures", couleur: colors.info },
  { cle: "recrutements", label: "Recrutements", couleur: colors.success },
];
const SERIES_INSCRIPTIONS = [
  { cle: "inscriptions_candidats", label: "Candidats", couleur: colors.primary[600] },
  { cle: "inscriptions_recruteurs", label: "Recruteurs", couleur: colors.accent[500] },
];
const SERIES_REVENU = [{ cle: "revenu_da", label: "Revenu", couleur: colors.success }];

const COULEURS_ENTONNOIR = [colors.primary[700], colors.primary[600], colors.primary[500], colors.primary[400], colors.success];

const NOMS_PALIERS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

const CARTES = [
  { cle: "offres", label: "Offres créées", icon: Briefcase, color: "indigo", format: nombre },
  { cle: "candidatures", label: "Candidatures", icon: FileText, color: "blue", format: nombre },
  { cle: "inscriptions_candidats", label: "Nouveaux candidats", icon: GraduationCap, color: "violet", format: nombre },
  { cle: "inscriptions_recruteurs", label: "Nouveaux recruteurs", icon: Building2, color: "emerald", format: nombre },
  {
    cle: "recrutements",
    label: "Recrutements",
    icon: PartyPopper,
    color: "pink",
    format: nombre,
    info: "Candidatures passées au statut « Retenu » pendant la période. La date retenue est celle de la dernière modification de la candidature (pas d'historique des changements de statut).",
  },
  {
    cle: "revenu_da",
    label: "Revenu des abonnements",
    icon: Wallet,
    color: "gold",
    format: montant,
    info: "Somme des paiements d'abonnement enregistrés pendant la période. N'inclut pas les activations manuelles sans paiement.",
  },
];

const Variation = ({ valeur }) => {
  if (valeur === null || valeur === undefined) {
    return (
      <span className={`text-xs ${tw.textMuted}`} title="Aucune donnée sur la période précédente : pas de comparaison possible.">
        —
      </span>
    );
  }
  const hausse = valeur >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        hausse ? `${tw.bgSuccessSoft} ${tw.textSuccessIcon}` : `${tw.bgErrorSoft} ${tw.textError}`
      }`}
      title="Variation par rapport à la période précédente de même durée."
    >
      {hausse ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {hausse ? "+" : ""}
      {String(valeur).replace(".", ",")} %
    </span>
  );
};

const CarteIndicateur = ({ carte, donnees }) => {
  const Icone = carte.icon;
  return (
    <div className={`${tw.surface} border ${tw.borderSubtle} rounded-xl p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tw.kpiIconBg[carte.color]} text-white shadow-sm`}>
        <Icone size={20} />
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold ${tw.textMuted} uppercase tracking-wider flex items-center gap-1`}>
          {carte.label}
          {carte.info && <TooltipIcon text={carte.info} />}
        </p>
        <p className={`text-2xl font-extrabold ${tw.textStrong} mt-0.5 tabular-nums`}>{carte.format(donnees?.valeur)}</p>
        <div className="mt-1 flex items-center gap-2">
          <Variation valeur={donnees?.variation_pct} />
          <span className={`text-[11px] ${tw.textMuted}`}>vs {carte.format(donnees?.precedente)}</span>
        </div>
      </div>
    </div>
  );
};

const Bloc = ({ titre, info, note, children }) => (
  <section className={`${tw.card} overflow-hidden`}>
    <div className={`px-5 py-4 border-b ${tw.borderSubtle}`}>
      <h2 className={`text-sm font-bold ${tw.textStrong} flex items-center gap-1.5`}>
        {titre}
        {info && <TooltipIcon text={info} />}
      </h2>
    </div>
    <div className="p-5 space-y-3">{children}</div>
    {note && <p className={`px-5 pb-4 text-[11px] ${tw.textMuted}`}>{note}</p>}
  </section>
);

const Chiffre = ({ label, valeur }) => (
  <div className={`${tw.surfaceMuted} rounded-lg p-3`}>
    <p className={`text-[11px] font-semibold ${tw.textMuted} uppercase tracking-wider`}>{label}</p>
    <p className={`text-xl font-bold ${tw.textStrong} tabular-nums mt-0.5`}>{valeur ?? "—"}</p>
  </div>
);

const AdminStatsPeriode = () => {
  const [periode, setPeriode] = useState(() => periodeDepuisJours(365));
  const [saisie, setSaisie] = useState(periode);
  const [entrepriseId, setEntrepriseId] = useState("");
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setDonnees(await jobsService.getAdminStatsPeriode(periode.debut, periode.fin, entrepriseId || null));
    } catch (err) {
      setErreur(true);
      toast.error(apiErrMsg(err, "Erreur lors du chargement des statistiques."));
      reportError("ECHEC_CHARGEMENT_STATS_PERIODE", err);
    } finally {
      setChargement(false);
    }
  }, [periode, entrepriseId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const appliquer = () => {
    if (!saisie.debut || !saisie.fin) return toast.error("Renseignez les deux dates.");
    if (saisie.debut > saisie.fin) return toast.error("La date de début doit précéder la date de fin.");
    setPeriode(saisie);
  };

  const choisirRaccourci = (jours) => {
    const p = periodeDepuisJours(jours);
    setSaisie(p);
    setPeriode(p);
  };

  const exporter = async () => {
    setExportEnCours(true);
    const toastId = toast.loading("Génération du fichier...");
    try {
      const blob = await jobsService.exportAdminStatsPeriode(periode.debut, periode.fin, entrepriseId || null);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const lien = document.createElement("a");
      lien.href = url;
      lien.setAttribute("download", `statistiques_taftech_${periode.debut}_au_${periode.fin}.xlsx`);
      document.body.appendChild(lien);
      lien.click();
      lien.parentNode.removeChild(lien);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement réussi !");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'exportation."));
      reportError("ECHEC_EXPORT_STATS_PERIODE", err);
    } finally {
      toast.dismiss(toastId);
      setExportEnCours(false);
    }
  };

  const entete = (
    <AdminPageHeader
      icon={BarChart3}
      color="indigo"
      title="Statistiques"
      subtitle="Évolution de la plateforme sur la période choisie"
      aideKey="stats-periode"
      aide={[
        "Toutes les valeurs portent sur la période choisie. La petite pastille compare avec la période précédente de même durée.",
        "Un tiret signifie qu'il n'y avait rien à comparer sur la période précédente.",
        "Certains chiffres sont des approximations (recrutements, entonnoir) : l'application ne garde pas l'historique des changements de statut. Les notes sous chaque bloc l'indiquent.",
        "Le bouton « Exporter » télécharge un classeur Excel avec un onglet par bloc ; chaque export est tracé dans le journal d'audit.",
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exporter}
            disabled={exportEnCours || chargement || erreur}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tw.borderSubtle} bg-white text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 disabled:opacity-50 ${tw.focusRing}`}
          >
            <Download size={14} /> Exporter
          </button>
          <button
            onClick={charger}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tw.borderSubtle} bg-white text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 ${tw.focusRing}`}
          >
            <RefreshCw size={14} className={chargement ? "animate-spin" : ""} /> Rafraîchir
          </button>
        </div>
      }
    />
  );

  const selecteur = (
    <div className={`${tw.card} p-4 flex flex-wrap items-end gap-3`}>
      <label className="text-xs font-semibold">
        <span className={tw.textMuted}>Du</span>
        <input
          type="date"
          aria-label="Date de début"
          value={saisie.debut}
          max={saisie.fin}
          onChange={(e) => setSaisie({ ...saisie, debut: e.target.value })}
          className={`block mt-1 text-sm ${tw.input}`}
        />
      </label>
      <label className="text-xs font-semibold">
        <span className={tw.textMuted}>Au</span>
        <input
          type="date"
          aria-label="Date de fin"
          value={saisie.fin}
          min={saisie.debut}
          onChange={(e) => setSaisie({ ...saisie, fin: e.target.value })}
          className={`block mt-1 text-sm ${tw.input}`}
        />
      </label>
      <label className="text-xs font-semibold">
        <span className={tw.textMuted}>Entreprise</span>
        <select
          aria-label="Filtrer par entreprise"
          value={entrepriseId}
          onChange={(e) => setEntrepriseId(e.target.value)}
          className={`block mt-1 text-sm max-w-[16rem] ${tw.input}`}
        >
          <option value="">Toutes les entreprises</option>
          {(donnees?.entreprises || []).map((e) => (
            <option key={e.id} value={String(e.id)}>
              {e.nom}
            </option>
          ))}
        </select>
      </label>
      <button onClick={appliquer} className={`${tw.buttonPrimary} px-4 py-2 text-sm rounded-lg`}>
        Appliquer
      </button>
      <div className="flex gap-1.5 ml-auto">
        {RACCOURCIS.map((r) => (
          <button
            key={r.jours}
            onClick={() => choisirRaccourci(r.jours)}
            className={`px-3 py-2 rounded-lg border ${tw.borderSubtle} text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 ${tw.focusRing}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (erreur && !donnees) {
    return (
      <div className="space-y-6">
        {entete}
        {selecteur}
        <AdminErreurChargement message="Impossible de charger les statistiques." onRetry={charger} />
      </div>
    );
  }

  if (!donnees) {
    return (
      <div className="space-y-6">
        {entete}
        {selecteur}
        <div className="flex items-center justify-center h-48">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorderPrimary}`}></div>
        </div>
      </div>
    );
  }

  const { indicateurs, evolution, entonnoir, offres, matching, abonnements } = donnees;
  const etapes = entonnoir.etapes.map((e, i) => ({
    label: e.libelle,
    count: e.nb,
    pct: e.pct_du_total,
    couleur: COULEURS_ENTONNOIR[i % COULEURS_ENTONNOIR.length],
  }));
  const paliers = [...new Set([...abonnements.par_palier, ...abonnements.revenu_par_palier].map((p) => p.palier))];

  return (
    <div className="space-y-6">
      {entete}
      {selecteur}

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${chargement ? "opacity-60" : ""}`}>
        {CARTES.filter((carte) => indicateurs[carte.cle]).map((carte) => (
          <CarteIndicateur key={carte.cle} carte={carte} donnees={indicateurs[carte.cle]} />
        ))}
      </div>
      {donnees.entreprise && (
        <p className={`text-xs ${tw.textMuted}`}>
          Chiffres limités à <strong className={tw.textStrong}>{donnees.entreprise.nom}</strong>. Les inscriptions de candidats et de
          recruteurs ne se rattachent pas à une entreprise : elles sont masquées.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bloc titre="Activité par mois">
          <EvolutionChart data={evolution} series={SERIES_ACTIVITE} ariaLabel="Évolution mensuelle des offres, candidatures et recrutements" />
        </Bloc>
        {!donnees.entreprise && (
          <Bloc titre="Inscriptions par mois">
            <EvolutionChart data={evolution} series={SERIES_INSCRIPTIONS} ariaLabel="Évolution mensuelle des inscriptions" />
          </Bloc>
        )}
        <Bloc titre="Revenu des abonnements par mois" info="Paiements d'abonnement enregistrés, en dinars.">
          <EvolutionChart data={evolution} series={SERIES_REVENU} unite="DA" ariaLabel="Évolution mensuelle du revenu" />
        </Bloc>
        <Bloc
          titre="Qualité du matching"
          info="Répartition des scores de compatibilité des candidatures déposées pendant la période."
        >
          <p className={`text-xs ${tw.textMuted}`}>
            Score moyen : <strong className={tw.textStrong}>{matching.moyenne === null ? "—" : `${matching.moyenne} %`}</strong>
          </p>
          <DistributionChart data={matching.distribution} ariaLabel="Répartition des scores de matching" />
        </Bloc>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bloc
          titre="Entonnoir de recrutement"
          info="Chaque étape inclut les candidatures qui sont allées plus loin."
          note="Approximation : calculé sur le statut actuel des candidatures déposées pendant la période (pas d'historique des changements de statut)."
        >
          <FunnelChart etapes={etapes} />
          <ul className={`divide-y ${tw.divideBase} text-xs`}>
            {entonnoir.etapes.map((e) => (
              <li key={e.cle} className="flex justify-between py-1.5">
                <span className={tw.textMuted700}>{e.libelle}</span>
                <span className={`font-semibold ${tw.textStrong} tabular-nums`}>
                  {nombre(e.nb)}
                  <span className={`ml-2 font-normal ${tw.textMuted}`}>
                    {e.taux_passage === null ? "" : `${String(e.taux_passage).replace(".", ",")} % de l'étape précédente`}
                  </span>
                </span>
              </li>
            ))}
            <li className="flex justify-between py-1.5">
              <span className={tw.textMuted700}>Refusées</span>
              <span className={`font-semibold ${tw.textStrong} tabular-nums`}>{nombre(entonnoir.refusees)}</span>
            </li>
          </ul>
        </Bloc>

        <div className="space-y-6">
          <Bloc titre="Offres publiées sur la période" info="Offres approuvées dont la date de création tombe dans la période.">
            <div className="grid grid-cols-2 gap-3">
              <Chiffre label="Offres approuvées" valeur={nombre(offres.offres_approuvees)} />
              <Chiffre
                label="Candidatures par offre"
                valeur={offres.candidatures_par_offre === null ? null : String(offres.candidatures_par_offre).replace(".", ",")}
              />
              <Chiffre label="Sans aucune candidature" valeur={nombre(offres.sans_candidature)} />
              <Chiffre label="Expirées sans candidature" valeur={nombre(offres.expirees_sans_candidature)} />
            </div>
          </Bloc>

          <Bloc
            titre="Abonnements"
            note="État actuel : l'application ne garde pas l'historique des changements de palier, donc pas de conversion gratuit → payant dans le temps."
          >
            <div className="grid grid-cols-3 gap-3">
              <Chiffre label="Actifs" valeur={nombre(abonnements.actifs)} />
              <Chiffre label="Expirent sous 7 j" valeur={nombre(abonnements.expirations.sous_7_jours)} />
              <Chiffre label="Expirent sous 30 j" valeur={nombre(abonnements.expirations.sous_30_jours)} />
            </div>
            {paliers.length === 0 ? (
              <p className={`text-xs ${tw.textMuted}`}>Aucun abonnement actif ni paiement sur la période.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className={`${tw.surfaceMuted} text-[10px] ${tw.textMuted} uppercase tracking-wider`}>
                    <th className="px-3 py-2 text-left">Palier</th>
                    <th className="px-3 py-2 text-right">Actifs</th>
                    <th className="px-3 py-2 text-right">Paiements</th>
                    <th className="px-3 py-2 text-right">Revenu</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${tw.divideBase}`}>
                  {paliers.map((nom) => {
                    const actif = abonnements.par_palier.find((p) => p.palier === nom);
                    const revenu = abonnements.revenu_par_palier.find((p) => p.palier === nom);
                    return (
                      <tr key={nom} className={tw.rowHover}>
                        <td className={`px-3 py-2 font-semibold ${tw.textStrong}`}>{NOMS_PALIERS[nom] || nom}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nombre(actif?.nb)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{nombre(revenu?.nb_paiements)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{montant(revenu?.total_da)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Bloc>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsPeriode;
