/**
 * Enemy sprite renderer — bat and skeleton sprite sheet animations.
 *
 * Bat (bat-idle.png):  576×64 → 9 frames × 64×64, single row (IdleFly)
 * Skeleton (skeleton.png): 832×320 → 13 frames × 64×64, 5 rows
 *   Row 0: walk, Row 1: attack, Row 2: hurt, Row 3: die, Row 4: idle
 */

// ── Bat ──────────────────────────────────────────────────────────────────────
const BAT_FRAME_W = 64;
const BAT_FRAME_H = 64;
const BAT_FRAMES  = 9;   // 576 / 64
const BAT_FPS     = 10;
const BAT_DRAW_W  = 48;
const BAT_DRAW_H  = 48;

// ── Skeleton ─────────────────────────────────────────────────────────────────
const SKEL_FRAME_W = 64;
const SKEL_FRAME_H = 64;
const SKEL_COLS    = 13;  // 832 / 64
const SKEL_FPS     = 9;
const SKEL_DRAW_W  = 72;  // draw a bit larger for boss feel
const SKEL_DRAW_H  = 72;

export const SKEL_ROW_WALK   = 0;
export const SKEL_ROW_ATTACK = 1;
export const SKEL_ROW_HURT   = 2;
export const SKEL_ROW_DIE    = 3;

// ── Shared loader ────────────────────────────────────────────────────────────
let batSheet:  HTMLImageElement | null = null;
let skelSheet: HTMLImageElement | null = null;
let _loaded = false;

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(img); // resolve on error — fallback to no sprite
    img.src = src;
  });
}

export async function loadEnemySprites(base: string = ''): Promise<void> {
  if (_loaded) return;
  [batSheet, skelSheet] = await Promise.all([
    loadImg(`${base}sprites/bat-idle.png`),
    loadImg(`${base}sprites/skeleton.png`),
  ]);
  _loaded = true;
}

// ── Bat draw ─────────────────────────────────────────────────────────────────
/**
 * Draw bat centred on (cx, cy‑feet).
 */
export function drawBat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  alpha = 1,
): void {
  if (!batSheet?.naturalWidth) return;
  const frame = Math.floor(time * BAT_FPS) % BAT_FRAMES;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    batSheet,
    frame * BAT_FRAME_W, 0,
    BAT_FRAME_W, BAT_FRAME_H,
    Math.round(cx - BAT_DRAW_W / 2),
    Math.round(cy - BAT_DRAW_H),
    BAT_DRAW_W, BAT_DRAW_H,
  );
  ctx.restore();
}

// ── Skeleton draw ─────────────────────────────────────────────────────────────
/**
 * Draw skeleton centred on (cx, cy‑feet).
 * @param row  Animation row: 0=walk, 1=attack, 2=hurt, 3=die, 4=idle
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  alpha = 1,
  row = SKEL_ROW_WALK,
): void {
  if (!skelSheet?.naturalWidth) return;
  const frame = Math.floor(time * SKEL_FPS) % SKEL_COLS;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    skelSheet,
    frame * SKEL_FRAME_W, row * SKEL_FRAME_H,
    SKEL_FRAME_W, SKEL_FRAME_H,
    Math.round(cx - SKEL_DRAW_W / 2),
    Math.round(cy - SKEL_DRAW_H),
    SKEL_DRAW_W, SKEL_DRAW_H,
  );
  ctx.restore();
}
