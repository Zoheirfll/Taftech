// En-tête d'entreprise d'une offre publique, façon Emploitic : bannière pleine largeur (image de l'entreprise, sinon
// dégradé du thème), grande carte logo qui chevauche la bannière, nom + secteur + ville en blanc, onglets
// « Entreprise » / « Offres d'emploi ». Le nom de l'entreprise n'est pas un titre de page : le <h1> reste l'offre.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, MapPin } from "lucide-react";
import { tw } from "../theme";
import { mediaUrl } from "../utils/mediaUrl";

const ONGLETS_PAR_DEFAUT = [
  { cle: "entreprise", libelle: "Entreprise" },
  { cle: "offres", libelle: "Offres d'emploi" },
];

// Sur la page de l'entreprise, `onSelectOnglet` change d'onglet (boutons) ; ailleurs (page d'une offre), chaque onglet est
// un lien vers `/entreprise/<slug>?onglet=<cle>`. `action` : bouton affiché à droite de la barre d'onglets.
const EnteteEntreprise = ({ entreprise, lieu, onglets = ONGLETS_PAR_DEFAUT, ongletActif = "offres", onSelectOnglet, action }) => {
  const [logoEnErreur, setLogoEnErreur] = useState(false);
  if (!entreprise) return null;
  const logo = mediaUrl(entreprise.logo_url);
  const banniere = mediaUrl(entreprise.banniere_url);

  return (
    <header>
      <div className={`relative h-52 md:h-72 overflow-hidden ${tw.bannerGradientPrimary}`}>
        {banniere && <img src={banniere} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className={`absolute inset-0 ${tw.heroOverlay}`} />
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="pl-36 md:pl-52 pb-4 md:pb-5">
              <p className={`text-xl md:text-3xl font-extrabold leading-tight ${tw.textOnDark}`}>{entreprise.nom_entreprise}</p>
              <div className={`flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-sm ${tw.textOnDark}`}>
                {entreprise.secteur_libelle && (
                  <span className="flex items-center gap-1.5"><Briefcase size={14} aria-hidden="true" />{entreprise.secteur_libelle}</span>
                )}
                {lieu && (
                  <span className="flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{lieu}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${tw.surface} border-b ${tw.borderBase}`}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 relative min-h-16 flex items-center">
          <div className={`absolute left-4 md:left-6 -top-24 md:-top-32 w-32 h-32 md:w-48 md:h-48 rounded-2xl border ${tw.borderBase} ${tw.surface} shadow-lg flex items-center justify-center overflow-hidden`}>
            {logo && !logoEnErreur ? (
              <img src={logo} alt={entreprise.nom_entreprise} className="w-full h-full object-contain p-3" onError={() => setLogoEnErreur(true)} />
            ) : (
              <Building2 size={48} className={tw.textSubtle} aria-hidden="true" />
            )}
          </div>
          <nav aria-label="Navigation de l'entreprise" className="flex gap-6 pl-36 md:pl-52 text-sm">
            {onglets.map((onglet) => {
              const actif = onglet.cle === ongletActif;
              const classe = `py-4 ${actif ? tw.heroTabActive : tw.heroTabIdle}`;
              const courant = actif ? "page" : undefined;
              return onSelectOnglet ? (
                <button key={onglet.cle} type="button" aria-current={courant} onClick={() => onSelectOnglet(onglet.cle)} className={classe}>
                  {onglet.libelle}
                </button>
              ) : (
                <Link key={onglet.cle} to={`/entreprise/${entreprise.slug}?onglet=${onglet.cle}`} aria-current={courant} className={classe}>
                  {onglet.libelle}
                </Link>
              );
            })}
          </nav>
          {action && <div className="ml-auto py-2">{action}</div>}
        </div>
      </div>
    </header>
  );
};

export default EnteteEntreprise;
