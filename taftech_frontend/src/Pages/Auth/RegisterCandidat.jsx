import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";

const TEXTE_LOI_1807 = {
  titre: "Protection des données à caractère personnel (Loi 18-07)",
  contenu: `Conformément à la loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, TAFTECH s'engage à :

1. Finalité : Vos données (Téléphone, CV) sont collectées exclusivement pour faciliter votre mise en relation avec des recruteurs.
2. Droits de l'utilisateur : Vous disposez d'un droit d'accès, de rectification et de suppression de vos données depuis votre espace personnel.
3. Sécurité : TAFTECH met en œuvre des mesures de sécurité techniques pour prévenir toute fuite ou utilisation frauduleuse de vos informations.

En cochant la case de consentement, vous acceptez que vos informations professionnelles soient visibles par les entreprises enregistrées sur la plateforme.`,
};

const AVANTAGES = [
  { icon: CheckCircle2, title: "Candidature simplifiée", desc: "Postulez rapidement à vos offres préférées." },
  { icon: Eye, title: "Plus de visibilité", desc: "Votre profil est accessible aux entreprises en recherche de candidats." },
  { icon: Lock, title: "Vos données en sécurité", desc: "Vos informations personnelles sont protégées conformément à la loi n° 18-07 relative à la protection des données à caractère personnel." },
];

