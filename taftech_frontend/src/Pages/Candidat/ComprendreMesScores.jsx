import React from "react";
import { Link } from "react-router-dom";
import { Target, Gauge, Compass, Lightbulb } from "lucide-react";
import { ExplicationPage, Bloc } from "../../Components/ExplicationPage";

// Doit rester aligné sur jobs/matcher.py, jobs/profile_score.py et jobs/metiers_matching.py.
const ComprendreMesScores = () => (
  <ExplicationPage
    titre="Comprendre mes scores"
    intro="TafTech affiche trois scores. Ils sont calculés par des règles fixes, pas inventés par une IA : mêmes informations, même résultat."
  >
    <Bloc icon={Target} titre="Score de compatibilité avec une offre" badge="0 – 100 %">
      <p>Il compare votre profil à ce que le recruteur demande, sur 5 critères pondérés : localisation et mobilité (20), diplôme (20), spécialité de formation (25), expérience pertinente (20), compétences (15).</p>
      <p>Seuls les critères demandés par l'offre comptent. Si l'offre n'exige pas de diplôme, votre diplôme n'entre pas dans le calcul.</p>
      <p>Ce score est figé au moment où vous postulez et n'élimine jamais votre candidature : c'est une aide au tri pour le recruteur. Le détail est visible dans « Mes candidatures », bouton « Pourquoi ce score ? ».</p>
    </Bloc>
    <Bloc icon={Gauge} titre="Score de profil" badge="/100">
      <p>Il mesure la solidité de votre profil, indépendamment d'une offre :</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Complétude du profil : 25 points</li>
        <li>Niveau de diplôme : 20 points</li>
        <li>Années d'expérience : 20 points (2 points par année, jusqu'à 10 ans)</li>
        <li>Niveau moyen en langues : 15 points</li>
        <li>Compatibilité moyenne avec les offres en ligne : 20 points</li>
      </ul>
    </Bloc>
    <Bloc icon={Compass} titre="Métiers accessibles (%)">
      <p>Pour chaque métier, deux éléments seulement : la proximité avec le métier que vous avez indiqué (60 points) et votre expérience réelle dans ce métier ou un métier voisin (40 points).</p>
      <p>Un pourcentage bas ne veut pas dire que vous ne pouvez pas postuler : il veut dire que votre profil ne montre pas encore de lien avec ce métier.</p>
    </Bloc>
    <Bloc icon={Lightbulb} titre="Comment améliorer mes scores">
      <ul className="list-disc pl-5 space-y-1">
        <li>Indiquez votre wilaya et votre <strong>mobilité</strong> (régionale ou nationale) : sans elle, une offre dans une autre wilaya compte 0 sur la localisation.</li>
        <li>Détaillez chaque formation avec son <strong>diplôme et sa spécialité</strong> tirés de la liste, et le statut « Obtenu ».</li>
        <li>Rattachez chaque expérience à un <strong>métier</strong> et renseignez ses dates : seule l'expérience liée au poste est comptée.</li>
        <li>Indiquez le <strong>niveau</strong> de chaque compétence dans <Link to="/mes-competences" className="text-indigo-700 font-semibold underline">Mes compétences</Link>.</li>
      </ul>
      <p>Une information absente n'est pas une incompatibilité, mais elle ne rapporte aucun point : le recruteur voit alors « informations incomplètes ».</p>
    </Bloc>
  </ExplicationPage>
);

export default ComprendreMesScores;
