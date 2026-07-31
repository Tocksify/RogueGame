# Dungeon Crawler

A canvas-based dungeon crawler game built with React/Vite, an Express API backend, and PostgreSQL via Drizzle ORM.

## Project structure

```
artifacts/
  dungeon-crawler/   — React/Vite frontend (the game)
  api-server/        — Express API backend
  mockup-sandbox/    — Design canvas preview server
lib/
  api-client-react/  — Shared React API client
  api-spec/          — Shared API spec
  api-zod/           — Shared Zod schemas
  db/                — Drizzle ORM + PostgreSQL schema
```

## Running the project

| Service | Workflow |
|---------|----------|
| Game (frontend) | `artifacts/dungeon-crawler: web` — `pnpm --filter @workspace/dungeon-crawler run dev` |
| API server | `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev` |

Dependencies are managed with `pnpm` at the workspace root. Run `pnpm install` to install all packages.

## Database

Uses Replit's built-in PostgreSQL. The `DATABASE_URL` environment variable is provided automatically. Schema is defined in `lib/db/src/schema/` using Drizzle ORM. Push schema changes with:

```sh
cd lib/db && pnpm run push
```

## Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, Wouter, shadcn/ui components
- **Backend:** Express 5, Pino (logging)
- **Database:** PostgreSQL, Drizzle ORM
- **Language:** TypeScript throughout

## User preferences

<!-- Add any preferences the user asks you to remember here -->
