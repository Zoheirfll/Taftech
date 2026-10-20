import React, { useEffect, useState } from "react";
import { tw } from "../../theme";
import { adminDossierService } from "../../Services/adminDossierService";

const date = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");
const dateHeure = (iso) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Jamais";
const oui = (valeur) => (valeur ? "Oui" : "Non");

const Titre = ({ children }) => (
  <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase tracking-wider mb-2`}>{children}</p>
);

const Chiffre = ({ libelle, valeur, detail }) => (
  <div className={`${tw.surfaceMuted} p-3 rounded-lg border ${tw.borderSubtle}`}>
    <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase`}>{libelle}</p>
    <p className={`text-lg font-bold ${tw.textStrong} mt-1`}>{valeur}</p>
    {detail && <p className={`text-[11px] ${tw.textMuted} mt-0.5`}>{detail}</p>}
  </div>
);

const Ligne = ({ libelle, valeur }) => (
  <div className="flex justify-between gap-3 text-xs py-1">
    <span className={tw.textMuted}>{libelle}</span>
    <span className={`font-semibold text-right ${tw.textSlate800}`}>{valeur}</span>
  </div>
);

const ListeAvecNiveau = ({ elements, libelle, niveau, vide }) =>
  elements.length === 0 ? (
    <p className={`text-xs ${tw.textMuted} italic`}>{vide}</p>
  ) : (
    <ul className="space-y-1">
      {elements.map((e) => (
        <li key={libelle(e)} className="flex justify-between gap-3 text-xs">
          <span className={`font-medium ${tw.textSlate800}`}>{libelle(e)}</span>
          <span className={tw.textMuted}>{niveau(e) || "Niveau non précisé"}</span>
        </li>
      ))}
    </ul>
  );

