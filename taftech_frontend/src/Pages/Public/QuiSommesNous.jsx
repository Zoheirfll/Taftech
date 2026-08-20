import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { Briefcase, Building2, Users, BadgeCheck } from "lucide-react";
import { tw } from "../../theme";

const fmt = (n) => (n === undefined || n === null ? "—" : `${n}+`);

const QuiSommesNous = () => {
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(null);

  useEffect(() => {
    api.get("jobs/stats/public/").then((r) => setStats(r.data)).catch(() => {});
    jobsService
      .getPageStatique("qui-sommes-nous")
      .then(setPage)
      .catch((err) => reportError("ECHEC_GET_PAGE_QUI_SOMMES_NOUS", err));
  }, []);

  return (
    <div className={`${tw.surfaceSubtle} min-h-screen`}>
      {/* HERO */}
      <div className={`${tw.surface} border-b ${tw.borderSubtle} text-center py-14 px-6`}>
        <h1 className={`text-3xl font-extrabold ${tw.textStrong} tracking-tight mb-2`}>
          Qui sommes-<span className={tw.textPrimary}>nous</span> ?
        </h1>
        <p className={`text-base font-semibold ${tw.textPrimary}`}>TafTech</p>
        <p className={`text-sm ${tw.textMuted700} mt-1`}>
          Plateforme de recrutement algérienne propulsée par l'intelligence artificielle
        </p>
      </div>

      {page && (
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-teal-700"
            dangerouslySetInnerHTML={{ __html: page.contenu_html }}
          />
        </div>
      )}

      {/* CHIFFRES (données réelles en direct) */}
      <div className={tw.bannerGradientPrimary}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <h2 className={`text-xl font-extrabold ${tw.textOnDark} text-center mb-8`}>
            TafTech en chiffres
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: Briefcase, value: fmt(stats?.total_offres), label: "Offres actives" },
              { icon: Building2, value: fmt(stats?.total_entreprises), label: "Entreprises vérifiées" },
              { icon: Users, value: fmt(stats?.total_candidats), label: "Candidats inscrits" },
              { icon: BadgeCheck, value: fmt(stats?.total_recrutements), label: "Recrutements réussis" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label}>
                <Icon size={20} className={`${tw.textPrimaryOnDark} mx-auto mb-2`} />
                <p className={`text-2xl font-extrabold ${tw.textOnDark}`}>{value}</p>
                <p className={`text-xs ${tw.textPrimaryOnDark} mt-1`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-slate-950 text-center py-14 px-6">
        <h2 className="text-xl font-extrabold text-white mb-2">Prêt à nous rejoindre ?</h2>
        <p className="text-sm text-slate-300 mb-6 max-w-md mx-auto">
          Que vous soyez candidat à la recherche d'opportunités ou une entreprise en quête de talents, nous sommes là pour vous accompagner.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/offres" className={`px-6 py-2.5 ${tw.bgPrimarySolidHover} text-white text-sm font-semibold rounded-lg transition-colors`}>
            Voir les offres
          </Link>
          <Link to="/contact" className="px-6 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors">
            Nous contacter
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuiSommesNous;
