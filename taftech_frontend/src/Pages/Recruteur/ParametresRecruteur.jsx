import React, { useState, useEffect } from "react";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import { profilService } from "../../Services/profilService";
import Select from "react-select";
import toast from "react-hot-toast";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { selectStyles } from "../../theme";
import communesAlgerie from "../../data/communes.json";
import { QRCodeCanvas } from "qrcode.react";
import {
  User,
  Building2,
  Bell,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
  Users,
  Download,
  QrCode,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "../../api/axiosConfig";
import MonEquipe from "./MonEquipe";
import InfoBanner from "../../Components/InfoBanner";

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
  const [isPremium, setIsPremium] = useState(false);

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

  // Mot de passe
  const [estCompteGoogle, setEstCompteGoogle] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: "", new: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);

  // Aperçu message refus
  const [showApercu, setShowApercu] = useState(false);
  const textareaRef = React.useRef(null);

  const insererVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = notifForm.message_refus_auto.slice(0, start);
    const after = notifForm.message_refus_auto.slice(end);
    const newVal = before + variable + after;
    setNotifForm({ ...notifForm, message_refus_auto: newVal });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const apercuMessage = notifForm.message_refus_auto
    .replace(/\{prenom\}/g, "Ahmed")
    .replace(/\{titre_offre\}/g, "Développeur React")
    .replace(/\{nom_entreprise\}/g, entreprise?.nom_entreprise || "Votre Entreprise");

  useEffect(() => {
    const load = async () => {
      try {
        const estMembre = authService.getEstMembreEquipe();
        if (role === "RECRUTEUR") {
          const [dash, constData, notifs] = await Promise.all([
            jobsService.getDashboard(),
            jobsService.getConstants(),
            jobsService.getParametresRecruteur(),
          ]);
          setIsPremium(!!dash.est_premium);
          const e = dash.entreprise;
          setEntreprise(e);
          setEntrepriseForm({
            secteur_activite: e.secteur_activite || "",
            wilaya_siege: e.wilaya_siege || "",
            commune_siege: e.commune_siege || "",
            taille_entreprise: e.taille_entreprise || "",
            description: e.description || "",
            telephone: e.telephone || "",
            linkedin: e.linkedin || "",
            site_web: e.site_web || "",
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
        } else if (estMembre) {
          // Membre : charger dashboard (entreprise + premium) + profil perso + constants
          const [dash, data, constData] = await Promise.all([
            jobsService.getDashboard(),
            profilService.getProfil(),
            jobsService.getConstants(),
          ]);
          setConstants(constData);
          setIsPremium(!!dash.est_premium);
          const e = dash.entreprise;
          if (e) {
            setEntreprise(e);
            setEntrepriseForm({
              secteur_activite: e.secteur_activite || "",
              wilaya_siege: e.wilaya_siege || "",
              commune_siege: e.commune_siege || "",
              taille_entreprise: e.taille_entreprise || "",
              description: e.description || "",
              telephone: e.telephone || "",
            });
          }
          setProfilForm({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            telephone: data.telephone || "",
          });
          if (data.photo_profil) {
            setPhotoPreview(
              mediaUrl(data.photo_profil),
            );
          }
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
              mediaUrl(data.photo_profil),
            );
          }
        }
        // Charger est_compte_google
        try {
          const me = await api.get("accounts/me/");
          setEstCompteGoogle(me.data.est_compte_google || false);
        } catch { /* non bloquant */ }

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
        // Propriétaire : sauvegarde via updateProfilEntreprise (backend sauvegarde aussi user.first_name etc.)
        const { nom_entreprise: _n, registre_commerce: _r, logo: _l, ...dataToSend } = entrepriseForm;
        Object.assign(dataToSend, profilForm);
        // L'onglet profil uploade dans photoFile, pas logoFile
        if (photoFile) dataToSend.logo = photoFile;
        await jobsService.updateProfilEntreprise(dataToSend);
        setPhotoFile(null);
        toast.success("Profil mis à jour !");
      } else {
        // Membres (CANDIDAT en DB) : sauvegarde du profil candidat
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

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    if (pwdForm.new !== pwdForm.confirm) return toast.error("Les mots de passe ne correspondent pas.");
    if (pwdForm.new.length < 8) return toast.error("8 caractères minimum.");
    setPwdLoading(true);
    try {
      await api.post("accounts/changer-mot-de-passe/", {
        ancien_mdp: pwdForm.old,
        nouveau_mdp: pwdForm.new,
      });
      toast.success(estCompteGoogle ? "Mot de passe défini !" : "Mot de passe modifié !");
      setPwdForm({ old: "", new: "", confirm: "" });
      if (estCompteGoogle) setEstCompteGoogle(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur.");
      reportError("ECHEC_CHANGER_MDP_RECRUTEUR", err);
    } finally {
      setPwdLoading(false);
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

  const TABS = [
    { key: "profil", label: "Mon profil", icon: User, minRole: "INVITE" },
    { key: "entreprise", label: "Mon entreprise", icon: Building2, minRole: "ADMIN" },
    { key: "notifications", label: "Notifications", icon: Bell, minRole: "PROPRIETAIRE" },
    // Toujours visible pour le propriétaire (même si premium expiré — pour pouvoir supprimer les membres)
    // Visible pour les membres uniquement si premium actif
    ...((isPremium || role === "RECRUTEUR") ? [{ key: "equipe", label: "Mon équipe ⭐", icon: Users, minRole: "PROPRIETAIRE" }] : []),
  ].filter(({ minRole }) => authService.peutFaire(minRole));

  if (loading)
    return (
      <div className="bg-slate-100 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8 space-y-2">
            <div className="h-7 bg-slate-200 rounded w-40 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-64 animate-pulse" />
          </div>
          <div className="flex gap-1 border-b border-slate-200 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-32 bg-slate-100 rounded-t animate-pulse mx-1" />
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
            </div>
            <div className="h-10 bg-slate-200 rounded-xl w-32 ml-auto" />
          </div>
        </div>
      </div>
    );

  const logoUrl =
    logoPreview || mediaUrl(entreprise?.logo);

  return (
    <div className="bg-slate-100 min-h-screen">
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Paramètres
        </h1>
        <p className="text-base text-slate-500 mt-1">
          Gérez votre profil et vos préférences.
        </p>
      </div>

      <div className="mb-6">
        <InfoBanner storageKey="parametres_recruteur" title="Paramètres de votre espace recruteur" color="teal">
          <strong>Mon entreprise</strong> : modifiez le logo, la description et les infos de votre entreprise (admin uniquement). ·{" "}
          <strong>Mon équipe</strong> : invitez des collaborateurs avec différents rôles (ADMIN, UTILISATEUR, INVITÉ). ·{" "}
          <strong>Changer le mot de passe</strong> depuis l'onglet compte. ·{" "}
          <strong>QR Code</strong> : disponible après validation de votre entreprise.
        </InfoBanner>
      </div>

      {/* ONGLETS */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === key
                ? "border-teal-700 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ONGLET MON PROFIL */}
      {activeTab === "profil" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Informations personnelles
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ces informations sont visibles sur votre profil public.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Photo — uniquement pour les candidats purs (pas recruteur ni membre) */}
            {role !== "RECRUTEUR" && !authService.getEstMembreEquipe() && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Photo de profil
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-slate-300" />
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                      <Upload size={14} />
                      Choisir une photo
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">JPG, PNG ou WEBP — 5 Mo max</p>
                  </div>
                </div>
              </div>
            )}

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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={sauvegarderProfil}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-teal-700 text-white text-base font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOT DE PASSE (dans onglet profil) */}
      {activeTab === "profil" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Lock size={16} className="text-slate-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {estCompteGoogle ? "Définir un mot de passe" : "Changer le mot de passe"}
              </h2>
              {estCompteGoogle && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Votre compte a été créé via Google. Définissez un mot de passe pour vous connecter sans Google.
                </p>
              )}
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={changerMotDePasse} className="space-y-3">
              <div className={`grid gap-3 ${estCompteGoogle ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                {!estCompteGoogle && (
                  <input
                    type="password"
                    placeholder="Mot de passe actuel"
                    value={pwdForm.old}
                    onChange={(e) => setPwdForm({ ...pwdForm, old: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                )}
                <input
                  type="password"
                  placeholder="Nouveau mot de passe (8 car. min)"
                  value={pwdForm.new}
                  onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2.5 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60"
                >
                  {pwdLoading ? "Enregistrement..." : estCompteGoogle ? "Définir le mot de passe" : "Modifier le mot de passe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONGLET MON ENTREPRISE */}
      {activeTab === "entreprise" && entreprise && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
                    className="text-emerald-600 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Compte vérifié
                    </p>
                    <p className="text-xs text-slate-500">
                      Votre entreprise a été validée par TAFTECH.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle
                    size={18}
                    className="text-amber-600 shrink-0"
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
                <div className="w-24 h-24 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
                  placeholder="Décrivez votre entreprise..."
                />
              </div>

              {/* Liens web */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">LinkedIn (URL)</label>
                <input
                  type="url"
                  value={entrepriseForm.linkedin}
                  onChange={(e) => setEntrepriseForm({ ...entrepriseForm, linkedin: e.target.value })}
                  placeholder="https://www.linkedin.com/company/..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Site web (URL)</label>
                <input
                  type="url"
                  value={entrepriseForm.site_web}
                  onChange={(e) => setEntrepriseForm({ ...entrepriseForm, site_web: e.target.value })}
                  placeholder="https://www.monentreprise.dz"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            {/* QR CODE */}
            {entreprise.slug && entreprise.est_approuvee && (
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode size={16} className="text-teal-700" />
                  <h3 className="text-sm font-semibold text-slate-900">QR Code de votre entreprise</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <QRCodeCanvas
                      id="entreprise-qr"
                      value={`${window.location.origin}/entreprise/${entreprise.slug}`}
                      size={140}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-700 font-medium">Partagez ce QR code avec vos candidats</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      En le scannant, ils accèdent directement à votre page entreprise et peuvent envoyer une candidature spontanée.
                    </p>
                    <button
                      onClick={() => {
                        const canvas = document.getElementById("entreprise-qr");
                        const url = canvas.toDataURL("image/png");
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `qr-${entreprise.nom_entreprise || "entreprise"}.png`;
                        a.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors"
                    >
                      <Download size={14} /> Télécharger le QR
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={sauvegarderEntreprise}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-teal-700 text-white text-base font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-50"
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  notifForm.email_refus_auto ? "bg-teal-700" : "bg-slate-200"
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
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Message de refus
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 mr-1">Cliquez pour insérer :</span>
                    {["{prenom}", "{titre_offre}", "{nom_entreprise}"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insererVariable(v)}
                        className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[10px] font-mono rounded border border-teal-100 hover:bg-teal-100 hover:border-teal-300 transition-colors cursor-pointer"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {showApercu ? (
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[11rem]">
                    {apercuMessage || <span className="text-slate-400 italic">Aucun message.</span>}
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    rows="8"
                    value={notifForm.message_refus_auto}
                    onChange={(e) => setNotifForm({ ...notifForm, message_refus_auto: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none font-mono"
                    placeholder="Bonjour {prenom},&#10;&#10;Nous avons bien étudié votre candidature pour le poste de {titre_offre} au sein de {nom_entreprise}...&#10;&#10;Cordialement,"
                  />
                )}

                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setShowApercu(!showApercu)}
                    className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline"
                  >
                    {showApercu ? <><EyeOff size={12} /> Modifier</> : <><Eye size={12} /> Aperçu</>}
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {notifForm.message_refus_auto.length} caractères
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={sauvegarderNotifs}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-teal-700 text-white text-base font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET ÉQUIPE */}
      {activeTab === "equipe" && <MonEquipe />}
    </div>
    </div>
  );
};

export default ParametresRecruteur;