// Dossier détaillé d'un candidat dans la fiche admin : tout ce qui n'est pas dans la liste des
// utilisateurs (niveaux, candidatures, activité, usage de l'IA). Chargé à l'ouverture de la fiche.
// `repli` : affichage simple des compétences et langues tant que le dossier n'est pas chargé, ou s'il
// ne peut pas l'être.
const DossierCandidatAdmin = ({ userId, repli = null }) => {
  const [dossier, setDossier] = useState(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    setDossier(null);
    setErreur(false);
    adminDossierService
      .getDossierCandidat(userId)
      .then((donnees) => {
        if (!annule) setDossier(donnees);
      })
      .catch(() => {
        if (!annule) setErreur(true);
      });
    return () => {
      annule = true;
    };
  }, [userId]);

  if (erreur) {
    return (
      <div className="space-y-3">
        <p className={`text-xs ${tw.textError}`}>Impossible de charger le dossier détaillé.</p>
        {repli}
      </div>
    );
  }
  if (!dossier) {
    return (
      <div className="space-y-3">
        <p className={`text-xs ${tw.textMuted}`}>Chargement du dossier…</p>
        {repli}
      </div>
    );
  }

  const { candidatures, activite, identite, compte, competences, langues, ia_mois: iaMois } = dossier;
  const statuts = Object.entries(candidatures.par_statut || {});

  return (
    <div className="space-y-6" data-testid="dossier-candidat">
      <div>
        <Titre>Activité</Titre>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Chiffre libelle="Candidatures" valeur={candidatures.total} detail={candidatures.derniere_le ? `Dernière le ${date(candidatures.derniere_le)}` : "Aucune"} />
          <Chiffre libelle="Score moyen" valeur={candidatures.score_moyen === null ? "—" : `${candidatures.score_moyen} %`} detail="Correspondance aux offres" />
          <Chiffre libelle="Score du profil" valeur={dossier.score_profil === null || dossier.score_profil === undefined ? "—" : `${dossier.score_profil}/100`} />
          <Chiffre libelle="Offres sauvegardées" valeur={activite.offres_sauvegardees} />
          <Chiffre libelle="Alertes emploi" valeur={activite.alertes_total} detail={`${activite.alertes_actives} active(s)`} />
          <Chiffre libelle="Documents" valeur={activite.documents} />
          <Chiffre libelle="Rendez-vous" valeur={activite.rendez_vous_total} detail={`${activite.rendez_vous_a_venir} à venir`} />
          <Chiffre libelle="Dernière connexion" valeur={dateHeure(compte.derniere_connexion)} />
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
        <div>
          <Titre>Compétences</Titre>
          <ListeAvecNiveau
            elements={competences}
            libelle={(c) => c.label}
            niveau={(c) => c.niveau_libelle}
            vide="Aucune compétence renseignée"
          />
        </div>
        <div>
          <Titre>Langues</Titre>
          <ListeAvecNiveau
            elements={langues}
            libelle={(l) => l.langue}
            niveau={(l) => l.niveau}
            vide="Aucune langue renseignée"
          />
        </div>
      </div>

      <div>
        <Titre>Candidatures</Titre>
        {candidatures.total === 0 ? (
          <p className={`text-xs ${tw.textMuted} italic`}>Aucune candidature envoyée.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {statuts.map(([statut, nombre]) => (
                <span key={statut} className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${tw.borderSubtle} ${tw.textSlate800}`}>
                  {statut} : {nombre}
                </span>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={tw.textMuted}>
                    <th className="text-left font-medium py-1 pr-3">Offre</th>
                    <th className="text-left font-medium py-1 px-2">Entreprise</th>
                    <th className="text-left font-medium py-1 px-2">Statut</th>
                    <th className="text-right font-medium py-1 px-2">Score</th>
                    <th className="text-right font-medium py-1 pl-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatures.recentes.map((c) => (
                    <tr key={c.id} className={`border-t ${tw.borderSubtle} ${tw.textStrong}`}>
                      <td className="py-1 pr-3">{c.offre}</td>
                      <td className="py-1 px-2">{c.entreprise}</td>
                      <td className="py-1 px-2">{c.statut}</td>
                      <td className="text-right py-1 px-2">{c.score === null ? "—" : `${c.score} %`}</td>
                      <td className="text-right py-1 pl-2">{date(c.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {candidatures.total > candidatures.recentes.length && (
              <p className={`text-[11px] ${tw.textMuted} mt-2`}>
                {candidatures.recentes.length} dernières candidatures sur {candidatures.total}.
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <Titre>Profil complémentaire</Titre>
        <div className={`${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
          <Ligne libelle="Sexe" valeur={identite.sexe || "—"} />
          <Ligne libelle="Date de naissance" valeur={date(identite.date_naissance)} />
          <Ligne libelle="Véhiculé" valeur={oui(identite.vehicule_personnel)} />
          <Ligne libelle="Visible dans la CVthèque" valeur={oui(identite.visible_cvtheque)} />
          <Ligne libelle="CV mis à jour le" valeur={date(identite.cv_maj_le)} />
          <Ligne libelle="Inscrit le" valeur={date(compte.inscrit_le)} />
          {identite.linkedin && (
            <Ligne libelle="LinkedIn" valeur={<a href={identite.linkedin} target="_blank" rel="noreferrer noopener" className={tw.linkPrimary}>{identite.linkedin}</a>} />
          )}
          {identite.github && (
            <Ligne libelle="GitHub" valeur={<a href={identite.github} target="_blank" rel="noreferrer noopener" className={tw.linkPrimary}>{identite.github}</a>} />
          )}
          {identite.bio && (
            <div className="pt-2 mt-2 border-t border-slate-200">
              <p className={`text-[10px] font-semibold ${tw.textMuted} uppercase mb-1`}>Résumé</p>
              <p className={`text-xs ${tw.textSlate800} whitespace-pre-line`}>{identite.bio}</p>
            </div>
          )}
        </div>
      </div>

      {iaMois.length > 0 && (
        <div>
          <Titre>Utilisation de l'IA ce mois-ci</Titre>
          <ul className="space-y-1">
            {iaMois.map((u) => (
              <li key={u.libelle} className="flex justify-between gap-3 text-xs">
                <span className={`font-medium ${tw.textSlate800}`}>{u.libelle}</span>
                <span className={tw.textMuted}>
                  {u.appels} appel(s) · {u.tokens.toLocaleString("fr-FR")} tokens
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DossierCandidatAdmin;
