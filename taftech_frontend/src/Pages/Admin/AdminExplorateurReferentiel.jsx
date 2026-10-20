import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, Network, GraduationCap, AlertTriangle, ChevronRight, ChevronDown, Search } from "lucide-react";
import { adminService } from "../../Services/adminService";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";
import AdminPagination from "../../Components/AdminPagination";
import { AdminErreurChargement, AdminVide } from "../../Components/AdminEtat";
import { reportError } from "../../utils/errorReporter";

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

const Kpi = ({ label, valeur }) => (
  <div className={`${tw.card} p-4`}>
    <p className={`text-[11px] font-semibold uppercase tracking-wider ${tw.textMuted}`}>{label}</p>
    <p className={`text-2xl font-extrabold mt-1 tabular-nums ${tw.textStrong}`}>{valeur}</p>
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

const BadgeNombre = ({ n }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} border ${tw.borderPrimary200}`}>{n}</span>
);

const NoeudArbre = ({ groupe, enfantsDe, ouverts, selectionId, onBasculer, onChoisir, profondeur }) => {
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
        <BadgeNombre n={groupe.nb_metiers} />
      </div>
      {ouvert && enfants.length > 0 && (
        <ul>
          {enfants.map((e) => (
            <NoeudArbre key={e.id} groupe={e} enfantsDe={enfantsDe} ouverts={ouverts} selectionId={selectionId} onBasculer={onBasculer} onChoisir={onChoisir} profondeur={profondeur + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const Liste = ({ titre, vide, elements }) => (
  <div>
    <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${tw.textMuted}`}>{titre} ({elements.length})</p>
    {elements.length === 0 ? <p className={`text-xs ${tw.textMuted}`}>{vide}</p> : (
      <ul className="flex flex-wrap gap-1.5">
        {elements.map((e) => (
          <li key={e.cle} className={`px-2 py-0.5 rounded-full text-xs ${tw.surfaceMuted} border ${tw.borderSubtle} ${e.inactif ? tw.textMuted : ""}`}>{e.texte}{e.inactif ? " (inactif)" : ""}</li>
        ))}
      </ul>
    )}
  </div>
);

const FicheMetier = ({ fiche }) => (
  <div className={`${tw.card} p-4 space-y-4`}>
    <div>
      <p className={`text-base font-bold ${tw.textStrong}`}>{fiche.metier.libelle}</p>
      <p className={`text-xs ${tw.textMuted}`}>
        {fiche.chemin.length ? fiche.chemin.map((c) => c.libelle).join(" › ") : "Aucun secteur ni domaine"} · code {fiche.metier.code}
        {fiche.metier.redirige_vers ? ` · redirigé vers « ${fiche.metier.redirige_vers} »` : ""}
      </p>
    </div>
    <Liste titre="Appellations" vide="Aucune appellation." elements={fiche.appellations.map((a) => ({ cle: a.id, texte: a.libelle, inactif: !a.actif }))} />
    <Liste titre="Compétences suggérées" vide="Aucune compétence suggérée." elements={fiche.competences.map((c) => ({ cle: c.competence_id, texte: c.competence__label, inactif: !c.competence__actif }))} />
    <Liste titre="Spécialités suggérées" vide="Aucune spécialité suggérée." elements={fiche.specialites.map((s) => ({ cle: s.specialite_id, texte: s.specialite__libelle }))} />
  </div>
);

