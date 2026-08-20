import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { mediaUrl } from "../../utils/mediaUrl";
import { tw } from "../../theme";
import Seo from "../../Components/Seo";
import { ArrowLeft, Calendar } from "lucide-react";

const ArticleDetail = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    jobsService
      .getArticleBySlug(slug)
      .then(setArticle)
      .catch((err) => {
        reportError("ECHEC_GET_ARTICLE_DETAIL", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className={tw.pageBackground}>
        <div className={`${tw.pageContainer} max-w-3xl animate-pulse space-y-4`}>
          <div className="h-6 bg-slate-100 rounded w-32" />
          <div className="h-10 bg-slate-100 rounded w-3/4" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className={tw.pageBackground}>
        <div className={`${tw.pageContainer} max-w-3xl text-center py-16`}>
          <h1 className={tw.pageTitleGrand}>Article introuvable</h1>
          <p className={`${tw.bodyTextGrand} mt-2`}>Cet article n'existe pas ou n'est plus disponible.</p>
          <Link to="/blog" className={`inline-flex items-center gap-2 mt-6 text-sm font-semibold text-teal-700 hover:text-teal-800`}>
            <ArrowLeft size={15} /> Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={tw.pageBackground}>
      <Seo
        title={article.titre}
        description={article.extrait}
        image={article.image_couverture ? mediaUrl(article.image_couverture) : undefined}
      />
      <div className={`${tw.pageContainer} max-w-3xl`}>
        <Link to="/blog" className={`inline-flex items-center gap-2 text-sm font-medium ${tw.textMuted} hover:${tw.textStrong} mb-6`}>
          <ArrowLeft size={15} /> Retour au blog
        </Link>

        {article.categorie_label && (
          <span className={`inline-block px-2.5 py-1 ${tw.bgPrimarySoft} ${tw.textPrimaryStrong} text-xs font-medium rounded-full mb-3`}>{article.categorie_label}</span>
        )}
        <h1 className={tw.pageTitleGrand}>{article.titre}</h1>
        <div className={`flex items-center gap-1.5 text-xs ${tw.textMuted} mt-3 mb-6`}>
          <Calendar size={12} />
          {article.date_publication && new Date(article.date_publication).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>

        {article.image_couverture && (
          <img src={mediaUrl(article.image_couverture)} alt={article.titre} className="w-full max-h-96 object-cover rounded-2xl mb-8" />
        )}

        <div
          className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-teal-700"
          dangerouslySetInnerHTML={{ __html: article.contenu_html }}
        />
      </div>
    </div>
  );
};

export default ArticleDetail;
