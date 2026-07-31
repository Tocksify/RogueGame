import { GameState, Doorway, Rarity } from './types';
import { drawSprite, PLAYER_APPEARANCE } from './sprite';
import { roomKey, ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, ITEMS, RARITY_COLORS } from './world';

// ── NOIR 8-BIT PALETTE ──────────────────────────────────────────────
const C = {
  black:   '#080808',
  darkest: '#111111',
  dark:    '#1e1e1e',
  mid:     '#3a3a3a',
  gray:    '#606060',
  silver:  '#909090',
  light:   '#c0c0c0',
  white:   '#f0f0f0',
  bright:  '#ffffff',
  accent:  '#e8e8e8',
  dim:     '#505050',
};

// Number of wall tiles thick on each side
const WALL_TILES = 1;

// ── TILE DRAWING ─────────────────────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  tile: string,
  frame: number
): void {
  const x = Math.round(tx * TILE_SIZE);
  const y = Math.round(ty * TILE_SIZE);
  const TS = TILE_SIZE;
  let base = C.dark;
  let detail = C.darkest;
  let bright = false;

  if      (tile === 'P')  { base = '#2e2e2e'; detail = '#222222'; }
  else if (tile === 'G')  { base = '#1e1e1e'; detail = '#161616'; }
  else if (tile === 'T')  { base = '#141414'; detail = '#0e0e0e'; }
  else if (tile === 'W')  { base = '#303030'; detail = '#242424'; }
  else if (tile === 'H')  { base = '#2a2a2a'; detail = '#1e1e1e'; }
  else if (tile === 'D')  { base = '#1e1e2e'; detail = '#14142e'; }
  else if (tile === 'V')  { base = '#0c0c0c'; detail = '#060606'; }
  else if (tile === 'M')  { base = '#252525'; detail = '#1c1c1c'; }
  else if (tile === '>' || tile === '<' || tile === '!') {
    base = '#e0e0e0'; detail = '#b0b0b0'; bright = true;
  }

  ctx.fillStyle = base;
  ctx.fillRect(x, y, TS, TS);
  ctx.fillStyle = detail;

  if (tile === 'V') {
    for (let dy = 0; dy < TS; dy += 8) {
      for (let dx = ((dy / 8) % 2) * 8; dx < TS; dx += 16) {
        ctx.fillRect(x + dx, y + dy, 8, 8);
      }
    }
  } else if (tile === 'T') {
    ctx.fillRect(x + 12, y + 8, 24, 32);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 18, y + 12, 12, 20);
  } else if (tile === 'M') {
    ctx.fillStyle = '#333333';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + i * 12 + 2, y + (i % 2) * 12 + 6, 4, 4);
    }
  } else if (tile === 'H') {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 4, y + 4, TS - 8, TS - 8);
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 14, y + 12, 8, 8);
    ctx.fillRect(x + 28, y + 12, 8, 8);
  } else if (tile === 'W') {
    ctx.fillStyle = '#222222';
    for (let r = 0; r < 4; r++) {
      ctx.fillRect(x + 2, y + r * 12 + 10, TS - 4, 2);
    }
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x, y, TS, 2);
    ctx.fillStyle = '#141414';
    ctx.fillRect(x, y + TS - 2, TS, 2);
  } else if (tile === 'P') {
    ctx.fillStyle = '#282828';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + i * 16 + 6, y + (i % 2) * 14 + 8, 3, 3);
    }
  } else if (tile === 'D') {
    ctx.fillStyle = '#2a2a44';
    ctx.fillRect(x + 6, y + 6, TS - 12, TS - 6);
    ctx.fillStyle = '#111122';
    ctx.fillRect(x + 10, y + 10, TS - 20, TS - 12);
    ctx.fillStyle = '#5555aa';
    ctx.fillRect(x + TS / 2 - 2, y + TS - 12, 4, 8);
  }

  if (bright) {
    const pulse = 0.6 + 0.4 * Math.sin(frame * 0.08);
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      tile === '>' ? '▲' : tile === '!' ? '!' : '▼',
      x + TS / 2,
      y + TS / 2
    );
    ctx.textBaseline = 'alphabetic';
  }

  ctx.strokeStyle = C.darkest;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, TS, TS);
}

