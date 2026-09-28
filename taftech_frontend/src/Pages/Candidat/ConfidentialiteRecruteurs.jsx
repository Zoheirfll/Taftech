import React from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, ToggleLeft, FolderLock, Send } from "lucide-react";
import { ExplicationPage, Bloc } from "../../Components/ExplicationPage";

// Doit rester aligné sur ProfilCandidatDTO (_peut_voir_coordonnees), visible_cvtheque et PartageDocument.
const ConfidentialiteRecruteurs = () => (
  <ExplicationPage
    titre="Ce que voient les recruteurs"
    intro="Vos données sont protégées conformément à la loi 18-07. Voici exactement ce qu'un recruteur peut voir, et quand."
  >
    <Bloc icon={Eye} titre="Dans la CVthèque, avant déblocage">
      <p>Seuls votre titre de poste et votre wilaya sont visibles, plus un aperçu anonyme de votre parcours (intitulés de poste, dates, descriptions).</p>
    </Bloc>
    <Bloc icon={EyeOff} titre="Masqué tant que le recruteur n'a pas débloqué votre profil">
      <p>Nom complet, photo, email, téléphone, adresse, commune, date de naissance, salaire souhaité, noms de vos employeurs, diplôme, liens LinkedIn/GitHub, texte « À propos » et CV.</p>
      <p>Pour débloquer votre profil, une entreprise validée par TafTech doit dépenser un crédit. Votre NIN n'est jamais montré à un recruteur.</p>
    </Bloc>
    <Bloc icon={ToggleLeft} titre="Refuser les déblocages">
      <p>Dans <Link to="/mes-documents" className="text-indigo-700 font-semibold underline">Mes documents</Link>, vous pouvez désactiver « Déblocage par les recruteurs ». Votre profil reste trouvable, mais plus personne ne peut obtenir vos coordonnées par la CVthèque. Les déblocages déjà faits restent valides.</p>
    </Bloc>
    <Bloc icon={Send} titre="Quand vous postulez">
      <p>L'entreprise à laquelle vous postulez voit votre profil tel qu'il était au moment de la candidature, coordonnées comprises. Les mises à jour ultérieures de votre profil ne sont pas transmises à cette candidature.</p>
    </Bloc>
    <Bloc icon={FolderLock} titre="Vos documents privés">
      <p>Les documents privés (diplômes, attestations, certificats…) ne sont jamais visibles, sauf si vous les partagez vous-même avec une entreprise précise. Seules les entreprises avec qui vous êtes déjà en relation (candidature ou profil débloqué) sont proposées, et vous pouvez retirer un partage à tout moment.</p>
    </Bloc>
  </ExplicationPage>
);

export default ConfidentialiteRecruteurs;
