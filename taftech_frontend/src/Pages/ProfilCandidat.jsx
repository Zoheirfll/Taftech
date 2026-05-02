import React, { useState, useEffect } from "react";
import { profilService } from "../Services/profilService";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";

// 👇 1. ON IMPORTE LE FICHIER DES COMMUNES ICI 👇
import communesAlgerie from "../data/communes.json";

const ProfilCandidat = () => {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);
  const [constants, setConstants] = useState({
    wilayas: [],
    secteurs: [],
    diplomes: [],
  });

  const [showExpForm, setShowExpForm] = useState(false);
  const [showFormForm, setShowFormForm] = useState(false);
  const [showCVForm, setShowCVForm] = useState(false);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showPrefForm, setShowPrefForm] = useState(false);

  const [newExp, setNewExp] = useState({
    titre_poste: "",
    entreprise: "",
    date_debut: "",
    date_fin: "",
    description: "",
  });
  const [newForm, setNewForm] = useState({
    diplome: "",
    etablissement: "",
    date_debut: "",
    date_fin: "",
    description: "",
  });

  const [editInfo, setEditInfo] = useState({});
  const [editPref, setEditPref] = useState({});
  const [editCV, setEditCV] = useState({ titre: "", file: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pData, cData] = await Promise.all([
        profilService.getProfil(),
        jobsService.getConstants(),
      ]);
      setProfil(pData);
      setConstants(cData);

      setEditInfo({
        first_name: pData.first_name,
        last_name: pData.last_name,
        telephone: pData.telephone || "",
        wilaya: pData.wilaya || "",
        commune: pData.commune || "",
        diplome: pData.diplome || "",
        specialite: pData.specialite || "",
        service_militaire: pData.service_militaire || "",
        permis_conduire: pData.permis_conduire || false,
        passeport_valide: pData.passeport_valide || false,
      });

      setEditPref({
        secteur_souhaite: pData.secteur_souhaite || "",
        salaire_souhaite: pData.salaire_souhaite || "",
        mobilite: pData.mobilite || "",
        situation_actuelle: pData.situation_actuelle || "",
      });

      setEditCV({ titre: pData.titre_professionnel || "", file: null });
    } catch (err) {
      toast.error("Erreur de synchronisation avec le serveur.");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // 👇 2. LA FONCTION QUI FILTRE LES COMMUNES SELON LA WILAYA 👇
  const getCommunesOptions = () => {
    if (!editInfo.wilaya) return [];
    // On extrait le "31" de "31 - Oran"
    const wilayaCode = editInfo.wilaya.split(" - ")[0];
    return communesAlgerie
      .filter((c) => c.wilaya_code === wilayaCode)
      .map((c) => ({
        value: c.commune_name_ascii,
        label: c.commune_name_ascii,
      }));
  };

  const handleUpdateGeneric = async (e, dataState, setModalState) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(dataState).forEach((key) =>
        formData.append(key, dataState[key]),
      );
      await profilService.updateProfil(formData);
      toast.success("Profil mis à jour !");
      setModalState(false);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
      console.log(err);
    }
  };

  const handleUpdateCV = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("titre_professionnel", editCV.titre);
      if (editCV.file) formData.append("cv_pdf", editCV.file);
      await profilService.updateProfil(formData);
      toast.success("Dossier CV actualisé");
      setShowCVForm(false);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de l'envoi du fichier");
      console.log(err);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo_profil", file);
    try {
      await profilService.updateProfil(formData);
      toast.success("Photo de profil mise à jour !");
      fetchData();
    } catch (err) {
      toast.error("Erreur lors du téléchargement de la photo.");
      console.log(err);
    }
  };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      await profilService.addExperience(newExp);
      toast.success("Expérience ajoutée");
      setShowExpForm(false);
      setNewExp({
        titre_poste: "",
        entreprise: "",
        date_debut: "",
        date_fin: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error("Vérifiez les données de l'expérience.");
      console.log(err);
    }
  };

  const handleDeleteExp = async (id) => {
    if (window.confirm("Supprimer cette expérience ?")) {
      try {
        await profilService.deleteExperience(id);
        fetchData();
      } catch (err) {
        toast.error("Erreur de suppression");
        console.log(err);
      }
    }
  };

  const handleAddFormation = async (e) => {
    e.preventDefault();
    try {
      await profilService.addFormation(newForm);
      toast.success("Diplôme ajouté");
      setShowFormForm(false);
      setNewForm({
        diplome: "",
        etablissement: "",
        date_debut: "",
        date_fin: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de l'ajout de la formation");
      console.log(err);
    }
  };

  const handleDeleteForm = async (id) => {
    if (window.confirm("Supprimer cette formation ?")) {
      try {
        await profilService.deleteFormation(id);
        fetchData();
      } catch (err) {
        toast.error("Erreur de suppression");
        console.log(err);
      }
    }
  };

  const handleAddTag = async (type, value) => {
    const currentTags = profil[type] ? profil[type].split(",") : [];
    if (!currentTags.includes(value.trim())) {
      const newTags = [...currentTags, value.trim()].join(",");
      const formData = new FormData();
      formData.append(type, newTags);
      await profilService.updateProfil(formData);
      fetchData();
    }
  };

  const handleRemoveTag = async (type, tagToRemove) => {
    const newTags = profil[type]
      .split(",")
      .filter((tag) => tag.trim() !== tagToRemove.trim())
      .join(",");
    const formData = new FormData();
    formData.append(type, newTags);
    await profilService.updateProfil(formData);
    fetchData();
  };

  const handleAddLanguage = async (lang, level) => {
    const currentLangStr = profil.langues || "";
    const newEntry = `${lang}:${level}`;
    const languages = currentLangStr ? currentLangStr.split(",") : [];
    const filtered = languages.filter((l) => !l.startsWith(lang));
    const newLangs = [...filtered, newEntry].join(",");
    const formData = new FormData();
    formData.append("langues", newLangs);
    await profilService.updateProfil(formData);
    fetchData();
  };

  const getPhotoUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `http://127.0.0.1:8000${path}`;
  };

  const formatText = (text) => {
    if (!text) return "Non spécifié";
    return text
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 font-sans text-gray-800">
      <h1 className="text-2xl font-black text-gray-900 mb-8">
        Mon Profil Professionnel
      </h1>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex justify-between items-start">
        <div>
          <h2 className="font-black text-gray-900 text-lg mb-2">Mon CV</h2>
          <p className="text-blue-600 font-bold mb-4 text-xl">
            {profil.titre_professionnel || "Titre du profil à définir"}
          </p>
          <p className="text-xs text-gray-500 font-medium">
            Pièce jointe :{" "}
            <span className="text-gray-900 font-bold">
              {profil.cv_pdf ? profil.cv_pdf.split("/").pop() : "Aucun fichier"}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCVForm(true)}
          className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-50 flex items-center gap-2"
        >
          ✏️ Modifier
        </button>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-black text-gray-900 text-lg">
            Informations personnelles
          </h2>
          <button
            onClick={() => setShowInfoForm(true)}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-50 flex items-center gap-2"
          >
            ✏️ Modifier
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-100 rounded-[1.5rem] flex items-center justify-center text-gray-400 text-3xl overflow-hidden border-2 border-gray-200 shadow-sm">
              {profil.photo_profil ? (
                <img
                  src={getPhotoUrl(profil.photo_profil)}
                  alt="Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 text-sm shadow-md border-2 border-white transition-all">
              📷
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-black text-gray-900">
              {profil.first_name} {profil.last_name}
            </h3>

            <div className="mt-2 space-y-1">
              <p className="text-gray-600 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                📍 {profil.wilaya || "Wilaya non renseignée"}{" "}
                {profil.commune ? `- ${profil.commune}` : ""}
              </p>
              <p className="text-gray-600 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                🎓 {formatText(profil.diplome) || "Diplôme non renseigné"} | 🛠️{" "}
                {formatText(profil.specialite) || "Spécialité non renseignée"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-8 border-t border-gray-50 pt-5 mb-5 bg-gray-50/50 p-4 rounded-xl">
          <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
            <span
              className={
                profil.service_militaire === "DEGAGE"
                  ? "text-white bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  : "text-white bg-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              }
            >
              {profil.service_militaire === "DEGAGE" ? "✓" : "✕"}
            </span>{" "}
            Service militaire
          </p>
          <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
            <span
              className={
                profil.permis_conduire
                  ? "text-white bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  : "text-white bg-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              }
            >
              {profil.permis_conduire ? "✓" : "✕"}
            </span>{" "}
            Permis de conduire
          </p>
          <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
            <span
              className={
                profil.passeport_valide
                  ? "text-white bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  : "text-white bg-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              }
            >
              {profil.passeport_valide ? "✓" : "✕"}
            </span>{" "}
            Passeport valide
          </p>
        </div>

        <div className="border-t border-gray-50 pt-5">
          <h4 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3">
            Contact
          </h4>
          <div className="flex flex-wrap gap-10 text-sm font-bold text-gray-700">
            <p className="flex items-center gap-2">
              <span>📞</span> {profil.telephone || "Non renseigné"}
            </p>
            <p className="flex items-center gap-2">
              <span>✉️</span> {profil.email}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-black text-gray-900 text-lg">
            Préférences de recrutement
          </h2>
          <button
            onClick={() => setShowPrefForm(true)}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-50 flex items-center gap-2"
          >
            ✏️ Modifier
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-1">
              Secteur d'activité souhaité
            </p>
            <p className="font-bold text-blue-700">
              {formatText(profil.secteur_souhaite)}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-1">
              Salaire souhaité
            </p>
            <p className="font-bold text-blue-700">
              {profil.salaire_souhaite || "À discuter"}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-1">
              Mobilité
            </p>
            <p className="font-bold text-blue-700">
              {formatText(profil.mobilite)}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-1">
              Situation actuelle
            </p>
            <p className="font-bold text-blue-700">
              {formatText(profil.situation_actuelle)}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-black text-gray-900">Vos expériences</h2>
          <button
            onClick={() => setShowExpForm(true)}
            className="text-blue-600 font-black text-xs border border-blue-100 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 uppercase tracking-wider transition-all"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-8">
          {profil.experiences_detail?.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              Aucune expérience ajoutée.
            </p>
          )}
          {profil.experiences_detail?.map((exp) => (
            <div
              key={exp.id}
              className="relative group pl-6 border-l-2 border-blue-200"
            >
              <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-4 border-blue-600 rounded-full"></div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-gray-900 text-base">
                    {exp.titre_poste}
                  </h4>
                  <p className="text-blue-600 font-bold text-sm mb-2 uppercase">
                    {exp.entreprise}
                  </p>
                  <span className="text-gray-500 text-xs font-bold bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    📅 {exp.date_debut} — {exp.date_fin || "Aujourd'hui"}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteExp(exp.id)}
                  className="text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 p-2 rounded-lg transition"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
              <p className="text-gray-600 text-sm mt-4 leading-relaxed whitespace-pre-line">
                {exp.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-black text-gray-900">
            Formations et diplômes
          </h2>
          <button
            onClick={() => setShowFormForm(true)}
            className="text-indigo-600 font-black text-xs border border-indigo-100 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 uppercase tracking-wider transition-all"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-8">
          {profil.formations_detail?.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              Aucune formation ajoutée.
            </p>
          )}
          {profil.formations_detail?.map((f) => (
            <div
              key={f.id}
              className="relative group pl-6 border-l-2 border-indigo-200"
            >
              <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-4 border-indigo-600 rounded-full"></div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-gray-900 text-base">
                    {f.diplome}
                  </h4>
                  <p className="text-indigo-600 font-bold text-sm mb-2">
                    {f.etablissement}
                  </p>
                  <span className="text-gray-500 text-xs font-bold bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    📅 {f.date_debut} — {f.date_fin}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteForm(f.id)}
                  className="text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 p-2 rounded-lg transition"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-black text-gray-900 mb-6">Compétences</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {profil.competences
            ?.split(",")
            .filter((t) => t)
            .map((tag, i) => (
              <span
                key={i}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                {tag}{" "}
                <button
                  onClick={() => handleRemoveTag("competences", tag)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center transition"
                >
                  ✕
                </button>
              </span>
            ))}
        </div>
        <input
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (handleAddTag("competences", e.target.value), (e.target.value = ""))
          }
          placeholder="Tapez une compétence (ex: React, Gestion d'équipe) puis appuyez sur Entrée..."
          className="w-full p-4 bg-gray-50 rounded-xl text-sm font-bold border-2 border-dashed border-gray-200 outline-none focus:border-blue-500 focus:bg-white transition-all"
        />
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-black text-gray-900 mb-6">Langues</h2>
        <div className="flex flex-wrap gap-3 mb-8">
          {profil.langues
            ?.split(",")
            .filter((l) => l)
            .map((l, i) => {
              const [name, level] = l.split(":");
              return (
                <div
                  key={i}
                  className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm"
                >
                  <span className="font-black text-blue-900 text-sm">
                    {name}
                  </span>
                  <span className="bg-white text-blue-600 text-[10px] uppercase px-2 py-1 rounded-md font-black border border-blue-100">
                    {level}
                  </span>
                  <button
                    onClick={() => handleRemoveTag("langues", l)}
                    className="text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center transition"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
        </div>

        <div className="flex flex-col md:flex-row gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <input
            id="langName"
            placeholder="Langue (ex: Anglais)"
            className="p-4 bg-white rounded-xl text-sm font-bold border border-gray-200 outline-none flex-1 focus:ring-2 focus:ring-blue-500"
          />
          <select
            id="langLevel"
            className="p-4 bg-white rounded-xl text-sm font-bold border border-gray-200 outline-none flex-1 focus:ring-2 focus:ring-blue-500"
          >
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
            <option>Bilingue / Maternelle</option>
          </select>
          <button
            onClick={() => {
              const n = document.getElementById("langName").value;
              const v = document.getElementById("langLevel").value;
              if (n) {
                handleAddLanguage(n, v);
                document.getElementById("langName").value = "";
              }
            }}
            className="bg-gray-900 text-white font-black rounded-xl text-sm px-8 hover:bg-black transition shadow-lg"
          >
            AJOUTER
          </button>
        </div>
      </section>

      {/* 1. Modal Modifier Informations Personnelles */}
      {showInfoForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-xl w-full shadow-2xl animate-slideUp overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-8 text-gray-900 text-center tracking-tight">
              Informations personnelles
            </h3>
            <form
              onSubmit={(e) =>
                handleUpdateGeneric(e, editInfo, setShowInfoForm)
              }
              className="space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Prénom
                  </label>
                  <input
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editInfo.first_name}
                    onChange={(e) =>
                      setEditInfo({ ...editInfo, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Nom
                  </label>
                  <input
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editInfo.last_name}
                    onChange={(e) =>
                      setEditInfo({ ...editInfo, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                  Téléphone
                </label>
                <input
                  required
                  type="tel"
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-blue-500"
                  value={editInfo.telephone}
                  onChange={(e) =>
                    setEditInfo({ ...editInfo, telephone: e.target.value })
                  }
                />
              </div>

              {/* 👇 LES DEUX LISTES DÉROULANTES EN CASCADE 👇 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Wilaya
                  </label>
                  <Select
                    options={constants.wilayas}
                    value={
                      constants.wilayas.find(
                        (w) => w.value === editInfo.wilaya,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        wilaya: opt ? opt.value : "",
                        commune: "",
                      })
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "1rem",
                        padding: "0.4rem",
                        border: "none",
                        backgroundColor: "#f9fafb",
                      }),
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Commune
                  </label>
                  <Select
                    options={getCommunesOptions()}
                    isDisabled={
                      !editInfo.wilaya || getCommunesOptions().length === 0
                    }
                    value={
                      getCommunesOptions().find(
                        (c) => c.value === editInfo.commune,
                      ) || null
                    }
                    placeholder={
                      editInfo.wilaya ? "Sélectionnez..." : "Wilaya d'abord"
                    }
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        commune: opt ? opt.value : "",
                      })
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "1rem",
                        padding: "0.4rem",
                        border: "none",
                        backgroundColor: "#f9fafb",
                      }),
                    }}
                  />
                </div>
              </div>

              {/* 👇 PROFIL PRINCIPAL POUR L'IA 👇 */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Plus haut diplôme
                  </label>
                  <Select
                    options={constants.diplomes}
                    value={
                      constants.diplomes.find(
                        (d) => d.value === editInfo.diplome,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        diplome: opt ? opt.value : "",
                      })
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "1rem",
                        padding: "0.4rem",
                        border: "none",
                        backgroundColor: "#f9fafb",
                      }),
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Spécialité Principale
                  </label>
                  <Select
                    options={constants.secteurs}
                    value={
                      constants.secteurs.find(
                        (s) => s.value === editInfo.specialite,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        specialite: opt ? opt.value : "",
                      })
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "1rem",
                        padding: "0.4rem",
                        border: "none",
                        backgroundColor: "#f9fafb",
                      }),
                    }}
                  />
                </div>
              </div>

              {/* Trio Administratif */}
              <div className="bg-blue-50/50 border border-blue-50 p-6 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Situation Militaire
                  </label>
                  <select
                    className="w-full p-4 bg-white rounded-xl text-sm font-bold border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    value={editInfo.service_militaire}
                    onChange={(e) =>
                      setEditInfo({
                        ...editInfo,
                        service_militaire: e.target.value,
                      })
                    }
                  >
                    <option value="">Sélectionner un statut...</option>
                    <option value="DEGAGE">Dégagé</option>
                    <option value="SURSITAIRE">Sursitaire</option>
                    <option value="INAPTE">Inapte</option>
                    <option value="INCORPORE">Incorporé</option>
                    <option value="NON_CONCERNE">Non concerné (Femme)</option>
                  </select>
                </div>
                <div className="flex justify-between border-t border-blue-100 pt-4">
                  <label className="flex items-center gap-3 text-sm font-bold text-gray-800 cursor-pointer group">
                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all ${editInfo.permis_conduire ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"}`}
                    >
                      {editInfo.permis_conduire && "✓"}
                    </div>
                    Permis de conduire
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={editInfo.permis_conduire}
                      onChange={(e) =>
                        setEditInfo({
                          ...editInfo,
                          permis_conduire: e.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-3 text-sm font-bold text-gray-800 cursor-pointer group">
                    <div
                      className={`w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all ${editInfo.passeport_valide ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"}`}
                    >
                      {editInfo.passeport_valide && "✓"}
                    </div>
                    Passeport valide
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={editInfo.passeport_valide}
                      onChange={(e) =>
                        setEditInfo({
                          ...editInfo,
                          passeport_valide: e.target.checked,
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInfoForm(false)}
                  className="flex-1 font-black text-gray-400 hover:text-gray-600 transition py-4"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all"
                >
                  SAUVEGARDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Préférences de Recrutement */}
      {showPrefForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black mb-8 text-gray-900 text-center tracking-tight">
              Préférences de recherche
            </h3>
            <form
              onSubmit={(e) =>
                handleUpdateGeneric(e, editPref, setShowPrefForm)
              }
              className="space-y-5"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                  Secteur souhaité
                </label>
                <Select
                  options={constants.secteurs}
                  value={
                    constants.secteurs.find(
                      (s) => s.value === editPref.secteur_souhaite,
                    ) || null
                  }
                  placeholder="Sélectionnez..."
                  onChange={(opt) =>
                    setEditPref({
                      ...editPref,
                      secteur_souhaite: opt ? opt.value : "",
                    })
                  }
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "1rem",
                      padding: "0.4rem",
                      border: "none",
                      backgroundColor: "#f9fafb",
                    }),
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                  Salaire mensuel attendu
                </label>
                <input
                  placeholder="Ex: 80 000 DA"
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-blue-500"
                  value={editPref.salaire_souhaite}
                  onChange={(e) =>
                    setEditPref({
                      ...editPref,
                      salaire_souhaite: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Mobilité
                  </label>
                  <select
                    className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editPref.mobilite}
                    onChange={(e) =>
                      setEditPref({ ...editPref, mobilite: e.target.value })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="LOCALE">Locale</option>
                    <option value="REGIONALE">Régionale</option>
                    <option value="NATIONALE">Nationale</option>
                    <option value="INTERNATIONALE">Internationale</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Statut actuel
                  </label>
                  <select
                    className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editPref.situation_actuelle}
                    onChange={(e) =>
                      setEditPref({
                        ...editPref,
                        situation_actuelle: e.target.value,
                      })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="EN_RECHERCHE">En recherche active</option>
                    <option value="A_L_ECOUTE">À l'écoute du marché</option>
                    <option value="EN_POSTE">En poste</option>
                    <option value="ETUDIANT">Étudiant</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowPrefForm(false)}
                  className="flex-1 font-black text-gray-400 hover:text-gray-600 transition py-4"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all"
                >
                  SAUVEGARDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Mettre à jour CV */}
      {showCVForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black mb-8 text-gray-900 text-center tracking-tight">
              Mettre à jour mon CV
            </h3>
            <form onSubmit={handleUpdateCV} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                  Titre professionnel
                </label>
                <input
                  placeholder="Ex: Développeur Fullstack"
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                  value={editCV.titre}
                  onChange={(e) =>
                    setEditCV({ ...editCV, titre: e.target.value })
                  }
                />
              </div>
              <div className="border-2 border-dashed border-gray-200 p-8 rounded-[2rem] text-center hover:border-blue-500 transition-all bg-blue-50/20 cursor-pointer group relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setEditCV({ ...editCV, file: e.target.files[0] })
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">
                  📁
                </span>
                <p className="text-sm font-black text-gray-600 group-hover:text-blue-600 transition-colors">
                  {editCV.file
                    ? editCV.file.name
                    : "Cliquez ou glissez un PDF ici"}
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCVForm(false)}
                  className="flex-1 font-black text-gray-400 hover:text-gray-600 transition py-4"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:-translate-y-1 transition-all"
                >
                  TÉLÉVERSER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Ajouter Expérience */}
      {showExpForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black mb-8 text-gray-900 tracking-tight">
              Ajouter une Expérience
            </h3>
            <form onSubmit={handleAddExperience} className="space-y-5">
              <input
                required
                placeholder="Titre du poste"
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                value={newExp.titre_poste}
                onChange={(e) =>
                  setNewExp({ ...newExp, titre_poste: e.target.value })
                }
              />
              <input
                required
                placeholder="Nom de l'entreprise"
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                value={newExp.entreprise}
                onChange={(e) =>
                  setNewExp({ ...newExp, entreprise: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={newExp.date_debut}
                    onChange={(e) =>
                      setNewExp({ ...newExp, date_debut: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Date de fin (Optionnel)
                  </label>
                  <input
                    type="date"
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={newExp.date_fin}
                    onChange={(e) =>
                      setNewExp({ ...newExp, date_fin: e.target.value })
                    }
                  />
                </div>
              </div>
              <textarea
                placeholder="Description des missions et résultats..."
                rows="4"
                className="w-full p-4 bg-gray-50 rounded-2xl font-medium border-none outline-none focus:ring-2 focus:ring-blue-500"
                value={newExp.description}
                onChange={(e) =>
                  setNewExp({ ...newExp, description: e.target.value })
                }
              />
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowExpForm(false)}
                  className="flex-1 font-black text-gray-400 hover:text-gray-600 transition py-4"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all"
                >
                  SAUVEGARDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Ajouter Formation */}
      {showFormForm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black mb-8 text-gray-900 tracking-tight">
              Ajouter un Diplôme
            </h3>
            <form onSubmit={handleAddFormation} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                  Niveau de diplôme
                </label>
                <Select
                  options={constants.diplomes}
                  placeholder="Sélectionnez..."
                  onChange={(opt) =>
                    setNewForm({ ...newForm, diplome: opt.label })
                  }
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "1rem",
                      padding: "0.4rem",
                      border: "none",
                      backgroundColor: "#f9fafb",
                    }),
                  }}
                />
              </div>
              <input
                required
                placeholder="Université, École ou Institut"
                className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500"
                value={newForm.etablissement}
                onChange={(e) =>
                  setNewForm({ ...newForm, etablissement: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Année de début
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newForm.date_debut}
                    onChange={(e) =>
                      setNewForm({ ...newForm, date_debut: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                    Année de fin
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newForm.date_fin}
                    onChange={(e) =>
                      setNewForm({ ...newForm, date_fin: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowFormForm(false)}
                  className="flex-1 font-black text-gray-400 hover:text-gray-600 transition py-4"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 hover:-translate-y-1 transition-all"
                >
                  ENREGISTRER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilCandidat;
