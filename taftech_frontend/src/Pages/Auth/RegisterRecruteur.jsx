import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import { CheckCircle, CheckCircle2, Eye, EyeOff, Info, ArrowRight } from "lucide-react";

const STEPS = [
  { num: 1, label: "Compte" },
  { num: 2, label: "Vérification" },
  { num: 3, label: "Confirmé" },
];

const LEFT_CONTENT = {
  1: {
    title: "Créez votre espace employeur",
    desc: "Rejoignez TafTech pour accéder aux meilleurs talents d'Algérie. Votre compte sera actif après vérification de vos documents.",
    items: ["Publication illimitée d'offres", "Score IA sur chaque candidat", "CVthèque intelligente", "Gestion d'équipe multi-rôles"],
  },
  2: {
    title: "Vérification de votre email",
    desc: "Un code à 6 chiffres a été envoyé à votre adresse email. Vérifiez vos spams si vous ne le recevez pas.",
    items: ["Code valide 10 minutes", "Vérification sécurisée", "Renvoi possible si nécessaire"],
  },
  3: {
    title: "Compte créé avec succès !",
    desc: "Votre email est validé. Nos administrateurs vont vérifier votre Registre de Commerce avant d'activer votre compte.",
    items: ["Email vérifié ✓", "Dossier transmis à l'équipe TafTech", "Activation sous 24-48h"],
  },
};

const REDIRECT_DELAY = 5;

