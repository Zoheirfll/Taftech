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
    <Bloc icon={ToggleLeft} titre="Masquer ou supprimer votre profil">
      <p>Vous gardez la maîtrise de votre profil. Dans <Link to="/mes-documents" className="text-indigo-700 font-semibold underline">Mes documents</Link>, « Visibilité de mon profil dans la CVthèque » le retire de la CVthèque : plus aucun recruteur, <strong>même une entreprise qui l'avait déjà débloqué</strong>, ne voit vos coordonnées, votre CV ni vos documents partagés. Si vous le réaffichez, l'accès des entreprises qui l'avaient débloqué revient, sans nouveau crédit.</p>
      <p>Si vous supprimez votre compte, tout accès cesse définitivement. Un déblocage n'est donc jamais un accès permanent à vos données.</p>
    </Bloc>
    <Bloc icon={Send} titre="Quand vous postulez">
      <p>L'entreprise à laquelle vous postulez voit votre profil tel qu'il était au moment de la candidature, coordonnées comprises. Les mises à jour ultérieures de votre profil ne sont pas transmises à cette candidature.</p>
    </Bloc>
    <Bloc icon={FolderLock} titre="Votre CV de recrutement et vos documents privés">
      <p>Ce sont deux choses distinctes. Votre <strong>CV professionnel</strong> (celui de votre profil, utilisé pour postuler) est visible par les recruteurs selon ces règles : après déblocage de votre profil, ou si vous avez postulé à leur entreprise.</p>
      <p>Vos <strong>documents privés</strong> (diplômes, attestations, certificats…) ne sont jamais visibles automatiquement, ni après un déblocage, sauf si vous les partagez vous-même avec une entreprise précise. Seules les entreprises avec qui vous êtes déjà en relation (candidature ou profil débloqué) sont proposées, vous pouvez retirer un partage à tout moment, et un partage n'ouvre rien tant que votre profil est masqué.</p>
    </Bloc>
  </ExplicationPage>
);

export default ConfidentialiteRecruteurs;
