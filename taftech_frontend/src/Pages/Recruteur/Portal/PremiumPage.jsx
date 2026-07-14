import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ArrowLeft,
  Clock,
  Shield,
  Star,
  CalendarDays,
  CalendarCheck,
  RefreshCw,
  Loader2,
  CreditCard,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { jobsService } from "../../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../../utils/errorReporter";

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

const getEconomie = (mois) => {
  const pleinTarif = PRIX_MENSUEL * mois;
  return pleinTarif - getPrix(mois);
};

const formatDA = (n) => n.toLocaleString("fr-FR") + " DA";

const getJoursRestants = (dateStr) => {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/");
  const expire = new Date(`${y}-${m}-${d}`);
  return Math.ceil((expire - new Date()) / (1000 * 60 * 60 * 24));
};

const getDateExpiration = (mois) => {
  const d = new Date();
  d.setMonth(d.getMonth() + mois);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

const FAQ_ITEMS = [
  {
    q: "Que se passe-t-il à l'expiration de mon abonnement ?",
    r: "Votre accès aux fonctionnalités Premium (CVthèque, analyse IA) est suspendu. Vos données et offres restent intactes. Les membres de votre équipe ne peuvent plus se connecter jusqu'au renouvellement.",
  },
  {
    q: "Puis-je prolonger mon abonnement avant qu'il expire ?",
    r: "Oui. La durée s'ajoute à la fin de votre abonnement actuel — vous ne perdez aucun jour.",
  },
  {
    q: "Le paiement est-il sécurisé ?",
    r: "Oui. Le paiement est traité par Chargily Pay, la plateforme de paiement algérienne agréée. TAFTECH ne stocke aucune information bancaire.",
  },
  {
    q: "Quand mon accès Premium est-il activé ?",
    r: "L'activation est automatique après confirmation du paiement, en quelques secondes via le système webhook de Chargily.",
  },
];

// ─── Écran Statut Premium ────────────────────────────────────────────────────
const StatusPremium = ({ premiumData, onRenouveler }) => {
  const { premium_expire_at, premium_active_since, premium_nb_mois } = premiumData;
  const jours = getJoursRestants(premium_expire_at);
  const bientotExpire = jours !== null && jours <= 14;
  const totalJours = (premium_nb_mois || 1) * 30;
  const joursEcoules = Math.max(0, totalJours - (jours ?? 0));
  const pctConsomme = Math.min(100, Math.round((joursEcoules / totalJours) * 100));

  return (
    <div className="space-y-5">
      {/* Bandeau statut */}
      <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 border-2 border-teal-300 rounded-2xl mb-3">
          <Star size={28} className="text-teal-700 fill-teal-200" />
        </div>
        <h2 className="text-2xl font-extrabold text-teal-800">Abonnement Premium actif</h2>
        <p className="text-teal-600 text-sm mt-1">Vous bénéficiez de toutes les fonctionnalités avancées.</p>
        {jours !== null && (
          <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold ${bientotExpire ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-teal-100 text-teal-700 border border-teal-300"}`}>
            <Clock size={14} />
            {jours > 0 ? `${jours} jour${jours > 1 ? "s" : ""} restant${jours > 1 ? "s" : ""}` : "Expire aujourd'hui"}
          </div>
        )}
        {/* Fix 2 — Barre de progression */}
        {jours !== null && (
          <div className="mt-4 px-2">
            <div className="flex justify-between text-[10px] text-teal-600 mb-1">
              <span>Début</span>
              <span>{pctConsomme}% écoulé</span>
              <span>Fin</span>
            </div>
            <div className="h-2 bg-teal-200 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${bientotExpire ? "bg-amber-500" : "bg-teal-600"}`}
                style={{ width: `${pctConsomme}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Détails */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Détails de l'abonnement</p>
        <div className="space-y-3">
          {premium_active_since && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <CalendarDays size={15} className="text-slate-400" /> Date d'activation
              </div>
              <span className="text-sm font-semibold text-slate-800">{premium_active_since}</span>
            </div>
          )}
          {premium_expire_at && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <CalendarCheck size={15} className="text-slate-400" /> Expire le
              </div>
              <span className={`text-sm font-semibold ${bientotExpire ? "text-amber-600" : "text-slate-800"}`}>
                {premium_expire_at}
                {bientotExpire && <span className="ml-2 text-xs text-amber-500">(bientôt)</span>}
              </span>
            </div>
          )}
          {premium_nb_mois && (
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                <RefreshCw size={15} className="text-slate-400" /> Durée souscrite
              </div>
              <span className="text-sm font-semibold text-slate-800">{premium_nb_mois} mois</span>
            </div>
          )}
        </div>
      </div>

      {/* Avantages */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-sm font-bold text-slate-700 mb-3">Fonctionnalités incluses</p>
        <div className="space-y-2">
          {AVANTAGES.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
              {a}
            </div>
          ))}
        </div>
      </div>

      {bientotExpire ? (
        <button onClick={onRenouveler} className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
          <RefreshCw size={16} /> Renouveler mon abonnement
        </button>
      ) : (
        <button onClick={onRenouveler} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
          <RefreshCw size={15} /> Prolonger l'abonnement
        </button>
      )}
    </div>
  );
};

// ─── Flow Paiement ───────────────────────────────────────────────────────────
const PremiumPage = () => {
  const [nbMois, setNbMois] = useState(3);
  const [loading, setLoading] = useState(false);
  const [premiumData, setPremiumData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modeRenouvellement, setModeRenouvellement] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);

  useEffect(() => {
    // Quand Chargily redirige ici après paiement, le webhook peut mettre 1-3s à arriver.
    // On tente jusqu'à 5 fois avec 2s d'intervalle pour détecter l'activation.
    let tentatives = 0;
    const MAX = 5;

    const load = async () => {
      try {
        const dash = await jobsService.getDashboard();
        const data = {
          est_premium: dash.est_premium,
          premium_expire_at: dash.premium_expire_at,
          premium_active_since: dash.premium_active_since,
          premium_nb_mois: dash.premium_nb_mois,
        };
        setPremiumData(data);

        // Si pas encore premium et qu'on vient de payer (paramètre URL ?paid=1),
        // on réessaie pour laisser le temps au webhook Chargily de s'exécuter
        const isPaidReturn = new URLSearchParams(window.location.search).get('paid');
        if (!data.est_premium && isPaidReturn && tentatives < MAX) {
          tentatives++;
          setTimeout(load, 2000);
          return;
        }
      } catch (err) {
        reportError("ECHEC_GET_STATUT_PREMIUM", err);
      } finally {
        if (tentatives === 0 || tentatives >= MAX) setLoadingStatus(false);
        else setLoadingStatus(false);
      }
    };
    load();
  }, []);

  const prix = getPrix(nbMois);
  const showStatut = premiumData?.est_premium && !modeRenouvellement;

  const handlePayer = async () => {
    setLoading(true);
    try {
      const data = await jobsService.chargilyCheckout(nbMois);
      window.location.href = data.checkout_url;
    } catch (err) {
      reportError("ECHEC_CHARGILY_CHECKOUT", err);
      const msg = err.response?.data?.error || "Erreur lors de la création du paiement.";
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft size={15} /> Retour au tableau de bord
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 border-2 border-teal-200 rounded-2xl mb-4">
            <span className="text-3xl">⭐</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {showStatut ? "Mon abonnement Premium" : "Passer en Premium"}
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            {showStatut ? "Consultez l'état de votre abonnement." : "Payez en ligne par CIB ou EDAHABIA via Chargily Pay."}
          </p>
        </div>

        {loadingStatus && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-8 text-center space-y-3">
              <div className="w-16 h-16 bg-teal-200 rounded-2xl mx-auto" />
              <div className="h-6 bg-teal-200 rounded w-64 mx-auto" />
              <div className="h-4 bg-teal-100 rounded w-48 mx-auto" />
              <div className="h-2 bg-teal-200 rounded-full w-full mt-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-slate-100">
                  <div className="h-4 bg-slate-100 rounded w-32" />
                  <div className="h-4 bg-slate-200 rounded w-24" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingStatus && showStatut && (
          <StatusPremium premiumData={premiumData} onRenouveler={() => setModeRenouvellement(true)} />
        )}

        {!loadingStatus && !showStatut && (
          <>
            {modeRenouvellement && (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <RefreshCw size={15} className="shrink-0" />
                Prolongation — la durée s'ajoutera à la fin de votre abonnement actuel.
                <button onClick={() => setModeRenouvellement(false)} className="ml-auto text-slate-400 hover:text-slate-600 text-xs underline">
                  Annuler
                </button>
              </div>
            )}

            <div className="bg-white border-2 border-teal-200 rounded-2xl p-8 mb-6 shadow-sm">
              <p className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-4 text-center">Ce qui est inclus</p>
              <div className="space-y-2 mb-8">
                {AVANTAGES.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                    {a}
                  </div>
                ))}
              </div>

              <p className="text-sm font-semibold text-slate-700 mb-3">Choisissez votre durée</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {DUREES.map(({ mois, label, remise }) => (
                  <button
                    key={mois}
                    onClick={() => setNbMois(mois)}
                    className={`relative p-4 rounded-xl border-2 text-center transition-all ${nbMois === mois ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}
                  >
                    {remise && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {remise}
                      </span>
                    )}
                    <p className="text-sm font-bold text-slate-900">{label}</p>
                    <p className="text-xs text-teal-700 font-semibold mt-1">{getPrix(mois).toLocaleString("fr-DZ")} DA</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(getPrix(mois) / mois).toLocaleString("fr-DZ")} DA/mois</p>
                  </button>
                ))}
              </div>

              {/* Fix 3 — Économies + Fix 4 — Date expiration estimée */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Total à payer</p>
                    <p className="text-xs text-slate-500">
                      {nbMois} mois × {formatDA(Math.round(getPrix(nbMois) / nbMois))}/mois
                      {(nbMois === 6 || nbMois === 12) && (
                        <span className="ml-1 text-emerald-600 font-semibold">({nbMois === 6 ? "−8%" : "−17%"})</span>
                      )}
                    </p>
                  </div>
                  <p className="text-2xl font-extrabold text-teal-700">{formatDA(prix)}</p>
                </div>
                {getEconomie(nbMois) > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                    <Zap size={12} className="shrink-0" />
                    Vous économisez {formatDA(getEconomie(nbMois))} par rapport au tarif mensuel
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                  <CalendarCheck size={12} className="text-teal-500 shrink-0" />
                  Accès Premium jusqu'au <span className="font-semibold text-slate-700 ml-1">{getDateExpiration(nbMois)}</span>
                </div>
              </div>
            </div>

            {/* Moyen de paiement */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard size={22} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Paiement sécurisé via Chargily Pay</p>
                <p className="text-xs text-slate-500 mt-0.5">CIB · EDAHABIA — vous serez redirigé vers la plateforme de paiement algérienne</p>
              </div>
              <ExternalLink size={15} className="text-slate-300 ml-auto shrink-0" />
            </div>

            <button
              onClick={handlePayer}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Connexion à Chargily...</>
              ) : (
                <><CreditCard size={16} /> Payer {formatDA(prix)} avec Chargily</>
              )}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Shield size={13} /> Paiement 100% sécurisé</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={13} /> Activation automatique après paiement</span>
            </div>

            {/* Fix 5 — FAQ */}
            <div className="mt-8 border-t border-slate-200 pt-8">
              <p className="text-sm font-bold text-slate-700 mb-3">Questions fréquentes</p>
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                    >
                      {item.q}
                      {faqOpen === i ? <ChevronUp size={15} className="text-slate-400 shrink-0 ml-2" /> : <ChevronDown size={15} className="text-slate-400 shrink-0 ml-2" />}
                    </button>
                    {faqOpen === i && (
                      <div className="px-4 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                        {item.r}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
