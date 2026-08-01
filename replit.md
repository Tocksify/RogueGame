# Dungeon Crawler

A top-down dungeon crawler game with a React/Vite frontend and an Express API backend, organized as a pnpm monorepo.

## Stack

- **Frontend** (`artifacts/dungeon-crawler`): React 19, Vite, TypeScript, Tailwind CSS, canvas-based game engine
- **Backend** (`artifacts/api-server`): Express 5, TypeScript, Pino logging
- **Package manager**: pnpm (workspaces)

## Running the project

Two workflows run the project:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/dungeon-crawler: web` | `pnpm --filter @workspace/dungeon-crawler run dev` | 21601 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

The Replit artifact system injects `PORT` automatically — no manual env var needed for the workflows.

## Game controls

- **WASD / Arrow keys** — move
- **LMB / num** — attack
- **E** — inventory
- **F** — talk / shop
- **0–num** — use item

## Project structure

```
artifacts/
  dungeon-crawler/      # React game frontend
    src/
      game/             # Core game engine (gameLoop, renderer, sprites, world, etc.)
      components/       # GameCanvas, MobileControls
      pages/            # not-found
  api-server/           # Express REST API
    src/
      routes/           # health + index router
      lib/              # logger (pino)
lib/                    # Shared workspace libraries
attached_assets/        # Game sprites and tilesets
```

## User preferences

_None recorded yet._
