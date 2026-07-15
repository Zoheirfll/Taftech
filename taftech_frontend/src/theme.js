/**
 * TAFTECH Design System
 * Identité visuelle centralisée — couleurs exactes échantillonnées sur le logo officiel.
 *
 * Couleur principale : Bleu logo #204883 (classe Tailwind `indigo`, candidat/public)
 * Couleur portail recruteur : Vert logo #67af57 (classe Tailwind `teal`)
 * Style : Minimaliste tech, inspiré de Linear/Vercel
 * Note : `indigo-*` et `teal-*` sont réassignés dans tailwind.config.js
 * (chargé via `@config` dans index.css — requis par Tailwind v4).
 */

export const colors = {
  // === COULEUR PRINCIPALE (BLEU LOGO) ===
  primary: {
    50: "#eef2f9",
    100: "#dbe4f2",
    200: "#b3c6e3",
    300: "#82a1d0",
    400: "#4f76b2",
    500: "#2f5798",
    600: "#204883", // Couleur principale TAFTECH — exacte logo
    700: "#1a3a6a",
    800: "#152e54",
    900: "#102240",
  },

  // === COULEUR ACCENT (AMBRE) ===
  // Utilisée pour : badges IA, scores élevés, éléments premium
  accent: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    400: "#fbbf24",
    500: "#f59e0b", // Accent principal
    600: "#d97706",
    700: "#b45309",
  },

  // === NEUTRES (SLATE - plus pro que gray) ===
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },

  // === SÉMANTIQUES ===
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};

