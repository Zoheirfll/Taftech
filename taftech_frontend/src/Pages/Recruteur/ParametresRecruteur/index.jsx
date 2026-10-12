// Page Paramètres recruteur (orchestrateur) : en-tête, onglets Mon profil / Mon entreprise / Notifications, recadrage d'image.
import React from "react";
import { User, Building2, Bell } from "lucide-react";
import { authService } from "../../../Services/authService";
import { tw } from "../../../theme";
import InfoBanner from "../../../Components/InfoBanner";
import ImageCropperModal from "../../../Components/ImageCropperModal";
import { useParametresRecruteur } from "./useParametresRecruteur";
import { OngletMonProfil } from "./OngletMonProfil";
import { OngletMonEntreprise } from "./OngletMonEntreprise";
import { OngletNotifications } from "./OngletNotifications";

const SqueletteParametres = () => (
  <div className={`${tw.surfaceSubtle} min-h-screen`}>
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8 space-y-2">
        <div className={`h-7 ${tw.surfaceSubtle} rounded w-40 animate-pulse`} />
        <div className={`h-4 ${tw.surfaceSubtle} rounded w-64 animate-pulse`} />
      </div>
      <div className={`flex gap-1 border-b ${tw.borderBase} mb-8`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-10 w-32 ${tw.surfaceSubtle} rounded-t animate-pulse mx-1`} />
        ))}
      </div>
      <div className={`${tw.card} rounded-2xl p-6 space-y-4 animate-pulse`}>
        <div className={`h-5 ${tw.surfaceSubtle} rounded w-48`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className={`h-12 ${tw.surfaceSubtle} rounded-xl`} />)}
        </div>
        <div className={`h-10 ${tw.surfaceSubtle} rounded-xl w-32 ml-auto`} />
      </div>
    </div>
  </div>
);

const ParametresRecruteur = () => {
  const p = useParametresRecruteur();
  const { activeTab, setActiveTab, entreprise, cropper, fermerCropper } = p;

  const TABS = [
    { key: "profil", label: "Mon profil", icon: User, minRole: "INVITE" },
    { key: "entreprise", label: "Mon entreprise", icon: Building2, minRole: "ADMIN" },
    { key: "notifications", label: "Notifications", icon: Bell, minRole: "PROPRIETAIRE" },
  ].filter(({ minRole }) => authService.peutFaire(minRole));

  if (p.loading) return <SqueletteParametres />;

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className={`text-2xl font-extrabold ${tw.textStrong} tracking-tight`}>
          Paramètres
        </h1>
        <p className={`text-base ${tw.textMuted700} mt-1`}>
          Gérez votre profil et vos préférences.
        </p>
      </div>

      <div className="mb-6">
        <InfoBanner storageKey="parametres_recruteur" title="Paramètres de votre espace recruteur" color="teal">
          <strong>Mon entreprise</strong> : modifiez le logo, la description et les infos de votre entreprise (admin uniquement). ·{" "}
          <strong>Mon équipe</strong> : gérez vos collaborateurs depuis la page dédiée dans la barre latérale. ·{" "}
          <strong>Changer le mot de passe</strong> depuis l'onglet compte. ·{" "}
          <strong>QR Code</strong> : disponible après validation de votre entreprise.
        </InfoBanner>
      </div>

      {/* ONGLETS */}
      <div className={`flex gap-1 border-b ${tw.borderBase} mb-8 overflow-x-auto`}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === key
                ? `border-teal-700 ${tw.textTeal}`
                : `border-transparent ${tw.textMuted700} hover:text-slate-900`
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profil" && <OngletMonProfil p={p} />}
      {activeTab === "entreprise" && entreprise && <OngletMonEntreprise p={p} />}
      {activeTab === "notifications" && <OngletNotifications p={p} />}

      {cropper && (
        <ImageCropperModal
          file={cropper.file}
          aspect={cropper.aspect}
          cropShape={cropper.shape}
          onCancel={fermerCropper}
          onValidate={cropper.apply}
        />
      )}
    </div>
    </div>
  );
};

export default ParametresRecruteur;
