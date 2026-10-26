import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookPlus,
  Briefcase,
  Building2,
  Cpu,
  Download,
  FileScan,
  FileText,
  Gauge,
  GraduationCap,
  Inbox,
  KeyRound,
  LineChart,
  PartyPopper,
  Percent,
  RefreshCw,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { notifier } from "../../utils/notifier";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement } from "../../Components/AdminEtat";
import CarteKpi, { nombre, montant, pourcent } from "../../Components/CarteKpi";
import KpiDetail from "../../Components/KpiDetailBlocs";

const ONGLETS = [
  { cle: "apercu", label: "Vue d'ensemble", icon: Gauge },
  { cle: "croissance", label: "Croissance", icon: Users },
  { cle: "activite", label: "Offres et candidatures", icon: Briefcase },
  { cle: "revenus", label: "Revenus et abonnements", icon: Wallet },
  { cle: "ia", label: "Qualité et IA", icon: Cpu },
];

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

const decimal = (n) => String(n).replace(".", ",");

// Valeur seule (indicateur d'état ou sans période précédente) : pas de comparaison affichée.
const seule = (valeur) => ({ valeur });

const Section = ({ titre, icon: Icone, note, children }) => (
  <section className="space-y-4">
    <div className={`flex items-center gap-2 pb-2 border-b ${tw.borderSubtle}`}>
      <Icone size={16} className={tw.textMuted} aria-hidden="true" />
      <h2 className={`text-sm font-bold ${tw.textStrong}`}>{titre}</h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">{children}</div>
    {note && <p className={`text-[11px] leading-relaxed ${tw.textMuted} max-w-3xl`}>{note}</p>}
  </section>
);

const ATRAITER = [
  { cle: "entreprises_a_valider", label: "Entreprises à valider", to: "/admin-taftech/entreprises", icon: Building2 },
  { cle: "offres_a_moderer", label: "Offres à modérer", to: "/admin-taftech/offres", icon: Briefcase },
  { cle: "demandes_ajout", label: "Demandes d'ajout au référentiel", to: "/admin-taftech/metiers-suggeres", icon: BookPlus },
  { cle: "candidatures_recues", label: "Candidatures jamais ouvertes", to: "/admin-taftech/candidatures", icon: Inbox },
];

const BandeauATraiter = ({ donnees }) => (
  <div className="space-y-2">
    <p className={`text-[11px] font-semibold uppercase tracking-wider ${tw.textMuted} flex items-center gap-1.5`}>
      <AlertTriangle size={12} aria-hidden="true" /> À traiter maintenant
    </p>
    <div className="flex flex-wrap gap-2">
      {ATRAITER.map(({ cle, label, to, icon: Icone }) => {
        const n = donnees[cle] ?? 0;
        return (
          <Link
            key={cle}
            to={to}
            className={`inline-flex items-center gap-2 rounded-full border pl-3 pr-1.5 py-1.5 text-xs font-medium transition-colors ${tw.focusRing} ${
              n > 0
                ? `${tw.bgWarningSoft} ${tw.borderWarning} ${tw.textWarning} hover:brightness-95`
                : `${tw.surface} ${tw.borderSubtle} ${tw.textMuted700} hover:bg-slate-50`
            }`}
          >
            <Icone size={14} aria-hidden="true" />
            <span>{label}</span>
            <span className={`min-w-[1.5rem] text-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${n > 0 ? tw.scoreBadgeMid : tw.surfaceMuted}`}>
              {nombre(n)}
            </span>
          </Link>
        );
      })}
    </div>
  </div>
);