// === CLASSES TAILWIND PRÊTES À L'EMPLOI ===
// On les utilise dans le code pour éviter de retaper les couleurs partout
export const tw = {
  // BOUTONS
  buttonPrimary:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  buttonSecondary:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50",
  buttonGhost:
    "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors",
  buttonAccent:
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors",

  // CARTES
  card: "bg-white border border-slate-200 rounded-xl",
  cardHover:
    "bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all",
  cardSelected:
    "bg-white border-2 border-indigo-500 ring-4 ring-indigo-50 rounded-xl",

  // INPUTS
  input:
    "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors",
  inputSearch:
    "w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",

  // BADGES
  badgePrimary:
    "inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full",
  badgeAccent:
    "inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full",
  badgeSuccess:
    "inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full",
  badgeNeutral:
    "inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full",
  badgeError:
    "inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full",

  // TYPO
  pageTitle: "text-2xl font-bold text-slate-900 tracking-tight",
  pageSubtitle: "text-sm text-slate-700 mt-1",
  sectionTitle: "text-base font-semibold text-slate-900",
  sectionLabel: "text-xs font-semibold text-slate-700 uppercase tracking-wider",
  bodyText: "text-sm text-slate-700",
  mutedText: "text-sm text-slate-700",
  metricNumber: "text-2xl font-bold text-slate-900 font-mono tabular-nums",

  // LAYOUT
  pageContainer: "max-w-7xl mx-auto px-6 py-8",
  pageBackground: "min-h-screen bg-slate-50",

  // === TEXTE / NEUTRES ===
  textMuted: "text-slate-600",
  textMuted700: "text-slate-900",
  textStrong: "text-slate-900",
  textSubtle: "text-slate-300",
  textLight: "text-slate-400",
  textOnDark: "text-white",
  iconMuted: "text-slate-600",
  iconStrong: "text-slate-900",

  // === SURFACES / BORDURES NEUTRES ===
  surface: "bg-white",
  surfaceMuted: "bg-slate-50",
  surfaceSubtle: "bg-slate-100",
  surfaceDark: "bg-slate-900",
  borderBase: "border-slate-200",
  borderSubtle: "border-slate-100",
  borderStrong: "border-slate-300",
  divideBase: "divide-slate-100",

  // === PRIMAIRE (INDIGO) ===
  textPrimary: "text-indigo-600",
  textPrimaryStrong: "text-indigo-700",
  linkPrimary: "text-indigo-600 hover:text-indigo-700",
  bgPrimary: "bg-indigo-600",
  bgPrimarySolid: "bg-indigo-600 hover:bg-indigo-700 text-white",
  bgPrimarySolidHover: "bg-indigo-600 hover:bg-indigo-700",
  bgPrimarySoft: "bg-indigo-50",
  bgPrimaryHover: "hover:bg-indigo-50",
  borderPrimary: "border-indigo-500",
  ringPrimary: "ring-indigo-100",

  // === ACCENT TEAL (portail recruteur) ===
  textTeal: "text-teal-700",
  linkTeal: "text-teal-700 hover:text-teal-800",
  bgTeal: "bg-teal-700",
  bgTealSoft: "bg-teal-50",
  bgTealHover: "hover:bg-teal-50",
  borderTeal: "border-teal-500",
  ringTeal: "ring-teal-100",

  // === SÉMANTIQUES (succès / erreur / warning) ===
  textSuccess: "text-emerald-700",
  bgSuccessSoft: "bg-emerald-50",
  borderSuccess: "border-emerald-200",
  textError: "text-red-600",
  textErrorMuted: "text-red-500",
  bgErrorSoft: "bg-red-50",
  borderError: "border-red-200",
  inputErrorRing: "border-red-400 ring-2 ring-red-100 bg-red-50",
  textWarning: "text-amber-700",
  bgWarningSoft: "bg-amber-50",
  borderWarning: "border-amber-200",

  // === NAVIGATION ===
  navLink:
    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-900 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all duration-150",
  navLinkActive:
    "hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-900 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-150",
  navLinkTeal:
    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-900 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all duration-150",
  navLinkTealActive:
    "hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all duration-150",
  navLinkIndigoActive:
    "hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-150",
  dropdownItem:
    "flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors",
  dropdownItemTeal:
    "flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors",
  dropdownItemDanger:
    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors",
  dropdownPanel:
    "absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50",
  iconButton:
    "relative p-2 text-slate-700 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-50",
  navbarShell: "bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm",

  // === MODALES ===
  modalOverlay:
    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center",
  modalPanel: "bg-white rounded-xl border border-slate-200 shadow-xl",

  // === TYPO complémentaire ===
  sectionHeading: "text-sm font-semibold text-slate-900",
  cardBase: "bg-white border border-slate-200 rounded-xl",
  footerLink: "text-slate-600 hover:text-slate-900 transition-colors",

  // === DENSITÉ "GRAND" (pages publiques / profil) ===
  pageTitleGrand: "text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight",
  bodyTextGrand: "text-base text-slate-700",

  // === DENSITÉ "PETIT" (auth / outils denses) ===
  pageTitlePetit: "text-xl md:text-2xl font-bold text-slate-900 tracking-tight",
  bodyTextPetit: "text-sm text-slate-700",

  // === NAVBAR — liens actifs/inactifs (desktop + mobile) ===
  navLinkDesktopActive: "text-indigo-600 bg-indigo-50 font-semibold",
  navLinkDesktopInactive: "text-slate-900 hover:text-indigo-600 hover:bg-indigo-50",
  navLinkDesktopActiveTeal: "text-teal-700 bg-teal-50 font-semibold",
  navLinkDesktopInactiveTeal: "text-slate-900 hover:text-teal-700 hover:bg-teal-50",
  navLinkMobileActive: "text-indigo-600 bg-indigo-50 font-semibold",
  navLinkMobileInactive: "text-slate-700 hover:bg-slate-50 hover:text-indigo-600",
  navLinkMobileActiveTeal: "text-teal-700 bg-teal-50 font-semibold",
  navLinkMobileInactiveTeal: "text-slate-600 hover:text-slate-900 hover:bg-slate-50",

  // === FOOTER (candidat — fond indigo-950) ===
  footerShell: "bg-slate-950 border-t border-slate-800",
  footerBrandText: "text-indigo-300 text-sm leading-relaxed",
  footerLinkAmber: "text-indigo-300 hover:text-white text-sm font-medium transition-colors",
  footerLinkAmberBlock: "hover:text-white transition-colors block",
  footerHeading: "text-white font-semibold text-xs uppercase tracking-wider mb-2.5 border-l-2 border-indigo-400 pl-3",
  footerCopyright: "text-xs text-indigo-400",
  footerCopyrightLink: "text-xs text-indigo-400 hover:text-white transition-colors",

  // === FOOTER RECRUTEUR (fond slate-900 / accent teal) ===
  footerShellTeal: "bg-slate-950 border-t border-slate-800",
  footerBrandTextTeal: "text-slate-300 text-sm leading-relaxed",
  footerLinkTeal: "text-slate-300 hover:text-teal-400 text-sm font-medium transition-colors",
  footerLinkTealBlock: "hover:text-teal-400 transition-colors block",
  footerHeadingTeal: "text-white font-semibold text-xs uppercase tracking-wider mb-2.5 border-l-2 border-teal-500 pl-3",
  footerCopyrightTeal: "text-xs text-slate-400",
  footerCopyrightLinkTeal: "text-xs text-slate-400 hover:text-teal-400 transition-colors",

  // === JOBCARD ===
  jobCardShell: "bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all",
  jobCardBadgeNeutral: "flex-shrink-0 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full",
  jobCardTagNeutral: "inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 text-xs rounded-md",
  jobCardTagSuccess: "inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-md",
  jobCardStatusOk: "flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium bg-emerald-50 text-emerald-700",
  jobCardStatusError: "flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium bg-red-50 text-red-600",
  jobCardApplyButton: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors",
  jobCardGhostButton: "px-3 py-1.5 border border-slate-200 text-slate-700 text-xs rounded-lg hover:bg-slate-50 transition-colors",

  // === BANNIÈRES / TOOLTIPS (variantes couleur) ===
  bannerColors: {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900 [&_svg]:text-indigo-500",
    teal: "bg-teal-50 border-teal-200 text-teal-900 [&_svg]:text-teal-500",
    amber: "bg-amber-50 border-amber-200 text-amber-900 [&_svg]:text-amber-500",
    slate: "bg-slate-50 border-slate-200 text-slate-800 [&_svg]:text-slate-600",
  },
  tooltipPanel: "z-50 w-56 text-xs bg-slate-800 text-white rounded-lg px-3 py-2 shadow-xl pointer-events-none",
  tooltipArrow: {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800",
  },
  tooltipIconTrigger: "text-slate-600 hover:text-slate-600 cursor-help ml-1 shrink-0",

  // === ADMIN — SÉMANTIQUES COMPLÉMENTAIRES (statuts multi-couleurs) ===
  textBlue: "text-blue-700",
  textBlue600: "text-blue-600",
  bgBlueSoft: "bg-blue-50",
  borderBlue: "border-blue-200",
  textOrange: "text-orange-700",
  textOrangeStrong: "text-orange-600",
  bgOrangeSoft: "bg-orange-50",
  borderOrange: "border-orange-200",
  textViolet: "text-violet-700",
  textVioletStrong: "text-violet-600",
  bgVioletSoft: "bg-violet-50",
  borderViolet: "border-violet-200",
  textPurple: "text-purple-700",
  bgPurpleSoft: "bg-purple-50",
  borderPurple: "border-purple-200",
  bgSlate800: "bg-slate-800",
  bgSlate200: "bg-slate-200",

  // Badges de journal d'audit (couleurs distinctes des badges standards)
  auditActionSuccess: "bg-green-100 text-green-700",
  auditActionDanger: "bg-red-100 text-red-700",
  auditActionWarning: "bg-orange-100 text-orange-700",
  auditActionNeutral: "bg-slate-100 text-slate-600",

  // Badges score/statut à 3 niveaux (score matching, salaire...)
  scoreHigh: "bg-emerald-50 text-emerald-700 border-emerald-200",
  scoreMid: "bg-amber-50 text-amber-700 border-amber-200",
  scoreLow: "bg-red-50 text-red-700 border-red-200",
  statusBlueSoft: "bg-blue-50 text-blue-700 border-blue-200",
  statusOrangeSoft: "bg-orange-50 text-orange-700 border-orange-200",
  statusNeutralSoft: "bg-slate-100 text-slate-700",

  // Badges de score solides (fond plein + texte blanc)
  scoreBadgeHigh: "bg-emerald-500 text-white",
  scoreBadgeMid: "bg-amber-500 text-white",
  scoreBadgeLow: "bg-red-500 text-white",

  // Analyse IA — cartes radar/barres (MesCandidatures)
  analyseBarHigh: "bg-emerald-500",
  analyseBarMid: "bg-amber-500",
  analyseBarLow: "bg-red-400",
  analyseCardSuccess: "bg-emerald-50 border border-emerald-100",
  analyseCardWarning: "bg-amber-50 border border-amber-100",
  analyseTextSuccessStrong: "text-emerald-700",
  analyseTextSuccessBody: "text-emerald-800",
  analyseIconSuccess: "text-emerald-500",
  analyseTextWarningStrong: "text-amber-700",
  analyseTextWarningBody: "text-amber-800",
  analyseIconWarning: "text-amber-500",

  // Entretien programmé (MesCandidatures)
  interviewCard: "bg-orange-50 border border-orange-200",
  interviewHeading: "text-orange-900",
  interviewDate: "text-orange-800",
  interviewNote: "bg-white/80 border border-orange-100 text-slate-700",
  interviewFootnote: "text-orange-700",

  // Bandeau statut clôturé (badge sombre sur job card)
  badgeClosedSolid: "bg-slate-800 text-white",
  toggleAnalyseButton: "bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-700",
  pillLinkPrimarySoft: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",

  // Bouton sombre (broadcast, téléchargement CV)
  buttonDark:
    "bg-slate-900 text-white hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed",

  // Ligne de tableau bloquée/désactivée
  rowBlocked: "bg-red-50/30",
  // Ligne de tableau — hover neutre standard (tables Admin)
  rowHover: "hover:bg-slate-50 transition-colors",
  // Bouton/lien texte muted avec hover indigo (actualiser, actions secondaires)
  textMutedHoverPrimary: "text-slate-700 hover:text-indigo-600",
  // Bouton icône neutre avec hover indigo (Admin — modifier/action sur ligne)
  iconButtonHoverPrimary: "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50",
  // Bordure neutre avec hover indigo léger (cartes sélectionnables non actives)
  borderBaseHoverPrimary: "border-slate-200 hover:border-indigo-200",
  // Accent natif des inputs radio/checkbox
  accentPrimary: "accent-indigo-600",
  // Spinner blanc plein (boutons sombres/colorés)
  spinnerWhiteSolid: "border-2 border-white border-t-transparent rounded-full animate-spin",

  // Variante primaire plus douce (labels sur fond clair indigo, panneaux imbriqués)
  textPrimaryLight: "text-indigo-400",
  iconPrimary500: "text-indigo-500",
  bgPrimarySoftLight: "bg-indigo-50/50",
  borderPrimarySoft: "border-indigo-100",

  // Barres de progression
  progressTrack: "bg-slate-100 rounded-full h-1.5",
  progressBarPrimary: "bg-indigo-500 h-1.5 rounded-full transition-all",
  progressBarSuccess: "bg-emerald-500 h-1.5 rounded-full transition-all",

  // Bandeau dégradé (modale détail offre)
  bannerGradientPrimary: "bg-linear-to-br from-indigo-700 to-indigo-500",
  textPrimaryOnDark: "text-indigo-200",
  badgeOnGradient: "bg-white/20 text-white",
  closeButtonOnDark: "text-white/70 hover:text-white hover:bg-white/20",
  borderOnDark20: "border-white/20",
  textAmberOnDark: "text-amber-300",

  // Admin sidebar (fond slate-900, liens actifs/inactifs)
  adminNavLinkActive: "bg-indigo-600 text-white",
  adminNavLinkInactive: "text-slate-600 hover:bg-slate-800 hover:text-white",

  // === CERCLES D'ICÔNES SÉMANTIQUES (états succès/erreur/info) ===
  iconCircleError: "bg-red-100 border border-red-200",
  iconCircleSuccess: "bg-emerald-100 border border-emerald-200",
  iconCirclePrimary: "bg-indigo-50 border-2 border-indigo-200",

  // === TEAL ÉTENDU (portail recruteur — nuances complémentaires) ===
  textTeal600: "text-teal-600",
  textTeal800: "text-teal-800",
  textTeal900: "text-teal-900",
  textTeal200: "text-teal-200",
  bgTeal50: "bg-teal-50",
  bgTealSolid: "bg-teal-700 text-white hover:bg-teal-800",
  bgTealSolidOutline: "bg-teal-700 text-white border border-teal-700",
  borderTeal200: "border-teal-200",
  borderTeal100: "border-teal-100",
  badgeTealSoft: "bg-teal-50 text-teal-800",
  barTeal500: "bg-teal-500",
  dotTeal600: "bg-teal-600",
  iconButtonHoverDanger: "text-slate-600 hover:text-red-500 hover:bg-red-50",
  buttonNeutralSoft: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  buttonDangerSolid: "bg-red-600 text-white hover:bg-red-700",
  chipTealActive: "bg-teal-700 text-white border-teal-700",
  chipTealInactive: "bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:text-teal-700",
  spinnerTeal: "border-teal-600 border-t-transparent",
  checkboxTeal: "text-teal-700 border-slate-300",
  bannerGradientTeal: "bg-linear-to-br from-teal-700 to-teal-900",
  linkOnTealGradient: "bg-white text-teal-700 hover:bg-teal-50",
  segmentTabActiveTeal: "border-teal-700 text-teal-700",
  segmentTabInactive: "border-transparent text-slate-700 hover:text-slate-900",

  // === AUTH (Login / Register / ForgotPassword / ResetPassword) ===
  linkMutedHover: "text-slate-700 hover:text-slate-900 transition-colors",
  textEmphasis800: "text-slate-800",
  inputColorsTeal:
    "bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
  authPageBg: "bg-slate-100",
  authCardShell: "bg-white rounded-2xl shadow-sm border border-slate-200",
  authInput:
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors",
  authInputTeal:
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors",
  authLabel: "text-sm font-semibold text-slate-600 block",
  authEyeToggle: "text-slate-600 hover:text-slate-700 transition-colors",
  spinnerOnDark: "border-2 border-white/30 border-t-white rounded-full animate-spin",
  otpBoxInput:
    "text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all",
  heroPanelDark: "bg-slate-900 text-white",
  heroTextMuted: "text-indigo-100",
  heroTextFaint: "text-indigo-300",
  heroBorderDivider: "border-indigo-500/50",
  heroIconBoxIndigo: "bg-indigo-500/50 border border-indigo-400/30",
  progressBadgeDone: "bg-emerald-500 text-white",
  progressConnectorDone: "bg-emerald-400",
  textTealLight: "text-teal-400",
  borderNeutral800: "border-slate-800",
  textSuccessIcon: "text-emerald-600",
  modalOverlayStrong:
    "fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center",
  tooltipPanelDark900: "bg-slate-900 text-white",

  // === OVERLAYS TRANSLUCIDES (stats hero) ===
  bgPrimaryOverlay: "bg-indigo-500/50",

  // === AMBRE — accents ponctuels (icônes, points, fill) ===
  textAmber500: "text-amber-500",
  textAmber400: "text-amber-400",
  bgAmber400: "bg-amber-400",
  fillAmber500: "fill-amber-500",

  // === BOOKMARK / FAVORI (toggle sauvegarde offre) ===
  bookmarkActive: "bg-amber-50 border-amber-200 text-amber-500",

  // === LANDING RECRUTEUR ===
  landingHeroBorder: "bg-white border-b border-slate-100",
  buttonTealSolidLg:
    "bg-teal-700 text-white font-bold rounded-xl hover:bg-teal-800 transition-colors shadow-md",
  buttonSlateSoftLg:
    "bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors",
  landingStatsPanelDark: "bg-slate-900 rounded-3xl p-8 text-white",
  landingStatsRow: "flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3",
  landingStatsLabel: "text-sm text-slate-300",
  landingStatsDotTeal: "bg-teal-500",
  landingStatsDotIndigo: "bg-indigo-500",
  landingStatsDotEmerald: "bg-emerald-500",
  landingStatsBandTeal: "bg-teal-700 py-12",
  landingStatsIconBox: "w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center mb-1",
  landingStatsIconColor: "text-teal-100",
  landingStatsCaption: "text-sm text-teal-200",
  landingFeatureCard:
    "bg-white border border-slate-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-md transition-all group",
  landingFeatureIconBox:
    "w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors",
  landingFeatureIconColor: "text-teal-700",
  landingStepConnector: "hidden lg:block absolute top-7 left-14 -right-4 h-px bg-slate-200 z-0",
  landingStepBadge:
    "relative z-10 w-14 h-14 bg-teal-700 text-white text-xl font-extrabold rounded-2xl flex items-center justify-center mb-4 shadow-md",
  landingAdvantageRow:
    "flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3",
  landingCtaPanelTeal: "bg-teal-700 rounded-3xl p-10 text-white text-center",
  landingCtaCaption: "text-xs font-semibold uppercase tracking-widest text-teal-300 mb-4",
  landingCtaBodyTeal: "text-teal-200 text-sm leading-relaxed mb-8",
  landingCtaButtonWhite:
    "bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors shadow-md",
  landingCtaButtonTealOutline:
    "bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-500 transition-colors border border-teal-500",
  landingFaqItem: "border border-slate-200 rounded-2xl overflow-hidden",
  landingFaqQuestion: "text-sm font-semibold text-slate-800 pr-4",
  landingFaqChevronOpen: "text-teal-600 shrink-0",
  landingFaqChevronClosed: "text-slate-600 shrink-0",
  landingFaqAnswer: "text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-4",
  bookmarkInactive: "bg-white border-slate-200 text-slate-600 hover:border-slate-300",

  // === INPUTS — variantes couleur seule (layout géré au call-site) ===
  inputColorsMuted:
    "bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
  inputColorsWhite:
    "bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
  inputColorsMutedTeal:
    "bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100",

  // === CreateJob (recruteur — outil dense) ===
  textMutedHoverTeal: "text-slate-600 hover:text-teal-700",
  textMutedHoverDanger: "text-slate-600 hover:text-red-500",
  textWarning800: "text-amber-800",
  textWarning900: "text-amber-900",
  amberReadyBanner: "bg-amber-50 border-amber-300",
  badgeSuccessSolid100: "bg-emerald-100 text-emerald-700",
  bgAmberSolidHover: "bg-amber-500 hover:bg-amber-600",
  bgSlate300: "bg-slate-300",
  badgeAmberSolid100: "text-amber-600 bg-amber-100",

  // === TAG SOLIDE (fond slate-100, texte 700 — JobsList/Home tags) ===
  tagNeutralSolid: "bg-slate-100 text-slate-700",

  // === TOGGLE SWITCH (alertes, notifications on/off) ===
  toggleTrackOn: "bg-indigo-600",
  toggleTrackOff: "bg-slate-200",
  toggleThumb: "bg-white shadow",

  // === BOUTONS SECONDAIRES / ICÔNES (pages candidat denses) ===
  buttonCancelSoft: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  modalCloseButton: "text-slate-600 hover:text-slate-700 hover:bg-slate-100",
  deleteIconButton: "text-slate-600 hover:text-red-500 hover:bg-red-50",
  emptyStateIconCircle: "bg-indigo-50 text-indigo-400",
  badgeDangerSolid: "bg-red-500 text-white",
  hoverSurfaceMuted: "hover:bg-slate-50",
  hoverTextPrimary: "hover:text-indigo-600",
  dangerCardBorder: "border-red-100",
  textSlate800: "text-slate-800",

  // === PROFIL CANDIDAT (jauge de complétion + sections) ===
  profileGaugeCard: "bg-indigo-600 text-white",
  profileGaugeTrack: "bg-white/20",
  profileGaugeBar: "bg-white",
  profileGaugeBadge: "bg-white/20",
  profileGaugeFootnote: "text-indigo-200",
  editButtonOutline: "border border-slate-200 text-slate-600 hover:bg-slate-50",
  addButtonSoft: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  linkPrimaryUnderline: "text-indigo-600 hover:underline",
  photoPlaceholder: "bg-slate-100 border border-slate-200 text-slate-600",
  photoUploadButton: "bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-white",
  bioQuoteBox: "text-slate-600 bg-slate-50",
  linkedinPill: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  githubPill: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  toggleChipActive: "bg-emerald-50 text-emerald-700",
  toggleChipInactive: "bg-slate-100 text-slate-700",
  prefCardSoft: "bg-slate-50 border border-slate-100",
  timelineBorderPrimary: "border-indigo-100",
  timelineDotPrimary: "bg-white border-2 border-indigo-500",
  timelineBorderNeutral: "border-slate-200",
  timelineDotNeutral: "bg-white border-2 border-slate-400",
  hoverIconActionPrimary: "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50",
  skillTag: "bg-white border border-slate-200 text-slate-700 shadow-sm",
  skillTagRemove: "text-slate-300 hover:text-red-400",
  langueChip: "bg-indigo-50 border border-indigo-100",
  langueChipName: "text-indigo-900",
  langueChipLevel: "bg-white text-indigo-600 border border-indigo-100",
  langueChipRemove: "text-indigo-300 hover:text-red-400",

  // === FORMULAIRES MODALES (ProfilCandidat) ===
  formLabel: "text-xs font-medium text-slate-600 mb-1.5 block",
  modalHeading: "text-lg font-bold text-slate-900 mb-6",
  ninDisplayBox: "bg-slate-100 border border-slate-200 text-slate-700",
  autocompleteDropdown: "bg-white border border-slate-200",
  autocompleteItem: "hover:bg-indigo-50 border-b border-slate-100 last:border-0",
  autocompleteItemTitle: "text-slate-900",
  autocompleteItemSubtitle: "text-slate-600",
  dropzoneNeutral: "border-2 border-dashed border-slate-200 hover:border-indigo-400",
  dropzoneNeutralText: "text-slate-600 group-hover:text-indigo-600",
  dropzonePrimary: "border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/50",
  parserInfoBox: "bg-indigo-50 border border-indigo-100 text-indigo-800",
  parserSuccessBox: "bg-emerald-50 border border-emerald-100",
  parserSuccessText: "text-emerald-800",
  badgeAiCloud: "bg-indigo-100 text-indigo-700",
  badgeRegex: "bg-slate-100 text-slate-600",
  photoDetectedBox: "bg-pink-50 border border-pink-100",
  photoDetectedTitle: "text-pink-900",
  photoDetectedSubtitle: "text-pink-700",
  parserSectionBox: "bg-slate-50 border border-slate-200",
  parserSectionLabel: "text-slate-600",
  parserBioText: "text-slate-700",
  detectedLinkedin: "text-indigo-600",
  detectedGithub: "text-slate-700",
  detectedFieldValue: "text-slate-800",
  detectedFieldEmpty: "text-slate-300",
  chipActiveGreen: "bg-emerald-50 text-emerald-700",
  chipInactiveSlate: "bg-slate-100 text-slate-600",
  parserExpBox: "bg-indigo-50 border border-indigo-100",
  parserExpTitle: "text-indigo-900",
  parserExpItem: "bg-white border border-indigo-100",
  parserFormBox: "bg-slate-50 border border-slate-200",
  parserFormTitle: "text-slate-700",
  parserFormItem: "bg-white border border-slate-200",
  parserCompChip: "bg-white border border-indigo-200 text-indigo-800",
  parserLangueBox: "bg-pink-50 border border-pink-100",
  parserLangueTitle: "text-pink-900",
  parserModeBox: "bg-amber-50 border border-amber-200",
  parserModeText: "text-amber-900",
  modalOverlayLight: "bg-slate-900/50 backdrop-blur-sm",

  // === SIDEBAR CANDIDAT (CandidatLayout) ===
  sidebarShell: "bg-white border border-slate-200",
  sidebarLinkActive: "bg-indigo-600 text-white",
  sidebarLinkInactive: "text-slate-600 hover:bg-slate-50 hover:text-indigo-600",
  sidebarLinkIconActive: "text-white",
  sidebarLinkIconInactive: "text-slate-600",
  sidebarBadgeActive: "bg-white text-indigo-600",
  sidebarBadgeInactive: "bg-red-500 text-white",
  sidebarDivider: "border-t border-slate-100",
  sidebarLogoutButton: "text-red-500 hover:bg-red-50",

  // === ATOMES COMPLÉMENTAIRES (Pages Public — Entreprises/Home/JobsList/JobDetail/Régions/Secteurs) ===
  borderHoverSlate300: "hover:border-slate-300",
  groupHoverTextPrimaryStrong: "group-hover:text-indigo-700",
  placeholderMuted: "placeholder-slate-400",
  borderPrimary200: "border-indigo-200",
  bgPrimaryLightSolid: "bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400",
  ctaGhostHoverPrimary: "hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
  toggleFilterActive: "bg-indigo-600 border-indigo-600 text-white",
  toggleFilterInactive: "bg-white border-slate-200 text-slate-700",
  paginationActive: "bg-indigo-600 text-white",
  paginationInactive: "text-slate-700 hover:bg-slate-100",
  hoverTextPrimary900: "hover:text-indigo-900",
  jobCardBorderHover: "border-slate-200 hover:border-indigo-400",
  groupHoverTextPrimary500: "group-hover:text-indigo-500",
  groupHoverBgPrimary100: "group-hover:bg-indigo-100",
  regionLinkHover: "hover:bg-indigo-50 text-slate-700",
  groupHoverBgPrimarySoft: "group-hover:bg-indigo-50",
  groupHoverTextPrimary: "group-hover:text-indigo-600",
  textEmerald500: "text-emerald-500",
  textAmber900: "text-amber-900",
  textAmber700: "text-amber-700",
  bulletPrimary400: "bg-indigo-400",
  hoverTextStrong900: "hover:text-slate-900",
  borderHoverPrimary400: "hover:border-indigo-400",
  bgIndigoHover100: "hover:bg-indigo-100",
  borderPrimaryHover: "hover:border-indigo-300",
  cardColors: "bg-white border border-slate-200",
  surfaceWhiteSubtleBorder: "bg-white border border-slate-100",

  // === CANDIDATURE — statuts (GestionOffre/DetailCandidature) ===
  candidatureStatutStyles: {
    RECUE: "bg-amber-50 text-amber-700 border-amber-200",
    EN_COURS: "bg-blue-50 text-blue-700 border-blue-200",
    ENTRETIEN: "bg-orange-50 text-orange-700 border-orange-200",
    RETENU: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REFUSE: "bg-red-50 text-red-700 border-red-200",
  },
  tagSlateSoft: "bg-slate-100 text-slate-600",
  tagSlateSoft700: "bg-slate-100 text-slate-700",
  pillTeal: "bg-teal-50 text-teal-800 hover:bg-teal-100",
  pillSlate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  pillAmberSoft: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  dangerPillSoft: "bg-red-50 text-red-600 hover:bg-red-100",
  iconButtonHoverTeal: "text-slate-600 hover:text-teal-700 hover:bg-teal-50",
  iconButtonHoverSlate: "text-slate-600 hover:text-slate-700 hover:bg-slate-100",
  clearLinkTeal: "text-teal-400 hover:underline",
  quoteBoxMuted: "text-slate-600 bg-slate-50",
  chipTealSoft: "bg-teal-50 text-teal-800",
  emptyStateAmberBox: "bg-amber-50 border-amber-100",
  progressBarWarning: "bg-amber-400 h-1.5 rounded-full transition-all",
  progressBarDanger: "bg-red-400 h-1.5 rounded-full transition-all",
  textSuccessStrong: "text-emerald-800",
  borderOrange100: "border-orange-100",
  buttonSuccessSolid: "bg-emerald-600 text-white hover:bg-emerald-700",
  badgeErrorLight: "bg-red-50 text-red-600",
  analyseVerdictBox: "bg-teal-50 border-teal-100 text-teal-800",
  analyseFortsBox: "bg-emerald-50 border-emerald-100 text-emerald-700",
  analyseRecommandationBox: "bg-amber-50 border-amber-100 text-amber-700",
  premiumLockBadge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",

  // === GestionOffre index — pastilles statut candidature ===
  statutDotColors: {
    RECUE: "bg-amber-500",
    EN_COURS: "bg-blue-500",
    ENTRETIEN: "bg-orange-500",
    RETENU: "bg-emerald-500",
    REFUSE: "bg-red-500",
  },
  expirationBadgeUrgent: "bg-red-50 text-red-600",
  expirationBadgeWarning: "bg-amber-50 text-amber-700",
  expirationBadgeOk: "bg-teal-50 text-teal-700",
  expirationBadgeNeutral: "bg-slate-100 text-slate-600",
  scoreFillSuccess: "bg-emerald-500",
  scoreFillWarning: "bg-amber-400",
  scoreFillDanger: "bg-red-400",
  scoreTextSuccess: "text-emerald-600",
  scoreTextWarning: "text-amber-600",
  scoreTextDanger: "text-red-500",
  chipTealActiveSolid: "bg-teal-700 text-white border-teal-700",
  chipTealOutline: "bg-white text-teal-700 border-teal-200 hover:bg-teal-50",
  compareChipActive: "bg-teal-100 text-teal-800",
  compareChipInactive: "bg-slate-50 text-slate-600 hover:text-teal-700",
  rowSelectedTeal: "bg-teal-50",

  // === Modals GestionOffre — comparateur / entretien / évaluation ===
  badgeErrorLight100: "bg-red-100 text-red-600",
  modalInputTeal: "bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500",
  cancelPillGray: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  ratingActive: "bg-teal-700 text-white shadow-sm",
  ratingInactive: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  compareFortsBox: "bg-emerald-50 border border-emerald-100",
  compareFortsLabel: "text-emerald-700",
  compareFortsText: "text-emerald-800",
  compareEcartsBox: "bg-amber-50 border border-amber-100",
  compareEcartsLabel: "text-amber-700",
  compareEcartsText: "text-amber-800",

  // === MonEquipe — rôles / avatars / permissions ===
  roleBadgeColors: {
    PROPRIETAIRE: "text-amber-700 bg-amber-50 border-amber-200",
    ADMIN: "text-indigo-700 bg-indigo-50 border-indigo-200",
    UTILISATEUR: "text-teal-700 bg-teal-50 border-teal-200",
    INVITE: "text-slate-600 bg-slate-50 border-slate-200",
  },
  avatarCircleIndigo: "bg-indigo-100 border border-indigo-200 text-indigo-700",
  youBadge: "text-indigo-500 bg-indigo-50 border border-indigo-200",
  rowSelectedIndigoFaint: "bg-indigo-50/30",
  iconButtonSlateSoft: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  expiredBadge: "text-red-500 bg-red-50 border border-red-200",
  permCheck: "text-emerald-600",
  permCross: "text-red-400",

  // === ParametresRecruteur ===
  inputTeal: "bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
  readonlyFieldDashed: "bg-slate-50 border border-dashed border-slate-200 text-slate-600",
  uploadLabelPill: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
  toggleTrackOnTeal: "bg-teal-700",
  toggleTrackOffTeal: "bg-slate-200",
  variablePillTeal: "bg-teal-50 text-teal-800 border border-teal-100 hover:bg-teal-100 hover:border-teal-300",
  accentTeal: "accent-teal-700",
  accentRed: "accent-red-500",
  badgeTealSolidSmall: "bg-teal-50 text-teal-700",
  badgeErrorSolidSmall: "bg-red-50 text-red-600",

  // === DashboardRecruteur — table offres ===
  spinnerTealB: "border-teal-700",
  textError700: "text-red-700",
  textSlate200: "text-slate-200",
  textOrange500: "text-orange-500",
  textRed400: "text-red-400",
  dotEmerald400: "bg-emerald-400",
  dotRed400: "bg-red-400",
  rowRejetee: "bg-red-50 hover:bg-red-50/60",
  rowEnAttente: "bg-amber-50 hover:bg-amber-50/60",
  rowCloturee: "bg-slate-50 hover:bg-slate-100/50",
  rowDefault: "bg-white hover:bg-slate-50/50",
  borderError100: "border-red-100",
  textMutedHoverMuted700: "text-slate-600 hover:text-slate-700",

  // === CARTES FEATURES (Home — "Pourquoi TAFTECH") ===
  featureColors: {
    indigo: { icon: "bg-indigo-50 text-indigo-600", border: "group-hover:border-indigo-300" },
    amber: { icon: "bg-amber-50 text-amber-600", border: "group-hover:border-amber-300" },
    emerald: { icon: "bg-emerald-50 text-emerald-600", border: "group-hover:border-emerald-300" },
    rose: { icon: "bg-rose-50 text-rose-600", border: "group-hover:border-rose-300" },
  },

  // === SECTIONS ANALYSE IA (SuggestionsCarriere) ===
  analyseSectionColors: {
    indigo: { card: "bg-indigo-50 border-indigo-100", icon: "text-indigo-600", header: "text-indigo-700" },
    amber: { card: "bg-amber-50 border-amber-100", icon: "text-amber-600", header: "text-amber-700" },
    emerald: { card: "bg-emerald-50 border-emerald-100", icon: "text-emerald-600", header: "text-emerald-700" },
  },

  // === ADMIN — boutons/actions complémentaires ===
  textSlate800: "text-slate-800",
  hoverSurfaceSubtle: "hover:bg-slate-100",
  hoverSurfaceSubtleStrong: "hover:bg-slate-200",
  hoverErrorSoft: "hover:bg-red-100",
  iconButtonHoverNeutral: "text-slate-600 hover:text-slate-700 hover:bg-slate-100",

  // === CVThèque (recruteur — split view candidats) ===
  inputColorsWhiteTeal: "bg-white border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
  buttonFilterOutline: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
  segmentTabActiveAmber: "border-amber-500 text-amber-600",
  closeLinkTeal: "text-teal-400 hover:text-teal-800",
  chipTealActiveAlt: "bg-teal-50 border-blue-300 text-teal-800",
  chipNeutralInactive: "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
  textMuted700HoverTeal: "text-slate-700 hover:text-teal-700",
  scoreBarHigh: "bg-emerald-400",
  scoreBarLowNeutral: "bg-slate-200",
  dotEmerald500: "bg-emerald-500",
  dotBlue500: "bg-blue-500",
  dotSlate400: "bg-slate-400",
  borderTealSelected: "border-teal-500 ring-2 ring-teal-100 shadow-sm",
  borderNeutralHover: "border-slate-200 hover:border-slate-300 hover:shadow-sm",
  linkedinChip: "bg-[#0A66C2]/10 border border-[#0A66C2]/20 text-[#0A66C2] hover:bg-[#0A66C2]/20",
  textMutedHoverStrong: "text-slate-600 hover:text-slate-900",
  hoverSuccessSoft: "hover:bg-emerald-100",
  starFavoriActive: "fill-amber-400 text-amber-400",
  starFavoriInactiveGroupHover: "text-slate-300 group-hover/star:text-slate-600",
  surfaceMutedLight: "bg-slate-50/50",

  // === ADMIN OFFRES — violet (candidatures/Top5 IA), dots, statuts ===
  dotAmber400: "bg-amber-400",
  dotAmber500: "bg-amber-500",
  dotViolet500: "bg-violet-500",
  chipVioletActive: "bg-violet-600 text-white border-violet-600",
  chipVioletInactive: "bg-white text-violet-700 border-violet-200 hover:bg-violet-50",
  borderWarningLight: "border-amber-100",
  textWarningStrong2: "text-amber-600",
  textErrorStrong: "text-red-700",
  textVioletStrong2: "text-violet-600",
  divideSubtle: "divide-slate-50",
  candStatutColors: {
    RETENU: "text-emerald-600",
    REFUSE: "text-red-500",
    ENTRETIEN: "text-orange-500",
    EN_COURS: "text-blue-600",
    DEFAULT: "text-amber-600",
  },
  textError900: "text-red-900",
  spinnerBorderPrimary: "border-indigo-600",

  // === ADMIN STATISTIQUES — bordures KPI (StatCard) ===
  kpiBorderColors: {
    blue: "border-blue-100",
    violet: "border-violet-100",
    pink: "border-pink-100",
    emerald: "border-emerald-100",
    amber: "border-amber-100",
    indigo: "border-indigo-100",
    red: "border-red-100",
  },
};

