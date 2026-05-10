import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../Services/authService";
import { jobsService } from "../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../utils/errorReporter"; // ✅ Télémétrie ajoutée

const RegisterRecruteur = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState("");

  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    telephone: "",
    nom_entreprise: "",
    secteur_activite: "",
    registre_commerce: "",
    wilaya_siege: "",
  });

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (err) {
        reportError("ECHEC_CHARGEMENT_CONSTANTES_RECRUTEUR", err); // ✅ Télémétrie
      }
    };
    fetchConstants();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.secteur_activite || !formData.wilaya_siege) {
      return toast.error("Veuillez sélectionner un secteur et une wilaya.");
    }

    setLoading(true);
    const toastId = toast.loading("Création de votre compte entreprise...");

    try {
      const usernameGenere =
        formData.email.split("@")[0] +
        "_pro_" +
        Math.floor(Math.random() * 999);
      const dataToSend = { ...formData, username: usernameGenere };

      const response = await authService.registerRecruteur(dataToSend);

      toast.success(
        response.message || "Un code a été envoyé à votre adresse email.",
        { id: toastId, duration: 3000 },
      );

      setStep(2);
    } catch (err) {
      const serverError = err.response?.data;
      toast.error(
        serverError?.email?.[0] ||
          serverError?.registre_commerce?.[0] ||
          "Une erreur est survenue lors de l'inscription.",
        { id: toastId },
      );
      reportError("ECHEC_REGISTRATION_RECRUTEUR", err); // ✅ Télémétrie
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6)
      return toast.error("Le code doit contenir 6 chiffres.");

    setLoading(true);
    const toastId = toast.loading("Vérification en cours...");

    try {
      await authService.verifyEmail(formData.email, otpCode);
      toast.success("Email vérifié avec succès !", { id: toastId });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || "Code incorrect.", {
        id: toastId,
      });
      reportError("ECHEC_VERIFICATION_OTP_RECRUTEUR", err); // ✅ Télémétrie
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Colonne Gauche */}
        <div className="md:w-1/3 bg-gray-900 p-10 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-bl-full opacity-20"></div>
          <h2 className="text-3xl font-black mb-4 z-10">
            Espace
            <br />
            <span className="text-blue-500">Recruteur</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed z-10">
            Rejoignez TafTech pour accéder aux meilleurs talents d'Algérie.
            Votre compte sera actif après vérification de vos documents légaux.
          </p>
          <div className="mt-10 space-y-4 z-10">
            <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600/20 text-blue-500 rounded-full">
                ✓
              </span>{" "}
              Publication illimitée
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600/20 text-blue-500 rounded-full">
                ✓
              </span>{" "}
              Gestion des candidatures
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 font-bold">
              <span className="w-6 h-6 flex items-center justify-center bg-blue-600/20 text-blue-500 rounded-full">
                ✓
              </span>{" "}
              Visibilité Premium
            </div>
          </div>
        </div>

        {/* Colonne Droite */}
        <div className="md:w-2/3 p-10 flex flex-col justify-center">
          {/* ÉTAPE 1 */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 mb-6">
                Créer un compte entreprise
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Email Pro
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    required
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  name="nom_entreprise"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Secteur d'activité
                  </label>
                  <Select
                    options={constants.secteurs}
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setFormData({ ...formData, secteur_activite: opt.value })
                    }
                    styles={{
                      control: (b) => ({
                        ...b,
                        borderRadius: "0.75rem",
                        padding: "0.15rem",
                        borderColor: "#e5e7eb",
                        backgroundColor: "#f9fafb",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                      }),
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Wilaya du siège
                  </label>
                  <Select
                    options={constants.wilayas}
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setFormData({ ...formData, wilaya_siege: opt.value })
                    }
                    styles={{
                      control: (b) => ({
                        ...b,
                        borderRadius: "0.75rem",
                        padding: "0.15rem",
                        borderColor: "#e5e7eb",
                        backgroundColor: "#f9fafb",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                      }),
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Registre de Commerce
                  </label>
                  <input
                    type="text"
                    name="registre_commerce"
                    required
                    onChange={handleChange}
                    placeholder="Ex: 1234567A89"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    name="password"
                    minLength="8"
                    required
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-600 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 mt-4"
              >
                {loading
                  ? "CRÉATION EN COURS..."
                  : "S'INSCRIRE COMME EMPLOYEUR"}
              </button>

              <p className="text-center mt-6 text-sm text-gray-500 font-medium">
                Déjà un compte ?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 font-black hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </form>
          )}

          {/* ÉTAPE 2 */}
          {step === 2 && (
            <div className="space-y-6 text-center animate-fade-in">
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                Vérifiez votre Email
              </h3>
              <p className="text-gray-500 text-sm">
                Un code à 6 chiffres a été envoyé à <br />
                <span className="font-bold text-gray-800">
                  {formData.email}
                </span>
              </p>

              <form onSubmit={handleOtpSubmit} className="space-y-6 mt-8">
                <div>
                  <input
                    type="text"
                    maxLength="6"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="------"
                    className="w-48 text-center text-3xl tracking-[0.5em] p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-600 outline-none font-black text-gray-800 uppercase"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1"
                >
                  {loading ? "VÉRIFICATION..." : "VALIDER MON EMAIL"}
                </button>
              </form>
            </div>
          )}

          {/* ÉTAPE 3 */}
          {step === 3 && (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-green-500 text-4xl">✓</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                Compte Sécurisé !
              </h3>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-left">
                <p className="text-blue-900 text-sm leading-relaxed">
                  <strong>Bravo {formData.first_name} !</strong> Votre email est
                  validé. <br />
                  <br />
                  Pour garantir la qualité des entreprises sur TafTech, votre
                  compte est actuellement{" "}
                  <strong>en cours de vérification</strong> par nos
                  administrateurs (Analyse du Registre de Commerce).
                  <br />
                  <br />
                  Vous pourrez publier vos offres d'emploi dès que votre compte
                  sera approuvé !
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full border-2 border-blue-600 text-blue-600 font-black py-4 rounded-xl hover:bg-blue-50 transition-all mt-4"
              >
                ALLER À LA PAGE DE CONNEXION
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterRecruteur;