// ── SCANLINES ────────────────────────────────────────────────────────
function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 2);
  }
}

// ── PIXEL BOX ────────────────────────────────────────────────────────
function pixelBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill = C.black, stroke = C.white, sw = 2
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = sw;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = stroke;
  ctx.fillRect(x, y, 3, 3);
  ctx.fillRect(x + w - 3, y, 3, 3);
  ctx.fillRect(x, y + h - 3, 3, 3);
  ctx.fillRect(x + w - 3, y + h - 3, 3, 3);
}

// ── RAINBOW GRADIENT ─────────────────────────────────────────────────
function getRainbowGradient(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
): CanvasGradient {
  const t = Date.now() / 15;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0,    `hsl(${(t)      % 360}, 100%, 65%)`);
  grad.addColorStop(0.17, `hsl(${(t + 60) % 360}, 100%, 65%)`);
  grad.addColorStop(0.33, `hsl(${(t + 120)% 360}, 100%, 65%)`);
  grad.addColorStop(0.5,  `hsl(${(t + 180)% 360}, 100%, 65%)`);
  grad.addColorStop(0.67, `hsl(${(t + 240)% 360}, 100%, 65%)`);
  grad.addColorStop(0.83, `hsl(${(t + 300)% 360}, 100%, 65%)`);
  grad.addColorStop(1,    `hsl(${(t + 360)% 360}, 100%, 65%)`);
  return grad;
}

// ── TILE MAP GENERATION ──────────────────────────────────────────────
const TILES_X = Math.floor(ROOM_WIDTH / TILE_SIZE);  // 15
const TILES_Y = Math.floor(ROOM_HEIGHT / TILE_SIZE); // 10

const DOOR_COLS_NS = [7, 8];
const DOOR_ROWS_EW = [4, 5];

function generateTileMap(doorways: Doorway[]): string[][] {
  const hasDoor = (side: string) => doorways.some((d) => d.side === side);
  const map: string[][] = [];

  for (let ty = 0; ty < TILES_Y; ty++) {
    map[ty] = [];
    for (let tx = 0; tx < TILES_X; tx++) {
      const isN = ty === 0;
      const isS = ty === TILES_Y - 1;
      const isW = tx === 0;
      const isE = tx === TILES_X - 1;
      const isCorner = (isN || isS) && (isW || isE);
      const isPerimeter = isN || isS || isW || isE;

      if (isCorner) { map[ty][tx] = 'V'; continue; }

      if (isPerimeter) {
        if (isN && hasDoor('north') && DOOR_COLS_NS.includes(tx)) map[ty][tx] = 'D';
        else if (isS && hasDoor('south') && DOOR_COLS_NS.includes(tx)) map[ty][tx] = 'D';
        else if (isW && hasDoor('west') && DOOR_ROWS_EW.includes(ty)) map[ty][tx] = 'D';
        else if (isE && hasDoor('east') && DOOR_ROWS_EW.includes(ty)) map[ty][tx] = 'D';
        else map[ty][tx] = 'W';
        continue;
      }

      const isInnerRing =
        ty === 1 || ty === TILES_Y - 2 || tx === 1 || tx === TILES_X - 2;
      if (isInnerRing) {
        const isInnerCorner =
          (ty === 1 || ty === TILES_Y - 2) && (tx === 1 || tx === TILES_X - 2);
        map[ty][tx] = isInnerCorner ? 'H' : 'G';
        continue;
      }

      const seed = (tx * 7 + ty * 13) % 16;
      if (seed < 7)       map[ty][tx] = 'G';
      else if (seed < 12) map[ty][tx] = 'P';
      else                map[ty][tx] = 'M';
    }
  }

  return map;
}

