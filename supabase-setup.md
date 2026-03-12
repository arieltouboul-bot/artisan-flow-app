# Supabase – configuration ArtisanFlow

Documentation pour configurer Supabase (tables, RLS, ordre des scripts SQL).

Voir les fichiers `supabase-*.sql` à la racine et les exécuter dans l'ordre indiqué dans ce guide.

## Racine du projet

- `package.json` : à la racine (OK pour Vercel)
- Code source : `src/`
- App Next.js : `src/app/` (tout en minuscules, conforme au build)

## Variables d'environnement

Dans Vercel, définir :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Ordre des scripts SQL recommandé : clients → projects-and-tasks → auth-rls → project-transactions → profiles-and-storage → reminders → appointments → employees → material-catalog.
