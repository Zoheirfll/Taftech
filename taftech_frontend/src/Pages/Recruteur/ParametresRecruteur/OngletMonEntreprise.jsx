// Onglet "Mon entreprise" des Paramètres : statut, champs verrouillés, médias, informations éditables.
import React from "react";
import Select from "react-select";
import { CheckCircle, AlertCircle, Save } from "lucide-react";
import { selectStylesTeal, tw } from "../../../theme";
import { BlocLogo, BlocBanniere, BlocGaleriePhotos, BlocQrCode } from "./MediasEntreprise";

const TAILLES_ENTREPRISE_OPTIONS = [
  { value: "TPE", label: "1 à 10 employés" },
  { value: "PE", label: "11 à 50 employés" },
  { value: "ME", label: "51 à 200 employés" },
  { value: "GE", label: "201 à 500 employés" },
  { value: "TGE", label: "Plus de 500 employés" },
];

const StatutValidation = ({ estApprouvee }) => (
  <div className={`flex items-center gap-3 p-4 ${tw.surfaceMuted} rounded-xl border ${tw.borderSubtle}`}>
    {estApprouvee ? (
      <>
        <CheckCircle
          size={18}
          className={`${tw.scoreTextSuccess} shrink-0`}
        />
        <div>
          <p className={`text-sm font-semibold ${tw.textStrong}`}>
            Compte vérifié
          </p>
          <p className={`text-xs ${tw.textMuted700}`}>
            Votre entreprise a été validée par TAFTECH.
          </p>
        </div>
      </>
    ) : (
      <>
        <AlertCircle
          size={18}
          className={`${tw.scoreTextWarning} shrink-0`}
        />
        <div>
          <p className={`text-sm font-semibold ${tw.textStrong}`}>
            En attente de validation
          </p>
          <p className={`text-xs ${tw.textMuted700}`}>
            Notre équipe vérifie votre registre de commerce.
          </p>
        </div>
      </>
    )}
  </div>
);

const ChampsVerrouilles = ({ entreprise }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
        Dénomination sociale
      </label>
      <p className={`px-4 py-2.5 rounded-lg text-sm cursor-not-allowed ${tw.readonlyFieldDashed}`}>
        {entreprise.nom_entreprise}
      </p>
    </div>
    <div>
      <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
        Registre de commerce
      </label>
      <p className={`px-4 py-2.5 rounded-lg text-sm font-mono cursor-not-allowed ${tw.readonlyFieldDashed}`}>
        {entreprise.registre_commerce}
      </p>
    </div>
  </div>
);

