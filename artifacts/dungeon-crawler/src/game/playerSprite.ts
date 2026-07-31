/**
 * Player sprite renderer using the generated sprite sheets.
 *
 * Idle sheet:  8 dirs × 8 frames, each frame 96×96 → 768×768
 *   Row order: south, south-east, east, north-east, north, north-west, west, south-west
 *
 * Run sheet:   4 dirs × 8 frames, each frame 96×96 → 768×384
 *   Row order: south, east, north, west
 *
 * The sprite is drawn at DRAW_SIZE × DRAW_SIZE world pixels,
 * centred horizontally on player.x, bottom edge at player.y.
 */

const FRAME_W = 96;
const FRAME_H = 96;
const FRAMES = 8;
const DRAW_SIZE = 84; // pixels in world space (~1.75× the original 48)
const IDLE_FPS = 8;   // frames per second for idle animation
const RUN_FPS  = 12;  // frames per second for run animation

// Direction row indices
const IDLE_DIRS = [
  'south', 'south-east', 'east', 'north-east',
  'north', 'north-west', 'west', 'south-west',
] as const;

const RUN_DIRS = ['south', 'east', 'north', 'west'] as const;

// ── Sprite sheets ────────────────────────────────────────────────────────────
let idleSheet: HTMLImageElement | null = null;
let runSheet:  HTMLImageElement | null = null;
let loaded = false;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadPlayerSprites(base: string = ''): Promise<void> {
  if (loaded) return;
  [idleSheet, runSheet] = await Promise.all([
    loadImage(`${base}sprites/character-idle.png`),
    loadImage(`${base}sprites/character-run.png`),
  ]);
  loaded = true;
}

// ── Direction snapping ────────────────────────────────────────────────────────

/**
 * Snap a movement angle (atan2, screen-space) to the nearest of 8 directions
 * and return the idle row index.
 *
 * Screen-space atan2: right=0, down=π/2, left=±π, up=-π/2
 * Direction mapping (clockwise from south):
 *   south=0, south-east=1, east=2, north-east=3,
 *   north=4, north-west=5, west=6, south-west=7
 */
function angleToIdleRow(angle: number): number {
  // Normalise to [0, 2π)
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // 8 sectors of 45°. Offset by -π/2 so that "south" (π/2 screen) lands on sector 0.
  const sector = Math.round((a - Math.PI / 2) / (Math.PI / 4) + 8) % 8;
  // sector 0=south, 1=south-west... we want CW: south=0, SE=1, E=2...
  // Our sheet is: 0=S,1=SE,2=E,3=NE,4=N,5=NW,6=W,7=SW
  // atan2 CW from south: 0=S,1=SW,2=W,3=NW,4=N,5=NE,6=E,7=SE
  // Remap: sector → row
  const SECTOR_TO_ROW = [0, 7, 6, 5, 4, 3, 2, 1];
  return SECTOR_TO_ROW[sector];
}

/**
 * Snap angle to the nearest of 4 cardinal directions.
 * Returns the run row index: south=0, east=1, north=2, west=3
 */
function angleToRunRow(angle: number): number {
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sector = Math.round((a - Math.PI / 2) / (Math.PI / 2) + 4) % 4;
  // sector 0=S, 1=W, 2=N, 3=E  → row: S=0, E=1, N=2, W=3
  const SECTOR_TO_ROW = [0, 3, 2, 1];
  return SECTOR_TO_ROW[sector];
}

// ── Draw ─────────────────────────────────────────────────────────────────────

/**
 * Draw the player at world position (px, py) using the current animation state.
 * @param ctx     Canvas 2D context (already in world-space transform)
 * @param px      Player world x (centre)
 * @param py      Player world y (feet / bottom)
 * @param facingAngle  Angle in radians from atan2 of last movement vector
 * @param isMoving     Whether the player is moving
 * @param time    Elapsed game time in seconds (for frame cycling)
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  facingAngle: number,
  isMoving: boolean,
  time: number,
): void {
  const sheet = isMoving ? runSheet : idleSheet;
  if (!sheet) return; // sheets not loaded yet — render nothing

  const fps  = isMoving ? RUN_FPS : IDLE_FPS;
  const col  = Math.floor(time * fps) % FRAMES;
  const row  = isMoving ? angleToRunRow(facingAngle) : angleToIdleRow(facingAngle);

  const srcX = col * FRAME_W;
  const srcY = row * FRAME_H;

  const dx = Math.round(px - DRAW_SIZE / 2);
  const dy = Math.round(py - DRAW_SIZE);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, srcX, srcY, FRAME_W, FRAME_H, dx, dy, DRAW_SIZE, DRAW_SIZE);
  ctx.restore();
}