const RegisterRecruteur = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [secondes, setSecondes] = useState(REDIRECT_DELAY);
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", password: "",
    telephone: "", nom_entreprise: "", secteur_activite: "",
    registre_commerce: "", wilaya_siege: "",
  });

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("taftech_pending_verification_recruteur");
    if (pendingEmail) {
      setFormData((prev) => ({ ...prev, email: pendingEmail }));
      setStep(2);
    }
    const fetchConstants = async () => {
      try {
        const data = await jobsService.getConstants();
        setConstants(data);
      } catch (err) {
        reportError("ECHEC_CHARGEMENT_CONSTANTES_RECRUTEUR", err);
      }
    };
    fetchConstants();
  }, []);

  // Compte à rebours étape 3
  useEffect(() => {
    if (step !== 3) return;
    const interval = setInterval(() => {
      setSecondes((s) => {
        if (s <= 1) { clearInterval(interval); navigate("/recruteurs/connexion"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.secteur_activite || !formData.wilaya_siege) {
      return toast.error("Veuillez sélectionner un secteur et une wilaya.");
    }
    setLoading(true);
    const toastId = toast.loading("Création de votre compte entreprise...");
    try {
      const usernameGenere = formData.email.split("@")[0] + "_pro_" + Math.floor(Math.random() * 999);
      const response = await authService.registerRecruteur({ ...formData, username: usernameGenere });
      toast.success(response.message || "Code envoyé à votre email.", { id: toastId });
      sessionStorage.setItem("taftech_pending_verification_recruteur", formData.email);
      setStep(2);
    } catch (err) {
      const serverError = err.response?.data;
      toast.error(
        serverError?.email?.[0] || serverError?.registre_commerce?.[0] || "Une erreur est survenue.",
        { id: toastId },
      );
      reportError("ECHEC_REGISTRATION_RECRUTEUR", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenvoyerCode = async () => {
    setLoading(true);
    const toastId = toast.loading("Envoi d'un nouveau code...");
    try {
      await authService.renvoyerCodeVerification(formData.email);
      sessionStorage.setItem("taftech_pending_verification_recruteur", formData.email);
      toast.success("Nouveau code envoyé !", { id: toastId });
      setOtpCode("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors du renvoi.", { id: toastId });
      reportError("ECHEC_RENVOYER_CODE_RECRUTEUR", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) return toast.error("Le code doit contenir 6 chiffres.");
    setLoading(true);
    const toastId = toast.loading("Vérification en cours...");
    try {
      await authService.verifyEmail(formData.email, otpCode);
      sessionStorage.removeItem("taftech_pending_verification_recruteur");
      toast.success("Email vérifié avec succès !", { id: toastId });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || "Code incorrect.", { id: toastId });
      reportError("ECHEC_VERIFICATION_OTP_RECRUTEUR", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
  const labelClass = "text-sm font-semibold text-slate-600 mb-2 block";
  const left = LEFT_CONTENT[step];

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">

        {/* COLONNE GAUCHE */}
        <div className="md:w-5/12 bg-slate-900 p-10 text-white flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-6">Espace Recruteur</p>
            <h2 className="text-xl font-extrabold leading-snug mb-3 transition-all duration-300">
              {left.title}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">{left.desc}</p>
            <div className="space-y-3">
              {left.items.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle size={15} className="text-teal-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-slate-800 text-xs text-slate-500">
            Déjà un compte ?{" "}
            <Link to="/recruteurs/connexion" className="text-teal-400 font-semibold hover:underline">
              Se connecter →
            </Link>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">

          {/* STEPPER */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s.num ? "bg-emerald-500 text-white" :
                    step === s.num ? "bg-teal-700 text-white" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {step > s.num ? <CheckCircle2 size={14} /> : s.num}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${step === s.num ? "text-teal-700" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px transition-all ${step > s.num ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ÉTAPE 1 */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 mb-1">Créer un compte entreprise</h3>
              <p className="text-sm text-slate-500 mb-4">Remplissez les informations de votre entreprise</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nom</label>
                  <input type="text" name="last_name" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input type="text" name="first_name" required onChange={handleChange} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email professionnel</label>
                  <input type="email" name="email" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Téléphone</label>
                  <input type="tel" name="telephone" required onChange={handleChange} className={inputClass} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className={labelClass}>Nom de l'entreprise</label>
                <input type="text" name="nom_entreprise" required onChange={handleChange} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Secteur d'activité</label>
                  <Select
                    options={constants.secteurs}
                    placeholder="Sélectionnez..."
                    onChange={(opt) => setFormData({ ...formData, secteur_activite: opt?.value || "" })}
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className={labelClass}>Wilaya du siège</label>
                  <Select
                    options={constants.wilayas}
                    placeholder="Sélectionnez..."
                    onChange={(opt) => setFormData({ ...formData, wilaya_siege: opt?.value || "" })}
                    styles={selectStyles}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-sm font-semibold text-slate-600">Registre de commerce</label>
                    <div className="group relative">
                      <Info size={13} className="text-slate-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                        Numéro figurant sur votre extrait de registre de commerce (RC). Exemple : 1234567B89. Requis pour valider votre compte employeur.
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    name="registre_commerce"
                    required
                    placeholder="Ex : 1234567B89"
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      minLength="8"
                      required
                      onChange={handleChange}
                      placeholder="8 caractères minimum"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <ArrowRight size={15} />}
                {loading ? "Création en cours..." : "S'inscrire comme employeur"}
              </button>
            </form>
          )}

          {/* ÉTAPE 2 — OTP */}
          {step === 2 && (
            <div className="text-center max-w-sm mx-auto w-full">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Vérifiez votre email</h3>
              <p className="text-sm text-slate-500 mb-6">
                Code envoyé à{" "}
                <span className="font-bold text-slate-800">{formData.email}</span>
              </p>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <input
                  type="text"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="______"
                  className="w-48 mx-auto block text-center text-2xl tracking-[0.5em] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none font-bold text-slate-900"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <CheckCircle2 size={15} />}
                  {loading ? "Vérification..." : "Valider mon email"}
                </button>
              </form>
              <p className="text-sm text-slate-400 mt-5">
                Vous n'avez rien reçu ? Vérifiez vos spams ou{" "}
                <button
                  type="button"
                  onClick={handleRenvoyerCode}
                  disabled={loading}
                  className="text-teal-700 font-semibold hover:underline disabled:opacity-50"
                >
                  renvoyer le code
                </button>
                .
              </p>
            </div>
          )}

          {/* ÉTAPE 3 — SUCCÈS */}
          {step === 3 && (
            <div className="text-center space-y-5 max-w-sm mx-auto w-full">
              <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center mx-auto animate-bounce" style={{ animationDuration: "1.5s", animationIterationCount: 3 }}>
                <CheckCircle2 size={36} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Compte sécurisé !</h3>
                <p className="text-sm text-slate-500 mt-1">Email vérifié avec succès</p>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 text-left">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <strong>Bravo {formData.first_name} !</strong> Votre email est validé.
                  <br /><br />
                  Pour garantir la qualité des entreprises sur TafTech, votre compte est en cours de vérification par nos administrateurs (analyse du Registre de Commerce).
                  <br /><br />
                  Vous pourrez publier vos offres dès que votre compte sera approuvé <span className="font-semibold text-teal-700">(sous 24-48h)</span>.
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Redirection automatique dans{" "}
                <span className="font-bold text-teal-700">{secondes}s</span>…
              </p>
              <button
                onClick={() => navigate("/recruteurs/connexion")}
                className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white font-semibold py-2.5 rounded-xl hover:bg-teal-800 transition-colors text-sm"
              >
                Aller à la connexion <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterRecruteur;
