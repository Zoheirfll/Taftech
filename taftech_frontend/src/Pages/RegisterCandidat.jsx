import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../Services/authService";
import toast from "react-hot-toast"; // <-- IMPORT

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
      toast.error("Vous devez accepter la Loi 18-07 pour vous inscrire."); // <-- TOAST ERROR
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Création de votre compte...");

    try {
      const usernameGenere =
        formData.email.split("@")[0] + Math.floor(Math.random() * 1000);

      const dataToSend = {
        ...formData,
        username: usernameGenere,
      };

      await authService.registerCandidat(dataToSend);
      toast.success("Compte créé avec succès ! Vous pouvez vous connecter.", {
        id: toastId,
      }); // <-- TOAST SUCCESS
      navigate("/login");
    } catch (err) {
      toast.error(
        err.response?.data?.email?.[0] ||
          err.response?.data?.nin?.[0] ||
          "Une erreur est survenue lors de l'inscription.",
        { id: toastId },
      ); // <-- TOAST ERROR
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-10">
      <h2 className="text-3xl font-black text-center text-gray-900 mb-2">
        Rejoindre <span className="text-blue-600">TafTech</span>
      </h2>
      <p className="text-center text-gray-500 mb-8">
        Créez votre profil candidat en quelques secondes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Nom *
            </label>
            <input
              type="text"
              name="last_name"
              required
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={handleChange}
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Prénom *
            </label>
            <input
              type="text"
              name="first_name"
              required
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Date de naissance *
            </label>
            <input
              type="date"
              name="date_naissance"
              required
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={handleChange}
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Téléphone *
            </label>
            <input
              type="tel"
              name="telephone"
              required
              placeholder="05/06/07..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            NIN (18 chiffres) *
          </label>
          <input
            type="text"
            name="nin"
            required
            maxLength="18"
            placeholder="Numéro d'Identification National"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Mot de passe *
          </label>
          <input
            type="password"
            name="password"
            required
            minLength="8"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={handleChange}
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
          <input
            type="checkbox"
            id="consentement"
            name="consentement_loi_18_07"
            required
            className="mt-1 w-5 h-5 cursor-pointer accent-blue-600"
            onChange={handleChange}
          />
          <label
            htmlFor="consentement"
            className="text-xs text-blue-900 leading-tight cursor-pointer"
          >
            J'autorise l'utilisation de mes données pour le recrutement
            conformément à la
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="font-black underline ml-1 hover:text-blue-700"
            >
              Loi 18-07
            </button>
            . *
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.consentement_loi_18_07}
          className={`w-full py-4 rounded-xl font-black transition shadow-lg ${
            loading || !formData.consentement_loi_18_07
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-[1.02]"
          }`}
        >
          {loading ? "Traitement en cours..." : "CRÉER MON COMPTE"}
        </button>
      </form>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[200] p-6">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600 text-2xl">⚖️</span>{" "}
              {TEXTE_LOI_1807.titre}
            </h3>
            <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line overflow-y-auto max-h-80 pr-2 mb-8">
              {TEXTE_LOI_1807.contenu}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition"
            >
              J'ai lu et j'accepte
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-8 text-sm">
        Déjà membre ?{" "}
        <Link to="/login" className="text-blue-600 font-bold hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  );
};

export default RegisterCandidat;
