---
name: ngrok
description: Rappelle la procédure ngrok pour partager TafTech avec des testeurs externes
---

Rappelle la procédure complète pour lancer TafTech avec ngrok :

**3 terminaux à ouvrir :**

Terminal 1 — Backend Django :
```
cd C:\Users\filali\Desktop\Taftech\taftech_backend
python manage.py runserver
```

Terminal 2 — Frontend Vite :
```
cd C:\Users\filali\Desktop\Taftech\taftech_frontend
npm run dev
```

Terminal 3 — Tunnel ngrok :
```
ngrok http 5173
```

**Ensuite :** copie l'URL `https://xxx.ngrok-free.app` affichée et envoie-la aux testeurs.

**Fonctionnement :** Vite proxy intercepte `/api` et `/media` → redirige vers `127.0.0.1:8000` côté serveur. Les testeurs n'ont besoin que d'une seule URL.

**Rappel :** ngrok est dans `C:\Users\filali\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe` (ajouté au PATH utilisateur — ouvrir un nouveau terminal si non reconnu).
