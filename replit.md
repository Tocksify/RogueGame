# Dungeon Crawler

A canvas-based dungeon crawler game built with React/Vite, an Express API backend, and a pnpm monorepo workspace.

## Stack

- **Frontend** (`artifacts/dungeon-crawler`): React + Vite + Tailwind CSS, canvas game engine
- **Backend** (`artifacts/api-server`): Express 5, Drizzle ORM, PostgreSQL
- **Shared libraries** (`lib/`): `db` (Drizzle schema + client), `api-spec`, `api-zod`, `api-client-react`
- **Game assets**: Tilesets, character sprites, enemy sprites (in `Tileset/`, `OurCharacter/`, `RogueEnemies/`, `Idle_new/`)

## How to run

Dependencies are managed with pnpm. After cloning or merging changes:

```bash
pnpm install
```

Two workflows start automatically:
- **Dungeon Crawler** (`artifacts/dungeon-crawler: web`) — Vite dev server on `PORT` (default 21601), preview at `/`
- **API Server** (`artifacts/api-server: API Server`) — Express on port 8080, preview at `/api`

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (auto-set by Replit) | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session signing |
| `PORT` | Yes (auto-set) | Port each service listens on |
| `BASE_PATH` | Yes (auto-set) | Base URL path for the frontend |

## Game controls

- **Arrow keys / WASD** — Move
- **LMB** — Attack
- **E** — Inventory
- **F** — Talk/Shop
- **0–6 / num** — Use item

## User preferences