const ChampsEditables = ({ p }) => {
  const { entrepriseForm, setEntrepriseForm, constants, secteursEntreprise, getCommunesOptions } = p;
  return (
    <>
      <div className="md:col-span-2">
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Secteur d'activité
        </label>
        <Select
          options={secteursEntreprise}
          value={
            secteursEntreprise.find(
              (s) => s.value === entrepriseForm.secteur_activite,
            ) || null
          }
          onChange={(s) =>
            setEntrepriseForm({
              ...entrepriseForm,
              secteur_activite: s ? s.value : "",
            })
          }
          styles={selectStylesTeal}
          placeholder="Sélectionnez un secteur"
        />
      </div>
      <div>
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Wilaya du siège
        </label>
        <Select
          options={constants.wilayas}
          value={
            constants.wilayas.find(
              (w) => w.value === entrepriseForm.wilaya_siege,
            ) || null
          }
          onChange={(s) =>
            setEntrepriseForm({
              ...entrepriseForm,
              wilaya_siege: s ? s.value : "",
              commune_siege: "",
            })
          }
          styles={selectStylesTeal}
          placeholder="Sélectionnez une wilaya"
        />
      </div>
      <div>
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Commune du siège
        </label>
        <Select
          options={getCommunesOptions(entrepriseForm.wilaya_siege)}
          isDisabled={!entrepriseForm.wilaya_siege}
          value={
            getCommunesOptions(entrepriseForm.wilaya_siege).find(
              (c) => c.value === entrepriseForm.commune_siege,
            ) || null
          }
          onChange={(s) =>
            setEntrepriseForm({
              ...entrepriseForm,
              commune_siege: s ? s.value : "",
            })
          }
          styles={selectStylesTeal}
          placeholder="Sélectionnez une commune"
        />
      </div>
      <div className="md:col-span-2">
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Adresse complète <span className={tw.textMuted}>(affichée sur la carte de votre page entreprise)</span>
        </label>
        <input
          type="text"
          value={entrepriseForm.adresse_complete || ""}
          onChange={(e) => setEntrepriseForm({ ...entrepriseForm, adresse_complete: e.target.value })}
          className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`}
        />
      </div>
      <div className="md:col-span-2">
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Taille de l'entreprise
        </label>
        <Select
          options={TAILLES_ENTREPRISE_OPTIONS}
          value={
            TAILLES_ENTREPRISE_OPTIONS.find(
              (t) => t.value === entrepriseForm.taille_entreprise,
            ) || null
          }
          onChange={(s) =>
            setEntrepriseForm({
              ...entrepriseForm,
              taille_entreprise: s ? s.value : "",
            })
          }
          styles={selectStylesTeal}
          placeholder="Sélectionnez une taille"
        />
      </div>
      <div className="md:col-span-1">
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`} htmlFor="annee_creation">
          Année de création (optionnel)
        </label>
        <input
          id="annee_creation"
          type="number"
          min="1900"
          max={new Date().getFullYear()}
          value={entrepriseForm.annee_creation || ""}
          onChange={(e) =>
            setEntrepriseForm({
              ...entrepriseForm,
              annee_creation: e.target.value,
            })
          }
          className={`w-full px-4 py-2.5 rounded-lg text-sm ${tw.inputColorsMuted}`}
        />
      </div>
      <div className="md:col-span-2">
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Description
        </label>
        <textarea
          rows="4"
          value={entrepriseForm.description}
          onChange={(e) =>
            setEntrepriseForm({
              ...entrepriseForm,
              description: e.target.value,
            })
          }
          className={`w-full px-4 py-3 rounded-xl text-base resize-none ${tw.inputTeal}`}
          placeholder="Décrivez votre entreprise..."
        />
      </div>
      <div className="md:col-span-2">
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
          Culture d'entreprise
        </label>
        <textarea
          rows="4"
          value={entrepriseForm.culture_entreprise || ""}
          onChange={(e) =>
            setEntrepriseForm({
              ...entrepriseForm,
              culture_entreprise: e.target.value,
            })
          }
          className={`w-full px-4 py-3 rounded-xl text-base resize-none ${tw.inputTeal}`}
          placeholder="Valeurs, ambiance de travail, avantages, ce qui distingue votre équipe..."
        />
      </div>

      {/* Liens web */}
      <div>
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>LinkedIn (URL)</label>
        <input
          type="url"
          value={entrepriseForm.linkedin}
          onChange={(e) => setEntrepriseForm({ ...entrepriseForm, linkedin: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal}`}
        />
      </div>
      <div>
        <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>Site web (URL)</label>
        <input
          type="url"
          value={entrepriseForm.site_web}
          onChange={(e) => setEntrepriseForm({ ...entrepriseForm, site_web: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal}`}
        />
      </div>
    </>
  );
};

export const OngletMonEntreprise = ({ p }) => {
  const { entreprise } = p;
  return (
    <div className={`${tw.card} rounded-2xl overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${tw.borderSubtle}`}>
        <h2 className={`text-base font-semibold ${tw.textStrong}`}>
          Informations de l'entreprise
        </h2>
        <p className={`text-xs ${tw.textMuted700} mt-0.5`}>
          Visibles sur votre page entreprise publique.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <StatutValidation estApprouvee={entreprise.est_approuvee} />
        <ChampsVerrouilles entreprise={entreprise} />
        <BlocLogo logoUrl={p.logoUrl} onLogoChange={p.handleLogoChange} />
        <BlocBanniere bannerUrl={p.bannerUrl} onBannerChange={p.handleBannerChange} />

        {/* Infos éditables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChampsEditables p={p} />
          <BlocGaleriePhotos
            photos={p.photos}
            newPhotoLegende={p.newPhotoLegende}
            setNewPhotoLegende={p.setNewPhotoLegende}
            uploadingPhoto={p.uploadingPhoto}
            onAjouterPhoto={p.handleAjouterPhoto}
            onSupprimerPhoto={p.handleSupprimerPhoto}
          />
        </div>

        {entreprise.slug && entreprise.est_approuvee && <BlocQrCode entreprise={entreprise} />}

        <div className="pt-2 flex justify-end">
          <button
            onClick={p.sauvegarderEntreprise}
            disabled={p.saving}
            className={`flex items-center gap-2 px-5 py-3 ${tw.bgTealSolid} text-base font-bold rounded-xl transition-colors disabled:opacity-50`}
          >
            <Save size={15} />
            {p.saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
};
