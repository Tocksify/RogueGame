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
 * Skeleton sheet (skeleton.png): 64×64 frames, 4 rows
 *   Row 0: attack  — 13 frames
 *   Row 1: die     — 13 frames
 *   Row 2: walk    — 12 frames
 *   Row 3: idle    —  4 frames
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

// Row 0 = attack (13 frames), Row 1 = die (13 frames),
// Row 2 = walk (12 frames),   Row 3 = idle (4 frames)
export type SkelAnim = 'attack' | 'die' | 'walk' | 'idle';

const SKEL_ANIM: Record<SkelAnim, { row: number; frames: number; fps: number }> = {
  attack: { row: 0, frames: 13, fps: 9  },
  die:    { row: 1, frames: 13, fps: 9  },
  walk:   { row: 2, frames: 12, fps: 10 },
  idle:   { row: 3, frames: 4,  fps: 6  },
};

/** Duration of the attack animation in milliseconds — used by AI to lock movement. */
export const SKEL_ATTACK_DURATION_MS = (SKEL_ANIM.attack.frames / SKEL_ANIM.attack.fps) * 1000; // ~1444 ms

// Keep legacy row exports so any stale imports don't break at compile time
export const SKEL_ROW_WALK   = 2;
export const SKEL_ROW_ATTACK = 0;
export const SKEL_ROW_HURT   = 3; // no hurt row — fall back to idle
export const SKEL_ROW_DIE    = 1;
export const SKEL_ROW_IDLE   = 3;

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
 * @param anim  Which animation to play: 'attack' | 'die' | 'walk' | 'idle'
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  alpha = 1,
  anim: SkelAnim = 'idle',
): void {
  if (!skelSheet?.naturalWidth) return;
  const cfg   = SKEL_ANIM[anim];
  const frame = Math.floor(time * cfg.fps) % cfg.frames;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    skelSheet,
    frame * SKEL_FRAME_W, cfg.row * SKEL_FRAME_H,
    SKEL_FRAME_W, SKEL_FRAME_H,
    Math.round(cx - ENEMY_DRAW_SIZE / 2),
    Math.round(cy - ENEMY_DRAW_SIZE),
    ENEMY_DRAW_SIZE, ENEMY_DRAW_SIZE,
  );
  ctx.restore();
}
