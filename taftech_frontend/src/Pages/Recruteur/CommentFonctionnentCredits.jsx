import React from "react";
import { Link } from "react-router-dom";
import { Coins, Unlock, Users, Calendar, ShoppingCart, ShieldAlert } from "lucide-react";
import { ExplicationPage, Bloc } from "../../Components/ExplicationPage";

// Doit rester aligné sur jobs/credits_utils.py et jobs/views/credits.py.
const CommentFonctionnentCredits = () => (
  <ExplicationPage
    titre="Comment fonctionnent les crédits CVthèque ?"
    intro="Parcourir la CVthèque est inclus dans toute formule payante. Les crédits servent uniquement à débloquer les coordonnées et le CV d'un candidat."
  >
    <Bloc icon={Unlock} titre="1 crédit = 1 candidat débloqué">
      <p>Un crédit donne accès au nom complet, à l'email, au téléphone, à l'adresse, au salaire souhaité, aux employeurs et au CV du candidat.</p>
      <p>Le déblocage n'est pas un accès permanent : il vaut tant que le candidat laisse son profil actif et visible. Pendant ce temps, le consulter à nouveau ne coûte rien. Vous n'avez pas accès à ses documents privés, sauf s'il les partage lui-même avec votre entreprise.</p>
    </Bloc>
    <Bloc icon={Users} titre="Partagés par toute l'équipe">
      <p>Les crédits appartiennent à l'entreprise, pas à un membre. Un profil débloqué par un collègue est débloqué pour tous : pas de double dépense.</p>
    </Bloc>
    <Bloc icon={Calendar} titre="Deux réserves, consommées dans cet ordre">
      <p><strong>1. Le quota mensuel de votre formule</strong> (Starter, Pro, Business ; illimité en Enterprise). Il repart à zéro le 1er de chaque mois ; les crédits mensuels non utilisés ne sont pas reportés.</p>
      <p><strong>2. Les crédits achetés en pack</strong>, utilisés seulement une fois le quota mensuel épuisé. Ils n'expirent jamais.</p>
    </Bloc>
    <Bloc icon={ShoppingCart} titre="Acheter des crédits">
      <p>Des packs sont disponibles sur la page <Link to="/recruteurs/abonnements" className="text-teal-700 font-semibold underline">Abonnements &amp; tarifs</Link>, en complément de votre formule.</p>
    </Bloc>
    <Bloc icon={ShieldAlert} titre="Quand un déblocage est impossible">
      <p>Sans formule active, ou tant que votre entreprise n'est pas validée par TafTech, aucun déblocage n'est possible.</p>
      <p>Le candidat garde la maîtrise de son profil : il peut le masquer ou supprimer son compte. Un profil masqué disparaît de la CVthèque et ne peut pas être débloqué, <strong>sans qu'aucun crédit ne soit consommé</strong>. Pour une entreprise qui l'avait déjà débloqué, l'accès aux coordonnées, au CV et aux documents partagés est suspendu tant que le profil est masqué, puis rétabli sans nouvelle dépense s'il est réaffiché. Si le candidat supprime son compte, l'accès cesse définitivement.</p>
    </Bloc>
    <Bloc icon={Coins} titre="Pas besoin de crédit pour vos candidatures">
      <p>Les candidats qui postulent à vos offres sont visibles en entier dans la gestion de l'offre, sans dépenser de crédit.</p>
    </Bloc>
  </ExplicationPage>
);

export default CommentFonctionnentCredits;
