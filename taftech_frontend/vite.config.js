import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    // Proxy : toutes les requêtes qui commencent par /api ou /media
    // sont redirigées vers le backend Django (localhost:8000)
    // Résultat : ngrok http 5173 suffit — les testeurs passent par le frontend
    // et Vite fait suivre les appels API au backend sur ta machine
    // Accepte tous les domaines ngrok (et n'importe quel host externe)
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,  // nécessaire pour que Django accepte la requête
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,  // pour servir les fichiers uploadés (photos, CV...)
      },
    },
  },
})
