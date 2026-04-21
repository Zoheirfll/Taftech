import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../Services/authService";
import toast from "react-hot-toast";

const RegisterCandidat = () => {
  const navigate = useNavigate();

  const TEXTE_LOI_1807 = {
    titre: "Protection des données à caractère personnel (Loi 18-07)",
    contenu: `Conformément à la loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, TafTech s'engage à :
    
    1. Finalité : Vos données (NIN, Téléphone, CV) sont collectées exclusivement pour faciliter votre mise en relation avec des recruteurs.
    2. Droits de l'utilisateur : Vous disposez d'un droit d'accès, de rectification et de suppression de vos données depuis votre espace personnel.
    3. Sécurité : TafTech met en œuvre des mesures de sécurité techniques pour prévenir toute fuite ou utilisation frauduleuse de vos informations.
    
    En cochant la case de consentement, vous acceptez que vos informations professionnelles soient visibles par les entreprises enregistrées sur la plateforme.`,
  };

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_naissance: "",
    telephone: "",
    nin: "",
    email: "",
    password: "",
    consentement_loi_18_07: false,
  });

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consentement_loi_18_07) {
      toast.error("Vous devez accepter la Loi 18-07 pour vous inscrire.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Création de votre profil Talent...");

    try {
      const usernameGenere =
        formData.email.split("@")[0] + Math.floor(Math.random() * 1000);
      const dataToSend = { ...formData, username: usernameGenere };

      await authService.registerCandidat(dataToSend);
      toast.success("Compte créé avec succès ! Bienvenue sur TafTech.", {
        id: toastId,
      });
      navigate("/login");
    } catch (err) {
      toast.error(
        err.response?.data?.email?.[0] ||
          err.response?.data?.nin?.[0] ||
          "Une erreur est survenue lors de l'inscription.",
        { id: toastId },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* Colonne de gauche : Inspiration / Valeur ajoutée */}
        <div className="md:w-5/12 bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Cercles de décoration en fond */}
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl"></div>

          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-6 leading-tight">
              Propulsez votre <br />{" "}
              <span className="text-blue-200">Carrière</span>
            </h2>
            <p className="text-blue-100 font-medium leading-relaxed mb-10">
              Rejoignez TafTech et accédez à des milliers d'opportunités à
              travers toute l'Algérie. Créez votre profil en 2 minutes.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-blue-400/30">
                  🚀
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-widest">
                    Candidature Rapide
                  </p>
                  <p className="text-xs text-blue-200">
                    Postulez en un clic avec votre profil
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-blue-400/30">
                  👁️
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-widest">
                    Visibilité Maximale
                  </p>
                  <p className="text-xs text-blue-200">
                    Soyez vu par les meilleurs recruteurs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/50 rounded-xl flex items-center justify-center text-xl shadow-inner border border-blue-400/30">
                  🔒
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-widest">
                    Données Sécurisées
                  </p>
                  <p className="text-xs text-blue-200">
                    Conformité totale avec la loi 18-07
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 pt-8 border-t border-blue-500/50">
            <p className="text-sm font-medium text-blue-100">
              Déjà membre ?{" "}
              <Link
                to="/login"
                className="text-white font-black hover:underline ml-1"
              >
                Connectez-vous ici
              </Link>
            </p>
          </div>
        </div>

        {/* Colonne de droite : Formulaire */}
        <div className="md:w-7/12 p-10 md:p-14 bg-white relative z-20">
          <h3 className="text-2xl font-black text-gray-900 mb-8">
            Créer mon espace candidat
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Nom
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Prénom
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  name="date_naissance"
                  required
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  required
                  placeholder="Ex: 0555..."
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                NIN (Numéro d'Identification National)
              </label>
              <input
                type="text"
                name="nin"
                required
                maxLength="18"
                placeholder="Les 18 chiffres de votre carte biométrique"
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold tracking-widest text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength="8"
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex items-start gap-4 mt-8">
              <input
                type="checkbox"
                id="consentement"
                name="consentement_loi_18_07"
                required
                onChange={handleChange}
                className="mt-1 w-5 h-5 cursor-pointer rounded text-blue-600 focus:ring-blue-600 border-gray-300"
              />
              <label
                htmlFor="consentement"
                className="text-xs text-gray-600 font-medium leading-relaxed cursor-pointer"
              >
                J'autorise l'utilisation de mes données pour le recrutement
                conformément à la
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="font-black text-blue-600 hover:text-blue-800 ml-1 underline decoration-2 underline-offset-2"
                >
                  Loi 18-07
                </button>
                . *
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.consentement_loi_18_07}
              className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl ${loading || !formData.consentement_loi_18_07 ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1 shadow-blue-200"}`}
            >
              {loading ? "Création en cours..." : "S'inscrire gratuitement"}
            </button>
          </form>
        </div>
      </div>

      {/* Modal Loi 18-07 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-10 shadow-2xl animate-slideUp">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-start gap-3">
              <span className="text-blue-600 text-2xl">⚖️</span>
              {TEXTE_LOI_1807.titre}
            </h3>
            <div className="text-gray-600 text-sm leading-loose whitespace-pre-line overflow-y-auto max-h-64 pr-4 mb-8 font-medium">
              {TEXTE_LOI_1807.contenu}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-gray-900 text-white font-black tracking-widest uppercase py-4 rounded-2xl hover:bg-black transition-colors shadow-lg"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterCandidat;
