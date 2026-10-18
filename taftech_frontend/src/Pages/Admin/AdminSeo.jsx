import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, TrendingUp, ExternalLink, RefreshCw } from "lucide-react";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import AdminPageHeader from "../../Components/AdminPageHeader";

const AdminSeo = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    setLoading(true);
    setErreur("");
    try {
      const res = await jobsService.getAdminSeoStats();
      setData(res);
    } catch (err) {
      reportError("ECHEC_CHARGEMENT_ADMIN_SEO", err);
      setErreur("Impossible de charger les données SEO.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const pages = data?.pages || [];
  const nbOk = pages.filter((p) => p.ok).length;
  const toutOk = pages.length > 0 && nbOk === pages.length;

  return (
    <div className="space-y-5 max-w-3xl">
      <AdminPageHeader
        icon={TrendingUp}
        color="teal"
        title="SEO"
        subtitle="URLs générées automatiquement et pages réellement indexables, calculées en direct."
        aideKey="seo"
        aide={[
          "Chaque offre, entreprise, métier, secteur, wilaya et article a une URL lisible générée automatiquement : rien à configurer.",
          "« Pages indexables » = pages publiées que Google peut réellement référencer (offres approuvées, entreprises validées, articles publiés…).",
          "Un ⚠️ signifie seulement qu'aucun contenu de ce type n'est encore publié. Ce n'est pas une erreur technique.",
          "Le sitemap.xml se met à jour tout seul. Déclarez-le une fois dans Google Search Console après la mise en ligne.",
        ]}
        actions={
          <button
            onClick={charger}
            disabled={loading}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border ${tw.borderSubtle} bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${tw.focusRing}`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        }
      />

      {erreur && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{erreur}</span>
          <button onClick={charger} className="text-xs font-semibold underline">Réessayer</button>
        </div>
      )}

      {(data?.alertes || []).map((alerte) => (
        <div
          key={alerte.code}
          role="alert"
          className={`${tw.bgWarningSoft} border ${tw.borderWarning} rounded-xl px-5 py-4 flex items-start gap-3`}
        >
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className={`text-sm ${tw.textWarning900}`}>{alerte.message}</p>
        </div>
      ))}

      <div className={`${tw.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Type de page</th>
                <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Exemple d'URL</th>
                <th className={`text-right px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Pages indexables</th>
                <th className={`text-right px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                    Chargement...
                  </td>
                </tr>
              )}
              {pages.map(({ type, url, nb_pages_indexables, ok }) => (
                <tr key={type} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{type}</td>
                  <td className="px-5 py-3 text-sm text-indigo-600 font-mono break-all">
                    {url || <span className="text-slate-400 italic">Aucune page publiée</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-slate-700 font-semibold">{nb_pages_indexables}</td>
                  <td className="px-5 py-3 text-right">
                    {ok ? (
                      <CheckCircle2 size={18} className="text-emerald-600 inline-block" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-500 inline-block" />
                    )}
                  </td>
                </tr>
              ))}
              {data && (
                <tr className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">Pages fixes</td>
                  <td className={`px-5 py-3 text-sm ${tw.textMuted}`}>
                    Accueil, offres, entreprises, blog, contact, pages légales…
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-slate-700 font-semibold">{data.pages_statiques}</td>
                  <td className="px-5 py-3 text-right">
                    <CheckCircle2 size={18} className="text-emerald-600 inline-block" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <div className={`${tw.card} px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm`}>
          <a
            href={data.sitemap_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
          >
            <ExternalLink size={14} /> Voir le sitemap.xml
          </a>
          <a
            href={data.robots_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline"
          >
            <ExternalLink size={14} /> Voir robots.txt
          </a>
          <span className="text-slate-600">
            <span className="font-semibold text-slate-900">{data.total_urls_sitemap}</span> URLs au total dans le sitemap
          </span>
        </div>
      )}

      {data?.job_posting && (
        <div className={`${tw.card} px-5 py-4 space-y-3`}>
          <h2 className={`text-sm font-bold ${tw.textStrong}`}>Google Emploi (données JobPosting)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Offres éligibles", data.job_posting.eligibles, "Offres actives, approuvées et non expirées : chacune porte sa fiche JobPosting."],
              ["Clôturées", data.job_posting.exclues_cloturees, "Exclues : une offre clôturée n'est plus proposée par Google."],
              ["Expirées", data.job_posting.exclues_expirees, "Exclues : date de fin dépassée (la tâche de nuit les clôture ensuite)."],
              ["Désactivées", data.job_posting.exclues_inactives, "Exclues : masquées par le recruteur ou l'admin."],
            ].map(([libelle, valeur, aide]) => (
              <div key={libelle} className={`${tw.surfaceMuted} rounded-lg p-3`} title={aide}>
                <p className={`text-[11px] font-semibold ${tw.textMuted} uppercase tracking-wider`}>{libelle}</p>
                <p className={`text-xl font-bold ${tw.textStrong} tabular-nums mt-0.5`}>{valeur}</p>
              </div>
            ))}
          </div>
          {data.job_posting.sans_date_fin > 0 && (
            <p className={`text-xs ${tw.textMuted}`}>
              {data.job_posting.sans_date_fin} offre(s) éligible(s) sans date de fin : Google recommande d'en indiquer une
              (« valid through »), sinon l'offre peut rester affichée après son recrutement.
            </p>
          )}
        </div>
      )}

      {data && (
        <div className={`${tw.card} px-5 py-4 space-y-2`}>
          <p className="flex items-center gap-2 text-sm">
            {data.rendu_serveur_pret ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            )}
            <span className={`font-semibold ${tw.textStrong}`}>Aperçus de partage et vrais 404 :</span>
            <span className={tw.textMuted}>{data.rendu_serveur_pret ? "prêts (index.html trouvé)" : "indisponibles (index.html introuvable, vérifiez FRONTEND_INDEX_PATH)"}</span>
          </p>
          <p className={`text-xs ${tw.textMuted}`}>
            En production, nginx doit envoyer les pages d'offre, d'entreprise et d'article à Django pour que Facebook, WhatsApp et Google
            voient leurs balises (voir docs/exploitation/deploiement.md).
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm">
            {[
              ["Google Search Console", "https://search.google.com/search-console"],
              ["Test des résultats enrichis", "https://search.google.com/test/rich-results"],
              ["PageSpeed Insights", "https://pagespeed.web.dev/"],
            ].map(([libelle, lien]) => (
              <a key={lien} href={lien} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:underline">
                <ExternalLink size={14} /> {libelle}
              </a>
            ))}
          </div>
        </div>
      )}

      {data && (
        <div
          className={`rounded-xl px-5 py-4 flex items-center gap-4 border ${
            toutOk ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
          }`}
        >
          {toutOk ? (
            <TrendingUp size={22} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={22} className="text-amber-600 shrink-0" />
          )}
          <p className={`text-sm ${toutOk ? "text-emerald-800" : "text-amber-800"}`}>
            {toutOk
              ? "Toutes les pages importantes ont une URL propre et au moins une page publiée, pour un meilleur référencement sur Google."
              : `${nbOk}/${pages.length} types de page ont du contenu publié — les types marqués ⚠️ n'ont aucune page à indexer pour l'instant.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminSeo;
