import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, Network, GraduationCap, AlertTriangle, ChevronRight, ChevronDown, Search, X, ArrowLeft } from "lucide-react";
import { adminService } from "../../Services/adminService";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import AdminPagination from "../../Components/AdminPagination";
import { AdminErreurChargement, AdminVide } from "../../Components/AdminEtat";
import { reportError } from "../../utils/errorReporter";
import useEchapPourFermer from "../../utils/useEchapPourFermer";

const ONGLETS = [
  { key: "metiers", label: "Métiers (arbre)", icon: Network },
  { key: "formations", label: "Formations", icon: GraduationCap },
  { key: "anomalies", label: "À vérifier", icon: AlertTriangle },
];
const ANOMALIES = [
  { code: "metiers_sans_groupe", label: "Métiers sans secteur ni domaine", aide: "Un métier non classé n'apparaît dans aucune statistique par secteur." },
  { code: "metiers_sans_competence", label: "Métiers sans compétence suggérée", aide: "L'offre et le candidat n'ont aucune suggestion de compétence pour ces métiers." },
  { code: "metiers_sans_appellation", label: "Métiers sans appellation", aide: "Aucun intitulé alternatif : le parser de CV a moins de chances de les reconnaître." },
  { code: "metiers_sans_formation", label: "Métiers sans spécialité suggérée", aide: "Pas de suggestion de formation pour rédiger une offre sur ces métiers." },
  { code: "groupes_vides", label: "Secteurs et domaines sans métier", aide: "Des branches de la hiérarchie qui ne contiennent aucun métier actif." },
  { code: "specialites_sans_diplome", label: "Spécialités sans diplôme lié", aide: "Ces spécialités n'apparaissent dans aucun couple diplôme + spécialité." },
];

const sansAccent = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Navigation par fenêtres empilées : chaque chiffre ouvre sa liste, on peut enchaîner (métier → spécialité
// → métier…) et revenir en arrière. `ouvrir({ type, titre, ...données })` est fourni par la page.
const NavigationContext = createContext({ ouvrir: () => {} });
const useNavigation = () => useContext(NavigationContext);

const Kpi = ({ label, valeur }) => (
  <div className={`${tw.card} p-4`}>
    <p className={`text-[11px] font-semibold uppercase tracking-wider ${tw.textMuted}`}>{label}</p>
    <p className={`text-2xl font-extrabold mt-1 tabular-nums ${tw.textStrong}`}>{valeur}</p>
  </div>
);

const DELAI_RECHERCHE_MS = 300;

// Saisie + terme appliqué avec un délai : on n'interroge pas le serveur à chaque frappe.
const useRechercheDifferee = () => {
  const [saisie, setSaisie] = useState("");
  const [terme, setTerme] = useState("");
  useEffect(() => {
    const minuteur = setTimeout(() => setTerme(saisie.trim()), DELAI_RECHERCHE_MS);
    return () => clearTimeout(minuteur);
  }, [saisie]);
  return [saisie, setSaisie, terme];
};

const ChampRecherche = ({ valeur, onChange, label }) => (
  <div className="px-4 pb-3">
    <div className="relative">
      <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
      <input value={valeur} onChange={(e) => onChange(e.target.value)} className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg ${tw.inputColorsMuted}`} aria-label={label} />
    </div>
  </div>
);

// Hook de chargement : `chargeur` doit avoir une référence stable (useCallback), sinon boucle.
const useChargement = (chargeur) => {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(false);
  const charger = useCallback(async () => {
    setErreur(false);
    try {
      setData(await chargeur());
    } catch (err) {
      reportError("ECHEC_EXPLORATEUR_UI", err);
      setErreur(true);
    }
  }, [chargeur]);
  useEffect(() => { charger(); }, [charger]);
  return { data, erreur, charger };
};

// Un chiffre sur lequel on peut cliquer pour voir ce qu'il compte (0 = rien à voir, donc pas de lien).
const NombreLien = ({ n, onClick, label }) => (n > 0 ? (
  <button type="button" onClick={onClick} aria-label={label} className={`px-1.5 rounded font-semibold tabular-nums hover:underline ${tw.linkPrimary} ${tw.focusRing}`}>{n}</button>
) : <span className={`tabular-nums ${tw.textMuted}`}>0</span>);

const Modale = ({ titre, peutRevenir, onRetour, onFermerTout, children }) => {
  useEchapPourFermer(true, onRetour);
  return (
    <div className={`${tw.modalOverlay} p-4`} onClick={(e) => e.target === e.currentTarget && onFermerTout()}>
      <div role="dialog" aria-modal="true" aria-label={titre} className={`${tw.surface} rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b ${tw.borderSubtle} ${tw.surface}`}>
          <div className="flex items-center gap-2 min-w-0">
            {peutRevenir && (
              <button type="button" onClick={onRetour} aria-label="Retour" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><ArrowLeft size={16} /></button>
            )}
            <h2 className={`text-base font-bold truncate ${tw.textStrong}`}>{titre}</h2>
          </div>
          <button type="button" onClick={onFermerTout} aria-label="Fermer" className={`p-1.5 ${tw.iconButtonHoverNeutral} rounded-lg ${tw.focusRing}`}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const BadgeNombre = ({ n, onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums hover:underline ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} border ${tw.borderPrimary200} ${tw.focusRing}`}>{n}</button>
);

