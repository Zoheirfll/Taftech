// Hook des Paramètres recruteur : chargement (recruteur / membre / candidat), formulaires, uploads d'images et sauvegardes.
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { authService } from "../../../Services/authService";
import { jobsService } from "../../../Services/jobsService";
import { profilService } from "../../../Services/profilService";
import { reportError } from "../../../utils/errorReporter";
import { confirmToast } from "../../../utils/confirmToast";
import { mediaUrl } from "../../../utils/mediaUrl";
import { apiErrMsg } from "../../../utils/apiErrMsg";
import communesAlgerie from "../../../data/communes.json";
import api from "../../../api/axiosConfig";

// Valeurs initiales du formulaire entreprise à partir de la fiche reçue du dashboard.
const construireFormEntreprise = (e) => ({
  secteur_activite: e.secteur_activite || "",
  wilaya_siege: e.wilaya_siege || "",
  commune_siege: e.commune_siege || "",
  adresse_complete: e.adresse_complete || "",
  taille_entreprise: e.taille_entreprise || "",
  description: e.description || "",
  culture_entreprise: e.culture_entreprise || "",
  annee_creation: e.annee_creation || "",
  telephone: e.telephone || "",
  linkedin: e.linkedin || "",
  site_web: e.site_web || "",
});

const FORMATS_IMAGE = ["image/jpeg", "image/png", "image/webp"];

export const useParametresRecruteur = () => {
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
    intitule_poste: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Entreprise (recruteur uniquement)
  const [entreprise, setEntreprise] = useState(null);
  const [entrepriseForm, setEntrepriseForm] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [newPhotoLegende, setNewPhotoLegende] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });
  const [secteursEntreprise, setSecteursEntreprise] = useState([]);

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
  const textareaRef = useRef(null);

  // Recadrage d'image : { file, aspect, shape, apply }
  const [cropper, setCropper] = useState(null);
  const fermerCropper = () => setCropper(null);

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
          const e = dash.entreprise;
          setEntreprise(e);
          setEntrepriseForm(construireFormEntreprise(e));
          setPhotos(e.photos || []);
          setProfilForm({
            first_name: e.first_name || "",
            last_name: e.last_name || "",
            email: e.email || "",
            telephone: e.telephone || "",
            intitule_poste: e.intitule_poste || "",
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
          const e = dash.entreprise;
          if (e) {
            setEntreprise(e);
            setEntrepriseForm(construireFormEntreprise(e));
            setPhotos(e.photos || []);
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
        toast.error(apiErrMsg(err, "Erreur de chargement."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  // Secteur d'entreprise — même référentiel v2 que la navigation publique "Offres par
  // secteur" (16 ANEM + secteurs précis ajoutés par TAFTECH), pas l'ancienne liste figée.
  useEffect(() => {
    jobsService
      .getNomenclature()
      .then((n) => setSecteursEntreprise((n.secteurs || []).map((s) => ({ value: s.code, label: s.libelle }))))
      .catch((err) => reportError("ECHEC_CHARGEMENT_SECTEURS_ENTREPRISE", err));
  }, []);

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
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    setCropper({
      file, aspect: 1, shape: "round",
      apply: (cropped) => {
        setPhotoFile(cropped);
        setPhotoPreview(URL.createObjectURL(cropped));
        fermerCropper();
      },
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!FORMATS_IMAGE.includes(file.type)) {
      toast.error("Format non supporté.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo trop volumineux (max 2 Mo).");
      return;
    }
    setCropper({
      file, aspect: 1, shape: "round",
      apply: (cropped) => {
        setLogoFile(cropped);
        setLogoPreview(URL.createObjectURL(cropped));
        fermerCropper();
      },
    });
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!FORMATS_IMAGE.includes(file.type)) {
      toast.error("Format non supporté.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bannière trop volumineuse (max 5 Mo).");
      return;
    }
    setCropper({
      file, aspect: 3.5, shape: "rect",
      apply: (cropped) => {
        setBannerFile(cropped);
        setBannerPreview(URL.createObjectURL(cropped));
        fermerCropper();
      },
    });
  };

  const handleAjouterPhoto = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!FORMATS_IMAGE.includes(file.type)) {
      toast.error("Format non supporté.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Photo trop volumineuse (max 3 Mo).");
      return;
    }
    if (photos.length >= 12) {
      toast.error("Maximum 12 photos dans la galerie.");
      return;
    }
    setCropper({ file, aspect: 4 / 3, shape: "rect", apply: (cropped) => { fermerCropper(); envoyerPhotoGalerie(cropped); } });
  };

  const envoyerPhotoGalerie = async (file) => {
    setUploadingPhoto(true);
    try {
      const photo = await jobsService.ajouterPhotoEntreprise(file, newPhotoLegende);
      setPhotos((prev) => [photo, ...prev]);
      setNewPhotoLegende("");
      toast.success("Photo ajoutée !");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de l'ajout de la photo."));
      reportError("ECHEC_AJOUTER_PHOTO_ENTREPRISE", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSupprimerPhoto = (photoId) => {
    confirmToast("Supprimer cette photo de la galerie ?", async () => {
      try {
        await jobsService.supprimerPhotoEntreprise(photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success("Photo supprimée.");
      } catch (err) {
        toast.error(apiErrMsg(err, "Erreur lors de la suppression."));
        reportError("ECHEC_SUPPRIMER_PHOTO_ENTREPRISE", err);
      }
    });
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
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
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
      toast.error(apiErrMsg(err, "Erreur."));
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
        banniere: _b,
        ...dataToSend
      } = entrepriseForm;
      if (logoFile) dataToSend.logo = logoFile;
      if (bannerFile) dataToSend.banniere = bannerFile;
      await jobsService.updateProfilEntreprise(dataToSend);
      setLogoFile(null);
      setBannerFile(null);
      toast.success("Entreprise mise à jour !");
    } catch (err) {
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
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
      toast.error(apiErrMsg(err, "Erreur lors de la sauvegarde."));
      reportError("ECHEC_SAVE_NOTIFS_PARAMETRES", err);
    } finally {
      setSaving(false);
    }
  };

  const logoUrl = logoPreview || mediaUrl(entreprise?.logo);
  const bannerUrl = bannerPreview || mediaUrl(entreprise?.banniere);

  return {
    role, activeTab, setActiveTab, loading, saving,
    profilForm, setProfilForm, photoPreview,
    entreprise, entrepriseForm, setEntrepriseForm, logoUrl, bannerUrl,
    photos, newPhotoLegende, setNewPhotoLegende, uploadingPhoto,
    constants, secteursEntreprise, getCommunesOptions,
    notifForm, setNotifForm, showApercu, setShowApercu, textareaRef, insererVariable, apercuMessage,
    estCompteGoogle, pwdForm, setPwdForm, pwdLoading,
    cropper, fermerCropper,
    handlePhotoChange, handleLogoChange, handleBannerChange, handleAjouterPhoto, handleSupprimerPhoto,
    sauvegarderProfil, changerMotDePasse, sauvegarderEntreprise, sauvegarderNotifs,
  };
};
