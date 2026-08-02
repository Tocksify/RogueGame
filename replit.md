# Dungeon Crawler

A canvas-based dungeon crawler game built with React/Vite, backed by an Express API server using Drizzle ORM and PostgreSQL.

## Project Structure

```
artifacts/
  dungeon-crawler/   # React/Vite frontend — the game UI and engine
  api-server/        # Express API server (Drizzle ORM + PostgreSQL)
  mockup-sandbox/    # Design canvas / component preview (Vite)
lib/
  db/                # Drizzle schema and database connection
  api-zod/           # Shared Zod schemas for API types
  api-client-react/  # Generated React API client
scripts/             # Workspace utility scripts
```

## Running the Project

- **Game (frontend):** `artifacts/dungeon-crawler: web` workflow → `pnpm --filter @workspace/dungeon-crawler run dev`
- **API server:** `artifacts/api-server: API Server` workflow → `pnpm --filter @workspace/api-server run dev`

## Environment Variables

- `PORT` — API server port (set to `3000`; actual runtime port may differ)
- `DATABASE_URL` — Managed automatically by Replit; no manual setup needed
- `SESSION_SECRET` — Secret for session signing (already configured)

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, Wouter (routing), canvas-based game engine
- **Backend:** Express 5, Pino logging, Drizzle ORM, PostgreSQL (`node-postgres`)
- **Language:** TypeScript throughout, pnpm workspaces

## Game Assets

Sprite sheets and tilesets live in the repo root:
- `Tileset/` — dungeon floor/wall tiles
- `OurCharacter/` — player character sprites (idle, run, attack)
- `RogueEnemies/`, `Enemies/`, `GolemEnemies/`, `BatEnemy/`, `Idle_new/` — enemy sprites

## User Preferences

- Keep existing project structure and stack.
