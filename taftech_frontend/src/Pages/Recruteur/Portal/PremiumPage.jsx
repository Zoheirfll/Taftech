import React, { useState, useEffect, useMemo } from "react";
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
  Mail,
  Download,
  SlidersHorizontal,
  Sparkles,
  Heart,
  Headset,
  Users,
  TrendingUp,
  Search,
  FileText,
  Award,
  Target,
  Lock,
  Bell,
} from "lucide-react";
import { jobsService } from "../../../Services/jobsService";
import toast from "react-hot-toast";
import { reportError } from "../../../utils/errorReporter";

// Doit couvrir exactement ICONES_CHOICES côté backend (jobs/models.py) — un admin choisit un nom
// d'icône via un <select> whitelisté, jamais du texte libre.
export const PREMIUM_ICON_MAP = {
  Mail, Download, SlidersHorizontal, Sparkles, Heart, Headset, Star, Shield, Zap, Clock,
  CheckCircle2, CreditCard, Users, TrendingUp, Search, FileText, Award, Target, Lock, Bell,
};

const AvantageCard = ({ icone, titre, description }) => {
  const Icon = PREMIUM_ICON_MAP[icone] || Star;
  return (
    <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-lg">
      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-teal-700" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{titre}</p>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
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


// ─── Écran Statut Premium ────────────────────────────────────────────────────
const StatusPremium = ({ premiumData, avantages, onRenouveler }) => {
  const { premium_expire_at, premium_active_since, premium_nb_mois } = premiumData;
  const jours = getJoursRestants(premium_expire_at);
  const bientotExpire = jours !== null && jours <= 14;
  const totalJours = (premium_nb_mois || 1) * 30;
  const joursEcoules = Math.max(0, totalJours - (jours ?? 0));
  const pctConsomme = Math.min(100, Math.round((joursEcoules / totalJours) * 100));

  return (
    <div className="space-y-5">
      {/* Bandeau statut */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-50 border border-teal-200 rounded-xl mb-3">
          <Star size={24} className="text-teal-700" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Abonnement Premium actif</h2>
        <p className="text-slate-600 text-sm mt-1">Vous bénéficiez de toutes les fonctionnalités avancées.</p>
        {jours !== null && (
          <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold ${bientotExpire ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-teal-50 text-teal-700 border border-teal-200"}`}>
            <Clock size={14} />
            {jours > 0 ? `${jours} jour${jours > 1 ? "s" : ""} restant${jours > 1 ? "s" : ""}` : "Expire aujourd'hui"}
          </div>
        )}
        {jours !== null && (
          <div className="mt-4 px-2">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Début</span>
              <span>{pctConsomme}% écoulé</span>
              <span>Fin</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${bientotExpire ? "bg-amber-500" : "bg-teal-600"}`}
                style={{ width: `${pctConsomme}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Détails */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Détails de l'abonnement</p>
        <div className="space-y-1">
          {premium_active_since && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <CalendarDays size={15} className="text-slate-400" /> Date d'activation
              </div>
              <span className="text-sm font-semibold text-slate-800">{premium_active_since}</span>
            </div>
          )}
          {premium_expire_at && (
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
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
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <RefreshCw size={15} className="text-slate-400" /> Durée souscrite
              </div>
              <span className="text-sm font-semibold text-slate-800">{premium_nb_mois} mois</span>
            </div>
          )}
        </div>
      </div>

      {/* Avantages */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-sm font-bold text-slate-700 mb-3">Fonctionnalités incluses</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {avantages.map((a) => (
            <AvantageCard key={a.id} {...a} />
          ))}
        </div>
      </div>

      {bientotExpire ? (
        <button onClick={onRenouveler} className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors">
          <RefreshCw size={16} /> Renouveler mon abonnement
        </button>
      ) : (
        <button onClick={onRenouveler} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={15} /> Prolonger l'abonnement
        </button>
      )}
    </div>
  );
};

// ─── Flow Paiement ───────────────────────────────────────────────────────────
const PremiumPage = () => {
  const [nbMois, setNbMois] = useState(null);
  const [loading, setLoading] = useState(false);
  const [premiumData, setPremiumData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [modeRenouvellement, setModeRenouvellement] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const [plans, setPlans] = useState([]);
  const [avantages, setAvantages] = useState([]);
  const [faqItems, setFaqItems] = useState([]);
  const [loadingContenu, setLoadingContenu] = useState(true);

  useEffect(() => {
    const loadContenu = async () => {
      try {
        const [plansData, avantagesData, faqData] = await Promise.all([
          jobsService.getPremiumPlans(),
          jobsService.getPremiumAvantages(),
          jobsService.getFaq("PREMIUM"),
        ]);
        setPlans(plansData);
        setAvantages(avantagesData);
        setFaqItems(faqData);
        const defaut = plansData.find((p) => p.populaire) || plansData[0];
        if (defaut) setNbMois(defaut.nb_mois);
      } catch (err) {
        reportError("ECHEC_GET_PREMIUM_CONTENU", err);
      } finally {
        setLoadingContenu(false);
      }
    };
    loadContenu();
  }, []);

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

  const planSelectionne = plans.find((p) => p.nb_mois === nbMois) || null;
  const prix = planSelectionne?.prix_da ?? 0;
  // Base de comparaison "économies" = tarif au mois du plus petit palier (ex: 1 mois),
  // sans hypothèse de prix mensuel global fixe — les paliers sont désormais libres.
  const planBase = useMemo(() => {
    if (plans.length === 0) return null;
    return plans.reduce((min, p) => (p.nb_mois < min.nb_mois ? p : min), plans[0]);
  }, [plans]);
  const getEconomie = (plan) => {
    if (!planBase || !plan || plan.nb_mois === planBase.nb_mois) return 0;
    const tarifPlein = Math.round((planBase.prix_da / planBase.nb_mois) * plan.nb_mois);
    return Math.max(0, tarifPlein - plan.prix_da);
  };
  const getRemisePct = (plan) => {
    if (!planBase || !plan || plan.nb_mois === planBase.nb_mois) return null;
    const tarifPlein = Math.round((planBase.prix_da / planBase.nb_mois) * plan.nb_mois);
    if (tarifPlein <= 0) return null;
    const pct = Math.round((1 - plan.prix_da / tarifPlein) * 100);
    return pct > 0 ? `−${pct}%` : null;
  };
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
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft size={15} /> Retour au tableau de bord
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-50 border border-teal-200 rounded-xl mb-4">
            <Star size={24} className="text-teal-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {showStatut ? "Mon abonnement Premium" : "Passer en Premium"}
          </h1>
          <p className="text-slate-600 mt-2 text-sm">
            {showStatut ? "Consultez l'état de votre abonnement." : "Payez en ligne par CIB ou EDAHABIA via Chargily Pay."}
          </p>
        </div>

        {(loadingStatus || (!showStatut && loadingContenu)) && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 rounded-xl mx-auto" />
              <div className="h-5 bg-slate-100 rounded w-56 mx-auto" />
              <div className="h-4 bg-slate-100 rounded w-40 mx-auto" />
              <div className="h-1.5 bg-slate-100 rounded-full w-full mt-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-slate-100">
                  <div className="h-4 bg-slate-100 rounded w-32" />
                  <div className="h-4 bg-slate-100 rounded w-24" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingStatus && showStatut && (
          <StatusPremium premiumData={premiumData} avantages={avantages} onRenouveler={() => setModeRenouvellement(true)} />
        )}

        {!loadingStatus && !showStatut && !loadingContenu && planSelectionne && (
          <>
            {modeRenouvellement && (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                <RefreshCw size={15} className="shrink-0" />
                Prolongation — la durée s'ajoutera à la fin de votre abonnement actuel.
                <button onClick={() => setModeRenouvellement(false)} className="ml-auto text-slate-600 hover:text-slate-800 text-xs underline">
                  Annuler
                </button>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-8 mb-6">
              <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 text-center">Ce qui est inclus</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {avantages.map((a) => (
                  <AvantageCard key={a.id} {...a} />
                ))}
              </div>

              <p className="text-sm font-semibold text-slate-700 mb-3">Choisissez votre durée</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {plans.map((plan) => {
                  const selected = nbMois === plan.nb_mois;
                  const remise = getRemisePct(plan);
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setNbMois(plan.nb_mois)}
                      className={`relative p-4 pt-5 rounded-lg border text-center transition-colors ${selected ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}
                    >
                      {plan.populaire && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                          Populaire
                        </span>
                      )}
                      {remise && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {remise}
                        </span>
                      )}
                      <p className="text-sm font-bold text-slate-900">{plan.label}</p>
                      <p className="text-sm font-semibold text-teal-700 mt-1">{plan.prix_da.toLocaleString("fr-DZ")} DA</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{Math.round(plan.prix_da / plan.nb_mois).toLocaleString("fr-DZ")} DA/mois</p>
                    </button>
                  );
                })}
              </div>

              {/* Total + économies + date expiration estimée */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Total à payer</p>
                    <p className="text-xs text-slate-600">
                      {nbMois} mois × {formatDA(Math.round(prix / nbMois))}/mois
                      {getRemisePct(planSelectionne) && (
                        <span className="ml-1 text-emerald-600 font-semibold">({getRemisePct(planSelectionne)})</span>
                      )}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatDA(prix)}</p>
                </div>
                {getEconomie(planSelectionne) > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                    <Zap size={12} className="shrink-0" />
                    Vous économisez {formatDA(getEconomie(planSelectionne))} par rapport au tarif mensuel
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                  <CalendarCheck size={12} className="text-teal-600 shrink-0" />
                  Accès Premium jusqu'au <span className="font-semibold text-slate-700 ml-1">{getDateExpiration(nbMois)}</span>
                </div>
              </div>
            </div>

            {/* Moyen de paiement */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center gap-4">
              <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard size={20} className="text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Paiement sécurisé via Chargily Pay</p>
                <p className="text-xs text-slate-600 mt-0.5">CIB · EDAHABIA — vous serez redirigé vers la plateforme de paiement algérienne</p>
              </div>
              <ExternalLink size={15} className="text-slate-300 ml-auto shrink-0" />
            </div>

            <button
              onClick={handlePayer}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-teal-700 text-white text-sm font-bold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Connexion à Chargily...</>
              ) : (
                <><CreditCard size={16} /> Payer {formatDA(prix)} avec Chargily</>
              )}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1"><Shield size={13} /> Paiement 100% sécurisé</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={13} /> Activation automatique après paiement</span>
            </div>

            {/* FAQ */}
            {faqItems.length > 0 && (
              <div className="mt-8 border-t border-slate-200 pt-8">
                <p className="text-sm font-bold text-slate-700 mb-3">Questions fréquentes</p>
                <div className="space-y-2">
                  {faqItems.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setFaqOpen(faqOpen === item.id ? null : item.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        {item.question}
                        {faqOpen === item.id ? <ChevronUp size={15} className="text-slate-600 shrink-0 ml-2" /> : <ChevronDown size={15} className="text-slate-600 shrink-0 ml-2" />}
                      </button>
                      {faqOpen === item.id && (
                        <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {item.reponse}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
