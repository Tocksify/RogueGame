/**
 * Builds two sprite sheets from the character assets:
 *
 *  character-idle.png   — 8 directions × 8 frames  → 8 cols × 8 rows (768 × 768)
 *    Source: Idle_new/Idle/animations/Idle/<dir>/frame_NNN.png  (N/S/E/W cardinal dirs)
 *            Idle_new/Idle/rotations/<dir>.png                   (diagonal dirs, frame repeated ×8)
 *    Row order: south, south-east, east, north-east, north, north-west, west, south-west
 *
 *  character-run.png    — 4 directions × 8 frames  → 8 cols × 4 rows (768 × 384)
 *    Source: OurCharacter/Running/animations/Full_Sprint/<dir>/frame_NNN.png
 *    Row order: south, east, north, west
 *
 * Output: artifacts/dungeon-crawler/public/sprites/
 */

const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts/dungeon-crawler/public/sprites');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FRAME_W = 96;
const FRAME_H = 96;
const FRAMES = 8;

async function load(p) { return Jimp.read(p); }

async function buildSheet(cols, rows, frames) {
  const sheet = new Jimp({ width: cols * FRAME_W, height: rows * FRAME_H });
  for (let i = 0; i < frames.length; i++) {
    const img = await load(frames[i]);
    sheet.composite(img, (i % cols) * FRAME_W, Math.floor(i / cols) * FRAME_H);
  }
  return sheet;
}

// ── Idle sheet (8 dirs × 8 frames) ───────────────────────────────────────────
// Cardinals have real animation; diagonals use the rotation still ×8.
const IDLE_ROWS = [
  { dir: 'south',      animated: true },
  { dir: 'south-east', animated: false },
  { dir: 'east',       animated: true },
  { dir: 'north-east', animated: false },
  { dir: 'north',      animated: true },
  { dir: 'north-west', animated: false },
  { dir: 'west',       animated: true },
  { dir: 'south-west', animated: false },
];

async function buildIdle() {
  const frames = [];
  for (const { dir, animated } of IDLE_ROWS) {
    for (let f = 0; f < FRAMES; f++) {
      if (animated) {
        frames.push(path.join(ROOT, `Idle_new/Idle/animations/Idle/${dir}/frame_${String(f).padStart(3,'0')}.png`));
      } else {
        // Repeat the single rotation still across all 8 frame slots
        frames.push(path.join(ROOT, `Idle_new/Idle/rotations/${dir}.png`));
      }
    }
  }
  const sheet = await buildSheet(FRAMES, IDLE_ROWS.length, frames);
  const out = path.join(OUT_DIR, 'character-idle.png');
  await sheet.write(out);
  console.log(`✓ character-idle.png  (${FRAMES * FRAME_W} × ${IDLE_ROWS.length * FRAME_H})`);
}

// ── Run sheet (4 dirs × 8 frames) ────────────────────────────────────────────
const RUN_DIRS = ['south', 'east', 'north', 'west'];

async function buildRun() {
  const frames = [];
  for (const dir of RUN_DIRS) {
    for (let f = 0; f < FRAMES; f++) {
      frames.push(path.join(ROOT, `OurCharacter/Running/animations/Full_Sprint/${dir}/frame_${String(f).padStart(3,'0')}.png`));
    }
  }
  const sheet = await buildSheet(FRAMES, RUN_DIRS.length, frames);
  const out = path.join(OUT_DIR, 'character-run.png');
  await sheet.write(out);
  console.log(`✓ character-run.png   (${FRAMES * FRAME_W} × ${RUN_DIRS.length * FRAME_H})`);
}

// ── Metadata JSON ─────────────────────────────────────────────────────────────
function writeMeta() {
  const meta = {
    frameSize: { w: FRAME_W, h: FRAME_H },
    idle: {
      file: 'sprites/character-idle.png',
      cols: FRAMES,
      rows: IDLE_ROWS.length,
      directions: IDLE_ROWS.map(r => r.dir),
      framesPerDirection: FRAMES,
    },
    run: {
      file: 'sprites/character-run.png',
      cols: FRAMES,
      rows: RUN_DIRS.length,
      directions: RUN_DIRS,
      framesPerDirection: FRAMES,
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'character-meta.json'), JSON.stringify(meta, null, 2));
  console.log('✓ character-meta.json');
}

(async () => {
  console.log('Building sprite sheets…\n');
  await Promise.all([buildIdle(), buildRun()]);
  writeMeta();
  console.log('\nDone → artifacts/dungeon-crawler/public/sprites/');
})().catch(e => { console.error(e); process.exit(1); });
