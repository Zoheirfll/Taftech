---
name: test
description: Lance les tests backend Django (282) et frontend Vitest (338) et affiche le résumé
---

Lance les deux suites de tests TafTech dans l'ordre :

1. **Backend** : `cd C:\Users\filali\Desktop\Taftech\taftech_backend && python manage.py test jobs.tests 2>&1`
2. **Frontend** : `cd C:\Users\filali\Desktop\Taftech\taftech_frontend && npx vitest run --reporter=verbose 2>&1`

Affiche le nombre de tests passés/échoués pour chaque suite.
Si tous passent, confirme : "282/282 backend ✅ — 338/338 frontend ✅".
Si des tests échouent, liste les noms des tests en échec et explique brièvement pourquoi.
