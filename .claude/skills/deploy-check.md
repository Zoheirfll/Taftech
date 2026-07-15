---
name: deploy-check
description: Checklist complète avant déploiement TafTech en production
---

Effectue la checklist de déploiement TafTech. Vérifie chaque point et affiche ✅ ou ❌ :

**Backend**
- [ ] `DEBUG=False` dans settings.py ou .env
- [ ] `SECRET_KEY` chargée depuis .env (pas hardcodée)
- [ ] `ALLOWED_HOSTS` contient le domaine .dz
- [ ] `CORS_ALLOWED_ORIGINS` contient le domaine frontend
- [ ] `DATABASE_URL` ou DB_PORT=5432 (prod, pas 5433)
- [ ] Toutes les migrations appliquées (`python manage.py showmigrations`)
- [ ] `python manage.py collectstatic` à lancer
- [ ] `requirements.txt` à jour

**Frontend**
- [ ] `VITE_MEDIA_BASE_URL=https://taftech.dz` dans .env
- [ ] `VITE_API_URL` vide (URLs relatives)
- [ ] Build Vite propre (`npx vite build`)

**Sécurité**
- [ ] `.env` non commité (`git status` ne montre pas .env)
- [ ] JWT expiry : access 15 min / refresh 7 jours
- [ ] HTTPS/HSTS activé (DEBUG=False l'active automatiquement)

**Crontab**
- [ ] `envoyer_alertes` — 0 8 * * *
- [ ] `relance_maj_cv` — 0 9 1 * *
- [ ] `archiver_offres_expirees` — 30 0 * * *

Affiche un résumé final avec le nombre de points ✅/❌.
