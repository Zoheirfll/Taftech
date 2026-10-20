import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Gauge, FileSearch, PenLine, Target, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "../../Services/adminService";
import { reportError } from "../../utils/errorReporter";
import { apiErrMsg } from "../../utils/apiErrMsg";
import { confirmToast } from "../../utils/confirmToast";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import { AdminErreurChargement, AdminVide } from "../../Components/AdminEtat";
import AdminPagination from "../../Components/AdminPagination";

const LIGNES_PAR_PAGE = 10;

const ONGLETS = [
  { key: "parser", label: "Parser CV", icon: FileSearch },
  { key: "corrections", label: "Corrections des candidats", icon: PenLine },
  { key: "matching", label: "Matching", icon: Target },
];

const LIBELLES_ERREUR = { IA_INDISPONIBLE: "IA indisponible / limite de débit", PDF_SCANNE: "PDF scanné (image)", "": "Non précisée" };
const LIBELLES_CHAMP = {
  nom_complet: "Nom", telephone: "Téléphone", titre_professionnel: "Titre professionnel",
  bio: "Bio", langues: "Langues", competences: "Compétences",
};
const LIBELLES_TYPE = { METIER_EXPERIENCE: "Métier", DIPLOME: "Diplôme", SPECIALITE: "Spécialité" };

const Kpi = ({ label, valeur, aide, alerte }) => (
  <div className={`${tw.card} p-4`}>
    <p className={`text-[11px] font-semibold uppercase tracking-wider ${tw.textMuted}`}>{label}</p>
    <p className={`text-2xl font-extrabold mt-1 tabular-nums ${alerte ? "text-red-600" : tw.textStrong}`}>{valeur}</p>
    {aide && <p className={`text-[11px] mt-1 ${tw.textMuted}`}>{aide}</p>}
  </div>
);

const Barre = ({ pct, couleur = "bg-indigo-500" }) => (
  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
    <div className={`h-full ${couleur}`} style={{ width: `${Math.min(100, pct)}%` }} />
  </div>
);

