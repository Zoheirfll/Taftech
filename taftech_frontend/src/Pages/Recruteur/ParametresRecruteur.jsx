import React, { useState, useEffect } from "react";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import { profilService } from "../../Services/profilService";
import Select from "react-select";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import communesAlgerie from "../../data/communes.json";
import {
  User,
  Building2,
  Bell,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const TAILLES_ENTREPRISE_OPTIONS = [
  { value: "TPE", label: "1 à 10 employés" },
  { value: "PE", label: "11 à 50 employés" },
  { value: "ME", label: "51 à 200 employés" },
  { value: "GE", label: "201 à 500 employés" },
  { value: "TGE", label: "Plus de 500 employés" },
];

const ParametresRecruteur = () => {
  const role = authService.getUserRole();

  const [activeTab, setActiveTab] = useState("profil");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profil commun
  const [profilForm, setProfilForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telephone: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Entreprise (recruteur uniquement)
  const [entreprise, setEntreprise] = useState(null);
  const [entrepriseForm, setEntrepriseForm] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });

  // Notifications (recruteur uniquement)
  const [notifForm, setNotifForm] = useState({
    email_refus_auto: false,
    message_refus_auto: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (role === "RECRUTEUR") {
          const [dash, constData, notifs] = await Promise.all([
            jobsService.getDashboard(),
            jobsService.getConstants(),
            jobsService.getParametresRecruteur(),
          ]);
          const e = dash.entreprise;
          setEntreprise(e);
          setEntrepriseForm({
            secteur_activite: e.secteur_activite || "",
            wilaya_siege: e.wilaya_siege || "",
            commune_siege: e.commune_siege || "",
            taille_entreprise: e.taille_entreprise || "",
            description: e.description || "",
            telephone: e.telephone || "",
          });
          setProfilForm({
            first_name: e.first_name || "",
            last_name: e.last_name || "",
            email: e.email || "",
            telephone: e.telephone || "",
          });
          setNotifForm({
            email_refus_auto: notifs.email_refus_auto || false,
            message_refus_auto: notifs.message_refus_auto || "",
          });
          setConstants(constData);
        } else {
          const data = await profilService.getProfil();
          setProfilForm({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            telephone: data.telephone || "",
          });
          if (data.photo_profil) {
            setPhotoPreview(
              data.photo_profil.startsWith("http")
                ? data.photo_profil
                : `http://127.0.0.1:8000${data.photo_profil}`,
            );
          }
        }
      } catch (err) {
        reportError("ECHEC_CHARGEMENT_PARAMETRES", err);
        toast.error("Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  const getCommunesOptions = (wilayaValue) => {
    if (!wilayaValue) return [];
    const code = wilayaValue.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === code)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Format non supporté.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo trop volumineux (max 2 Mo).");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const sauvegarderProfil = async () => {
    setSaving(true);
    try {
      if (role === "RECRUTEUR") {
        const {
          nom_entreprise: _n,
          registre_commerce: _r,
          logo: _l,
          ...dataToSend
        } = entrepriseForm;
        Object.assign(dataToSend, profilForm);
        if (logoFile) dataToSend.logo = logoFile;
        await jobsService.updateProfilEntreprise(dataToSend);
        toast.success("Profil mis à jour !");
      } else {
        const formData = new FormData();
        Object.entries(profilForm).forEach(([k, v]) => formData.append(k, v));
        if (photoFile) formData.append("photo_profil", photoFile);
        await authService.updateProfilCandidat(formData);
        toast.success("Profil mis à jour !");
      }
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde.");
      reportError("ECHEC_SAVE_PROFIL_PARAMETRES", err);
    } finally {
      setSaving(false);
    }
  };

  const sauvegarderEntreprise = async () => {
    setSaving(true);
    try {
      const {
        nom_entreprise: _n,
        registre_commerce: _r,
        logo: _l,
        ...dataToSend
      } = entrepriseForm;
      if (logoFile) dataToSend.logo = logoFile;
      await jobsService.updateProfilEntreprise(dataToSend);
      setLogoFile(null);
      toast.success("Entreprise mise à jour !");
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde.");
      reportError("ECHEC_SAVE_ENTREPRISE_PARAMETRES", err);
    } finally {
      setSaving(false);
    }
  };

  const sauvegarderNotifs = async () => {
    setSaving(true);
    try {
      await jobsService.updateParametresRecruteur(notifForm);
      toast.success("Préférences de notification sauvegardées !");
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde.");
      reportError("ECHEC_SAVE_NOTIFS_PARAMETRES", err);
    } finally {
      setSaving(false);
    }
  };

  const TABS =
    role === "RECRUTEUR"
      ? [
          { key: "profil", label: "Mon profil", icon: User },
          { key: "entreprise", label: "Mon entreprise", icon: Building2 },
          { key: "notifications", label: "Notifications", icon: Bell },
        ]
      : [{ key: "profil", label: "Mon profil", icon: User }];

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );

  const logoUrl =
    logoPreview ||
    (entreprise?.logo
      ? entreprise.logo.startsWith("http")
        ? entreprise.logo
        : `http://127.0.0.1:8000${entreprise.logo}`
      : null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Paramètres
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gérez votre profil et vos préférences.
        </p>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 border-b border-slate-200 mb-8">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ONGLET MON PROFIL */}
      {activeTab === "profil" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Informations personnelles
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ces informations sont visibles sur votre profil public.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Photo */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {role === "RECRUTEUR" ? "Photo de profil" : "Photo de profil"}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={28} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload size={14} />
                    Choisir une photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    JPG, PNG ou WEBP — 5 Mo max
                  </p>
                </div>
              </div>
            </div>

            {/* Champs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Nom
                </label>
                <input
                  type="text"
                  value={profilForm.last_name}
                  onChange={(e) =>
                    setProfilForm({ ...profilForm, last_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Prénom
                </label>
                <input
                  type="text"
                  value={profilForm.first_name}
                  onChange={(e) =>
                    setProfilForm({ ...profilForm, first_name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Email
                </label>
                <input
                  type="email"
                  value={profilForm.email}
                  onChange={(e) =>
                    setProfilForm({ ...profilForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={profilForm.telephone}
                  onChange={(e) =>
                    setProfilForm({ ...profilForm, telephone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={sauvegarderProfil}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET MON ENTREPRISE */}
      {activeTab === "entreprise" && entreprise && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Informations de l'entreprise
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visibles sur votre page entreprise publique.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Statut */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              {entreprise.est_approuvee ? (
                <>
                  <CheckCircle
                    size={18}
                    className="text-emerald-600 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Compte vérifié
                    </p>
                    <p className="text-xs text-slate-500">
                      Votre entreprise a été validée par TafTech.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle
                    size={18}
                    className="text-amber-600 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      En attente de validation
                    </p>
                    <p className="text-xs text-slate-500">
                      Notre équipe vérifie votre registre de commerce.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Champs verrouillés */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Dénomination sociale
                </label>
                <p className="px-4 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed">
                  {entreprise.nom_entreprise}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Registre de commerce
                </label>
                <p className="px-4 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-sm font-mono text-slate-400 cursor-not-allowed">
                  {entreprise.registre_commerce}
                </p>
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-3 block">
                Logo de l'entreprise
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 size={28} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    <Upload size={14} />
                    Changer le logo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    JPG, PNG ou WEBP — 2 Mo max
                  </p>
                </div>
              </div>
            </div>

            {/* Infos éditables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Secteur d'activité
                </label>
                <Select
                  options={constants.secteurs}
                  value={
                    constants.secteurs.find(
                      (s) => s.value === entrepriseForm.secteur_activite,
                    ) || null
                  }
                  onChange={(s) =>
                    setEntrepriseForm({
                      ...entrepriseForm,
                      secteur_activite: s ? s.value : "",
                    })
                  }
                  styles={selectStyles}
                  placeholder="Sélectionnez un secteur"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
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
                  styles={selectStyles}
                  placeholder="Sélectionnez une wilaya"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
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
                  styles={selectStyles}
                  placeholder="Sélectionnez une commune"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
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
                  styles={selectStyles}
                  placeholder="Sélectionnez une taille"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                  placeholder="Décrivez votre entreprise..."
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={sauvegarderEntreprise}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Notifications aux candidats
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configurez les emails automatiques envoyés à vos candidats.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Toggle */}
            <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Email de refus automatique
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Un email est envoyé automatiquement aux candidats refusés. Une
                  réponse, même négative, améliore votre image employeur.
                </p>
              </div>
              <button
                onClick={() =>
                  setNotifForm({
                    ...notifForm,
                    email_refus_auto: !notifForm.email_refus_auto,
                  })
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  notifForm.email_refus_auto ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    notifForm.email_refus_auto
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Message personnalisable */}
            {notifForm.email_refus_auto && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Message de refus
                  </label>
                  <div className="flex gap-1.5">
                    {["{prenom}", "{titre_offre}", "{nom_entreprise}"].map(
                      (v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono rounded border border-indigo-100"
                        >
                          {v}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <textarea
                  rows="8"
                  value={notifForm.message_refus_auto}
                  onChange={(e) =>
                    setNotifForm({
                      ...notifForm,
                      message_refus_auto: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none font-mono"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Utilisez les variables ci-dessus pour personnaliser le message
                  automatiquement.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={sauvegarderNotifs}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParametresRecruteur;
