/**
 * Builds two sprite sheets from OurCharacter assets:
 *
 *  character-idle.png   — 8 directions × 1 frame  → 8 cols × 1 row  (768 × 96)
 *    row order: south, south-east, east, north-east, north, north-west, west, south-west
 *
 *  character-run.png    — 4 directions × 8 frames  → 8 cols × 4 rows (768 × 384)
 *    row order: south, east, north, west
 *
 * Output lands in artifacts/dungeon-crawler/public/sprites/
 */

const { Jimp } = require("jimp");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts/dungeon-crawler/public/sprites");
fs.mkdirSync(OUT_DIR, { recursive: true });

const FRAME_W = 96;
const FRAME_H = 96;

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadPng(filePath) {
  return Jimp.read(filePath);
}

async function buildSheet(cols, rows, frames) {
  // frames is a flat array of { file } objects, row-major order
  const sheet = new Jimp({ width: cols * FRAME_W, height: rows * FRAME_H });
  for (let i = 0; i < frames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const img = await loadPng(frames[i].file);
    sheet.composite(img, col * FRAME_W, row * FRAME_H);
  }
  return sheet;
}

// ── idle sheet ────────────────────────────────────────────────────────────────
// 8 directions × 1 frame
const IDLE_DIRS = [
  "south",
  "south-east",
  "east",
  "north-east",
  "north",
  "north-west",
  "west",
  "south-west",
];

async function buildIdle() {
  const frames = IDLE_DIRS.map((dir) => ({
    file: path.join(ROOT, `OurCharacter/Idle/rotations/${dir}.png`),
    dir,
  }));

  const sheet = await buildSheet(8, 1, frames);
  const outPath = path.join(OUT_DIR, "character-idle.png");
  await sheet.write(outPath);
  console.log(`✓ character-idle.png  (${8 * FRAME_W} × ${FRAME_H})`);
  return outPath;
}

// ── run sheet ─────────────────────────────────────────────────────────────────
// 4 directions × 8 frames
const RUN_DIRS = ["south", "east", "north", "west"];
const RUN_FRAMES = 8;

async function buildRun() {
  const frames = [];
  for (const dir of RUN_DIRS) {
    for (let f = 0; f < RUN_FRAMES; f++) {
      const num = String(f).padStart(3, "0");
      frames.push({
        file: path.join(
          ROOT,
          `OurCharacter/Running/animations/Full_Sprint/${dir}/frame_${num}.png`
        ),
        dir,
        frame: f,
      });
    }
  }

  const sheet = await buildSheet(RUN_FRAMES, RUN_DIRS.length, frames);
  const outPath = path.join(OUT_DIR, "character-run.png");
  await sheet.write(outPath);
  console.log(
    `✓ character-run.png   (${RUN_FRAMES * FRAME_W} × ${RUN_DIRS.length * FRAME_H})`
  );
  return outPath;
}

// ── also write a metadata JSON the game can import ───────────────────────────
function writeMeta() {
  const meta = {
    frameSize: { w: FRAME_W, h: FRAME_H },
    idle: {
      file: "sprites/character-idle.png",
      cols: 8,
      rows: 1,
      directions: IDLE_DIRS,
      framesPerDirection: 1,
    },
    run: {
      file: "sprites/character-run.png",
      cols: RUN_FRAMES,
      rows: RUN_DIRS.length,
      directions: RUN_DIRS,
      framesPerDirection: RUN_FRAMES,
    },
  };
  const outPath = path.join(OUT_DIR, "character-meta.json");
  fs.writeFileSync(outPath, JSON.stringify(meta, null, 2));
  console.log("✓ character-meta.json");
}

// ── run ───────────────────────────────────────────────────────────────────────
(async () => {
  console.log("Building sprite sheets…\n");
  await Promise.all([buildIdle(), buildRun()]);
  writeMeta();
  console.log("\nDone. Files written to artifacts/dungeon-crawler/public/sprites/");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
