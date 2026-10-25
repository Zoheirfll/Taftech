// Onglet "Mon profil" des Paramètres : informations personnelles puis changement / définition du mot de passe.
import React from "react";
import { Upload, Save, Lock, User } from "lucide-react";
import { authService } from "../../../Services/authService";
import { tw } from "../../../theme";
import FieldError from "../../../Components/FieldError";
import { useErreursChamps } from "../../../utils/useErreursChamps";

const CarteInformationsPersonnelles = ({
  role,
  profilForm,
  setProfilForm,
  photoPreview,
  onPhotoChange,
  onSauvegarder,
  saving,
}) => (
  <div className={`${tw.card} rounded-2xl overflow-hidden`}>
    <div className={`px-6 py-4 border-b ${tw.borderSubtle}`}>
      <h2 className={`text-base font-semibold ${tw.textStrong}`}>
        Informations personnelles
      </h2>
      <p className={`text-xs ${tw.textMuted700} mt-0.5`}>
        Ces informations restent dans votre espace recruteur : elles ne sont pas affichées publiquement.
      </p>
    </div>

    <div className="p-6 space-y-6">
      {/* Photo — uniquement pour les candidats purs (pas recruteur ni membre) */}
      {role !== "RECRUTEUR" && !authService.getEstMembreEquipe() && (
        <div>
          <p className={`text-xs font-semibold ${tw.textMuted700} uppercase tracking-wider mb-3`}>
            Photo de profil
          </p>
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-xl ${tw.surfaceSubtle} border ${tw.borderBase} flex items-center justify-center overflow-hidden shrink-0`}>
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={28} className={tw.textSubtle} />
              )}
            </div>
            <div>
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${tw.uploadLabelPill}`}>
                <Upload size={14} />
                Choisir une photo
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} className="hidden" />
              </label>
              <p className={`text-[10px] ${tw.textMuted} mt-1`}>JPG, PNG ou WEBP — 5 Mo max</p>
            </div>
          </div>
        </div>
      )}

      {/* Champs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
            Nom
          </label>
          <input
            type="text"
            value={profilForm.last_name}
            onChange={(e) =>
              setProfilForm({ ...profilForm, last_name: e.target.value })
            }
            className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal}`}
          />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
            Prénom
          </label>
          <input
            type="text"
            value={profilForm.first_name}
            onChange={(e) =>
              setProfilForm({ ...profilForm, first_name: e.target.value })
            }
            className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal}`}
          />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
            Email <span className={tw.textMuted}>(non modifiable — identifiant de connexion)</span>
          </label>
          <input
            type="email"
            value={profilForm.email}
            disabled
            className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal} opacity-60 cursor-not-allowed`}
          />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
            Téléphone
          </label>
          <input
            type="tel"
            value={profilForm.telephone}
            onChange={(e) =>
              setProfilForm({ ...profilForm, telephone: e.target.value })
            }
            className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal}`}
          />
        </div>
        <div>
          <label className={`text-xs font-medium ${tw.textMuted700} mb-1.5 block`}>
            Intitulé de poste
          </label>
          <input
            type="text"
            value={profilForm.intitule_poste}
            onChange={(e) =>
              setProfilForm({ ...profilForm, intitule_poste: e.target.value })
            }
            className={`w-full px-4 py-3 rounded-xl text-base ${tw.inputTeal}`}
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={onSauvegarder}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-3 ${tw.bgTealSolid} text-base font-bold rounded-xl transition-colors disabled:opacity-50`}
        >
          <Save size={15} />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>
    </div>
  </div>
);

const CarteMotDePasse = ({ estCompteGoogle, pwdForm, setPwdForm, pwdLoading, onSubmit }) => {
  const { erreurs, definir, effacer, attributs } = useErreursChamps();
  // Contrôles faits avant l'envoi, avec un message sous le champ concerné.
  const soumettre = (e) => {
    const trouvees = {};
    if (!estCompteGoogle && !pwdForm.old) trouvees.old = "Saisissez votre mot de passe actuel.";
    if (pwdForm.new.length < 8) trouvees.new = "8 caractères minimum.";
    if (pwdForm.new !== pwdForm.confirm) trouvees.confirm = "Les mots de passe ne correspondent pas.";
    if (Object.keys(trouvees).length) {
      e.preventDefault();
      definir(trouvees);
      return;
    }
    definir({});
    return onSubmit(e);
  };
  return (
  <div className={`${tw.card} rounded-2xl overflow-hidden`}>
    <div className={`px-6 py-4 border-b ${tw.borderSubtle} flex items-center gap-2`}>
      <Lock size={16} className={tw.textMuted} />
      <div>
        <h2 className={`text-base font-semibold ${tw.textStrong}`}>
          {estCompteGoogle ? "Définir un mot de passe" : "Changer le mot de passe"}
        </h2>
        {estCompteGoogle && (
          <p className={`text-xs ${tw.textMuted700} mt-0.5`}>
            Votre compte a été créé via Google. Définissez un mot de passe pour vous connecter sans Google.
          </p>
        )}
      </div>
    </div>
    <div className="p-6">
      <form onSubmit={soumettre} noValidate className="space-y-3">
        <div className={`grid gap-3 ${estCompteGoogle ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
          {!estCompteGoogle && (
            <div>
              <input
                type="password"
                placeholder="Mot de passe actuel"
                aria-label="Mot de passe actuel"
                {...attributs("old")}
                value={pwdForm.old}
                onChange={(e) => { setPwdForm({ ...pwdForm, old: e.target.value }); effacer("old"); }}
                className={`w-full px-4 py-2.5 rounded-xl text-sm ${tw.inputTeal}`}
              />
              <FieldError id="err-old" message={erreurs.old} />
            </div>
          )}
          <div>
            <input
              type="password"
              placeholder="Nouveau mot de passe (8 car. min)"
              aria-label="Nouveau mot de passe"
              {...attributs("new")}
              value={pwdForm.new}
              onChange={(e) => { setPwdForm({ ...pwdForm, new: e.target.value }); effacer("new"); }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm ${tw.inputTeal}`}
            />
            <FieldError id="err-new" message={erreurs.new} />
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              aria-label="Confirmer le mot de passe"
              {...attributs("confirm")}
              value={pwdForm.confirm}
              onChange={(e) => { setPwdForm({ ...pwdForm, confirm: e.target.value }); effacer("confirm"); }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm ${tw.inputTeal}`}
            />
            <FieldError id="err-confirm" message={erreurs.confirm} />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pwdLoading}
            className={`px-5 py-2.5 ${tw.bgTealSolid} text-sm font-bold rounded-xl transition-colors disabled:opacity-60`}
          >
            {pwdLoading ? "Enregistrement..." : estCompteGoogle ? "Définir le mot de passe" : "Modifier le mot de passe"}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};

export const OngletMonProfil = ({ p }) => (
  <>
    <CarteInformationsPersonnelles
      role={p.role}
      profilForm={p.profilForm}
      setProfilForm={p.setProfilForm}
      photoPreview={p.photoPreview}
      onPhotoChange={p.handlePhotoChange}
      onSauvegarder={p.sauvegarderProfil}
      saving={p.saving}
    />
    <CarteMotDePasse
      estCompteGoogle={p.estCompteGoogle}
      pwdForm={p.pwdForm}
      setPwdForm={p.setPwdForm}
      pwdLoading={p.pwdLoading}
      onSubmit={p.changerMotDePasse}
    />
  </>
);