// ── ZOOM ─────────────────────────────────────────────────────────────
const ZOOM = 1.8;

// ── MAIN RENDER ENTRY ─────────────────────────────────────────────────
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  let camX = state.player.x;
  let camY = state.player.y;

  if (state.transition && state.transition.active) {
    const progress =
      (Date.now() - state.transition.startTime) / state.transition.duration;
    const t = Math.min(1, progress);
    const fromX = state.transition.fromRoom.x * ROOM_WIDTH + ROOM_WIDTH / 2;
    const fromY = state.transition.fromRoom.y * ROOM_HEIGHT + ROOM_HEIGHT / 2;
    const toX   = state.transition.toRoom.x * ROOM_WIDTH + ROOM_WIDTH / 2;
    const toY   = state.transition.toRoom.y * ROOM_HEIGHT + ROOM_HEIGHT / 2;
    camX = fromX + (toX - fromX) * t;
    camY = fromY + (toY - fromY) * t;
  }

  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(Math.round(-camX), Math.round(-camY));

  const room = state.rooms.get(roomKey(state.currentRoom));
  if (room) {
    drawRoom(ctx, state);
  }

  ctx.restore();

  // HUD overlaid on top
  drawHUD(ctx, state, canvasWidth, canvasHeight);

  // Screen flash (Providence lightning etc.)
  if (state.screenFlash) {
    const elapsed = Date.now() - state.screenFlash.startTime;
    const t = elapsed / state.screenFlash.duration;
    if (t < 1) {
      const alpha = state.screenFlash.alpha * (1 - t);
      ctx.save();
      ctx.fillStyle = state.screenFlash.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
  }

  drawScanlines(ctx, canvasWidth, canvasHeight);

  if (state.dialogue.active) {
    drawDialogue(ctx, state, canvasWidth, canvasHeight);
  }
}

