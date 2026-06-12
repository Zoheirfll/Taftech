import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import { Rocket, Eye, Lock } from "lucide-react";

const TEXTE_LOI_1807 = {
  titre: "Protection des données à caractère personnel (Loi 18-07)",
  contenu: `Conformément à la loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, TafTech s'engage à :

1. Finalité : Vos données (NIN, Téléphone, CV) sont collectées exclusivement pour faciliter votre mise en relation avec des recruteurs.
2. Droits de l'utilisateur : Vous disposez d'un droit d'accès, de rectification et de suppression de vos données depuis votre espace personnel.
3. Sécurité : TafTech met en œuvre des mesures de sécurité techniques pour prévenir toute fuite ou utilisation frauduleuse de vos informations.

En cochant la case de consentement, vous acceptez que vos informations professionnelles soient visibles par les entreprises enregistrées sur la plateforme.`,
};

const RegisterCandidat = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [wilayasList, setWilayasList] = useState([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_naissance: "",
    telephone: "",
    nin: "",
    wilaya: "",
    email: "",
    password: "",
    consentement_loi_18_07: false,
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setWilayasList(data.wilayas);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_WILAYAS_REGISTER", error);
      }
    };
    fetchConstants();
  }, []);

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFormData({
      ...formData,
      [actionMeta.name]: selectedOption ? selectedOption.value : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consentement_loi_18_07) {
      toast.error("Vous devez accepter la Loi 18-07 pour vous inscrire.");
      return;
    }
    if (!formData.wilaya) {
      toast.error("Veuillez sélectionner votre wilaya.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Création de votre profil...");
    try {
      const usernameGenere =
        formData.email.split("@")[0] + Math.floor(Math.random() * 1000);
      await authService.registerCandidat({
        ...formData,
        username: usernameGenere,
      });
      toast.success("Code envoyé à votre adresse email !", { id: toastId });
      setRegisteredEmail(formData.email);
      setStep(2);
    } catch (err) {
      toast.error(
        err.response?.data?.email?.[0] ||
          err.response?.data?.nin?.[0] ||
          "Une erreur est survenue.",
        { id: toastId },
      );
      reportError("ECHEC_REGISTRATION_CANDIDAT", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0 &&
      inputRefs.current[index - 1]
    ) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const codeSaisi = otp.join("");
    if (codeSaisi.length !== 6) {
      toast.error("Veuillez saisir les 6 chiffres du code.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Vérification du code...");
    try {
      await authService.verifyEmail(registeredEmail, codeSaisi);
      toast.success("Email vérifié avec succès !", { id: toastId });
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Le code est incorrect.", {
        id: toastId,
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0].focus();
      reportError("ECHEC_VERIFY_OTP_CANDIDAT", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* COLONNE GAUCHE */}
        <div className="md:w-5/12 bg-linear-to-br from-indigo-700 to-indigo-500 p-10 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-3 leading-tight">
              Propulsez votre <span className="text-indigo-200">carrière</span>
            </h2>
            <p className="text-indigo-100 text-sm leading-relaxed mb-8">
              Rejoignez TafTech et accédez à des milliers d'opportunités à
              travers toute l'Algérie.
            </p>
            <div className="space-y-4">
              {[
                {
                  icon: Rocket,
                  title: "Candidature rapide",
                  desc: "Postulez en un clic",
                },
                {
                  icon: Eye,
                  title: "Visibilité maximale",
                  desc: "Soyez vu par les recruteurs",
                },
                {
                  icon: Lock,
                  title: "Données sécurisées",
                  desc: "Conforme Loi 18-07",
                },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500/50 rounded-lg flex items-center justify-center flex-shrink-0 border border-indigo-400/30">
                    <span className="text-xs font-bold text-indigo-100">✓</span>
                  </div>
                  <div>
                    <p className="text-base font-semibold">{title}</p>
                    <p className="text-sm text-indigo-200">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-base text-indigo-100 mt-8 pt-6 border-t border-indigo-500/50">
            Déjà membre ?{" "}
            <Link
              to="/login"
              className="text-white font-semibold hover:underline"
            >
              Connectez-vous
            </Link>
          </p>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          {/* ÉTAPE 1 */}
          {step === 1 && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                Créer mon espace candidat
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Date de naissance *
                    </label>
                    <input
                      type="date"
                      name="date_naissance"
                      required
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Wilaya *
                    </label>
                    <Select
                      name="wilaya"
                      options={wilayasList}
                      onChange={handleSelectChange}
                      placeholder="Sélectionnez..."
                      styles={selectStyles}
                      classNamePrefix="wilaya-select"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      name="telephone"
                      required
                      placeholder="0555..."
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      NIN (18 chiffres) *
                    </label>
                    <input
                      type="text"
                      name="nin"
                      required
                      maxLength="18"
                      placeholder="108..."
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength="8"
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* Consentement */}
                <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <input
                    type="checkbox"
                    id="consentement"
                    name="consentement_loi_18_07"
                    required
                    onChange={handleChange}
                    className="mt-0.5 w-4 h-4 cursor-pointer rounded text-indigo-600 border-slate-300"
                  />
                  <label
                    htmlFor="consentement"
                    className="text-sm text-slate-600 leading-relaxed cursor-pointer"
                  >
                    J'autorise l'utilisation de mes données pour le recrutement
                    conformément à la{" "}
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Loi 18-07
                    </button>
                    . *
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !formData.consentement_loi_18_07}
                  className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Création en cours..." : "S'inscrire gratuitement"}
                </button>
              </form>
            </div>
          )}

          {/* ÉTAPE 2 — OTP */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Vérifiez votre email
              </h3>
              <p className="text-base text-slate-500 mb-8">
                Code envoyé à{" "}
                <span className="font-semibold text-slate-900">
                  {registeredEmail}
                </span>
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      ref={(el) => (inputRefs.current[index] = el)}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-13 text-center text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6}
                  className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
                >
                  {loading ? "Vérification..." : "Confirmer mon compte"}
                </button>
              </form>
              <p className="text-sm text-slate-400 mt-4">
                Vous n'avez rien reçu ? Vérifiez vos spams.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL LOI 18-07 */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>⚖️</span> {TEXTE_LOI_1807.titre}
            </h3>
            <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line overflow-y-auto max-h-56 mb-6">
              {TEXTE_LOI_1807.contenu}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-black transition-colors"
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
