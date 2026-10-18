import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { tw } from "../theme";

// Carte Google Maps chargée SEULEMENT après un clic. Une carte intégrée contacte Google dès
// l'ouverture de la page (adresse IP du visiteur, cookies de Google) : sans clic, on ne
// transmet rien. Le clic vaut accord, et le lien « Ouvrir dans Google Maps » reste disponible.
const HAUTEUR = 220;

const CarteSurDemande = ({ lieu }) => {
  const [affichee, setAffichee] = useState(false);

  if (affichee) {
    return (
      <iframe
        title="Localisation de l'entreprise"
        width="100%"
        height={HAUTEUR}
        style={{ border: 0 }}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(lieu)}&z=12&output=embed`}
      />
    );
  }

  return (
    <div
      className={`${tw.surfaceMuted} flex flex-col items-center justify-center gap-2 px-4 text-center`}
      style={{ height: HAUTEUR }}
    >
      <MapPin size={22} className={tw.textMuted} aria-hidden="true" />
      <button
        type="button"
        onClick={() => setAffichee(true)}
        className={`px-4 py-2 rounded-lg text-sm font-semibold ${tw.buttonDark}`}
      >
        Afficher la carte
      </button>
      <p className={`text-xs max-w-xs ${tw.textMuted}`}>
        Afficher la carte charge un contenu de Google, qui peut déposer ses propres cookies.
      </p>
    </div>
  );
};

export default CarteSurDemande;
