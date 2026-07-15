import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig";
import {
  Target, Eye, ShieldCheck, BadgeCheck, Sparkles, Heart,
  Bell, Compass, Users, FileText, Briefcase, Building2,
} from "lucide-react";
import { tw } from "../../theme";

const VALEURS = [
  { icon: Target, title: "Professionnalisme", desc: "Nous maintenons les plus hauts standards de qualité dans notre service de mise en relation." },
  { icon: Eye, title: "Transparence", desc: "Une communication claire et honnête avec les candidats et les entreprises." },
  { icon: ShieldCheck, title: "Conformité", desc: "Respect strict de la loi algérienne n° 18-07 sur la protection des données personnelles." },
  { icon: BadgeCheck, title: "Expertise", desc: "Une connaissance approfondie du marché de l'emploi algérien et de ses spécificités." },
  { icon: Sparkles, title: "Innovation", desc: "Un algorithme de matching intelligent pour rapprocher les bons profils des bonnes offres." },
  { icon: Heart, title: "Engagement", desc: "Un dévouement total à la réussite des candidats et des entreprises qui nous font confiance." },
];

const SERVICES = [
  { icon: Sparkles, title: "Matching par intelligence artificielle", desc: "Score de compatibilité calculé automatiquement entre chaque candidat et chaque offre." },
  { icon: Building2, title: "CVthèque pour recruteurs", desc: "Accès aux profils candidats avec filtres avancés et classement par pertinence (offre Premium)." },
  { icon: Bell, title: "Alertes emploi personnalisées", desc: "Notification par email dès qu'une offre correspond au profil du candidat." },
  { icon: Compass, title: "Suggestions de carrière", desc: "Recommandations d'orientation basées sur le profil et les compétences du candidat." },
  { icon: FileText, title: "Bulletin de candidature PDF", desc: "Génération d'un bulletin récapitulatif pour chaque candidature retenue." },
  { icon: Users, title: "Gestion d'équipe recruteur", desc: "Invitation de collaborateurs avec rôles et permissions au sein d'une même entreprise." },
];

const fmt = (n) => (n === undefined || n === null ? "—" : `${n}+`);

const QuiSommesNous = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("jobs/stats/public/").then((r) => setStats(r.data)).catch(() => {});
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

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">
        {/* MISSION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <h2 className={tw.sectionTitle}>Notre mission</h2>
            <p className={`text-sm ${tw.bodyText} leading-relaxed`}>
              Nous œuvrons à établir un pont solide entre les chercheurs d'emploi et les entreprises algériennes en
              quête de talents. Notre engagement est de fournir un service de recrutement rapide, transparent et
              conforme à la réglementation nationale.
            </p>
            <p className={`text-sm ${tw.bodyText} leading-relaxed`}>
              Nous croyons que chaque candidat mérite l'opportunité de révéler son potentiel, et que chaque
              entreprise mérite de trouver le talent qui la fera progresser.
            </p>
          </div>
          <div className={`${tw.cardColors} rounded-2xl p-6 text-center`}>
            <div className={`w-14 h-14 mx-auto rounded-xl ${tw.bgPrimarySoft} flex items-center justify-center mb-3`}>
              <Target size={24} className={tw.textPrimary} />
            </div>
            <p className={`text-sm font-semibold ${tw.textPrimary}`}>
              Connecter les talents aux opportunités
            </p>
          </div>
        </div>

        {/* VALEURS */}
        <div>
          <h2 className={`${tw.sectionTitle} text-center mb-6`}>Nos valeurs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {VALEURS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`${tw.cardColors} rounded-2xl p-5 text-center`}>
                <div className={`w-11 h-11 mx-auto rounded-xl ${tw.bgPrimarySoft} flex items-center justify-center mb-3`}>
                  <Icon size={20} className={tw.textPrimary} />
                </div>
                <p className={`text-sm font-bold ${tw.textStrong} mb-1.5`}>{title}</p>
                <p className={`text-xs ${tw.textMuted700} leading-relaxed`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* SERVICES */}
        <div>
          <h2 className={`${tw.sectionTitle} text-center mb-6`}>Nos services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`${tw.cardColors} rounded-xl p-5 border-l-2 ${tw.borderPrimary}`}>
                <Icon size={18} className={`${tw.textPrimary} mb-2`} />
                <p className={`text-sm font-bold ${tw.textStrong} mb-1.5`}>{title}</p>
                <p className={`text-xs ${tw.textMuted700} leading-relaxed`}>{desc}</p>
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
