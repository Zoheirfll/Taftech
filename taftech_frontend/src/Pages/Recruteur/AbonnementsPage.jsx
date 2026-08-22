import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, X, Zap, ShieldCheck, CreditCard, Headset, ChevronDown, ChevronUp,
  Clock, Users2, TrendingUp, Award, Loader2,
} from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import toast from "react-hot-toast";
import { tw } from "../../theme";

const NOM_LABELS = { STARTER: "Starter", PRO: "Pro", BUSINESS: "Business", ENTERPRISE: "Enterprise" };

const formatDA = (n) => (n != null ? `${n.toLocaleString("fr-FR")} DA` : "Sur devis");

const CRITERES_TABLEAU = [
  { key: "limite_offres", label: "Offres d'emploi actives", format: (v) => (v != null ? v : "Illimité") },
  { key: "acces_coordonnees", label: "Coordonnées candidats", format: (v) => (v ? "✓" : "—") },
  { key: "limite_cv_mois", label: "Téléchargement CV / mois", format: (v) => (v != null ? v : "Illimité") },
  { key: "acces_ia_recommandes", label: "Candidats recommandés (IA)", format: (v) => (v ? "✓" : "—") },
  { key: "acces_ia_avancee", label: "Recherche/filtres/stats avancés (IA)", format: (v) => (v ? "✓" : "—") },
  { key: "acces_equipe", label: "Gestion d'équipe multi-utilisateurs", format: (v) => (v ? "✓" : "—") },
  { key: "support_label", label: "Support", format: (v) => v || "—" },
];

const BADGES_AVANTAGES = [
  { icon: Zap, titre: "Accès immédiat", description: "Activation en quelques clics" },
  { icon: Clock, titre: "Sans engagement", description: "Résiliez à tout moment" },
  { icon: ShieldCheck, titre: "Paiement sécurisé", description: "100% chiffré" },
  { icon: Headset, titre: "Support prioritaire", description: "Accompagnement dédié" },
];

const RAISONS_UPGRADE = [
  { icon: Clock, titre: "Gagnez du temps", description: "Automatisez le tri et la recherche de candidats" },
  { icon: Users2, titre: "Accédez aux meilleurs talents", description: "Coordonnées et CVthèque complète" },
  { icon: TrendingUp, titre: "Optimisez vos recrutements", description: "Statistiques et candidats recommandés par IA" },
  { icon: Award, titre: "Support dédié à chaque étape", description: "Un accompagnement adapté à votre palier" },
];