const PanneauParser = () => {
  const [jours, setJours] = useState(30);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setData(await adminService.getQualiteIAParser(jours));
    } catch (err) {
      reportError("ECHEC_QUALITE_IA_PARSER_UI", err);
      setErreur(true);
    }
  }, [jours]);

  useEffect(() => { charger(); }, [charger]);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  if (data.total === 0) {
    return <div className={tw.card}><AdminVide icon={FileSearch} titre="Aucun CV analysé sur cette période." texte="Le journal se remplit à chaque analyse de CV par un candidat." /></div>;
  }
  const maxSemaine = Math.max(...data.par_semaine.map((s) => s.total), 1);
  const totalPages = Math.max(1, Math.ceil(data.recents.length / LIGNES_PAR_PAGE));
  const pageCourante = Math.min(page, totalPages);
  const recentsAffiches = data.recents.slice((pageCourante - 1) * LIGNES_PAR_PAGE, pageCourante * LIGNES_PAR_PAGE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <select value={jours} onChange={(e) => { setJours(Number(e.target.value)); setPage(1); }} className={`px-3 py-2 text-sm rounded-lg ${tw.inputColorsMuted}`} aria-label="Période">
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={365}>12 derniers mois</option>
        </select>
        <button type="button" onClick={charger} className={`flex items-center gap-1.5 text-xs font-semibold ${tw.linkPrimary}`}><RefreshCw size={13} /> Actualiser</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="CV analysés" valeur={data.total} aide={`Durée moyenne ${(data.duree_moyenne_ms / 1000).toFixed(1)} s`} />
        <Kpi label="Taux de réussite" valeur={`${data.taux_reussite}%`} alerte={data.taux_reussite < 90} />
        <Kpi label="Expériences sans métier" valeur={`${data.pct_exp_sans_metier}%`} aide={`Repli mots-clés : ${data.pct_exp_metier_repli}% — IA : ${data.pct_exp_metier_ia}%`} alerte={data.pct_exp_sans_metier > 20} />
        <Kpi label="Formations sans diplôme" valeur={`${data.pct_formations_sans_diplome}%`} aide="Aucun diplôme du référentiel trouvé" alerte={data.pct_formations_sans_diplome > 30} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${tw.card} p-4`}>
          <h3 className={`text-sm font-bold mb-3 ${tw.textStrong}`}>Analyses par semaine</h3>
          <div className="space-y-2">
            {data.par_semaine.map((s) => (
              <div key={s.semaine} className="flex items-center gap-3 text-xs">
                <span className={`w-20 shrink-0 ${tw.textMuted}`}>{new Date(s.semaine).toLocaleDateString("fr-FR")}</span>
                <div className="flex-1"><Barre pct={(s.total / maxSemaine) * 100} couleur={s.reussis < s.total ? "bg-amber-500" : "bg-indigo-500"} /></div>
                <span className="w-16 text-right tabular-nums">{s.reussis}/{s.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${tw.card} p-4 space-y-4`}>
          <div>
            <h3 className={`text-sm font-bold mb-2 ${tw.textStrong}`}>Erreurs</h3>
            {data.erreurs.length === 0 ? <p className={`text-xs ${tw.textMuted}`}>Aucune erreur sur la période.</p> : (
              <ul className="text-xs space-y-1">
                {data.erreurs.map((e) => (
                  <li key={e.code_erreur} className="flex justify-between"><span>{LIBELLES_ERREUR[e.code_erreur] || e.code_erreur}</span><span className="font-semibold tabular-nums">{e.n}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className={`text-sm font-bold mb-2 ${tw.textStrong}`}>Champs les plus souvent vides</h3>
            {data.champs_vides.length === 0 ? <p className={`text-xs ${tw.textMuted}`}>Aucun.</p> : (
              <ul className="text-xs space-y-1">
                {data.champs_vides.map((c) => (
                  <li key={c.champ} className="flex justify-between"><span>{LIBELLES_CHAMP[c.champ] || c.champ}</span><span className="font-semibold tabular-nums">{c.n}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className={`text-sm font-bold mb-2 ${tw.textStrong}`}>Version du parser</h3>
            <ul className="text-xs space-y-1">
              {data.par_version.map((v) => (
                <li key={v.version_parser} className="flex justify-between"><span>{v.version_parser}</span><span className="tabular-nums">{v.reussis}/{v.n} réussis</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Résultat</th><th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3">Exp.</th><th className="px-4 py-3">Sans métier</th><th className="px-4 py-3">Formations</th>
                <th className="px-4 py-3">Compétences</th><th className="px-4 py-3">Version</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase} text-xs`}>
              {recentsAffiches.map((p) => (
                <tr key={p.id} className={tw.rowHover}>
                  <td className="px-4 py-2.5">{new Date(p.date).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.succes ? `${tw.bgSuccessSoft} ${tw.textSuccess}` : tw.badgeErrorLight}`}>
                      {p.succes ? "Réussi" : LIBELLES_ERREUR[p.code_erreur] || "Échec"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{(p.duree_ms / 1000).toFixed(1)} s</td>
                  <td className="px-4 py-2.5 tabular-nums">{p.nb_experiences}</td>
                  <td className="px-4 py-2.5 tabular-nums">{p.exp_sans_metier}</td>
                  <td className="px-4 py-2.5 tabular-nums">{p.nb_formations}</td>
                  <td className="px-4 py-2.5">{p.nb_competences} {p.source_competences === "SECTION" ? "(bloc du CV)" : p.source_competences === "IA" ? "(IA)" : ""}</td>
                  <td className="px-4 py-2.5">{p.version || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={pageCourante} totalPages={totalPages} totalCount={data.recents.length} onChange={setPage} />
      </div>
    </div>
  );
};

const PanneauCorrections = () => {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setData(await adminService.getQualiteIACorrections(type));
    } catch (err) {
      reportError("ECHEC_QUALITE_IA_CORRECTIONS_UI", err);
      setErreur(true);
    }
  }, [type]);

  useEffect(() => { charger(); }, [charger]);

  const creerAppellation = (ligne) => {
    confirmToast(
      `Ajouter « ${ligne.texte_source} » comme appellation du métier « ${ligne.corrige_libelle} » ? Les prochains CV avec cet intitulé seront rattachés à ce métier.`,
      async () => {
        try {
          await adminService.creerAppellationDepuisCorrection(ligne.texte_source, ligne.corrige_id);
          toast.success("Appellation ajoutée au référentiel.");
        } catch (err) {
          toast.error(apiErrMsg(err, "Impossible d'ajouter l'appellation."));
        }
      },
    );
  };

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;

  const totalPages = Math.max(1, Math.ceil(data.resultats.length / LIGNES_PAR_PAGE));
  const pageCourante = Math.min(page, totalPages);
  const resultatsAffiches = data.resultats.slice((pageCourante - 1) * LIGNES_PAR_PAGE, pageCourante * LIGNES_PAR_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={`px-3 py-2 text-sm rounded-lg ${tw.inputColorsMuted}`} aria-label="Type de correction">
          <option value="">Tous les types</option>
          <option value="METIER_EXPERIENCE">Métiers</option>
          <option value="DIPLOME">Diplômes</option>
          <option value="SPECIALITE">Spécialités</option>
        </select>
        <p className={`text-xs ${tw.textMuted}`}>{data.total} correction(s) enregistrée(s)</p>
      </div>
      <div className={`${tw.card} overflow-hidden`}>
        {data.resultats.length === 0 ? (
          <AdminVide icon={PenLine} titre="Aucune correction pour l'instant." texte="Une ligne apparaît quand un candidat modifie un métier, un diplôme ou une spécialité pré-rempli par le parser." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[780px]">
              <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-4 py-3">Type</th><th className="px-4 py-3">Intitulé déclaré</th>
                  <th className="px-4 py-3">Proposé par le parser</th><th className="px-4 py-3">Choisi par le candidat</th>
                  <th className="px-4 py-3 text-center">Fois</th><th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase} text-xs`}>
                {resultatsAffiches.map((l, i) => (
                  <tr key={i} className={tw.rowHover}>
                    <td className="px-4 py-2.5">{LIBELLES_TYPE[l.type_correction]}</td>
                    <td className="px-4 py-2.5 font-medium">{l.texte_source || "—"}</td>
                    <td className="px-4 py-2.5">{l.propose_libelle || <span className={tw.textMuted}>Rien</span>}</td>
                    <td className="px-4 py-2.5">{l.corrige_libelle || <span className={tw.textMuted}>Retiré</span>}</td>
                    <td className="px-4 py-2.5 text-center font-bold tabular-nums">{l.n}</td>
                    <td className="px-4 py-2.5 text-right">
                      {l.type_correction === "METIER_EXPERIENCE" && l.corrige_id && l.texte_source && (
                        <button type="button" onClick={() => creerAppellation(l)} className={`text-xs font-semibold ${tw.linkPrimary}`}>Ajouter l'appellation</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination page={pageCourante} totalPages={totalPages} totalCount={data.resultats.length} onChange={setPage} />
      </div>
    </div>
  );
};

const PanneauMatching = () => {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setData(await adminService.getQualiteIAMatching());
    } catch (err) {
      reportError("ECHEC_QUALITE_IA_MATCHING_UI", err);
      setErreur(true);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{data.avertissement}</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="Candidatures scorées" valeur={data.total_scorees} />
        <Kpi label="Score ≥ 80 % refusées" valeur={data.forts_scores_refuses} aide="Un critère est peut-être mal pondéré" />
        <Kpi label="Score ≥ 80 % non traitées (14 j)" valeur={data.forts_scores_non_traites_14j} aide="Bons profils restés sans réponse" alerte={data.forts_scores_non_traites_14j > 0} />
      </div>
      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-4 py-3">Tranche de score</th><th className="px-4 py-3 text-center">Candidatures</th>
                <th className="px-4 py-3 text-center">Présélection ou +</th><th className="px-4 py-3 text-center">Entretien ou +</th>
                <th className="px-4 py-3 text-center">Retenus</th><th className="px-4 py-3 text-center">Refusés</th><th className="px-4 py-3 text-center">Non traités</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase} text-xs`}>
              {data.tranches.map((t) => (
                <tr key={t.tranche} className={tw.rowHover}>
                  <td className="px-4 py-2.5 font-semibold">{t.tranche}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{t.total}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{t.pct_preselection_ou_plus}%</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{t.pct_entretien_ou_plus}%</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{t.pct_retenu}%</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{t.pct_refuse}%</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{t.pct_non_traite}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className={`text-xs ${tw.textMuted}`}>Lecture : si le score est pertinent, les pourcentages de présélection et d'entretien doivent augmenter d'une tranche à la suivante.</p>
    </div>
  );
};

const PANNEAUX = { parser: PanneauParser, corrections: PanneauCorrections, matching: PanneauMatching };

const AdminQualiteIA = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actif = ONGLETS.find((o) => o.key === searchParams.get("tab"))?.key || "parser";
  const Panneau = PANNEAUX[actif];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Gauge}
        color="violet"
        title="Qualité IA"
        subtitle="Mesurer et améliorer le parser de CV et le matching à partir de l'usage réel."
        aideKey="qualite-ia"
        aide={[
          "Le journal ne conserve jamais le contenu des CV : uniquement des compteurs (nombre d'expériences, métiers trouvés ou non…). Il est purgé automatiquement après 12 mois.",
          "Les corrections sont les champs pré-remplis par le parser que le candidat a modifiés (métier, diplôme, spécialité). Une correction fréquente signale un intitulé mal reconnu : ajoutez-le comme appellation en un clic.",
          "Une correction isolée n'est pas une preuve : le candidat peut aussi changer par préférence. Regardez les corrections répétées.",
          "Le matching n'est lisible qu'avec assez de décisions de recruteurs : avant cela, les pourcentages sont indicatifs.",
        ]}
      />
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Sections Qualité IA">
        {ONGLETS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={actif === key}
            onClick={() => setSearchParams({ tab: key })}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t ${
              actif === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel"><Panneau /></div>
    </div>
  );
};

export default AdminQualiteIA;
