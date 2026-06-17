import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { authService } from "../../Services/authService";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Eye, EyeOff, Building2, Users } from "lucide-react";
import logoTafTech from "../../assets/logo-taftech.png";

const AccepterInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);       // infos invitation (entreprise, role, compte_existant)
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({ password: "", first_name: "", last_name: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const valider = async () => {
      try {
        const data = await jobsService.validerTokenInvitation(token);
        setInfo(data);
      } catch (err) {
        const msg = err.response?.data?.error || "Lien invalide ou expiré.";
        setErreur(msg);
      } finally {
        setLoading(false);
      }
    };
    valider();
  }, [token]);

  const handleAccepter = async () => {
    if (!form.password) return toast.error("Mot de passe requis.");
    setSaving(true);
    try {
      await jobsService.accepterInvitation(token, {
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
      });
      setSuccess(true);

      // Connecter automatiquement
      try {
        await authService.login(info.email, form.password);
        setTimeout(() => navigate("/dashboard"), 1500);
      } catch {
        // Si login échoue (ex: candidat existant), rediriger vers connexion recruteur
        setTimeout(() => navigate("/recruteurs/connexion"), 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors de l'acceptation.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8">
        <img src={logoTafTech} alt="TafTech" className="h-12 w-auto object-contain" />
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 max-w-md w-full">

        {erreur && (
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
            <p className="text-sm text-slate-500 mb-6">{erreur}</p>
            <Link to="/recruteurs/connexion" className="text-sm text-indigo-600 font-semibold hover:underline">
              Retour à la connexion
            </Link>
          </div>
        )}

        {success && (
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation acceptée !</h1>
            <p className="text-sm text-slate-500">Redirection vers votre tableau de bord...</p>
          </div>
        )}

        {!erreur && !success && info && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={26} className="text-indigo-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Rejoindre l'équipe</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Building2 size={14} className="text-slate-400" />
                <p className="text-sm text-slate-600 font-semibold">{info.entreprise}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Vous serez ajouté(e) en tant que <span className="font-semibold text-slate-600">{info.role_display}</span>
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-slate-500">Invitation pour</p>
              <p className="text-sm font-semibold text-slate-900">{info.email}</p>
            </div>

            <div className="space-y-4">
              {!info.compte_existant && (
                <>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Créer votre compte</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Prénom</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {info.compte_existant && (
                <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Un compte TafTech existe déjà avec cet email. Entrez votre mot de passe pour confirmer et rejoindre l'équipe.
                </p>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  {info.compte_existant ? "Votre mot de passe" : "Choisissez un mot de passe"} *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder={info.compte_existant ? "Votre mot de passe TafTech" : "8 caractères minimum"}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAccepter}
              disabled={saving}
              className="w-full mt-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> En cours...</> : "Accepter l'invitation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AccepterInvitation;
