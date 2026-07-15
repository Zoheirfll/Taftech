---
name: build
description: Lance npx vite build et signale les erreurs ou warnings bloquants
---

Lance le build Vite du frontend TafTech :

```
cd C:\Users\filali\Desktop\Taftech\taftech_frontend && npx vite build 2>&1
```

- Si le build réussit : confirme "Build Vite ✅ — prêt pour la prod"
- Si le build échoue : affiche les erreurs exactes et propose un fix
- Signale les chunks > 500 kB (warning normal, pas bloquant)
