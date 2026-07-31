/**
 * Enemy sprite renderer — bat and skeleton sprite sheet animations.
 *
 * All enemies are drawn at ENEMY_DRAW_SIZE × ENEMY_DRAW_SIZE world pixels
 * (matching the player sprite), centred horizontally and bottom-anchored
 * at (cx, cy) — identical anchor convention to the player.
 *
 * Bat sheets (all 64×64 frames, single row):
 *   bat-idle.png   576 × 64  →  9 frames  (IdleFly)
 *   bat-run.png    512 × 64  →  8 frames  (Run / chase)
 *   bat-attack.png 512 × 64  →  8 frames  (Attack1)
 *   bat-hurt.png   320 × 64  →  5 frames  (Hurt)
 *
 * Skeleton sheet (skeleton.png):  832×320 → 13 frames × 64×64, 5 rows
 *   Row 0: walk  | Row 1: attack | Row 2: hurt | Row 3: die | Row 4: idle
 */

export const ENEMY_DRAW_SIZE = 84; // matches DRAW_SIZE in playerSprite.ts

// ── Bat ──────────────────────────────────────────────────────────────────────
const BAT_FRAME_W = 64;
const BAT_FRAME_H = 64;
const BAT_FPS     = 10;

const BAT_ANIM = {
  idle:   { frames: 9,  fps: 8  },
  run:    { frames: 8,  fps: 12 },
  attack: { frames: 8,  fps: 14 },
  hurt:   { frames: 5,  fps: 12 },
} as const;
type BatAnim = keyof typeof BAT_ANIM;

// ── Skeleton ─────────────────────────────────────────────────────────────────
const SKEL_FRAME_W = 64;
const SKEL_FRAME_H = 64;
const SKEL_COLS    = 13;
const SKEL_FPS     = 9;

export const SKEL_ROW_WALK   = 0;
export const SKEL_ROW_ATTACK = 1;
export const SKEL_ROW_HURT   = 2;
export const SKEL_ROW_DIE    = 3;
export const SKEL_ROW_IDLE   = 4;

// ── Sprite sheets ─────────────────────────────────────────────────────────────
let batIdle:   HTMLImageElement | null = null;
let batRun:    HTMLImageElement | null = null;
let batAttack: HTMLImageElement | null = null;
let batHurt:   HTMLImageElement | null = null;
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
  [batIdle, batRun, batAttack, batHurt, skelSheet] = await Promise.all([
    loadImg(`${base}sprites/bat-idle.png`),
    loadImg(`${base}sprites/bat-run.png`),
    loadImg(`${base}sprites/bat-attack.png`),
    loadImg(`${base}sprites/bat-hurt.png`),
    loadImg(`${base}sprites/skeleton.png`),
  ]);
  _loaded = true;
}

// ── Bat draw ─────────────────────────────────────────────────────────────────
/**
 * Draw bat centred on (cx, cy) — bottom of sprite at cy (same as player).
 * @param animState  Which animation to play
 */
export function drawBat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  alpha = 1,
  animState: BatAnim = 'idle',
): void {
  const sheet = animState === 'idle'   ? batIdle
              : animState === 'run'    ? batRun
              : animState === 'attack' ? batAttack
              :                         batHurt;
  if (!sheet?.naturalWidth) return;

  const anim  = BAT_ANIM[animState];
  const frame = Math.floor(time * anim.fps) % anim.frames;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    frame * BAT_FRAME_W, 0,
    BAT_FRAME_W, BAT_FRAME_H,
    Math.round(cx - ENEMY_DRAW_SIZE / 2),
    Math.round(cy - ENEMY_DRAW_SIZE),
    ENEMY_DRAW_SIZE, ENEMY_DRAW_SIZE,
  );
  ctx.restore();
}

// ── Skeleton draw ─────────────────────────────────────────────────────────────
/**
 * Draw skeleton centred on (cx, cy) — bottom of sprite at cy (same as player).
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
    Math.round(cx - ENEMY_DRAW_SIZE / 2),
    Math.round(cy - ENEMY_DRAW_SIZE),
    ENEMY_DRAW_SIZE, ENEMY_DRAW_SIZE,
  );
  ctx.restore();
}
