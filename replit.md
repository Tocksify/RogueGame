# Dungeon Crawler

A top-down dungeon crawler game built with React + Vite (frontend) and an Express API server (backend), using PostgreSQL (Drizzle ORM) for persistence.

## Project Structure

```
artifacts/
  dungeon-crawler/   # React/Vite frontend (the game)
  api-server/        # Express API server
  mockup-sandbox/    # Component preview sandbox (canvas)
lib/
  api-client-react/  # Shared React API client hooks
  api-spec/          # Shared API spec types
  api-zod/           # Shared Zod schemas
  db/                # Drizzle ORM schema + database client
scripts/             # Spritesheet builder and other utilities
attached_assets/     # Sprite sheets and game assets
```

## How to Run

The project uses pnpm workspaces. Two workflows run the app:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/dungeon-crawler: web` | `pnpm --filter @workspace/dungeon-crawler run dev` | 21601 (auto-assigned) |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

Both workflows are started automatically by Replit.

## Environment

- `DATABASE_URL` — managed by Replit (PostgreSQL, auto-provisioned)
- `SESSION_SECRET` — stored as a Replit Secret
- `BASE_PATH` — set to `/` (shared env var)

## Database

Uses Replit's built-in PostgreSQL via Drizzle ORM. To push schema changes:

```sh
cd lib/db && pnpm run push
```

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui, Wouter, Framer Motion
- **Backend**: Express 5, Pino logger, Drizzle ORM, pg
- **Shared**: Zod, TypeScript
- **Tooling**: pnpm workspaces, esbuild

## User Preferences

- Keep the existing project structure and pnpm monorepo layout