const AdminKpi = () => {
  const [periode, setPeriode] = useState(() => periodeDepuisJours(30));
  const [saisie, setSaisie] = useState(periode);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setDonnees(await jobsService.getAdminKpi(periode.debut, periode.fin));
    } catch (err) {
      setErreur(true);
      notifier.echec("Chargement des indicateurs impossible", err);
      reportError("ECHEC_CHARGEMENT_KPI", err);
    } finally {
      setChargement(false);
    }
  }, [periode]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Détail d'un thème : chargé à l'ouverture de l'onglet (et quand la période change), jamais tous d'un coup.
  const [onglet, setOnglet] = useState("apercu");
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [erreurDetail, setErreurDetail] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);

  const chargerDetail = useCallback(async () => {
    if (onglet === "apercu") return;
    setChargementDetail(true);
    setErreurDetail(false);
    try {
      setDetail(await jobsService.getAdminKpiDetail(onglet, periode.debut, periode.fin));
    } catch (err) {
      setErreurDetail(true);
      notifier.echec("Chargement du détail impossible", err);
      reportError("ECHEC_CHARGEMENT_KPI_DETAIL", err);
    } finally {
      setChargementDetail(false);
    }
  }, [onglet, periode]);

  useEffect(() => {
    chargerDetail();
  }, [chargerDetail]);

  const rafraichir = () => {
    charger();
    chargerDetail();
  };

  const exporter = async () => {
    setExportEnCours(true);
    const toastId = notifier.chargement("Génération du fichier en cours");
    try {
      const blob = await jobsService.exportAdminKpi(periode.debut, periode.fin);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const lien = document.createElement("a");
      lien.href = url;
      lien.setAttribute("download", `kpi_taftech_${periode.debut}_au_${periode.fin}.xlsx`);
      document.body.appendChild(lien);
      lien.click();
      lien.parentNode.removeChild(lien);
      window.URL.revokeObjectURL(url);
      notifier.succes("Téléchargement terminé");
    } catch (err) {
      notifier.echec("Exportation impossible", err);
      reportError("ECHEC_EXPORT_KPI", err);
    } finally {
      notifier.fermer(toastId);
      setExportEnCours(false);
    }
  };

  const appliquer = () => {
    if (!saisie.debut || !saisie.fin) return notifier.erreur("Dates manquantes", "Renseignez les deux dates.");
    if (saisie.debut > saisie.fin) return notifier.erreur("Période invalide", "La date de début doit précéder la date de fin.");
    setPeriode(saisie);
    setJoursActifs(null);
  };

  const [joursActifs, setJoursActifs] = useState(30);

  const choisirRaccourci = (jours) => {
    const p = periodeDepuisJours(jours);
    setSaisie(p);
    setPeriode(p);
    setJoursActifs(jours);
  };

  const entete = (
    <AdminPageHeader
      icon={Gauge}
      color="indigo"
      title="KPI"
      subtitle="Indicateurs de pilotage de la plateforme"
      aideKey="kpi"
      aide={[
        "Chaque carte porte sur la période choisie ; la pastille la compare à la période précédente de même durée.",
        "Un tiret signifie qu'il n'y avait rien à comparer. Vert = évolution favorable, rouge = défavorable (pour les échecs, une baisse est favorable).",
        "« Comptes connectés » repose sur la dernière connexion de chaque compte : une période passée sous-estime les connexions.",
        "Les onglets thématiques détaillent chaque domaine : évolution mois par mois, répartitions, classements (Top 10) et parcours (entonnoirs).",
        "Les parcours (entonnoirs) suivent l'état actuel des comptes et candidatures de la période : l'application ne garde pas l'historique des changements de statut.",
        "Le bouton « Exporter » télécharge un classeur Excel avec un onglet par thème ; chaque export est tracé dans le journal d'audit. Pour filtrer par entreprise, voir la page Statistiques.",
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
            onClick={rafraichir}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border ${tw.borderSubtle} bg-white text-xs font-semibold ${tw.textMuted700} hover:bg-slate-50 ${tw.focusRing}`}
          >
            <RefreshCw size={14} className={chargement || chargementDetail ? "animate-spin" : ""} /> Rafraîchir
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
      <button onClick={appliquer} className={`${tw.buttonPrimary} px-4 py-2 text-sm rounded-lg`}>
        Appliquer
      </button>
      <div className={`flex ml-auto p-1 rounded-lg ${tw.surfaceMuted}`} role="group" aria-label="Périodes prédéfinies">
        {RACCOURCIS.map((r) => (
          <button
            key={r.jours}
            onClick={() => choisirRaccourci(r.jours)}
            aria-pressed={joursActifs === r.jours}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${tw.focusRing} ${
              joursActifs === r.jours ? `${tw.surface} ${tw.textStrong} shadow-sm` : tw.textMuted
            }`}
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
        <AdminErreurChargement message="Impossible de charger les indicateurs." onRetry={charger} />
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

  const { croissance, activite, revenus, ia, a_traiter: aTraiter } = donnees;

  return (
    <div className="space-y-8">
      {entete}
      {selecteur}
      <div role="tablist" aria-label="Thèmes" className={`flex flex-wrap gap-1 border-b ${tw.borderSubtle}`}>
        {ONGLETS.map(({ cle, label, icon: Icone }) => (
          <button
            key={cle}
            role="tab"
            aria-selected={onglet === cle}
            onClick={() => setOnglet(cle)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${tw.focusRing} ${
              onglet === cle ? `${tw.spinnerBorderPrimary} ${tw.textStrong}` : `border-transparent ${tw.textMuted}`
            }`}
          >
            <Icone size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {onglet !== "apercu" && (
        <div role="tabpanel" className={chargementDetail ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {erreurDetail && !detail ? (
            <AdminErreurChargement message="Impossible de charger le détail." onRetry={chargerDetail} />
          ) : detail?.theme === onglet ? (
            <KpiDetail detail={detail} />
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorderPrimary}`}></div>
            </div>
          )}
        </div>
      )}

      {onglet === "apercu" && (
        <>
      <BandeauATraiter donnees={aTraiter} />

      <div className={`space-y-10 ${chargement ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CarteKpi grande label="Revenu des abonnements" icon={Wallet} color="gold" format={montant} donnees={revenus.revenu_abonnements_da} />
          <CarteKpi grande label="Candidatures" icon={FileText} color="blue" donnees={activite.candidatures} />
          <CarteKpi
            grande
            label="Recrutements"
            icon={PartyPopper}
            color="emerald"
            donnees={activite.recrutements}
            info="Candidatures passées au statut « Retenu » pendant la période (date de dernière modification, pas d'historique des statuts)."
          />
          <CarteKpi grande label="Nouveaux candidats" icon={GraduationCap} color="violet" donnees={croissance.inscriptions_candidats} />
        </div>

        <Section titre="Croissance" icon={Users}>
          <CarteKpi label="Nouveaux recruteurs" icon={Building2} color="emerald" donnees={croissance.inscriptions_recruteurs} />
          <CarteKpi
            label="Comptes connectés"
            icon={Users}
            color="blue"
            donnees={croissance.comptes_connectes}
            info="Comptes dont la dernière connexion tombe dans la période (tous rôles)."
          />
        </Section>

        <Section titre="Offres et candidatures" icon={Briefcase}>
          <CarteKpi label="Offres créées" icon={Briefcase} color="indigo" donnees={activite.offres} />
          <CarteKpi
            label="Candidatures par offre"
            icon={LineChart}
            color="violet"
            format={decimal}
            donnees={seule(activite.candidatures_par_offre)}
            info="Moyenne sur les offres approuvées créées pendant la période."
          />
          <CarteKpi
            label="Offres sans candidature"
            icon={ShieldAlert}
            color="amber"
            donnees={seule(activite.offres_sans_candidature)}
            moinsEstMieux
          />
          <CarteKpi
            label="Taux de recrutement"
            icon={Percent}
            color="emerald"
            format={pourcent}
            donnees={seule(activite.taux_recrutement_pct)}
            info="Recrutements divisés par les candidatures de la période. Approximation : une candidature déposée plus tôt peut être retenue pendant la période."
          />
          <CarteKpi
            label="Score de matching moyen"
            icon={Activity}
            color="indigo"
            format={pourcent}
            donnees={seule(activite.score_matching_moyen)}
            info="Moyenne des scores de compatibilité des candidatures déposées pendant la période."
          />
        </Section>

        <Section
          titre="Revenus et abonnements"
          icon={Wallet}
          note="Abonnements actifs et expirations : état actuel (l'application ne garde pas l'historique des changements de palier, donc pas de conversion gratuit → payant dans le temps)."
        >
          <CarteKpi label="Revenu des packs de crédits" icon={Wallet} color="gold" format={montant} donnees={revenus.revenu_packs_da} />
          <CarteKpi label="Déblocages CVthèque" icon={KeyRound} color="violet" donnees={revenus.deblocages_cvtheque} />
          <CarteKpi label="Abonnements actifs" icon={Building2} color="emerald" donnees={seule(revenus.abonnements_actifs)} />
          <CarteKpi
            label="Expirent sous 7 jours"
            icon={AlertTriangle}
            color="amber"
            donnees={seule(revenus.expirent_sous_7_jours)}
            moinsEstMieux
          />
          <CarteKpi label="Expirent sous 30 jours" icon={AlertTriangle} color="amber" donnees={seule(revenus.expirent_sous_30_jours)} moinsEstMieux />
        </Section>

        <Section
          titre="Qualité et IA"
          icon={Cpu}
          note="Les appels remboursés (refus du fournisseur) ne sont pas comptés. Le coût en dinars dépend du tarif du fournisseur : voir la page de configuration IA."
        >
          <CarteKpi label="Appels IA" icon={Cpu} color="indigo" donnees={ia.appels} />
          <CarteKpi label="Tokens consommés" icon={Cpu} color="slate" donnees={ia.tokens} info="Entrée + sortie, tous appels confondus." />
          <CarteKpi label="CV analysés" icon={FileScan} color="blue" donnees={ia.cv_analyses} />
          <CarteKpi label="Analyses de CV en échec" icon={ShieldAlert} color="red" donnees={ia.cv_en_echec} moinsEstMieux />
          <CarteKpi label="Taux d'échec des analyses" icon={Percent} color="red" format={pourcent} donnees={ia.taux_echec_cv_pct} moinsEstMieux />
        </Section>
      </div>
        </>
      )}
    </div>
  );
};

export default AdminKpi;
