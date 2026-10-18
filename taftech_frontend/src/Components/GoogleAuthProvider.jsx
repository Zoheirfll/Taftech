import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Le fournisseur de « Continuer avec Google » charge un script de Google dès qu'il est monté. On ne
// l'enveloppe donc QUE autour des boutons (pages de connexion et d'inscription) : plus aucune autre
// page du site ne contacte Google. Ne pas le remonter dans main.jsx.
const GoogleAuthProvider = ({ children }) => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
);

export default GoogleAuthProvider;
