import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import toast from "react-hot-toast";
import Select from "react-select";
import { reportError } from "../../utils/errorReporter";
import { selectStyles } from "../../theme";
import { CheckCircle } from "lucide-react";

const RegisterRecruteur = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState("");
  const [constants, setConstants] = useState({ wilayas: [], secteurs: [] });
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", password: "",
    telephone: "", nom_entreprise: "", secteur_activite: "",
    registre_commerce: "", wilaya_siege: "",
  });

  useEffect(() => {
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
      const usernameGenere = formData.email.split("@")[0] + "_pro_" + Math.floor(Math.random() * 999);
      const response = await authService.registerRecruteur({ ...formData, username: usernameGenere });
      toast.success(response.message || "Code envoyé à votre email.", { id: toastId });
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

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) return toast.error("Le code doit contenir 6 chiffres.");
    setLoading(true);
    const toastId = toast.loading("Vérification en cours...");
    try {
      await authService.verifyEmail(formData.email, otpCode);
      toast.success("Email vérifié avec succès !", { id: toastId });
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || "Code incorrect.", { id: toastId });
      reportError("ECHEC_VERIFICATION_OTP_RECRUTEUR", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const labelClass = "text-sm font-semibold text-slate-600 mb-2 block";

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* COLONNE GAUCHE */}
        <div className="md:w-1/3 bg-slate-900 p-10 text-white flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-3">
            Espace <span className="text-indigo-400">Recruteur</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Rejoignez TafTech pour accéder aux meilleurs talents d'Algérie.
            Votre compte sera actif après vérification de vos documents légaux.
          </p>
          <div className="space-y-4">
            {["Publication illimitée", "Gestion des candidatures", "Visibilité Premium"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-base text-slate-300">
                <CheckCircle size={17} className="text-indigo-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="md:w-2/3 p-8 md:p-10 flex flex-col justify-center">
          {/* ÉTAPE 1 */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Créer un compte entreprise
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nom</label>
                  <input type="text" name="last_name" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input type="text" name="first_name" required onChange={handleChange} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email pro</label>
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Registre de commerce</label>
                  <input type="text" name="registre_commerce" required placeholder="Ex: 1234567A89" onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Mot de passe</label>
                  <input type="password" name="password" minLength="8" required onChange={handleChange} className={inputClass} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 mt-2"
              >
                {loading ? "Création en cours..." : "S'inscrire comme employeur"}
              </button>

              <p className="text-center text-sm text-slate-500">
                Déjà un compte ?{" "}
                <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
                  Se connecter
                </Link>
              </p>
            </form>
          )}

          {/* ÉTAPE 2 — OTP */}
          {step === 2 && (
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Vérifiez votre email
              </h3>
              <p className="text-base text-slate-500 mb-6">
                Code envoyé à{" "}
                <span className="font-semibold text-slate-900">{formData.email}</span>
              </p>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <input
                  type="text"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="______"
                  className="w-48 text-center text-2xl tracking-[0.5em] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Vérification..." : "Valider mon email"}
                </button>
              </form>
            </div>
          )}

          {/* ÉTAPE 3 — SUCCÈS */}
          {step === 3 && (
            <div className="text-center space-y-5">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={36} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Compte sécurisé !
              </h3>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-left">
                <p className="text-base text-slate-700 leading-relaxed">
                  <strong>Bravo {formData.first_name} !</strong> Votre email est validé.
                  <br /><br />
                  Pour garantir la qualité des entreprises sur TafTech, votre compte est en cours de vérification par nos administrateurs (analyse du Registre de Commerce).
                  <br /><br />
                  Vous pourrez publier vos offres dès que votre compte sera approuvé.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full border-2 border-indigo-600 text-indigo-600 font-semibold py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-sm"
              >
                Aller à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterRecruteur;
