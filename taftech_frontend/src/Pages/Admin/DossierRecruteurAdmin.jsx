import React from "react";
import { tw } from "../../theme";
import { adminDossierService } from "../../Services/adminDossierService";
import { Chiffre, EtatChargement, Ligne, Pastilles, Titre, date, dateHeure, oui, useDossier } from "./dossierAdminUI";

// Dossier détaillé d'un recruteur dans la fiche admin : entreprise, abonnement et crédits, offres,
// candidatures reçues, équipe, déblocages CVthèque, usage de l'IA de l'entreprise.
// Référence stable : une fonction créée à chaque rendu relancerait le chargement en boucle.
const charger = (id) => adminDossierService.getDossierRecruteur(id);

const DossierRecruteurAdmin = ({ userId }) => {
  const { dossier, erreur } = useDossier(charger, userId);

  if (!dossier) return <EtatChargement erreur={erreur} />;

  const { compte, entreprise, abonnement, offres, candidatures_recues: recues, equipe, cvtheque, ia_mois: iaMois } = dossier;
  const lien = (url) =>
    url ? <a href={url} target="_blank" rel="noreferrer noopener" className={tw.linkPrimary}>{url}</a> : "—";

  return (
    <div className="space-y-6" data-testid="dossier-recruteur">
      <div>
        <Titre>Activité</Titre>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Chiffre libelle="Offres" valeur={offres.total} detail={`${offres.en_ligne} en ligne · ${offres.cloturees} clôturée(s)`} />
          <Chiffre libelle="Candidatures reçues" valeur={recues.total} detail={recues.derniere_le ? `Dernière le ${date(recues.derniere_le)}` : "Aucune"} />
          <Chiffre libelle="Profils débloqués" valeur={cvtheque.debloques_total} detail={`${cvtheque.debloques_ce_mois} ce mois-ci`} />
          <Chiffre libelle="Dernière connexion" valeur={dateHeure(compte.derniere_connexion)} />
        </div>
      </div>

      <div>
        <Titre>Entreprise</Titre>
        <div className={`${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
          <Ligne libelle="Nom" valeur={entreprise.nom} />
          <Ligne libelle="Validée" valeur={oui(entreprise.approuvee)} />
          <Ligne libelle="Secteur" valeur={entreprise.secteur || "—"} />
          <Ligne libelle="Siège" valeur={[entreprise.commune_siege, entreprise.wilaya_siege].filter(Boolean).join(", ") || "—"} />
          <Ligne libelle="Adresse" valeur={entreprise.adresse || "—"} />
          <Ligne libelle="Registre du commerce" valeur={entreprise.registre_commerce || "—"} />
          <Ligne libelle="Taille" valeur={entreprise.taille || "—"} />
          <Ligne libelle="Année de création" valeur={entreprise.annee_creation || "—"} />
          <Ligne libelle="Site web" valeur={lien(entreprise.site_web)} />
          <Ligne libelle="LinkedIn" valeur={lien(entreprise.linkedin)} />
          <Ligne libelle="Mise en avant sur l'accueil" valeur={oui(entreprise.mise_en_avant_accueil)} />
          <Ligne libelle="Refus automatique par e-mail" valeur={oui(entreprise.refus_auto)} />
          <Ligne libelle="Inscrit le" valeur={date(compte.inscrit_le)} />
        </div>
      </div>

      <div>
        <Titre>Abonnement et crédits</Titre>
        <div className={`${tw.surfaceMuted} p-4 rounded-xl border ${tw.borderSubtle}`}>
          <Ligne libelle="Formule" valeur={abonnement.palier} />
          <Ligne libelle="Abonnement actif" valeur={oui(abonnement.actif)} />
          <Ligne libelle="Début" valeur={date(abonnement.debut)} />
          <Ligne libelle="Expiration" valeur={date(abonnement.expiration)} />
          <Ligne libelle="Renouvellement automatique" valeur={abonnement.renouvellement_auto === null ? "—" : oui(abonnement.renouvellement_auto)} />
          <Ligne libelle="Limite d'offres" valeur={abonnement.limite_offres ?? "Illimitée"} />
          <Ligne libelle="Crédits mensuels restants" valeur={abonnement.credits_mensuels_restants} />
          <Ligne libelle="Crédits achetés restants" valeur={abonnement.credits_achetes_restants} />
        </div>
      </div>

      <div>
        <Titre>Offres</Titre>
        {offres.total === 0 ? (
          <p className={`text-xs ${tw.textMuted} italic`}>Aucune offre publiée.</p>
        ) : (
          <>
            <div className="mb-3">
              <Pastilles entrees={Object.entries(offres.par_statut)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={tw.textMuted}>
                    <th className="text-left font-medium py-1 pr-3">Offre</th>
                    <th className="text-left font-medium py-1 px-2">Statut</th>
                    <th className="text-right font-medium py-1 px-2">Candidatures</th>
                    <th className="text-right font-medium py-1 pl-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {offres.recentes.map((o) => (
                    <tr key={o.id} className={`border-t ${tw.borderSubtle} ${tw.textStrong}`}>
                      <td className="py-1 pr-3">{o.titre}</td>
                      <td className="py-1 px-2">{o.cloturee ? `${o.statut} (clôturée)` : o.statut}</td>
                      <td className="text-right py-1 px-2">{o.candidatures}</td>
                      <td className="text-right py-1 pl-2">{date(o.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {offres.total > offres.recentes.length && (
              <p className={`text-[11px] ${tw.textMuted} mt-2`}>
                {offres.recentes.length} dernières offres sur {offres.total}.
              </p>
            )}
          </>
        )}
      </div>

      {recues.total > 0 && (
        <div>
          <Titre>Candidatures reçues par statut</Titre>
          <Pastilles entrees={Object.entries(recues.par_statut)} />
        </div>
      )}

      <div>
        <Titre>Équipe</Titre>
        {equipe.length === 0 ? (
          <p className={`text-xs ${tw.textMuted} italic`}>Aucun membre invité.</p>
        ) : (
          <ul className="space-y-1">
            {equipe.map((m) => (
              <li key={m.email} className="flex justify-between gap-3 text-xs">
                <span className={`font-medium ${tw.textSlate800}`}>{m.nom} · {m.email}</span>
                <span className={tw.textMuted}>{m.role} · depuis le {date(m.ajoute_le)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {iaMois.length > 0 && (
        <div>
          <Titre>Utilisation de l'IA ce mois-ci (toute l'entreprise)</Titre>
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

export default DossierRecruteurAdmin;
