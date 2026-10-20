import React from "react";
import { tw } from "../../theme";
import { adminDossierService } from "../../Services/adminDossierService";
import { Chiffre, EtatChargement, Pastilles, Titre, date, dateHeure, useDossier } from "./dossierAdminUI";

// Dossier d'un compte administrateur dans la fiche admin : type de compte, connexion et actions
// tracées dans le journal d'audit.
// Référence stable : une fonction créée à chaque rendu relancerait le chargement en boucle.
const charger = (id) => adminDossierService.getDossierAdmin(id);

const DossierAdminAdmin = ({ userId }) => {
  const { dossier, erreur } = useDossier(charger, userId);

  if (!dossier) return <EtatChargement erreur={erreur} />;

  const { compte, actions } = dossier;

  return (
    <div className="space-y-6" data-testid="dossier-admin">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Chiffre libelle="Type de compte" valeur={compte.type} />
        <Chiffre libelle="Dernière connexion" valeur={dateHeure(compte.derniere_connexion)} />
        <Chiffre libelle="Actions tracées" valeur={actions.total} detail={actions.derniere_le ? `Dernière le ${date(actions.derniere_le)}` : "Aucune"} />
        <Chiffre libelle="Compte créé le" valeur={date(compte.inscrit_le)} />
      </div>

      {actions.total > 0 && (
        <>
          <div>
            <Titre>Répartition des actions</Titre>
            <Pastilles entrees={actions.par_action.map((a) => [a.libelle, a.nombre])} />
          </div>
          <div>
            <Titre>Dernières actions</Titre>
            <ul className="space-y-1">
              {actions.recentes.map((a, i) => (
                <li key={`${a.date}-${i}`} className="flex justify-between gap-3 text-xs">
                  <span className={`font-medium ${tw.textSlate800}`}>
                    {a.action}
                    {a.detail ? ` — ${a.detail}` : ""}
                  </span>
                  <span className={`${tw.textMuted} shrink-0`}>{dateHeure(a.date)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default DossierAdminAdmin;
