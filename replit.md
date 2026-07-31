# Dungeon Crawler

A top-down dungeon crawler game built with React + Vite, backed by an Express API server and PostgreSQL database.

## Stack

- **Frontend** (`artifacts/dungeon-crawler`): React 19, Vite, TypeScript, Tailwind CSS, canvas-based game engine
- **Backend** (`artifacts/api-server`): Express 5, TypeScript, Drizzle ORM, PostgreSQL
- **Shared libs** (`lib/`): `api-zod` (shared Zod schemas), `api-spec`, `api-client-react` (React Query hooks), `db` (Drizzle schema + client)
- **Game assets**: tilesets, enemy sprites, and character animations in the root directory (zip files + extracted folders)

## How to run

Two workflows run in parallel:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/dungeon-crawler: web` | `pnpm --filter @workspace/dungeon-crawler run dev` | 21601 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

Both are configured as managed artifact workflows and start automatically.

## Environment

- `DATABASE_URL` — runtime-managed by Replit (PostgreSQL, already provisioned)
- `SESSION_SECRET` — stored as a Replit Secret
- `PORT`, `BASE_PATH` — injected automatically by the artifact runner

## Database schema

Schema lives in `lib/db/src/schema/`. Currently empty — add tables there and run `pnpm --filter @workspace/db run push` to apply to the dev database.

## Package management

Uses pnpm workspaces. Install all dependencies from the root:

```
pnpm install
```

## User preferences
