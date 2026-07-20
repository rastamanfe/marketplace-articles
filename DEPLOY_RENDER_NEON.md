# Deploiement Render + Neon

Ce projet est pret pour Render avec une base PostgreSQL Neon.

## 1. Creer la base Neon

1. Aller sur https://neon.tech
2. Creer un projet PostgreSQL gratuit.
3. Copier la connection string.
4. Elle doit ressembler a :

```text
postgresql://user:password@host/dbname?sslmode=require
```

## 2. Pousser ce dossier sur GitHub

Le dossier a deja un depot Git local.

```powershell
cd C:\Users\Ryzen\mon_projet_codex\Projet_Web_Developpement
git remote add origin https://github.com/<utilisateur>/<repo>.git
git push -u origin main
```

Si GitHub demande une authentification, utiliser un token GitHub ou GitHub Desktop.

## 3. Creer le service Render

1. Aller sur https://render.com
2. New > Web Service.
3. Connecter le repo GitHub.
4. Render detecte `render.yaml`.
5. Verifier :
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Plan : Free

## 4. Variables Render obligatoires

```text
NODE_VERSION=24.18.0
DATABASE_URL=<connection string Neon>
PGSSL=require
ADMIN_PASSWORD=<mot de passe administrateur fort>
```

## 5. Verification apres deploiement

Ouvrir :

```text
https://<nom-render>.onrender.com/api/health
```

Resultat attendu :

```json
{
  "ok": true,
  "database": "postgresql",
  "storage": "DATABASE_URL",
  "adminProtected": true
}
```

Ensuite ouvrir l'URL principale Render pour utiliser la plateforme.
