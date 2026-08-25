import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { tw } from "../../theme";
import Seo from "../../Components/Seo";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";

// Bandeau dégradé de secours quand l'article n'a pas de photo de couverture — coloré selon la
// catégorie (hash simple du libellé) plutôt qu'un carré vide, sans dépendre de vraies photos.
const GRADIENTS = [
  "from-indigo-500 to-indigo-700",
  "from-teal-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-700",
];
const gradientFor = (label) => {
  if (!label) return GRADIENTS[0];
  const hash = [...label].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
};

const ArticleBanner = ({ article, className = "h-40" }) =>
  article.image_couverture ? (
    <img src={mediaUrl(article.image_couverture)} alt={article.titre} className={`w-full ${className} object-cover`} loading="lazy" />
  ) : (
    <div className={`w-full ${className} bg-linear-to-br ${gradientFor(article.categorie_label)} flex items-center justify-center`}>
      <Newspaper size={32} className="text-white/70" />
    </div>
  );

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorieActive = searchParams.get("categorie") || "";
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    jobsService.getArticleCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    jobsService
      .getArticles(page, categorieActive)
      .then((data) => {
        setArticles(data.results || []);
        setPagination({ next: data.next, previous: data.previous, count: data.count });
      })
      .catch((err) => reportError("ECHEC_GET_ARTICLES_BLOG", err))
      .finally(() => setLoading(false));
  }, [page, categorieActive]);

  const handleCategorie = (id) => {
    setPage(1);
    if (id) setSearchParams({ categorie: id });
    else setSearchParams({});
  };

  return (
    <div className={tw.pageBackground}>
      <Seo title="Blog" description="Conseils carrière, actualités RH et guides de recrutement TafTech — le blog de la plateforme de recrutement algérienne." />
      <div className={tw.pageContainer}>
        <div className="text-center mb-8">
          <h1 className={tw.pageTitleGrand}>Blog TafTech</h1>
          <p className={`${tw.bodyTextGrand} mt-2`}>Conseils carrière, actualités RH et guides de recrutement.</p>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            <button
              onClick={() => handleCategorie("")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${!categorieActive ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted}`}`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategorie(String(c.id))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${categorieActive === String(c.id) ? "bg-teal-600 border-teal-600 text-white" : `${tw.surface} ${tw.borderBase} ${tw.textMuted}`}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${tw.card} rounded-2xl overflow-hidden animate-pulse`}>
                <div className="h-40 bg-slate-100" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className={`text-center ${tw.textMuted} py-12`}>Aucun article pour l'instant.</p>
        ) : (
          (() => {
            // Article vedette : uniquement en première page, sans filtre de catégorie —
            // sinon "le premier article de la catégorie X" n'a pas de sens à mettre en avant.
            const mettreEnAvant = page === 1 && !categorieActive && articles.length > 1;
            const [vedette, ...reste] = mettreEnAvant ? articles : [null, ...articles];

            return (
              <>
                {vedette && (
                  <Link
                    to={`/blog/${vedette.slug}`}
                    className={`${tw.card} rounded-2xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col md:flex-row mb-6`}
                  >
                    <div className="md:w-1/2">
                      <ArticleBanner article={vedette} className="h-48 md:h-full" />
                    </div>
                    <div className="p-6 md:w-1/2 flex flex-col justify-center">
                      {vedette.categorie_label && (
                        <span className={`inline-block w-fit px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full mb-2`}>{vedette.categorie_label}</span>
                      )}
                      <h2 className={`text-xl font-bold ${tw.textStrong} group-hover:text-teal-700 transition-colors`}>{vedette.titre}</h2>
                      <p className={`text-sm ${tw.textMuted} mt-2 line-clamp-3`}>{vedette.extrait}</p>
                      <div className={`flex items-center gap-1.5 text-xs ${tw.textMuted} mt-4`}>
                        <Calendar size={12} />
                        {vedette.date_publication && new Date(vedette.date_publication).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  </Link>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reste.map((a) => (
                    <Link key={a.id} to={`/blog/${a.slug}`} className={`${tw.card} rounded-2xl overflow-hidden hover:shadow-md transition-shadow group`}>
                      <ArticleBanner article={a} />
                      <div className="p-5">
                        {a.categorie_label && (
                          <span className={`inline-block px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full mb-2`}>{a.categorie_label}</span>
                        )}
                        <h2 className={`text-base font-bold ${tw.textStrong} group-hover:text-teal-700 transition-colors`}>{a.titre}</h2>
                        <p className={`text-sm ${tw.textMuted} mt-1.5 line-clamp-2`}>{a.extrait}</p>
                        <div className={`flex items-center gap-1.5 text-xs ${tw.textMuted} mt-3`}>
                          <Calendar size={12} />
                          {a.date_publication && new Date(a.date_publication).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            );
          })()
        )}

        {(pagination.next || pagination.previous) && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button disabled={!pagination.previous} onClick={() => setPage((p) => p - 1)} className={`px-4 py-2 text-sm font-medium rounded-lg border ${tw.borderBase} disabled:opacity-40`}>
              Précédent
            </button>
            <button disabled={!pagination.next} onClick={() => setPage((p) => p + 1)} className={`px-4 py-2 text-sm font-medium rounded-lg border ${tw.borderBase} disabled:opacity-40 flex items-center gap-1`}>
              Suivant <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
