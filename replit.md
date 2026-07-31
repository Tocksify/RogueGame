# Dungeon Crawler

A top-down dungeon crawler game built with React/Vite and an Express API backend.

## Stack

- **Frontend** (`artifacts/dungeon-crawler`): React + Vite + TypeScript, Tailwind CSS, game canvas rendered via HTML Canvas
- **Backend** (`artifacts/api-server`): Express 5, Drizzle ORM, pino logging
- **Monorepo**: pnpm workspaces

## Running the project

Both workflows are pre-configured in Replit:

- **Dungeon Crawler (web)** — `pnpm --filter @workspace/dungeon-crawler run dev` — game frontend, preview at port 21601
- **API Server** — `pnpm --filter @workspace/api-server run dev` — REST API, runs on port 8080

To install dependencies after pulling changes:
```
pnpm install
```

## Asset files

Game assets live at the repo root (not inside `artifacts/`):
- `Tileset/PNG/` — dungeon floor/wall tileset and animations
- `OurCharacter/` — player character sprites
- `RogueEnemies/` — enemy sprite sheets
- `Idle_new/` — additional character animations

## User preferences

- Keep existing monorepo structure (pnpm workspaces)