const NoeudArbre = ({ groupe, enfantsDe, ouverts, selectionId, onBasculer, onChoisir, onVoirTous, profondeur }) => {
  const enfants = enfantsDe[groupe.id] || [];
  const ouvert = ouverts.has(groupe.id);
  return (
    <li>
      <div
        className={`flex items-center gap-1.5 pr-2 rounded-lg ${tw.rowHover} ${selectionId === groupe.id ? tw.surfaceMuted : ""}`}
        style={{ paddingLeft: `${profondeur * 16 + 4}px` }}
      >
        {enfants.length ? (
          <button type="button" onClick={() => onBasculer(groupe.id)} className={`p-1 ${tw.textMuted} ${tw.focusRing} rounded`} aria-label={ouvert ? "Replier" : "Déplier"} aria-expanded={ouvert}>
            {ouvert ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : <span className="w-6" />}
        <button type="button" onClick={() => onChoisir(groupe)} className={`flex-1 min-w-0 text-left py-1.5 text-sm ${tw.textStrong} ${tw.focusRing} rounded`}>
          <span className={`text-[10px] uppercase mr-2 ${tw.textMuted}`}>{groupe.type_libelle}</span>
          <span className="truncate">{groupe.libelle}</span>
        </button>
        {groupe.nb_metiers > 0
          ? <BadgeNombre n={groupe.nb_metiers} onClick={() => onVoirTous(groupe)} label={`Voir les ${groupe.nb_metiers} métiers de ${groupe.libelle}`} />
          : <span className={`px-2 text-[10px] tabular-nums ${tw.textMuted}`}>0</span>}
      </div>
      {ouvert && enfants.length > 0 && (
        <ul>
          {enfants.map((e) => (
            <NoeudArbre key={e.id} groupe={e} enfantsDe={enfantsDe} ouverts={ouverts} selectionId={selectionId} onBasculer={onBasculer} onChoisir={onChoisir} onVoirTous={onVoirTous} profondeur={profondeur + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

// Liste de pastilles ; chaque pastille est cliquable si `onClick` est fourni.
const Liste = ({ titre, vide, elements }) => {
  const inactifs = elements.filter((e) => e.inactif).length;
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${tw.textMuted}`}>
        {titre} ({elements.length - inactifs}{inactifs ? ` + ${inactifs} inactif(s)` : ""})
      </p>
      {elements.length === 0 ? <p className={`text-xs ${tw.textMuted}`}>{vide}</p> : (
        <ul className="flex flex-wrap gap-1.5">
          {elements.map((e) => {
            const classes = `px-2 py-0.5 rounded-full text-xs ${tw.surfaceMuted} border ${tw.borderSubtle} ${e.inactif ? tw.textMuted : ""}`;
            return (
              <li key={e.cle}>
                {e.onClick
                  ? <button type="button" onClick={e.onClick} className={`${classes} hover:underline ${tw.focusRing}`}>{e.texte}</button>
                  : <span className={classes}>{e.texte}{e.inactif ? " (inactif)" : ""}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const VueMetier = ({ id }) => {
  const { ouvrir } = useNavigation();
  const chargerFiche = useCallback(() => adminService.getExplorateurMetier(id), [id]);
  const { data: fiche, erreur, charger } = useChargement(chargerFiche);
  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!fiche) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  return (
    <div className="space-y-4">
      <p className={`text-xs ${tw.textMuted}`}>
        {fiche.chemin.length ? fiche.chemin.map((c) => c.libelle).join(" › ") : "Aucun secteur ni domaine"} · code {fiche.metier.code}
        {fiche.metier.redirige_vers ? ` · redirigé vers « ${fiche.metier.redirige_vers} »` : ""}
      </p>
      <Liste titre="Appellations" vide="Aucune appellation." elements={fiche.appellations.map((a) => ({ cle: a.id, texte: a.libelle, inactif: !a.actif }))} />
      <Liste titre="Compétences suggérées" vide="Aucune compétence suggérée." elements={fiche.competences.map((c) => ({ cle: c.competence_id, texte: c.competence__label, inactif: !c.competence__actif }))} />
      <Liste
        titre="Spécialités suggérées (cliquez pour voir la spécialité)"
        vide="Aucune spécialité suggérée."
        elements={fiche.specialites.map((s) => ({
          cle: s.specialite_id, texte: s.specialite__libelle,
          onClick: () => ouvrir({ type: "specialite", id: s.specialite_id, titre: s.specialite__libelle }),
        }))}
      />
    </div>
  );
};

const VueSpecialite = ({ id }) => {
  const { ouvrir } = useNavigation();
  const chargerFiche = useCallback(() => adminService.getExplorateurSpecialite(id), [id]);
  const { data: fiche, erreur, charger } = useChargement(chargerFiche);
  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!fiche) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  const s = fiche.specialite;
  return (
    <div className="space-y-4">
      <p className={`text-xs ${tw.textMuted}`}>
        {s.domaine}{s.filiere ? ` › ${s.filiere}` : ""} · code {s.code}{s.nature ? ` · ${s.nature}` : ""}{!s.selectionnable ? " · masquée" : ""}
      </p>
      <Liste titre="Diplômes avec lesquels elle est attestée" vide="Aucun diplôme lié." elements={fiche.diplomes.map((d) => ({ cle: d.diplome_id, texte: `${d.diplome__libelle} (${d.diplome__systeme})` }))} />
      <Liste
        titre="Métiers liés (cliquez pour voir le métier)"
        vide="Aucun métier lié."
        elements={fiche.metiers.map((m) => ({
          cle: m.id, texte: `${m.libelle} — ${m.groupe}`,
          onClick: () => ouvrir({ type: "metier", id: m.id, titre: m.libelle }),
        }))}
      />
    </div>
  );
};

const VueFilieres = ({ filieres }) => (
  <ul className={`divide-y ${tw.divideBase} text-sm`}>
    {filieres.map((f) => (
      <li key={f.id} className="py-2 flex justify-between gap-3">
        <span className={tw.textStrong}>{f.libelle}</span>
        <span className={`tabular-nums ${tw.textMuted}`}>{f.nb_specialites} spécialité(s)</span>
      </li>
    ))}
  </ul>
);

// Métiers d'un groupe (directs, ou avec sous-groupes) : recherche, pagination serveur, chiffres cliquables.
const TableauMetiers = ({ groupe, sousGroupes = false, enModale = false }) => {
  const { ouvrir } = useNavigation();
  const [page, setPage] = useState(1);
  const [saisie, setSaisie, terme] = useRechercheDifferee();
  const chargerGroupe = useCallback(() => adminService.getExplorateurGroupe(groupe.id, page, terme, sousGroupes), [groupe.id, page, terme, sousGroupes]);
  const { data, erreur, charger } = useChargement(chargerGroupe);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  const voir = (m) => () => ouvrir({ type: "metier", id: m.id, titre: m.libelle });

  return (
    <div className={enModale ? "" : `${tw.card} overflow-hidden`}>
      <p className={`${enModale ? "pb-3" : "px-4 py-3"} text-sm font-semibold ${tw.textStrong}`}>
        {enModale ? `${data.total} métier(s)` : `${data.groupe.libelle} · ${data.total} métier(s) directement rattaché(s)`}
      </p>
      <ChampRecherche valeur={saisie} onChange={(v) => { setSaisie(v); setPage(1); }} label="Rechercher un métier dans cette liste" />
      {data.total === 0 ? (
        <AdminVide icon={Network} titre="Aucun métier." texte={terme ? "Aucun métier ne correspond à cette recherche." : "Dépliez le groupe : ses métiers sont dans les sous-groupes."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[480px]">
            <thead className={`${tw.surfaceMuted} border-y ${tw.borderSubtle}`}>
              <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                <th className="px-4 py-2">Métier</th>
                {sousGroupes && <th className="px-3 py-2">Groupe</th>}
                <th className="px-3 py-2 text-center">Appell.</th><th className="px-3 py-2 text-center">Compét.</th><th className="px-3 py-2 text-center">Spéc.</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tw.divideBase} text-xs`}>
              {data.metiers.map((m) => (
                <tr key={m.id} className={tw.rowHover}>
                  <td className="px-4 py-2 font-medium">
                    <button type="button" onClick={voir(m)} className={`text-left hover:underline ${tw.focusRing} rounded`}>{m.libelle}</button>
                  </td>
                  {sousGroupes && <td className={`px-3 py-2 ${tw.textMuted}`}>{m.groupe}</td>}
                  <td className="px-3 py-2 text-center"><NombreLien n={m.nb_appellations} onClick={voir(m)} label={`Voir les appellations de ${m.libelle}`} /></td>
                  <td className="px-3 py-2 text-center"><NombreLien n={m.nb_competences} onClick={voir(m)} label={`Voir les compétences de ${m.libelle}`} /></td>
                  <td className="px-3 py-2 text-center"><NombreLien n={m.nb_formations} onClick={voir(m)} label={`Voir les spécialités de ${m.libelle}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPagination page={data.page} totalPages={data.total_pages} totalCount={data.total} onChange={setPage} />
    </div>
  );
};

const PanneauMetiers = () => {
  const { ouvrir } = useNavigation();
  const { data, erreur, charger } = useChargement(adminService.getExplorateurArbre);
  const [ouverts, setOuverts] = useState(() => new Set());
  const [groupe, setGroupe] = useState(null);
  const [recherche, setRecherche] = useState("");

  const enfantsDe = useMemo(() => {
    const index = {};
    (data?.groupes || []).forEach((g) => { (index[g.parent_id] = index[g.parent_id] || []).push(g); });
    Object.values(index).forEach((liste) => liste.sort((a, b) => sansAccent(a.libelle).localeCompare(sansAccent(b.libelle))));
    return index;
  }, [data]);

  const basculer = useCallback((id) => setOuverts((prev) => {
    const suivant = new Set(prev);
    if (suivant.has(id)) suivant.delete(id); else suivant.add(id);
    return suivant;
  }), []);

  const voirTous = useCallback((g) => ouvrir({ type: "metiers", groupe: g, titre: `${g.type_libelle} · ${g.libelle}` }), [ouvrir]);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;

  const racines = enfantsDe[null] || [];
  const terme = sansAccent(recherche.trim());
  const trouves = terme ? data.groupes.filter((g) => sansAccent(g.libelle).includes(terme)) : [];
  const t = data.totaux;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Secteurs" valeur={t.secteurs} />
        <Kpi label="Domaines" valeur={t.domaines} />
        <Kpi label="Sous-domaines" valeur={t.sous_domaines} />
        <Kpi label="Métiers actifs" valeur={t.metiers_actifs} />
        <Kpi label="Appellations" valeur={t.appellations} />
        <Kpi label="Liens métier ↔ compétence" valeur={t.liens_competences} />
        <Kpi label="Liens métier ↔ spécialité" valeur={t.liens_formations} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className={`${tw.card} p-3`}>
          <div className="relative mb-3">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg ${tw.inputColorsMuted}`} aria-label="Rechercher un secteur ou un domaine" />
          </div>
          <p className={`px-1 pb-2 text-[11px] ${tw.textMuted}`}>Cliquez le nom pour voir les métiers directs, le chiffre pour voir tous les métiers (sous-groupes compris).</p>
          <ul className="max-h-[560px] overflow-y-auto">
            {terme ? (
              trouves.length === 0 ? <p className={`p-3 text-xs ${tw.textMuted}`}>Aucun groupe ne correspond.</p> : trouves.map((g) => (
                <NoeudArbre key={g.id} groupe={g} enfantsDe={{}} ouverts={ouverts} selectionId={groupe?.id} onBasculer={basculer} onChoisir={setGroupe} onVoirTous={voirTous} profondeur={0} />
              ))
            ) : racines.map((g) => (
              <NoeudArbre key={g.id} groupe={g} enfantsDe={enfantsDe} ouverts={ouverts} selectionId={groupe?.id} onBasculer={basculer} onChoisir={setGroupe} onVoirTous={voirTous} profondeur={0} />
            ))}
          </ul>
        </div>
        {groupe ? <TableauMetiers key={groupe.id} groupe={groupe} /> : (
          <div className={tw.card}><AdminVide icon={Compass} titre="Choisissez un secteur ou un domaine." texte="Le nombre à droite de chaque ligne est le total de métiers actifs qu'elle contient, sous-groupes compris : cliquez-le pour les voir." /></div>
        )}
      </div>
    </div>
  );
};

const SpecialitesDomaine = ({ domaine }) => {
  const { ouvrir } = useNavigation();
  const [page, setPage] = useState(1);
  const [saisie, setSaisie, terme] = useRechercheDifferee();
  const chargerSpecialites = useCallback(() => adminService.getExplorateurFormations(domaine.id, page, terme), [domaine.id, page, terme]);
  const { data, erreur, charger } = useChargement(chargerSpecialites);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  const voir = (s) => () => ouvrir({ type: "specialite", id: s.id, titre: s.libelle });

  return (
    <div className={`${tw.card} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <p className={`text-sm font-semibold ${tw.textStrong}`}>{domaine.libelle} · {data.total} spécialité(s)</p>
        {data.filieres.length > 0 && (
          <button type="button" onClick={() => ouvrir({ type: "filieres", titre: `Filières · ${domaine.libelle}`, filieres: data.filieres })} className={`text-xs font-semibold hover:underline ${tw.linkPrimary} ${tw.focusRing} rounded`}>
            Voir les {data.filieres.length} filière(s)
          </button>
        )}
      </div>
      <ChampRecherche valeur={saisie} onChange={(v) => { setSaisie(v); setPage(1); }} label="Rechercher une spécialité dans ce domaine" />
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[480px]">
          <thead className={`${tw.surfaceMuted} border-y ${tw.borderSubtle}`}>
            <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
              <th className="px-4 py-2">Spécialité</th><th className="px-3 py-2">Filière</th>
              <th className="px-3 py-2 text-center">Diplômes</th><th className="px-3 py-2 text-center">Métiers</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${tw.divideBase} text-xs`}>
            {data.specialites.map((s) => (
              <tr key={s.id} className={tw.rowHover}>
                <td className="px-4 py-2 font-medium">
                  <button type="button" onClick={voir(s)} className={`text-left hover:underline ${tw.focusRing} rounded`}>{s.libelle}</button>{!s.selectionnable ? " (masquée)" : ""}
                </td>
                <td className="px-3 py-2">{s.filiere || "—"}</td>
                <td className="px-3 py-2 text-center"><NombreLien n={s.nb_diplomes} onClick={voir(s)} label={`Voir les diplômes liés à ${s.libelle}`} /></td>
                <td className="px-3 py-2 text-center"><NombreLien n={s.nb_metiers} onClick={voir(s)} label={`Voir les métiers liés à ${s.libelle}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminPagination page={data.page} totalPages={data.total_pages} totalCount={data.total} onChange={setPage} />
    </div>
  );
};

const PanneauFormations = () => {
  const [domaine, setDomaine] = useState(null);
  const [recherche, setRecherche] = useState("");
  const chargerDomaines = useCallback(() => adminService.getExplorateurFormations(), []);
  const { data, erreur, charger } = useChargement(chargerDomaines);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;

  const terme = sansAccent(recherche.trim());
  const domaines = terme ? data.domaines.filter((d) => sansAccent(d.libelle).includes(terme)) : data.domaines;
  const t = data.totaux;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Domaines" valeur={t.domaines} />
        <Kpi label="Filières" valeur={t.filieres} />
        <Kpi label="Spécialités" valeur={t.specialites} />
        <Kpi label="Types de diplôme" valeur={t.types_diplome} />
        <Kpi label="Liens diplôme ↔ spécialité" valeur={t.liens_diplome_specialite} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className={`${tw.card} p-3`}>
          <div className="relative mb-3">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${tw.textMuted}`} />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg ${tw.inputColorsMuted}`} aria-label="Rechercher un domaine de formation" />
          </div>
          <ul className="max-h-[560px] overflow-y-auto">
            {domaines.length === 0 && <li className={`p-3 text-xs ${tw.textMuted}`}>Aucun domaine ne correspond.</li>}
            {domaines.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setDomaine(d)} className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm ${tw.rowHover} ${tw.focusRing} ${domaine?.id === d.id ? tw.surfaceMuted : ""}`}>
                  <span className={tw.textStrong}>{d.libelle}{!d.actif ? " (inactif)" : ""}</span>
                  <span className={`text-[11px] tabular-nums ${tw.textMuted}`}>{d.nb_filieres} filière(s) · {d.nb_specialites} spéc.</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {!domaine ? (
          <div className={tw.card}><AdminVide icon={GraduationCap} titre="Choisissez un domaine de formation." texte="Vous verrez ses spécialités ; cliquez un chiffre de diplômes ou de métiers pour voir la liste." /></div>
        ) : <SpecialitesDomaine key={domaine.id} domaine={domaine} />}
      </div>
    </div>
  );
};

const ListeAnomalie = ({ anomalie }) => {
  const { ouvrir } = useNavigation();
  const [page, setPage] = useState(1);
  const [saisie, setSaisie, terme] = useRechercheDifferee();
  const chargerListe = useCallback(() => adminService.getExplorateurAnomalie(anomalie.code, page, terme), [anomalie.code, page, terme]);
  const { data, erreur, charger } = useChargement(chargerListe);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  return (
    <div className={`${tw.card} overflow-hidden`}>
      <p className={`px-4 py-3 text-sm font-semibold ${tw.textStrong}`}>{anomalie.label} · {data.total}</p>
      <ChampRecherche valeur={saisie} onChange={(v) => { setSaisie(v); setPage(1); }} label="Rechercher dans cette liste" />
      {data.elements.length === 0 ? <AdminVide icon={AlertTriangle} titre="Rien à signaler." texte={terme ? "Aucun résultat pour cette recherche." : "Cette vérification ne remonte aucun élément."} /> : (
        <ul className={`divide-y ${tw.divideBase} text-xs`}>
          {data.elements.map((e) => (
            <li key={`${e.id}-${e.libelle}`} className="px-4 py-2 flex justify-between gap-3">
              {e.metier_id
                ? <button type="button" onClick={() => ouvrir({ type: "metier", id: e.metier_id, titre: e.libelle })} className={`font-medium text-left hover:underline ${tw.focusRing} rounded`}>{e.libelle}</button>
                : <span className="font-medium">{e.libelle}</span>}
              <span className={tw.textMuted}>{e.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <AdminPagination page={data.page} totalPages={data.total_pages} totalCount={data.total} onChange={setPage} />
    </div>
  );
};

const PanneauAnomalies = () => {
  const [code, setCode] = useState(null);
  const { data, erreur, charger } = useChargement(adminService.getExplorateurArbre);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  const choisie = ANOMALIES.find((a) => a.code === code);
  const comptes = ANOMALIES.map((a) => data.anomalies[a.code]);
  const aCorriger = comptes.reduce((somme, n) => somme + n, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Vérifications sans problème" valeur={`${comptes.filter((n) => n === 0).length} / ${ANOMALIES.length}`} />
        <Kpi label="Éléments à corriger" valeur={aCorriger} />
        <Kpi label="Métiers actifs" valeur={data.totaux.metiers_actifs} />
        <Kpi label="Spécialités" valeur={data.totaux.specialites} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <ul className={`${tw.card} p-2`}>
          {ANOMALIES.map((a) => {
            const n = data.anomalies[a.code];
            return (
              <li key={a.code}>
                <button type="button" onClick={() => setCode(a.code)} className={`w-full text-left px-3 py-2.5 rounded-lg ${tw.rowHover} ${tw.focusRing} ${code === a.code ? tw.surfaceMuted : ""}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${tw.textStrong}`}>{a.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${n ? tw.badgeErrorLight : `${tw.bgSuccessSoft} ${tw.textSuccess}`}`}>{n}</span>
                  </span>
                  <span className={`block text-[11px] mt-0.5 ${tw.textMuted}`}>{a.aide}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {!choisie ? (
          <div className={tw.card}><AdminVide icon={AlertTriangle} titre="Choisissez une vérification." texte="Un chiffre à 0 (vert) signifie que rien n'est à corriger sur ce point." /></div>
        ) : <ListeAnomalie key={choisie.code} anomalie={choisie} />}
      </div>
    </div>
  );
};

const PANNEAUX = { metiers: PanneauMetiers, formations: PanneauFormations, anomalies: PanneauAnomalies };

// Contenu de la fenêtre selon la vue en haut de la pile.
const contenuVue = (vue) => {
  if (vue.type === "metier") return <VueMetier key={vue.id} id={vue.id} />;
  if (vue.type === "specialite") return <VueSpecialite key={vue.id} id={vue.id} />;
  if (vue.type === "metiers") return <TableauMetiers key={vue.groupe.id} groupe={vue.groupe} sousGroupes enModale />;
  if (vue.type === "filieres") return <VueFilieres filieres={vue.filieres} />;
  return null;
};

const AdminExplorateurReferentiel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pile, setPile] = useState([]);
  const actif = ONGLETS.find((o) => o.key === searchParams.get("tab"))?.key || "metiers";
  const Panneau = PANNEAUX[actif];

  const ouvrir = useCallback((vue) => setPile((p) => [...p, vue]), []);
  const retour = useCallback(() => setPile((p) => p.slice(0, -1)), []);
  const fermerTout = useCallback(() => setPile([]), []);
  const navigation = useMemo(() => ({ ouvrir }), [ouvrir]);
  const vue = pile[pile.length - 1];

  return (
    <NavigationContext.Provider value={navigation}>
      <div className="space-y-5">
        <AdminPageHeader
          icon={Compass}
          color="violet"
          title="Explorateur du référentiel"
          subtitle="Voir toutes les données de référence : secteurs, domaines, métiers, formations, et ce qui est incomplet."
          aideKey="explorateur-referentiel"
          aide={[
            "Cette page est en lecture seule : elle sert à regarder et à contrôler. Pour modifier, utilisez les pages Métiers, Formations, Spécialités et Compétences.",
            "Arbre des métiers : secteur, domaine, sous-domaine puis métier. Le chiffre de chaque ligne est le total de métiers actifs qu'elle contient, sous-groupes compris : cliquez-le pour voir la liste.",
            "Tous les petits chiffres sont cliquables : appellations, compétences et spécialités d'un métier, diplômes et métiers d'une spécialité, filières d'un domaine. Dans une fenêtre, la flèche revient en arrière et Échap aussi.",
            "« À vérifier » liste les données incomplètes. Un chiffre à 0 veut dire que tout va bien sur ce point.",
          ]}
        />
        <div className={`flex gap-1 border-b ${tw.borderSubtle} overflow-x-auto`} role="tablist" aria-label="Sections de l'explorateur">
          {ONGLETS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={actif === key}
              onClick={() => setSearchParams({ tab: key })}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${tw.focusRing} rounded-t ${
                actif === key ? `border-current ${tw.textPrimaryStrong}` : `border-transparent ${tw.textMuted}`
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div role="tabpanel"><Panneau /></div>
      </div>
      {vue && (
        <Modale titre={vue.titre} peutRevenir={pile.length > 1} onRetour={retour} onFermerTout={fermerTout}>
          {contenuVue(vue)}
        </Modale>
      )}
    </NavigationContext.Provider>
  );
};

export default AdminExplorateurReferentiel;
