# Déploiement Vercel – vérifications et commandes Git

## Fait dans le projet

- **vercel.json** créé à la racine avec `framework`, `buildCommand`, `outputDirectory`.
- **package.json** : le script est bien `"build": "next build"`.
- **README.md** : présent à la racine (pas de READ.me à renommer).
- **app/** et **public/** et **package.json** sont à la racine du projet.

## Commandes Git pour forcer la casse (Windows → GitHub)

À exécuter dans un terminal (Git Bash ou PowerShell) **à la racine du projet** :

```bash
git config core.ignorecase false
git rm -r --cached app
git add app/
git commit -m "fix: force app directory lowercase for Vercel"
git push origin main
```

Si le dépôt utilise la branche **master** au lieu de **main** :

```bash
git push origin master
```

## Si le dossier était enregistré comme "App" ou "APP"

En une seule fois (remplace `main` par `master` si besoin) :

```bash
git config core.ignorecase false
git mv app app_temp
git commit -m "fix: rename app for case sensitivity"
git mv app_temp app
git commit -m "fix: app folder lowercase for Vercel"
git push origin main
```

## Sur Vercel

- **Root Directory** : laisser **vide** (ou `.`).
- Les variables d’environnement **NEXT_PUBLIC_SUPABASE_URL** et **NEXT_PUBLIC_SUPABASE_ANON_KEY** doivent être définies dans les paramètres du projet.
