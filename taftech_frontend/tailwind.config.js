/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Décaler les slate 400-900 d'une teinte → texte et bordures plus foncés partout
        slate: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#64748b', // était 400 (#94a3b8) → maintenant valeur 500
          500: '#475569', // était 500 (#64748b) → maintenant valeur 600
          600: '#334155', // était 600 (#475569) → maintenant valeur 700
          700: '#1e293b', // était 700 (#334155) → maintenant valeur 800
          800: '#0f172a', // était 800 (#1e293b) → maintenant valeur 900
          900: '#020617',
          950: '#020617',
        },
        // === TAFTECH BRAND — Bleu logo exact #204883 (candidat/public, remplace indigo) ===
        indigo: {
          50: '#eef2f9',
          100: '#dbe4f2',
          200: '#b3c6e3',
          300: '#82a1d0',
          400: '#4f76b2',
          500: '#2f5798',
          600: '#204883', // bleu TafTech — couleur exacte du logo
          700: '#1a3a6a',
          800: '#152e54',
          900: '#102240',
        },
        // === TAFTECH BRAND — Vert vif (recruteur, remplace teal) ===
        teal: {
          50: '#f0f9ec',
          100: '#ddf2cf',
          200: '#bce69f',
          300: '#98d873',
          400: '#7ac94e',
          500: '#5cad3f',
          600: '#3a8226', // vert vif TafTech — AA-safe (contraste 4.77:1)
          700: '#307020', // nuance principale boutons/texte (bg/text-teal-700) — AA-safe (6:1)
          800: '#255417', // hover
          900: '#1a3812',
        },
      },
    },
  },
  plugins: [],
}
