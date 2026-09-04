# Ledgerly

Ledgerly est un outil personnel de suivi financier mensuel. Le projet est organisé en monorepo avec une interface Angular 22, une API Express TypeScript et PostgreSQL via Prisma.

## Etat actuel

La première version fournit le socle du projet et un dashboard responsive sombre. Le modèle Prisma prépare les utilisateurs, les mois financiers et les entrées de revenus/dépenses. Le formulaire mensuel, le report des lignes et l'authentification complète seront ajoutés dans les prochaines étapes.

## Prerequis

- Node.js `22.22.3` ou plus récent dans la branche 22
- npm 10+
- PostgreSQL local (ou une base distante)
- Git

## Installation Windows

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
```

Modifie ensuite `backend/.env` avec une vraie `DATABASE_URL` et un `JWT_SECRET` d'au moins 32 caractères.

```powershell
npm run build:backend
npm run build:frontend
npm run dev:backend
npm run dev:frontend
```

L'API est disponible sur `http://localhost:3000/health` et l'application sur `http://localhost:4200`.

## Prisma

Depuis `backend/`, après avoir créé la base PostgreSQL locale:

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name init
```

La base de production est fournie par PostgreSQL Render. Les migrations sont déployées par la commande de démarrage du service API.

## Render

`render.yaml` décrit le service API et la base PostgreSQL. Le frontend Angular peut être créé comme Static Site Render avec:

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist/frontend/browser`

Renseigne `FRONTEND_URL` sur l'API avec l'URL du Static Site et l'URL d'API dans l'environnement Angular avant le déploiement. Les services gratuits peuvent s'endormir après une période d'inactivité; le système ne doit donc jamais dépendre d'un fichier écrit localement.

## Structure

- `frontend/`: application Angular 22 et interface utilisateur
- `backend/`: API Express TypeScript
- `prisma/`: schéma PostgreSQL et migrations
- `render.yaml`: configuration de déploiement Render
