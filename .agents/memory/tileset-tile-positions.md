---
name: Dungeon Crawler Tileset Tile Positions
description: Source tile coordinates used to blit from walls_floor.png into the game. These are approximate and may need visual tuning.
---

# Tileset Tile Positions

Tileset file: `public/sprites/tileset-walls.png` (copied from `Tileset/PNG/walls_floor.png`)
Dimensions: 208×368 px, 16 px source tiles → 13 cols × 23 rows
Game tile size: 32 px (2× scale via drawImage)

## Current mappings in `renderer.ts` (const STILE)

| Key     | col | row | srcX | srcY | Notes                         |
|---------|-----|-----|------|------|-------------------------------|
| WALL    | 0   | 0   | 0    | 0    | solid stone wall block        |
| CORNER  | 2   | 0   | 32   | 0    | corner pillar variant         |
| FLOOR_A | 0   | 7   | 0    | 112  | primary stone floor           |
| FLOOR_B | 1   | 7   | 16   | 112  | alternate stone floor         |
| FLOOR_M | 2   | 7   | 32   | 112  | dark / mossy floor            |
| FLOOR_H | 3   | 7   | 48   | 112  | hollow corner floor           |

**Why:** rows 0-6 assumed to be wall tiles, rows 7-13 assumed to be floor tiles based on visual analysis of the 23-row tileset. Positions are educated guesses — if individual tiles look wrong in-game, adjust col/row in the STILE const in `renderer.ts`.

**How to apply:** Any time tile rendering looks wrong (wall tile showing floor texture etc.), open `artifacts/dungeon-crawler/src/game/renderer.ts`, find `const STILE`, and adjust the col/row values by inspecting the tileset image.
