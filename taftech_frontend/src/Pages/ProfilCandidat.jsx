import React, { useState, useEffect } from "react";
import { profilService } from "../Services/profilService";
import { authService } from "../Services/authService";

const ProfilCandidat = () => {
  // --- ÉTATS ---
  const [profil, setProfil] = useState({
    titre_professionnel: "",
    diplome: "",
    specialite: "",
    experiences: "",
    competences: "",
    langues: "",
    cv_pdf: null,
  });

  const [user, setUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telephone: "",
    nin: "",
  });

  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [fichier, setFichier] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    const fetchAllData = async () => {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }
      try {
        const data = await profilService.getProfil();
        setProfil({
          titre_professionnel: data.titre_professionnel || "",
          diplome: data.diplome || "",
          specialite: data.specialite || "",
          experiences: data.experiences || "",
          competences: data.competences || "",
          langues: data.langues || "",
          cv_pdf: data.cv_pdf || null,
        });
        setUser({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          telephone: data.telephone || "",
          nin: data.nin || "",
        });
      } catch (err) {
        console.error("Erreur de chargement", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // --- LOGIQUE VISUELLE : BADGES DYNAMIQUES ---
  const renderBadges = (str, colorClass) => {
    if (!str) return null;
    return str.split(",").map((s, i) => (
      <span
        key={i}
        className={`${colorClass} px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border border-white/10`}
      >
        {s.trim()}
      </span>
    ));
  };

  // --- HANDLERS (Tous utilisés maintenant) ---
  const handleChangeProfil = (e) =>
    setProfil({ ...profil, [e.target.name]: e.target.value });
  const handleChangeUser = (e) =>
    setUser({ ...user, [e.target.name]: e.target.value });
  const handleChangePassword = (e) =>
    setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "info", message: "Synchronisation TafTech en cours..." });

    const formData = new FormData();
    Object.keys(profil).forEach((key) => {
      if (profil[key] !== null && key !== "cv_pdf")
        formData.append(key, profil[key]);
    });

    if (user.telephone) formData.append("telephone", user.telephone);
    if (user.nin) formData.append("nin", user.nin);
    if (fichier) formData.append("cv_pdf", fichier);

    if (passwords.newPassword) {
      if (passwords.newPassword !== passwords.confirmPassword) {
        setStatus({ type: "error", message: "Les mots de passe divergent." });
        return;
      }
      formData.append("new_password", passwords.newPassword);
      formData.append("old_password", passwords.oldPassword);
    }

    try {
      const data = await profilService.updateProfil(formData);
      setStatus({
        type: "success",
        message: "Votre profil a été propulsé avec succès !",
      });
      if (data.profil) setProfil((prev) => ({ ...prev, ...data.profil }));
      setFichier(null);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    } catch (error) {
      setStatus({
        type: "error",
        message: "Erreur lors de la mise à jour.",
        error,
      });
    }
  };

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="w-20 h-20 border-8 border-blue-600 border-t-transparent rounded-[2.5rem] animate-spin mb-4 shadow-2xl"></div>
        <p className="text-blue-600 font-black tracking-widest uppercase">
          Initialisation du Profil Élite...
        </p>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 bg-gray-50 min-h-screen font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* --- SIDEBAR GAUCHE (IDENTITÉ & STATUT) --- */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[3rem] shadow-2xl p-8 sticky top-10 border border-white overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-700 to-indigo-500"></div>

            <div className="relative w-40 h-40 mx-auto mb-8 mt-4">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[3rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl rotate-3 transform hover:rotate-0 transition-transform duration-500">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-10 h-10 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold">
                ✓
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-tight">
                {user.first_name} <br /> {user.last_name}
              </h2>
              <div className="inline-block px-4 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                CANDIDAT CERTIFIÉ TAFTECH
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4 border border-gray-100">
                <span className="text-2xl">📧</span>
                <p className="text-sm font-bold text-gray-700 truncate">
                  {user.email}
                </p>
              </div>
              {/* Le NIN est ici en lecture seule pour la sécurité */}
              <div className="p-4 bg-blue-900 rounded-2xl flex items-center gap-4 text-white shadow-lg shadow-blue-100">
                <span className="text-2xl">🆔</span>
                <p className="text-xs font-mono font-black">
                  {user.nin || "VALIDATION NIN EN COURS..."}
                </p>
              </div>
            </div>

            {/* APERÇU RAPIDE DES COMPÉTENCES */}
            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap gap-2">
              {renderBadges(profil.competences, "bg-gray-900 text-white")}
            </div>

            {profil.cv_pdf && (
              <a
                href={`http://127.0.0.1:8000${profil.cv_pdf}`}
                target="_blank"
                rel="noreferrer"
                className="mt-8 flex items-center justify-center w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black hover:bg-blue-600 transition-all shadow-xl"
              >
                📂 CONSULTER MON DOSSIER PDF
              </a>
            )}
          </div>
        </aside>

        {/* --- CONTENU PRINCIPAL --- */}
        <main className="lg:col-span-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8 pb-32">
            {status.message && (
              <div
                className={`p-6 rounded-3xl font-black shadow-2xl flex items-center gap-4 animate-slideDown ${status.type === "success" ? "bg-green-500 text-white" : "bg-blue-600 text-white animate-pulse"}`}
              >
                <span>{status.type === "success" ? "✅" : "🚀"}</span>{" "}
                {status.message}
              </div>
            )}

            {/* IDENTITÉ & MOBILE (Utilise handleChangeUser) */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>{" "}
                Contact & Téléphone
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Numéro Mobile Professionnel
                  </label>
                  <input
                    type="text"
                    name="telephone"
                    value={user.telephone}
                    onChange={handleChangeUser} // <-- Connecté ici
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-600 outline-none font-bold text-gray-800"
                    placeholder="Ex: 0550 00 00 00"
                  />
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 self-end">
                  <p className="text-[10px] font-black text-blue-400 uppercase">
                    Statut du contact
                  </p>
                  <p className="text-sm font-bold text-blue-900 italic">
                    Vérifié par TafTech 🇩🇿
                  </p>
                </div>
              </div>
            </div>

            {/* TITRE PRO */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-6">
                Titre de Carrière
              </h3>
              <input
                name="titre_professionnel"
                value={profil.titre_professionnel}
                onChange={handleChangeProfil}
                className="w-full text-3xl font-black text-gray-800 bg-gray-50 p-6 rounded-3xl border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none transition-all"
                placeholder="Ex: Ingénieur Fullstack & Décisionnel"
              />
            </div>

            {/* COMPÉTENCES & LANGUES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                  Compétences
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {renderBadges(profil.competences, "bg-gray-900 text-white")}
                </div>
                <input
                  name="competences"
                  value={profil.competences}
                  onChange={handleChangeProfil}
                  placeholder="React, Python, SQL..."
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none"
                />
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                  Langues
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {renderBadges(profil.langues, "bg-blue-600 text-white")}
                </div>
                <input
                  name="langues"
                  value={profil.langues}
                  onChange={handleChangeProfil}
                  placeholder="Français, Anglais..."
                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold border-none outline-none"
                />
              </div>
            </div>

            {/* PARCOURS PROFESSIONNEL */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-10">
                Parcours Académique & Pro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <input
                  name="diplome"
                  value={profil.diplome}
                  onChange={handleChangeProfil}
                  placeholder="Diplôme"
                  className="w-full p-5 bg-gray-50 rounded-3xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none"
                />
                <input
                  name="specialite"
                  value={profil.specialite}
                  onChange={handleChangeProfil}
                  placeholder="Spécialité"
                  className="w-full p-5 bg-gray-50 rounded-3xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none"
                />
              </div>
              <textarea
                name="experiences"
                value={profil.experiences}
                onChange={handleChangeProfil}
                rows="8"
                className="w-full p-6 bg-gray-50 rounded-[2rem] font-medium text-gray-600 outline-none border-2 border-transparent focus:border-indigo-600 leading-relaxed"
                placeholder="Détaillez vos expériences ici..."
              />
            </div>

            {/* SÉCURITÉ DU COMPTE (Utilise handleChangePassword) */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-8">
                Sécurité & Accès
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input
                  type="password"
                  name="oldPassword"
                  value={passwords.oldPassword}
                  onChange={handleChangePassword}
                  className="p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none font-bold text-sm"
                  placeholder="Actuel"
                />
                <input
                  type="password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handleChangePassword}
                  className="p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none font-bold text-sm"
                  placeholder="Nouveau"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handleChangePassword}
                  className="p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-red-500 outline-none font-bold text-sm"
                  placeholder="Confirmation"
                />
              </div>
            </div>

            {/* CV PDF */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-blue-50 rounded-[3rem] hover:bg-blue-50 cursor-pointer transition-all"
              >
                <div className="text-5xl mb-4 text-blue-600/30 font-black tracking-widest">
                  📂
                </div>
                <span className="font-black text-blue-600 text-sm uppercase tracking-widest">
                  {fichier ? fichier.name : "Téléverser mon nouveau CV (PDF)"}
                </span>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => setFichier(e.target.files[0])}
                  accept=".pdf"
                />
              </label>
            </div>

            {/* BOUTON SAUVEGARDE FLOTTANT */}
            <div className="fixed bottom-10 right-10 z-[100]">
              <button
                type="submit"
                className="bg-blue-600 text-white font-black px-12 py-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:-translate-y-2 transition-all border-4 border-white active:scale-95"
              >
                🚀 PROPULSER LES MISES À JOUR
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default ProfilCandidat;