// ── ROOM ─────────────────────────────────────────────────────────────
function drawRoom(ctx: CanvasRenderingContext2D, state: GameState): void {
  const room = state.rooms.get(roomKey(state.currentRoom));
  if (!room) return;

  const frame = state.time ?? 0;
  const tileMap = generateTileMap(room.doorways);

  for (let ty = 0; ty < TILES_Y; ty++) {
    for (let tx = 0; tx < TILES_X; tx++) {
      drawTile(ctx, tx, ty, tileMap[ty][tx], frame);
    }
  }

  drawLighting(ctx, state);

  for (const item of room.items) {
    drawFloorItem(ctx, item);
  }

  for (const npc of room.npcs) {
    drawSprite(ctx, npc.x - 16, npc.y - 32, npc.appearance);

    if (state.nearbyNpc === npc.id) {
      ctx.fillStyle = npc.isShopkeeper ? '#e0c840' : C.light;
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        npc.isShopkeeper ? 'Press F to shop' : 'Press F to talk',
        npc.x, npc.y - 52
      );
    }
  }

  for (const enemy of room.enemies) {
    if (enemy.dead) {
      const isChaserCountdown =
        enemy.enemyType === 'chaser' && !enemy.exploded && enemy.explodeTime !== undefined;

      if (isChaserCountdown) {
        // Draw expanding red warning ring so player knows to run
        const timeLeft = Math.max(0, enemy.explodeTime! - Date.now());
        const progress = 1 - timeLeft / (enemy.explodeDelay ?? 1500);
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / Math.max(20, 120 - progress * 90));
        const ringR = (enemy.explodeRadius ?? 90) * (0.25 + 0.75 * progress);

        ctx.save();
        // Filled danger zone
        ctx.globalAlpha = 0.06 + progress * 0.14 + pulse * 0.06;
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 16, ringR, 0, Math.PI * 2);
        ctx.fill();
        // Ring stroke
        ctx.globalAlpha = 0.4 + pulse * 0.4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2 + progress * 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 16, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Body stays visible
        ctx.globalAlpha = 0.8;
        drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
        ctx.globalAlpha = 1;
      } else if (enemy.enemyType === 'chaser' && enemy.exploded) {
        // Fast fade after explosion
        const elapsed = Date.now() - (enemy.explodeTime ?? enemy.deathTime);
        const fadeProg = Math.min(1, elapsed / 600);
        ctx.globalAlpha = 1 - fadeProg;
        drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
        ctx.globalAlpha = 1;
      } else {
        // Normal fade for standard / boss enemies
        const fadeProg = Math.min(1, (Date.now() - enemy.deathTime) / 2000);
        ctx.globalAlpha = 1 - fadeProg;
        drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
        ctx.globalAlpha = 1;
      }
      continue;
    }

    if (enemy.damageFlashTime > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const flashColor = enemy.enemyType === 'chaser'
        ? 'rgba(255, 120, 60, 0.45)'
        : 'rgba(255, 255, 255, 0.35)';
      ctx.fillStyle = flashColor;
      ctx.fillRect(enemy.x - 20, enemy.y - 40, 40, 50);
      ctx.restore();
    }

    drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);

    // Small in-world HP bar (skip for bosses — they get the big top bar)
    if (!enemy.isBoss) {
      const bw = 30; const bh = 4;
      const bx = Math.round(enemy.x - bw / 2);
      const by = Math.round(enemy.y - 46);
      ctx.fillStyle = C.darkest;
      ctx.fillRect(bx, by, bw, bh);
      const hpPct = enemy.hp / enemy.maxHp;
      ctx.fillStyle = enemy.enemyType === 'chaser' ? '#cc3311' : '#4a7c59';
      ctx.fillRect(bx, by, Math.round(bw * hpPct), bh);
      ctx.strokeStyle = C.mid;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
    }
  }

  if (state.player.damageFlashTime > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 80, 80, 0.45)';
    ctx.fillRect(state.player.x - 20, state.player.y - 40, 40, 50);
    ctx.restore();
  }

  drawSprite(ctx, state.player.x - 16, state.player.y - 32, PLAYER_APPEARANCE);

  const pw = 40; const ph = 5;
  const px = Math.round(state.player.x - pw / 2);
  const py = Math.round(state.player.y - 52);
  ctx.fillStyle = C.darkest;
  ctx.fillRect(px, py, pw, ph);
  const phpPct = state.player.hp / state.player.maxHp;
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(px, py, Math.round(pw * phpPct), ph);
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, pw, ph);

  if (state.attackArc) {
    const arc = state.attackArc;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = C.light;
    ctx.beginPath();
    ctx.moveTo(arc.x, arc.y);
    ctx.arc(arc.x, arc.y, 60, arc.angle - Math.PI / 4, arc.angle + Math.PI / 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const dn of state.damageNumbers) {
    const elapsed = Date.now() - dn.startTime;
    const t = elapsed / dn.duration;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = dn.color;
    ctx.font = 'bold 13px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(dn.value.toString(), dn.x, dn.y - t * 28);
    ctx.restore();
  }

  for (const ft of state.floatingTexts) {
    const elapsed = Date.now() - ft.startTime;
    const t = elapsed / ft.duration;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = C.silver;
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y - t * 18);
    ctx.restore();
  }
}

// ── LIGHTING ──────────────────────────────────────────────────────────
function drawLighting(ctx: CanvasRenderingContext2D, state: GameState): void {
  const grd = ctx.createRadialGradient(
    state.player.x, state.player.y, 0,
    state.player.x, state.player.y, 220
  );
  grd.addColorStop(0,    'rgba(0,0,0,0)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.18)');
  grd.addColorStop(1,    'rgba(0,0,0,0.62)');

  ctx.save();
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.restore();
}

