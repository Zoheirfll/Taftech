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
      },
    },
  },
  plugins: [],
}
