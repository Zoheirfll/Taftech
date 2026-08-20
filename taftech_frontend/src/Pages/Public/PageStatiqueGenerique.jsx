import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import Seo from "../../Components/Seo";

// Page de contenu générique éditable par l'admin (CMS) — sert /cgu, /confidentialite, et toute
// page libre créée en plus via /pages/:slug. `slugFixe` permet de monter ce composant sur des
// routes dédiées (/cgu, /confidentialite) sans dépendre du paramètre d'URL.
const PageStatiqueGenerique = ({ slugFixe }) => {
  const { slug: slugParam } = useParams();
  const slug = slugFixe || slugParam;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    jobsService
      .getPageStatique(slug)
      .then(setPage)
      .catch((err) => {
        reportError("ECHEC_GET_PAGE_STATIQUE", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className={tw.pageBackground}>
        <div className={`${tw.pageContainer} max-w-3xl animate-pulse space-y-4`}>
          <div className="h-10 bg-slate-100 rounded w-2/3" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className={tw.pageBackground}>
        <div className={`${tw.pageContainer} max-w-3xl text-center py-16`}>
          <h1 className={tw.pageTitleGrand}>Page introuvable</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={tw.pageBackground}>
      <Seo title={page.titre} />
      <div className={`${tw.pageContainer} max-w-3xl`}>
        <h1 className={`${tw.pageTitleGrand} mb-6`}>{page.titre}</h1>
        <div
          className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-teal-700"
          dangerouslySetInnerHTML={{ __html: page.contenu_html }}
        />
      </div>
    </div>
  );
};

export default PageStatiqueGenerique;