const STEPS = [
  { n: 1, label: "Informations" },
  { n: 2, label: "Vérification" },
];

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
    adresse: "",
    email: "",
    password: "",
    confirmPassword: "",
    consentement_loi_18_07: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("taftech_pending_verification");
    if (pendingEmail) {
      setRegisteredEmail(pendingEmail);
      setStep(2);
    }
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
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSelectChange = (selectedOption, actionMeta) => {
    setFormData({ ...formData, [actionMeta.name]: selectedOption ? selectedOption.value : "" });
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
    if (!/^\d{18}$/.test(formData.nin)) {
      toast.error("Le NIN doit contenir exactement 18 chiffres.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Création de votre profil...");
    try {
      const usernameGenere = formData.email.split("@")[0] + Math.floor(Math.random() * 1000);
      const { confirmPassword, ...payload } = formData;
      await authService.registerCandidat({ ...payload, username: usernameGenere });
      toast.success("Code envoyé à votre adresse email !", { id: toastId });
      sessionStorage.setItem("taftech_pending_verification", formData.email);
      setRegisteredEmail(formData.email);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.email?.[0] || "Une erreur est survenue.", { id: toastId });
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
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleRenvoyerCode = async () => {
    setLoading(true);
    const toastId = toast.loading("Envoi d'un nouveau code...");
    try {
      await authService.renvoyerCodeVerification(registeredEmail);
      sessionStorage.setItem("taftech_pending_verification", registeredEmail);
      toast.success("Nouveau code envoyé !", { id: toastId });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors du renvoi.", { id: toastId });
      reportError("ECHEC_RENVOYER_CODE_CANDIDAT", err);
    } finally {
      setLoading(false);
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
      sessionStorage.removeItem("taftech_pending_verification");
      toast.success("Email vérifié avec succès !", { id: toastId });
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Le code est incorrect.", { id: toastId });
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
              Rejoignez TAFTECH et accédez à des milliers d'opportunités professionnelles
              partout en Algérie. Créez votre profil, postulez facilement et laissez les
              recruteurs vous trouver.
            </p>
            <div className="space-y-4">
              {AVANTAGES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500/50 rounded-lg flex items-center justify-center shrink-0 border border-indigo-400/30">
                    <Icon size={16} className="text-indigo-100" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-indigo-200">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-indigo-100 mt-8 pt-6 border-t border-indigo-500/50">
            Déjà membre ?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline">
              Connectez-vous
            </Link>
          </p>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">

          {/* STEPPER */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > s.n ? "bg-emerald-500 text-white" : step === s.n ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {step > s.n ? <CheckCircle2 size={14} /> : s.n}
                  </div>
                  <span className={`text-xs font-semibold ${step >= s.n ? "text-slate-800" : "text-slate-400"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px transition-colors ${step > 1 ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ÉTAPE 1 */}
          {step === 1 && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-5">Créer mon espace candidat</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Nom *</label>
                    <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Prénom *</label>
                    <input type="text" name="first_name" required value={formData.first_name} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Date de naissance *</label>
                    <input type="date" name="date_naissance" required value={formData.date_naissance} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Téléphone *</label>
                    <input type="tel" name="telephone" required placeholder="0555..." value={formData.telephone} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Wilaya *</label>
                  <Select name="wilaya" options={wilayasList} onChange={handleSelectChange} placeholder="Sélectionnez votre wilaya..." styles={selectStyles} classNamePrefix="wilaya-select" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Adresse *</label>
                  <input type="text" name="adresse" required value={formData.adresse} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1.5 block">NIN (Numéro d'Identification Nationale) *</label>
                  <input type="text" name="nin" required maxLength={18} pattern="\d{18}" title="Le NIN doit contenir exactement 18 chiffres."
                    placeholder="18 chiffres" value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Email *</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Mot de passe *</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} name="password" required minLength="8" value={formData.password} onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 pr-10" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <input type={showConfirmPass ? "text" : "password"} name="confirmPassword" required minLength="8" value={formData.confirmPassword} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 pr-10" />
                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Consentement */}
                <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <input type="checkbox" id="consentement" name="consentement_loi_18_07" required checked={formData.consentement_loi_18_07} onChange={handleChange}
                    className="mt-0.5 w-4 h-4 cursor-pointer rounded text-indigo-600 border-slate-300" />
                  <label htmlFor="consentement" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                    J'accepte que mes données personnelles soient traitées par TAFTECH dans le cadre
                    des services de recrutement, conformément à la{" "}
                    <button type="button" onClick={() => setShowModal(true)} className="text-indigo-600 font-semibold hover:underline">
                      loi n° 18-07
                    </button>{" "}
                    relative à la protection des données à caractère personnel. *
                  </label>
                </div>

                <button type="submit" disabled={loading || !formData.consentement_loi_18_07}
                  className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? "Création en cours..." : "Créer mon compte"}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400 font-medium">ou</span></div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    const toastId = toast.loading("Inscription Google...");
                    try {
                      const data = await authService.googleLogin(credentialResponse.credential, "CANDIDAT", "register");
                      toast.dismiss(toastId);
                      if (data.requires_consent) {
                        setShowConsentModal(true);
                      } else {
                        toast.success("Compte connecté !");
                        navigate("/");
                        window.location.reload();
                      }
                    } catch {
                      toast.error("Échec de l'inscription Google.", { id: toastId });
                    }
                  }}
                  onError={() => toast.error("Échec de l'inscription Google.")}
                  text="signup_with" shape="rectangular" theme="outline" size="large" width="360"
                />
              </div>

              <p className="text-sm text-slate-500 text-center mt-6">
                Vous avez déjà un compte ?{" "}
                <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
                  Se connecter
                </Link>
              </p>

              {showConsentModal && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Protection des données — Loi 18-07</h2>
                    <p className="text-sm text-slate-500 mb-4">Avant d'accéder à TAFTECH, vous devez lire et accepter la politique de confidentialité.</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-52 overflow-y-auto text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-5">
                      {TEXTE_LOI_1807.contenu}
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer mb-6">
                      <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-slate-300" />
                      <span className="text-sm text-slate-700">J'ai lu et j'accepte la politique de protection des données conformément à la Loi 18-07.</span>
                    </label>
                    <button disabled={!consentChecked || consentLoading}
                      onClick={async () => {
                        setConsentLoading(true);
                        try {
                          await authService.accepterConsentement();
                          toast.success("Bienvenue sur TAFTECH !");
                          navigate("/");
                          window.location.reload();
                        } catch {
                          toast.error("Erreur lors de l'enregistrement du consentement.");
                          setConsentLoading(false);
                        }
                      }}
                      className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {consentLoading ? "Enregistrement..." : "J'accepte et je continue"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 2 — OTP */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Vérifiez votre email</h3>
              <p className="text-sm text-slate-500 mb-8">
                Code envoyé à <span className="font-semibold text-slate-900">{registeredEmail}</span>
              </p>
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input key={index} type="text" maxLength="1" ref={(el) => (inputRefs.current[index] = el)}
                      value={digit} onChange={(e) => handleOtpChange(index, e)} onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-13 text-center text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                  ))}
                </div>
                <button type="submit" disabled={loading || otp.join("").length !== 6}
                  className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? "Vérification..." : "Confirmer mon compte"}
                </button>
              </form>
              <p className="text-sm text-slate-400 mt-4">
                Vous n'avez rien reçu ? Vérifiez vos spams ou{" "}
                <button type="button" onClick={handleRenvoyerCode} disabled={loading} className="text-indigo-600 font-semibold hover:underline disabled:opacity-50">
                  renvoyer le code
                </button>.
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
            <button onClick={() => setShowModal(false)} className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-black transition-colors">
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterCandidat;
