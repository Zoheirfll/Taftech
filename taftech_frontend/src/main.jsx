import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { enregistrerServiceWorker } from './utils/registerServiceWorker'

// Le fournisseur « Continuer avec Google » n'enveloppe plus toute l'application : il charge un
// script de Google dès qu'il est monté, voir Components/GoogleAuthProvider.jsx.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

enregistrerServiceWorker()