const AbonnementsPage = () => {
  const [paliers, setPaliers] = useState([]);
  const [faq, setFaq] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("mensuel");
  const [faqOuverte, setFaqOuverte] = useState(null);
  const [palierActif, setPalierActif] = useState(null);
  const [detailsAbonnement, setDetailsAbonnement] = useState(null);
  const [checkoutEnCours, setCheckoutEnCours] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [p, f, c] = await Promise.allSettled([
        jobsService.getPaliers(),
        jobsService.getFaq("PALIERS"),
        jobsService.getEntreprisesMisesEnAvant(),
      ]);
      if (p.status === "fulfilled") setPaliers(p.value);
      else reportError("ECHEC_LOAD_PALIERS", p.reason);
      if (f.status === "fulfilled") setFaq(f.value);
      else reportError("ECHEC_LOAD_FAQ_PALIERS", f.reason);
      if (c.status === "fulfilled") setClients(c.value);
      else reportError("ECHEC_LOAD_CLIENTS_MIS_EN_AVANT", c.reason);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    // Retour de paiement Chargily (?paid=1) : le webhook peut mettre 1-3s à arriver, on
    // réessaie jusqu'à 5 fois — même pattern que l'ancienne page Premium.
    let tentatives = 0;
    const MAX = 5;
    const chargerPalierActif = async () => {
      try {
        const dash = await jobsService.getDashboard();
        setPalierActif(dash.palier_actif);
        setDetailsAbonnement({
          activeDepuis: dash.premium_active_since,
          expireLe: dash.premium_expire_at,
          nbMois: dash.premium_nb_mois,
        });
        const isPaidReturn = new URLSearchParams(window.location.search).get("paid");
        if (!dash.palier_actif && isPaidReturn && tentatives < MAX) {
          tentatives++;
          setTimeout(chargerPalierActif, 2000);
        } else if (isPaidReturn && dash.palier_actif) {
          toast.success("Paiement confirmé, votre abonnement est actif !");
        }
      } catch (err) {
        reportError("ECHEC_GET_PALIER_ACTIF", err);
      }
    };
    chargerPalierActif();
  }, []);

  const handleChoisir = async (palierNom) => {
    setCheckoutEnCours(palierNom);
    try {
      const periodeAPI = periode === "annuel" ? "ANNUEL" : "MENSUEL";
      const data = await jobsService.chargilyCheckoutPalier(palierNom, periodeAPI);
      window.location.href = data.checkout_url;
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors de la création du paiement.";
      toast.error(msg);
      setCheckoutEnCours(null);
    }
  };

  const paliersTries = useMemo(
    () => [...paliers].sort((a, b) => a.ordre - b.ordre),
    [paliers],
  );

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-600 animate-pulse">Chargement...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Abonnements & tarifs</h1>
        <p className="text-sm text-slate-600 mt-1">Choisissez la formule qui correspond le mieux à vos besoins de recrutement.</p>
      </div>

      {palierActif && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Abonnement {NOM_LABELS[palierActif] || palierActif} actif</p>
              {detailsAbonnement?.expireLe && (
                <p className="text-xs text-emerald-700">
                  Actif depuis le {detailsAbonnement.activeDepuis || "—"} · Expire le {detailsAbonnement.expireLe}
                  {detailsAbonnement.nbMois ? ` (${detailsAbonnement.nbMois} mois)` : ""}
                </p>
              )}
            </div>
          </div>
          <Link to="/facturation" className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors text-center">
            Voir mes factures
          </Link>
        </div>
      )}

      {/* Badges avantages */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BADGES_AVANTAGES.map((b) => (
          <div key={b.titre} className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-lg">
            <b.icon size={16} className="text-teal-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">{b.titre}</p>
              <p className="text-[11px] text-slate-600">{b.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toggle mensuel/annuel */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setPeriode("mensuel")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${periode === "mensuel" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600"}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setPeriode("annuel")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 ${periode === "annuel" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600"}`}
          >
            Annuel
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">-20%</span>
          </button>
        </div>
      </div>

      {/* Cartes paliers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {paliersTries.map((p) => {
          const prix = periode === "mensuel" ? p.prix_mensuel_da : p.prix_annuel_da;
          const estEnterprise = p.nom === "ENTERPRISE";
          return (
            <div
              key={p.id}
              className={`relative flex flex-col p-5 rounded-2xl border ${p.nom === "PRO" ? "border-teal-600 shadow-lg" : "border-slate-200"} bg-white`}
            >
              {p.nom === "PRO" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-teal-700 text-white text-[10px] font-bold rounded-full">Le plus choisi</span>
              )}
              <h3 className="text-base font-bold text-slate-900">{NOM_LABELS[p.nom] || p.nom}</h3>
              <div className="mt-2">
                {estEnterprise ? (
                  <p className="text-2xl font-extrabold text-slate-900">Sur devis</p>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold text-slate-900">{formatDA(prix)}<span className="text-sm font-medium text-slate-600">/{periode === "mensuel" ? "mois" : "an"}</span></p>
                    {periode === "annuel" && p.prix_mensuel_da != null && (
                      <p className="text-xs text-slate-600 mt-0.5">Facturé {formatDA(p.prix_annuel_da)}/an</p>
                    )}
                  </>
                )}
              </div>
              <ul className="mt-4 space-y-2 flex-1">
                <li className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 size={14} className="text-teal-700 shrink-0" />
                  {p.limite_offres != null ? `${p.limite_offres} offres d'emploi actives` : "Offres d'emploi illimitées"}
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 size={14} className="text-teal-700 shrink-0" />
                  {p.acces_coordonnees ? "Accès complet à la CVthèque" : "Accès basique à la CVthèque"}
                </li>
                {p.acces_ia_recommandes && (
                  <li className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={14} className="text-teal-700 shrink-0" /> Candidats recommandés (IA)
                  </li>
                )}
                {p.acces_ia_avancee && (
                  <li className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={14} className="text-teal-700 shrink-0" /> Recherche & statistiques avancées (IA)
                  </li>
                )}
                {p.acces_equipe && (
                  <li className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={14} className="text-teal-700 shrink-0" /> Gestion d'équipe multi-utilisateurs
                  </li>
                )}
                {p.support_label && (
                  <li className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={14} className="text-teal-700 shrink-0" /> Support {p.support_label.toLowerCase()}
                  </li>
                )}
              </ul>
              {estEnterprise ? (
                <Link to="/contact" className="mt-4 w-full py-2.5 text-center bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                  Nous contacter
                </Link>
              ) : palierActif === p.nom ? (
                <span className="mt-4 w-full py-2.5 text-center bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={15} /> Palier actuel
                </span>
              ) : (
                <button
                  onClick={() => handleChoisir(p.nom)}
                  disabled={checkoutEnCours === p.nom}
                  className={`mt-4 w-full py-2.5 text-center text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 ${p.nom === "PRO" ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}
                >
                  {checkoutEnCours === p.nom ? <><Loader2 size={14} className="animate-spin" /> Connexion à Chargily...</> : `Choisir ${NOM_LABELS[p.nom]}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Tableau comparatif */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">Comparez toutes les fonctionnalités</h2>
            <div className={`${tw.card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead className={`${tw.surfaceMuted} border-b ${tw.borderSubtle}`}>
                    <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                      <th className="px-4 py-3">Fonctionnalités</th>
                      {paliersTries.map((p) => (
                        <th key={p.id} className="px-4 py-3 text-center">{NOM_LABELS[p.nom]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CRITERES_TABLEAU.map((c) => (
                      <tr key={c.key}>
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{c.label}</td>
                        {paliersTries.map((p) => (
                          <td key={p.id} className="px-4 py-2.5 text-xs text-center text-slate-900">{c.format(p[c.key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pourquoi passer à une formule supérieure */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">Pourquoi passer à une formule supérieure ?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RAISONS_UPGRADE.map((r) => (
                <div key={r.titre} className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    <r.icon size={16} className="text-teal-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{r.titre}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* FAQ */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Questions fréquentes</h2>
            <div className="space-y-2">
              {faq.map((q) => (
                <div key={q.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setFaqOuverte(faqOuverte === q.id ? null : q.id)}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-900"
                  >
                    {q.question}
                    {faqOuverte === q.id ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                  </button>
                  {faqOuverte === q.id && (
                    <p className="px-3.5 pb-3 text-xs text-slate-600 leading-relaxed">{q.reponse}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ils nous font confiance */}
          {clients.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">Ils nous font confiance</h2>
              <div className="grid grid-cols-3 gap-3">
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-lg h-16">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.nom_entreprise} className="max-h-8 max-w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-600 text-center">{c.nom_entreprise}</span>
                    )}
                  </div>
                ))}
              </div>
              <Link to="/entreprises" className="block mt-2 text-xs font-semibold text-teal-700 hover:underline">Voir tous nos clients →</Link>
            </div>
          )}

          {/* Besoin d'aide */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <Headset size={20} className="text-teal-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-900">Besoin d'aide ?</p>
            <p className="text-[11px] text-slate-600 mt-0.5 mb-3">Notre équipe est là pour vous accompagner.</p>
            <Link to="/contact" className="inline-block px-4 py-2 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-800 transition-colors">
              Contacter le support
            </Link>
          </div>

          {/* Conformité loi 18-07 */}
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Vos données sont protégées conformément à la loi 18-07 sur la protection des données personnelles.{" "}
              <Link to="/confidentialite" className="font-semibold underline">En savoir plus →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbonnementsPage;
