# TafTech — Plateforme de recrutement Algérie

Plateforme de recrutement en ligne ciblant le marché algérien, avec matching IA, gestion complète des candidatures, et outils recruteur avancés.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | Django 5.2 + Django REST Framework |
| Base de données | PostgreSQL (port 5433) |
| Auth | JWT (SimpleJWT) |
| IA Matching | Algorithme classique (difflib + synonymes) |
| IA Analyse | Groq API (llama-3.1-8b-instant) |
| PDF | ReportLab |
| Email | Django SMTP Gmail |

## Lancement en développement

```bash
# Backend
cd taftech_backend
python manage.py runserver

# Frontend
cd taftech_frontend
npm run dev
```

## Tests

```bash
# Backend (186 tests)
cd taftech_backend
python manage.py test jobs.tests

# Frontend (270 tests)
cd taftech_frontend
npm test -- --run

# E2E Cypress
npx cypress open
```

## Structure

```
taftech_backend/    Django REST API
taftech_frontend/   React + Vite SPA
```

## Variables d'environnement

Copier `.env.example` en `.env` et renseigner :
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `GROQ_API_KEY`
- `CORS_ALLOWED_ORIGINS`, `SITE_URL`

**Ne jamais committer `.env`.**

## Fonctionnalités principales

- Inscription candidat / recruteur avec vérification email
- Dépôt et gestion d'offres d'emploi avec modération admin
- Matching IA (score 0–100% sur 5 critères : spécialité, diplôme, expérience, région, compétences)
- Candidature TafTech (avec profil) et candidature rapide (sans compte)
- Tableau de bord recruteur avec KPIs et pipeline candidatures
- CVThèque avec filtres avancés
- Questionnaires personnalisés par offre
- Candidatures spontanées
- Bulletin PDF professionnel (ReportLab)
- Suggestions de carrière IA (Groq)
- Notifications internes + alertes emploi par email
- Panel admin complet avec journal d'audit
- Référentiel métiers ROME (11 090 métiers)
