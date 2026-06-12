import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ArrowLeft,
  Banknote,
  Clock,
  Shield,
  Send,
  Mail,
  Star,
  CalendarDays,
  CalendarCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { jobsService } from "../../../Services/jobsService";
import toast from "react-hot-toast";

const AVANTAGES = [
  "Accès complet à la CVthèque — profils, coordonnées, CV",
  "Analyse approfondie IA de chaque candidature",
  "Résumé IA automatique des profils candidats",
  "Badge ⭐ Premium visible sur votre espace recruteur",
];

const DUREES = [
  { mois: 1, label: "1 mois", remise: null },
  { mois: 3, label: "3 mois", remise: null },
  { mois: 6, label: "6 mois", remise: "−8%" },
  { mois: 12, label: "12 mois", remise: "−17%" },
];

const PRIX_MENSUEL = 2000;

const getPrix = (mois) => {
  if (mois === 6) return Math.round(PRIX_MENSUEL * mois * 0.92);
  if (mois === 12) return Math.round(PRIX_MENSUEL * mois * 0.83);
  return PRIX_MENSUEL * mois;
};

const getJoursRestants = (dateStr) => {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  const expire = new Date(`${y}-${m}-${d}`);
  const diff = Math.ceil((expire - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
};

// ─── Écran Statut Premium ───────────────────────────────────────────────────
const StatusPremium = ({ premiumData, onRenouveler }) => {
  const { premium_expire_at, premium_active_since, premium_nb_mois } =
    premiumData;
  const jours = getJoursRestants(premium_expire_at);
  const bientotExpire = jours !== null && jours <= 14;

  const [showRecu, setShowRecu] = useState(false);
  const [moyenRecu, setMoyenRecu] = useState("CIB");
  const [nbMoisRecu, setNbMoisRecu] = useState(premium_nb_mois || 1);
  const [messageRecu, setMessageRecu] = useState("");
  const [loadingRecu, setLoadingRecu] = useState(false);

  const handleEnvoyerRecu = async () => {
    setLoadingRecu(true);
    try {
      await jobsService.envoyerRecuPremium(moyenRecu, nbMoisRecu, messageRecu);
      toast.success("Reçu envoyé à taftech963@gmail.com !");
      setShowRecu(false);
      setMessageRecu("");
    } catch {
      toast.error("Erreur lors de l'envoi.");
    } finally {
      setLoadingRecu(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Bannière statut */}
      <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 border-2 border-teal-300 rounded-2xl mb-3">
          <Star size={28} className="text-teal-700 fill-teal-200" />
        </div>
        <h2 className="text-2xl font-extrabold text-teal-800">
          Abonnement Premium actif
        </h2>
        <p className="text-teal-600 text-sm mt-1">
          Vous bénéficiez de toutes les fonctionnalités avancées.
        </p>
        {jours !== null && (
          <div
            className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold ${
              bientotExpire
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-teal-100 text-teal-700 border border-teal-300"
            }`}
          >
            <Clock size={14} />
            {jours > 0
              ? `${jours} jour${jours > 1 ? "s" : ""} restant${jours > 1 ? "s" : ""}`
              : "Expire aujourd'hui"}
          </div>
        )}
      </div>

      {/* Détails abonnement */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">
          Détails de l'abonnement
        </p>
        <div className="space-y-3">
          {premium_active_since && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <CalendarDays size={15} className="text-slate-400" />
                Date d'activation
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {premium_active_since}
              </span>
            </div>
          )}
          {premium_expire_at && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <CalendarCheck size={15} className="text-slate-400" />
                Expire le
              </div>
              <span
                className={`text-sm font-semibold ${bientotExpire ? "text-amber-600" : "text-slate-800"}`}
              >
                {premium_expire_at}
                {bientotExpire && (
                  <span className="ml-2 text-xs text-amber-500">(bientôt)</span>
                )}
              </span>
            </div>
          )}
          {premium_nb_mois && (
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <RefreshCw size={15} className="text-slate-400" />
                Durée souscrite
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {premium_nb_mois} mois
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Avantages actifs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-sm font-bold text-slate-700 mb-3">
          Fonctionnalités incluses
        </p>
        <div className="space-y-2">
          {AVANTAGES.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 text-sm text-slate-700"
            >
              <CheckCircle2
                size={15}
                className="text-teal-600 shrink-0 mt-0.5"
              />
              {a}
            </div>
          ))}
        </div>
      </div>

      {/* Envoyer un reçu */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowRecu(!showRecu)}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Mail size={15} className="text-slate-400" />
            Envoyer un reçu de paiement
          </div>
          <span className="text-xs text-slate-400">{showRecu ? "▲" : "▼"}</span>
        </button>
        {showRecu && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4">
            <p className="text-xs text-slate-500">
              Envoyez une preuve de paiement à l'équipe TafTech pour accélérer
              l'activation ou la prolongation.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Moyen de paiement
                </label>
                <select
                  value={moyenRecu}
                  onChange={(e) => setMoyenRecu(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="CIB">CIB</option>
                  <option value="EDAHABIA">EDAHABIA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Durée (mois)
                </label>
                <select
                  value={nbMoisRecu}
                  onChange={(e) => setNbMoisRecu(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  {[1, 3, 6, 12].map((m) => (
                    <option key={m} value={m}>
                      {m} mois — {getPrix(m).toLocaleString("fr-DZ")} DA
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Message (référence du virement, date...)
              </label>
              <textarea
                value={messageRecu}
                onChange={(e) => setMessageRecu(e.target.value)}
                rows={3}
                placeholder="Ex : Virement CIB effectué le 12/06/2026, référence #XXXXXXXX"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
              />
            </div>
            <button
              onClick={handleEnvoyerRecu}
              disabled={loadingRecu}
              className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60"
            >
              <Send size={15} />
              {loadingRecu ? "Envoi..." : "Envoyer le reçu par email"}
            </button>
          </div>
        )}
      </div>

      {/* Renouveler */}
      {bientotExpire ? (
        <button
          onClick={onRenouveler}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
        >
          <RefreshCw size={16} />
          Renouveler mon abonnement
        </button>
      ) : (
        <button
          onClick={onRenouveler}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={15} />
          Prolonger l'abonnement
        </button>
      )}
    </div>
  );
};

// ─── Flow Paiement ───────────────────────────────────────────────────────────
const PremiumPage = () => {
  const [moyen, setMoyen] = useState("CIB");
  const [nbMois, setNbMois] = useState(1);
  const [message, setMessage] = useState("");
  const [etape, setEtape] = useState("choix"); // choix | recu | confirme
  const [loading, setLoading] = useState(false);
  const [premiumData, setPremiumData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modeRenouvellement, setModeRenouvellement] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setPremiumData({
          est_premium: dash.est_premium,
          premium_expire_at: dash.premium_expire_at,
          premium_active_since: dash.premium_active_since,
          premium_nb_mois: dash.premium_nb_mois,
        });
      } catch {
        // pas de données = non premium
      } finally {
        setLoadingStatus(false);
      }
    };
    load();
  }, []);

  const prix = getPrix(nbMois);
  const showStatut = premiumData?.est_premium && !modeRenouvellement;

  const handleConfirmerDemande = async () => {
    setLoading(true);
    try {
      await jobsService.demanderPremium(moyen, nbMois);
      setEtape("recu");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message;
      toast.error(msg || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnvoyerRecu = async () => {
    setLoading(true);
    try {
      await jobsService.envoyerRecuPremium(moyen, nbMois, message);
      toast.success("Email envoyé ! Activation sous 24h ouvrables.");
      setEtape("confirme");
    } catch {
      toast.error("Erreur lors de l'envoi de l'email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Retour */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
        >
          <ArrowLeft size={15} /> Retour au tableau de bord
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 border-2 border-teal-200 rounded-2xl mb-4">
            <span className="text-3xl">⭐</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {showStatut ? "Mon abonnement Premium" : "Passer en Premium"}
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            {showStatut
              ? "Consultez l'état de votre abonnement."
              : "Accédez à toutes les fonctionnalités TafTech pour recruter plus efficacement."}
          </p>
        </div>

        {/* Chargement */}
        {loadingStatus && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-teal-600" />
          </div>
        )}

        {/* Mode statut */}
        {!loadingStatus && showStatut && (
          <StatusPremium
            premiumData={premiumData}
            onRenouveler={() => setModeRenouvellement(true)}
          />
        )}

        {/* Flow paiement */}
        {!loadingStatus && !showStatut && (
          <>
            {modeRenouvellement && etape === "choix" && (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <RefreshCw size={15} className="shrink-0" />
                Prolongation — la durée s'ajoutera à la fin de votre abonnement
                actuel.
                <button
                  onClick={() => setModeRenouvellement(false)}
                  className="ml-auto text-slate-400 hover:text-slate-600 text-xs underline"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* ÉTAPE 1 — Choix */}
            {etape === "choix" && (
              <>
                <div className="bg-white border-2 border-teal-200 rounded-2xl p-8 mb-6 shadow-sm">
                  <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-4 text-center">
                    Ce qui est inclus
                  </p>
                  <div className="space-y-2 mb-8">
                    {AVANTAGES.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-slate-700"
                      >
                        <CheckCircle2
                          size={16}
                          className="text-teal-600 shrink-0 mt-0.5"
                        />
                        {a}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    Choisissez votre durée
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {DUREES.map(({ mois, label, remise }) => (
                      <button
                        key={mois}
                        onClick={() => setNbMois(mois)}
                        className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                          nbMois === mois
                            ? "border-teal-600 bg-teal-50"
                            : "border-slate-200 bg-white hover:border-teal-300"
                        }`}
                      >
                        {remise && (
                          <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {remise}
                          </span>
                        )}
                        <p className="text-sm font-bold text-slate-900">
                          {label}
                        </p>
                        <p className="text-xs text-teal-700 font-semibold mt-1">
                          {getPrix(mois).toLocaleString("fr-DZ")} DA
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {Math.round(getPrix(mois) / mois).toLocaleString(
                            "fr-DZ",
                          )}{" "}
                          DA/mois
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Total à payer
                      </p>
                      <p className="text-xs text-slate-500">
                        {nbMois} mois ×{" "}
                        {Math.round(getPrix(nbMois) / nbMois).toLocaleString(
                          "fr-DZ",
                        )}{" "}
                        DA/mois
                        {(nbMois === 6 || nbMois === 12) && (
                          <span className="ml-1 text-emerald-600 font-semibold">
                            ({nbMois === 6 ? "−8%" : "−17%"})
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-2xl font-extrabold text-teal-700">
                      {prix.toLocaleString("fr-DZ")} DA
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* CIB */}
                  <div
                    className={`bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all ${moyen === "CIB" ? "border-blue-400" : "border-slate-200 hover:border-slate-300"}`}
                    onClick={() => setMoyen("CIB")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center shrink-0">
                        <Banknote size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          Carte CIB — Virement bancaire
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${moyen === "CIB" ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}
                      />
                    </div>
                    {moyen === "CIB" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bénéficiaire</span>
                          <span className="font-semibold">FILALI Zoheir</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">RIB</span>
                          <span className="font-mono text-slate-400 italic">
                            À compléter
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Banque</span>
                          <span className="text-slate-400 italic">
                            À compléter
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Montant</span>
                          <span className="font-bold text-teal-700">
                            {prix.toLocaleString("fr-DZ")} DA
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Motif</span>
                          <span className="font-semibold">
                            Premium TafTech {nbMois}M
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EDAHABIA */}
                  <div
                    className={`bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all ${moyen === "EDAHABIA" ? "border-amber-400" : "border-slate-200 hover:border-slate-300"}`}
                    onClick={() => setMoyen("EDAHABIA")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
                        <Banknote size={16} className="text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          EDAHABIA — Algérie Poste
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${moyen === "EDAHABIA" ? "border-amber-500 bg-amber-500" : "border-slate-300"}`}
                      />
                    </div>
                    {moyen === "EDAHABIA" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bénéficiaire</span>
                          <span className="font-semibold">FILALI Zoheir</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">N° CCP</span>
                          <span className="font-mono text-slate-400 italic">
                            À compléter
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Clé</span>
                          <span className="font-mono text-slate-400 italic">
                            À compléter
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Montant</span>
                          <span className="font-bold text-teal-700">
                            {prix.toLocaleString("fr-DZ")} DA
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Motif</span>
                          <span className="font-semibold">
                            Premium TafTech {nbMois}M
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleConfirmerDemande}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60 shadow-sm"
                >
                  <Send size={16} />
                  {loading
                    ? "Enregistrement..."
                    : `J'ai effectué le virement — ${prix.toLocaleString("fr-DZ")} DA`}
                </button>
                <p className="text-center text-xs text-slate-400 mt-3">
                  Votre demande sera transmise à notre équipe pour vérification.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Shield size={13} /> Vérification manuelle sécurisée
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> Activation sous 24h ouvrables
                  </span>
                </div>
              </>
            )}

            {/* ÉTAPE 2 — Envoi reçu */}
            {etape === "recu" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      Demande enregistrée ✓
                    </p>
                    <p className="text-sm text-slate-500">
                      Envoyez maintenant une preuve de paiement par email.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Moyen</span>
                    <span className="font-semibold">{moyen}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Durée</span>
                    <span className="font-semibold">{nbMois} mois</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Montant</span>
                    <span className="font-bold text-teal-700">
                      {prix.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Mail size={14} className="inline mr-1.5" />
                    Message (optionnel — ex : référence du virement)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Ex : Virement effectué le 12/06/2026, référence CIB #XXXXXXXX..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
                  />
                </div>

                <button
                  onClick={handleEnvoyerRecu}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60"
                >
                  <Send size={16} />
                  {loading
                    ? "Envoi en cours..."
                    : "Envoyer la confirmation par email"}
                </button>
                <p className="text-center text-xs text-slate-400 mt-3">
                  Un email sera envoyé à taftech963@gmail.com
                </p>
              </div>
            )}

            {/* ÉTAPE 3 — Confirmation finale */}
            {etape === "confirme" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                  Demande envoyée avec succès !
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Notre équipe a été notifiée. Votre compte Premium sera activé
                  sous <strong className="text-slate-700">24h ouvrables</strong>
                  .
                </p>
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 inline-block text-left mb-6 w-full max-w-xs">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Moyen</span>
                    <span className="font-semibold">{moyen}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Durée</span>
                    <span className="font-semibold">{nbMois} mois</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Montant</span>
                    <span className="font-bold text-teal-700">
                      {prix.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                </div>
                <br />
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors"
                >
                  Retour au tableau de bord
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