// ── FLOOR ITEMS ───────────────────────────────────────────────────────
function drawFloorItem(ctx: CanvasRenderingContext2D, item: any): void {
  const itemDef = ITEMS[item.itemId];
  if (!itemDef) return;

  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 380);
  const iconSize = 14;
  const cx = item.x;
  const ix = Math.round(cx - iconSize / 2);
  const iy = Math.round(item.y - iconSize - 6);

  drawItemIcon(ctx, cx, ix, iy, iconSize, itemDef);

  // Rarity-colored border
  const pad = 3;
  const rarity = itemDef.rarity as Rarity;
  ctx.save();
  ctx.lineWidth = 2;

  if (rarity === 'chromatic') {
    ctx.strokeStyle = getRainbowGradient(ctx, ix - pad, iy - pad, iconSize + pad * 2, iconSize + pad * 2);
  } else {
    const rarityColor = RARITY_COLORS[rarity] ?? '#888888';
    ctx.strokeStyle = `rgba(${hexToRgb(rarityColor)},${0.5 + 0.5 * pulse})`;
  }

  switch (itemDef.icon.shape) {
    case 'rect':
    case 'key':
      ctx.strokeRect(ix - pad, iy - pad, iconSize + pad * 2, iconSize + pad * 2);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(cx, iy + iconSize / 2, iconSize / 2 + pad, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'trapezoid':
      ctx.beginPath();
      ctx.moveTo(ix + 2 - pad, iy - pad);
      ctx.lineTo(ix + iconSize - 2 + pad, iy - pad);
      ctx.lineTo(ix + iconSize + pad, iy + iconSize + pad);
      ctx.lineTo(ix - pad, iy + iconSize + pad);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'hexagon': {
      const r = iconSize / 2 + pad;
      const hcx = cx, hcy = iy + iconSize / 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const hpx = hcx + r * Math.cos(a);
        const hpy = hcy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(hpx, hpy) : ctx.lineTo(hpx, hpy);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();

  // Chromatic extra glow ring
  if (rarity === 'chromatic') {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * pulse;
    ctx.strokeStyle = getRainbowGradient(ctx, ix - pad - 4, iy - pad - 4, iconSize + (pad + 4) * 2, iconSize + (pad + 4) * 2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, iy + iconSize / 2, iconSize / 2 + pad + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Ground dot
  ctx.fillStyle = `rgba(192,192,192,${pulse * 0.45})`;
  ctx.beginPath();
  ctx.arc(cx, item.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ── ITEM ICON (shared by floor + hotbar) ──────────────────────────────
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  ix: number,
  iy: number,
  size: number,
  itemDef: any
): void {
  ctx.save();
  ctx.fillStyle = itemDef.icon.color;

  switch (itemDef.icon.shape) {
    case 'rect':
      ctx.fillRect(ix, iy, size, size);
      ctx.strokeStyle = C.darkest;
      ctx.lineWidth = 1;
      ctx.strokeRect(ix, iy, size, size);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, iy + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.darkest;
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    case 'trapezoid':
      ctx.beginPath();
      ctx.moveTo(ix + 2, iy);
      ctx.lineTo(ix + size - 2, iy);
      ctx.lineTo(ix + size, iy + size);
      ctx.lineTo(ix, iy + size);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hexagon': {
      const r = size / 2;
      const hcx = centerX;
      const hcy = iy + size / 2;
      ctx.strokeStyle = itemDef.icon.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const hpx = hcx + r * Math.cos(a);
        const hpy = hcy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(hpx, hpy) : ctx.lineTo(hpx, hpy);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'key':
      ctx.fillRect(ix, iy + size * 0.35, size * 0.6, size * 0.3);
      ctx.fillRect(ix + size * 0.6, iy, size * 0.3, size);
      ctx.fillRect(ix + size * 0.85, iy + size * 0.15, size * 0.15, size * 0.25);
      ctx.fillRect(ix + size * 0.85, iy + size * 0.55, size * 0.15, size * 0.25);
      break;
  }
  ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────────
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number,
  ch: number
): void {
  ctx.font = '12px "Space Mono", monospace';
  ctx.textBaseline = 'alphabetic';

  // ── Top-left: HP + Gold box ──
  const hpBoxW = 162; const hpBoxH = 60;
  pixelBox(ctx, 12, 10, hpBoxW, hpBoxH, C.black, C.mid, 2);

  ctx.fillStyle = C.silver;
  ctx.textAlign = 'left';
  ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, 20, 28);

  const barW = 134; const barH = 10;
  const barX = 20; const barY = 33;
  ctx.fillStyle = C.darkest;
  ctx.fillRect(barX, barY, barW, barH);
  const hpPct = state.player.hp / state.player.maxHp;
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(barX, barY, Math.round(barW * hpPct), barH);
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Gold display
  ctx.fillStyle = '#e0c840';
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText(`◈ ${(state.player.gold ?? 0).toLocaleString()}`, 20, 54);

  // ── Boss HP bar (top-centre, only when boss is alive in current room) ──
  const room = state.rooms.get(roomKey(state.currentRoom));
  const boss = room?.enemies.find((e) => e.isBoss && !e.dead);
  if (boss) {
    const barW = Math.min(500, cw - 120);
    const barH = 18;
    const barX = Math.round(cw / 2 - barW / 2);
    const barY = 14;

    // Boss name above bar
    ctx.font = 'bold 13px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e0c840';
    ctx.fillText(boss.bossName ?? 'BOSS', cw / 2, barY - 5);

    // Gold outer frame
    pixelBox(ctx, barX - 3, barY, barW + 6, barH + 4, C.black, '#e0c840', 2);

    // Dark background
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(barX, barY + 2, barW, barH);

    // HP fill — two-tone for depth
    const hpPct = Math.max(0, boss.hp / boss.maxHp);
    const fillW = Math.round(barW * hpPct);
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(barX, barY + 2, fillW, barH);
    ctx.fillStyle = '#cc1122';
    ctx.fillRect(barX, barY + 2, fillW, Math.round(barH * 0.55));

    // HP text
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${boss.hp} / ${boss.maxHp}`, cw / 2, barY + barH - 3);
  }

  // ── Top-right: Room info box ──
  const enemyCount = room ? room.enemies.filter((e) => !e.dead).length : 0;
  const infoW = 160; const infoH = 46;
  pixelBox(ctx, cw - infoW - 12, 10, infoW, infoH, C.black, C.mid, 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = C.silver;
  ctx.font = '12px "Space Mono", monospace';
  ctx.fillText(`Room ${state.currentRoom.x},${state.currentRoom.y}`, cw - 20, 28);
  ctx.fillStyle = enemyCount > 0 ? '#cc2936' : C.dim;
  ctx.fillText(`Enemies: ${enemyCount}`, cw - 20, 46);

  // ── Bottom-center: Hotbar ──
  drawHotbar(ctx, state, cw, ch);

  // ── Bottom-right: Key hints ──
  ctx.textAlign = 'right';
  ctx.fillStyle = C.dim;
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText('[E] Inventory', cw - 14, ch - 54);
  ctx.fillText('[F] Talk/Shop', cw - 14, ch - 40);
  ctx.fillText('[LMB] Attack',  cw - 14, ch - 26);
  ctx.fillText('[Q] Use Item',  cw - 14, ch - 12);

  // ── Mouse crosshair ──
  const mx = state.mousePos.x;
  const my = state.mousePos.y;
  ctx.strokeStyle = C.silver;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx - 7, my); ctx.lineTo(mx + 7, my);
  ctx.moveTo(mx, my - 7); ctx.lineTo(mx, my + 7);
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.fillRect(mx - 1, my - 1, 2, 2);
}

// ── HOTBAR ────────────────────────────────────────────────────────────
function drawHotbar(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number,
  ch: number
): void {
  const slotSize = 48;
  const gap = 3;
  const count = 6;
  const totalW = count * slotSize + (count - 1) * gap;
  const startX = Math.round(cw / 2 - totalW / 2);
  const startY = ch - 68;

  for (let i = 0; i < count; i++) {
    const sx = startX + i * (slotSize + gap);
    const isSelected = i === state.player.selectedHotbarSlot;

    const itemId = state.player.hotbar[i];
    const itemDef = itemId ? ITEMS[itemId] : null;
    const rarity = itemDef?.rarity as Rarity | undefined;

    // Slot background
    ctx.fillStyle = isSelected ? '#1a1a2a' : C.black;
    ctx.fillRect(sx, startY, slotSize, slotSize);

    // Slot border — rarity-colored for chromatic items, normal otherwise
    if (itemDef && rarity === 'chromatic') {
      ctx.save();
      ctx.strokeStyle = getRainbowGradient(ctx, sx, startY, slotSize, slotSize);
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.strokeRect(sx, startY, slotSize, slotSize);
      ctx.restore();
    } else {
      ctx.strokeStyle = isSelected ? C.light : C.mid;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(sx, startY, slotSize, slotSize);
    }

    // Slot number
    ctx.fillStyle = C.dim;
    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1).toString(), sx + 4, startY + 12);

    // Item icon
    if (itemDef) {
      const is = 22;
      const ix = sx + slotSize / 2 - is / 2;
      const iy = startY + slotSize / 2 - is / 2 + 3;
      drawItemIcon(ctx, sx + slotSize / 2, ix, iy, is, itemDef);
    }
  }

  // Tooltip above selected slot
  const selectedId = state.player.hotbar[state.player.selectedHotbarSlot];
  if (selectedId) {
    const itemDef = ITEMS[selectedId];
    if (itemDef) {
      const tx = startX + state.player.selectedHotbarSlot * (slotSize + gap) + slotSize / 2;
      const tw = ctx.measureText(itemDef.name).width + 16;
      pixelBox(ctx, tx - tw / 2, startY - 26, tw, 20, C.black, C.mid, 1);
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = C.light;
      ctx.fillText(itemDef.name, tx, startY - 11);
    }
  }
}

// ── DIALOGUE ──────────────────────────────────────────────────────────
function drawDialogue(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number,
  ch: number
): void {
  const room = state.rooms.get(roomKey(state.currentRoom));
  if (!room) return;
  const npc = room.npcs.find((n) => n.id === state.dialogue.npcId);
  if (!npc) return;

  const panelH = 128;
  const panelW = cw - 80;
  const panelX = 40;
  const panelY = ch - panelH - 24;

  pixelBox(ctx, panelX, panelY, panelW, panelH, 'rgba(8,8,8,0.92)', C.silver, 2);

  ctx.fillStyle = C.mid;
  ctx.fillRect(panelX + 2, panelY + 2, panelW - 4, 22);
  ctx.fillStyle = C.white;
  ctx.font = 'bold 13px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(npc.name, panelX + 14, panelY + 17);

  const line = npc.dialogue[state.dialogue.currentLine] ?? '';
  ctx.fillStyle = C.accent;
  ctx.font = '11px "Space Mono", monospace';
  wrapText(ctx, line, panelX + 14, panelY + 50, panelW - 28, 17);

  ctx.fillStyle = C.gray;
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = 'right';
  const isLast = state.dialogue.currentLine >= npc.dialogue.length - 1;
  ctx.fillText(
    isLast ? '[Space] Close' : '[Space] Continue',
    panelX + panelW - 14,
    panelY + panelH - 10
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line.trim(), x, cy);
      line = word + ' ';
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, cy);
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '192,192,192';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