// === STYLES POUR REACT-SELECT ===
// Réutilisable partout où on a un <Select>
export const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "#fff",
    borderColor: state.isFocused ? colors.primary[500] : colors.neutral[200],
    borderWidth: "1px",
    boxShadow: state.isFocused ? `0 0 0 3px ${colors.primary[100]}` : "none",
    borderRadius: "0.5rem",
    padding: "2px",
    fontSize: "0.875rem",
    minHeight: "42px",
    "&:hover": { borderColor: colors.primary[500] },
  }),
  placeholder: (base) => ({
    ...base,
    color: colors.neutral[400],
    fontSize: "0.875rem",
  }),
  singleValue: (base) => ({
    ...base,
    color: colors.neutral[900],
    fontSize: "0.875rem",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? colors.primary[600]
      : state.isFocused
        ? colors.primary[50]
        : "transparent",
    color: state.isSelected ? "#fff" : colors.neutral[900],
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    border: `1px solid ${colors.neutral[200]}`,
  }),
};

// Variante teal — portail recruteur (couleur de marque recruteur, pas le bleu candidat)
const tealScale = { 50: "#f0f9ec", 100: "#ddf2cf", 500: "#5cad3f", 600: "#3a8226" };
export const selectStylesTeal = {
  ...selectStyles,
  control: (base, state) => ({
    ...base,
    backgroundColor: "#fff",
    borderColor: state.isFocused ? tealScale[500] : colors.neutral[200],
    borderWidth: "1px",
    boxShadow: state.isFocused ? `0 0 0 3px ${tealScale[100]}` : "none",
    borderRadius: "0.5rem",
    padding: "2px",
    fontSize: "0.875rem",
    minHeight: "42px",
    "&:hover": { borderColor: tealScale[500] },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? tealScale[600]
      : state.isFocused
        ? tealScale[50]
        : "transparent",
    color: state.isSelected ? "#fff" : colors.neutral[900],
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
};