const ListeEtFicheMetier = ({ groupe }) => {
  const [metierId, setMetierId] = useState(null);
  const [page, setPage] = useState(1);
  const chargerGroupe = useCallback(() => adminService.getExplorateurGroupe(groupe.id, page), [groupe.id, page]);
  const { data, erreur, charger } = useChargement(chargerGroupe);
  const chargerFiche = useCallback(() => (metierId ? adminService.getExplorateurMetier(metierId) : Promise.resolve(null)), [metierId]);
  const fiche = useChargement(chargerFiche);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  const affiches = data.metiers;

  return (
    <div className="space-y-4">
      <div className={`${tw.card} overflow-hidden`}>
        <p className={`px-4 py-3 text-sm font-semibold ${tw.textStrong}`}>{data.groupe.libelle} · {data.total} métier(s) directement rattaché(s)</p>
        {data.total === 0 ? (
          <AdminVide icon={Network} titre="Aucun métier directement dans ce groupe." texte="Dépliez-le : ses métiers sont dans les sous-groupes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[480px]">
              <thead className={`${tw.surfaceMuted} border-y ${tw.borderSubtle}`}>
                <tr className={`text-[10px] ${tw.textMuted} uppercase tracking-wider font-semibold`}>
                  <th className="px-4 py-2">Métier</th><th className="px-3 py-2 text-center">Appell.</th>
                  <th className="px-3 py-2 text-center">Compét.</th><th className="px-3 py-2 text-center">Spéc.</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${tw.divideBase} text-xs`}>
                {affiches.map((m) => (
                  <tr key={m.id} className={`${tw.rowHover} cursor-pointer`} onClick={() => setMetierId(m.id)}>
                    <td className={`px-4 py-2 font-medium ${metierId === m.id ? tw.textPrimaryStrong : ""}`}>{m.libelle}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{m.nb_appellations}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{m.nb_competences}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{m.nb_formations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination page={data.page} totalPages={data.total_pages} totalCount={data.total} onChange={setPage} />
      </div>
      {metierId && fiche.erreur && <AdminErreurChargement onRetry={fiche.charger} />}
      {metierId && fiche.data && <FicheMetier fiche={fiche.data} />}
    </div>
  );
};

const PanneauMetiers = () => {
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

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;

  const racines = enfantsDe[null] || [];
  const terme = sansAccent(recherche.trim());
  const trouves = terme ? data.groupes.filter((g) => sansAccent(g.libelle).includes(terme)) : [];
  const t = data.totaux;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          <ul className="max-h-[560px] overflow-y-auto">
            {terme ? (
              trouves.length === 0 ? <p className={`p-3 text-xs ${tw.textMuted}`}>Aucun groupe ne correspond.</p> : trouves.map((g) => (
                <NoeudArbre key={g.id} groupe={g} enfantsDe={{}} ouverts={ouverts} selectionId={groupe?.id} onBasculer={basculer} onChoisir={setGroupe} profondeur={0} />
              ))
            ) : racines.map((g) => (
              <NoeudArbre key={g.id} groupe={g} enfantsDe={enfantsDe} ouverts={ouverts} selectionId={groupe?.id} onBasculer={basculer} onChoisir={setGroupe} profondeur={0} />
            ))}
          </ul>
        </div>
        {groupe ? <ListeEtFicheMetier key={groupe.id} groupe={groupe} /> : (
          <div className={tw.card}><AdminVide icon={Compass} titre="Choisissez un secteur ou un domaine." texte="Le nombre à droite de chaque ligne est le total de métiers actifs qu'elle contient, sous-groupes compris." /></div>
        )}
      </div>
    </div>
  );
};

const SpecialitesDomaine = ({ domaine }) => {
  const [page, setPage] = useState(1);
  const chargerSpecialites = useCallback(() => adminService.getExplorateurFormations(domaine.id, page), [domaine.id, page]);
  const { data, erreur, charger } = useChargement(chargerSpecialites);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  return (
    <div className={`${tw.card} overflow-hidden`}>
      <p className={`px-4 py-3 text-sm font-semibold ${tw.textStrong}`}>{domaine.libelle} · {data.total} spécialité(s)</p>
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
                <td className="px-4 py-2 font-medium">{s.libelle}{!s.selectionnable ? " (masquée)" : ""}</td>
                <td className="px-3 py-2">{s.filiere || "—"}</td>
                <td className="px-3 py-2 text-center tabular-nums">{s.nb_diplomes}</td>
                <td className="px-3 py-2 text-center tabular-nums">{s.nb_metiers}</td>
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
  const chargerDomaines = useCallback(() => adminService.getExplorateurFormations(), []);
  const { data, erreur, charger } = useChargement(chargerDomaines);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div className={`${tw.card} p-3`}>
        <ul className="max-h-[560px] overflow-y-auto">
          {data.domaines.map((d) => (
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
        <div className={tw.card}><AdminVide icon={GraduationCap} titre="Choisissez un domaine de formation." texte="Vous verrez ses spécialités, avec le nombre de diplômes et de métiers qui y sont liés." /></div>
      ) : <SpecialitesDomaine key={domaine.id} domaine={domaine} />}
    </div>
  );
};

const ListeAnomalie = ({ anomalie }) => {
  const [page, setPage] = useState(1);
  const chargerListe = useCallback(() => adminService.getExplorateurAnomalie(anomalie.code, page), [anomalie.code, page]);
  const { data, erreur, charger } = useChargement(chargerListe);

  if (erreur) return <AdminErreurChargement onRetry={charger} />;
  if (!data) return <p className={`text-sm ${tw.textMuted}`}>Chargement…</p>;
  return (
    <div className={`${tw.card} overflow-hidden`}>
      <p className={`px-4 py-3 text-sm font-semibold ${tw.textStrong}`}>{anomalie.label} · {data.total}</p>
      {data.elements.length === 0 ? <AdminVide icon={AlertTriangle} titre="Rien à signaler." texte="Cette vérification ne remonte aucun élément." /> : (
        <ul className={`divide-y ${tw.divideBase} text-xs`}>
          {data.elements.map((e) => (
            <li key={`${e.id}-${e.libelle}`} className="px-4 py-2 flex justify-between gap-3">
              <span className="font-medium">{e.libelle}</span><span className={tw.textMuted}>{e.detail}</span>
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

  return (
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
      {!code ? (
        <div className={tw.card}><AdminVide icon={AlertTriangle} titre="Choisissez une vérification." texte="Un chiffre à 0 (vert) signifie que rien n'est à corriger sur ce point." /></div>
      ) : <ListeAnomalie key={choisie.code} anomalie={choisie} />}
    </div>
  );
};

const PANNEAUX = { metiers: PanneauMetiers, formations: PanneauFormations, anomalies: PanneauAnomalies };

const AdminExplorateurReferentiel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actif = ONGLETS.find((o) => o.key === searchParams.get("tab"))?.key || "metiers";
  const Panneau = PANNEAUX[actif];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Compass}
        color="violet"
        title="Explorateur du référentiel"
        subtitle="Voir toutes les données de référence : secteurs, domaines, métiers, formations, et ce qui est incomplet."
        aideKey="explorateur-referentiel"
        aide={[
          "Cette page est en lecture seule : elle sert à regarder et à contrôler. Pour modifier, utilisez les pages Métiers, Formations, Spécialités et Compétences.",
          "Arbre des métiers : secteur, domaine, sous-domaine puis métier. Le nombre affiché sur chaque ligne est le total de métiers actifs qu'elle contient, sous-groupes compris. Cliquez un métier pour voir ses appellations, compétences et spécialités.",
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
  );
};

export default AdminExplorateurReferentiel;
