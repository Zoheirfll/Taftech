import React from "react";
import { Link } from "react-router-dom";
import { MapPin, GraduationCap, BookOpen, Briefcase, Wrench, Calculator, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { tw } from "../../theme";

// Page explicative du matching — doit rester alignée sur jobs/matcher.py et
// jobs/matching_params.py (poids par défaut 20/20/25/20/15, formule à poids actifs).
const CRITERES = [
  {
    icon: MapPin, titre: "Localisation & mobilité", poids: 20,
    actif: "Toujours pris en compte.",
    regle: "Oui ou non : le candidat habite la wilaya de l'offre, OU sa mobilité le permet (mobilité nationale, ou mobilité régionale vers une wilaya de la même région).",
    note: "Pas de score intermédiaire : une wilaya voisine sans mobilité déclarée compte 0. Le détail (commune, région) reste visible dans l'explication.",
  },
  {
    icon: GraduationCap, titre: "Diplôme", poids: 20,
    actif: "Seulement si vous avez choisi des « Diplômes acceptés » sur l'offre.",
    regle: "Le candidat a obtenu l'un des diplômes acceptés : 100 %. Sinon 0 %.",
    note: "Pas d'équivalence automatique entre diplômes (un BTS n'est jamais converti en DEUA, un Master en Magister). Une formation « en cours » ou « interrompue » ne compte pas comme obtenue. Si le candidat n'a pas détaillé ses formations, son niveau de diplôme déclaré sert de repli (signalé comme estimation).",
  },
  {
    icon: BookOpen, titre: "Spécialité de formation", poids: 25,
    actif: "Seulement si vous avez choisi des « Spécialités acceptées » sur l'offre.",
    regle: "Même spécialité : 100 %. Spécialités reconnues comme similaires par TafTech : 70 %. Intitulés très proches : score partiel. Sinon 0 %.",
    note: "Diplôme et spécialité sont toujours lus sur la même formation du candidat : un Master en finance + une Licence en informatique ne donnent jamais un « Master informatique ».",
  },
  {
    icon: Briefcase, titre: "Expérience", poids: 20,
    actif: "Seulement si l'expérience requise n'est pas « Débutant / Stagiaire ».",
    regle: "Années d'expérience PERTINENTES ÷ années demandées (plafonné à 100 %). Ex : 2 ans pertinents pour 4 demandés = 50 %.",
    note: "Une expérience est pertinente si son métier est le même, du même domaine, lié par TafTech ou du même grand secteur que celui de l'offre (ou si l'intitulé de poste est très proche). Les périodes qui se chevauchent ne sont comptées qu'une fois.",
  },
  {
    icon: Wrench, titre: "Compétences", poids: 15,
    actif: "Seulement si vous avez ajouté des compétences structurées (Obligatoire / Souhaitée) sur l'offre.",
    regle: "Une compétence Obligatoire pèse deux fois plus qu'une Souhaitée. Niveau atteint : crédit plein ; niveau insuffisant : 60 % ; compétence citée sans niveau vérifiable : 80 %.",
    note: "Le texte libre « Compétences » de l'annonce n'entre pas dans le score : seules les étiquettes structurées comptent.",
  },
];

const METIER_NIVEAUX = [
  ["Métier identique", "100 %"],
  ["Même domaine", "85 %"],
  ["Métiers liés manuellement par TafTech", "70 %"],
  ["Intitulés très proches", "partiel"],
  ["Même grand secteur, domaine différent", "45 %"],
  ["Aucun lien", "0 %"],
];

const CommentFonctionneMatching = () => (
  <div className="space-y-6 max-w-4xl">
    <div>
      <h1 className={tw.pageTitleGrand}>Comment fonctionne le matching ?</h1>
      <p className={`mt-2 text-base ${tw.textMuted700}`}>
        Le score de compatibilité (0 à 100 %) est calculé automatiquement par un algorithme fixe et reproductible,
        pas par une IA générative : deux calculs sur les mêmes données donnent toujours le même résultat.
        Il est figé au moment où le candidat postule.
      </p>
    </div>

    <section className={`${tw.card} p-6`}>
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Calculator size={18} className={tw.textTeal} /> Le principe : seuls vos critères comptent</h2>
      <p className={`mt-2 text-sm ${tw.textMuted700}`}>
        Chaque critère a un poids. Un critère que vous n'avez <strong>pas demandé</strong> sur l'offre est retiré du calcul,
        et le score est recalculé sur les critères restants. Un candidat n'est donc jamais pénalisé sur un point que vous n'exigez pas.
      </p>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
        <p className="font-semibold">Exemple</p>
        <p className="mt-1">
          Offre sans diplôme ni spécialité demandés → seuls Localisation (20), Expérience (20) et Compétences (15) comptent, soit 55 points.
          Un candidat bien situé (20/20), avec la moitié de l'expérience demandée (10/20) et toutes les compétences (15/15) obtient
          45 / 55 = <strong>82 %</strong>.
        </p>
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">Les 5 critères</h2>
      {CRITERES.map(({ icon: Icon, titre, poids, actif, regle, note }) => (
        <div key={titre} className={`${tw.card} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Icon size={16} className={tw.textTeal} /> {titre}</h3>
            <span className="text-xs font-bold px-2 py-1 rounded-md bg-teal-50 text-teal-700 shrink-0">poids {poids}</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-600">{actif}</p>
          <p className="mt-2 text-sm text-slate-800">{regle}</p>
          <p className={`mt-1 text-sm ${tw.textMuted700}`}>{note}</p>
        </div>
      ))}
    </section>

    <section className={`${tw.card} p-6`}>
      <h2 className="text-lg font-bold text-slate-900">Comment deux métiers sont jugés proches</h2>
      <p className={`mt-2 text-sm ${tw.textMuted700}`}>Utilisé pour juger si une expérience du candidat est pertinente pour votre offre :</p>
      <table className="mt-3 w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {METIER_NIVEAUX.map(([cas, val]) => (
            <tr key={cas}><td className="py-2 text-slate-700">{cas}</td><td className="py-2 text-right font-semibold text-slate-900">{val}</td></tr>
          ))}
        </tbody>
      </table>
    </section>

    <section className={`${tw.card} p-6 space-y-3`}>
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><HelpCircle size={18} className={tw.textTeal} /> Donnée manquante ≠ incompatible</h2>
      <p className={`text-sm ${tw.textMuted700}`}>
        Si le candidat n'a pas renseigné une information (pas de wilaya, pas de formation détaillée, aucune compétence), le critère vaut 0
        mais il est signalé comme <strong>non renseigné</strong>. Le détail de la candidature indique alors « Score calculé sur des
        informations incomplètes » : ce candidat mérite peut-être un regard humain plutôt qu'un rejet.
      </p>
    </section>

    <section className={`${tw.card} p-6 space-y-2`}>
      <h2 className="text-lg font-bold text-slate-900">Lire le score</h2>
      <p className="text-sm text-slate-700 flex gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> 80 % et plus : candidat recommandé (page « Candidats recommandés », notification).</p>
      <p className="text-sm text-slate-700 flex gap-2"><AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" /> Le score n'écarte jamais automatiquement un candidat : c'est une aide au tri, la décision vous appartient.</p>
      <p className="text-sm text-slate-700 flex gap-2"><AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" /> Les exigences impératives (permis, certification…) ne sont jamais notées dans le score : elles sont vérifiées à part.</p>
      <p className={`text-sm ${tw.textMuted700} pt-2`}>
        Le détail critère par critère de chaque candidat est visible dans l'onglet « Analyse IA » d'une candidature, rubrique « Pourquoi ce score ? ».
        Pour des résultats plus précis, renseignez un métier, des diplômes/spécialités acceptés et des compétences structurées en <Link to="/creer-offre" className="text-teal-700 font-semibold underline">publiant votre offre</Link>.
      </p>
    </section>
  </div>
);

export default CommentFonctionneMatching;
