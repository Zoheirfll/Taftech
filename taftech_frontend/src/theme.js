/**
 * TAFTECH Design System
 * Identité visuelle centralisée.
 *
 * Couleurs principales : Indigo (Tech, Confiance)
 * Couleur accent : Ambre (Opportunité, IA)
 * Style : Minimaliste tech, inspiré de Linear/Vercel
 */

export const colors = {
  // === COULEUR PRINCIPALE (INDIGO) ===
  primary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5", // Couleur principale TAFTECH
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
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
  pageSubtitle: "text-sm text-slate-500 mt-1",
  sectionTitle: "text-base font-semibold text-slate-900",
  sectionLabel: "text-xs font-semibold text-slate-500 uppercase tracking-wider",
  bodyText: "text-sm text-slate-700",
  mutedText: "text-sm text-slate-500",
  metricNumber: "text-2xl font-bold text-slate-900 font-mono tabular-nums",

  // LAYOUT
  pageContainer: "max-w-7xl mx-auto px-6 py-8",
  pageBackground: "min-h-screen bg-slate-50",
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
