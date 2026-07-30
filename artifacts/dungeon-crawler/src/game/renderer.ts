import { GameState, Doorway } from './types';
import { drawSprite, PLAYER_APPEARANCE } from './sprite';
import { roomKey, ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, ITEMS } from './world';

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

// Number of wall tiles thick on each side (1 tile = TILE_SIZE px)
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
    // pseudo-3D edge highlight
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
    // Door tile: archway shape
    ctx.fillStyle = '#2a2a44';
    ctx.fillRect(x + 6, y + 6, TS - 12, TS - 6);
    ctx.fillStyle = '#111122';
    ctx.fillRect(x + 10, y + 10, TS - 20, TS - 12);
    ctx.fillStyle = '#5555aa';
    ctx.fillRect(x + TS / 2 - 2, y + TS - 12, 4, 8); // handle
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
function drawScanlines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 2);
  }
}

// ── PIXEL BOX ────────────────────────────────────────────────────────
function pixelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = C.black,
  stroke = C.white,
  sw = 2
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = sw;
  ctx.strokeRect(x, y, w, h);
  // Corner dots
  ctx.fillStyle = stroke;
  ctx.fillRect(x, y, 3, 3);
  ctx.fillRect(x + w - 3, y, 3, 3);
  ctx.fillRect(x, y + h - 3, 3, 3);
  ctx.fillRect(x + w - 3, y + h - 3, 3, 3);
}

// ── TILE MAP GENERATION ──────────────────────────────────────────────
// Room tile grid is TILES_X × TILES_Y.
// Perimeter = wall ('W'), door gaps = door tile ('D'), interior = floor mix.
const TILES_X = Math.floor(ROOM_WIDTH / TILE_SIZE);  // 15
const TILES_Y = Math.floor(ROOM_HEIGHT / TILE_SIZE); // 10

// Door gap: 2 tiles wide, centered
// North/South: cols 7,8  (center = 7.5 → pixel 240)
// East/West:   rows 4,5  (center = 4.5 → pixel 128-192, center 160)
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

      // ── Structural corners: solid void blocks ──
      if (isCorner) {
        map[ty][tx] = 'V';
        continue;
      }

      // ── Perimeter: walls or door arches ──
      if (isPerimeter) {
        if (isN && hasDoor('north') && DOOR_COLS_NS.includes(tx)) {
          map[ty][tx] = 'D';
        } else if (isS && hasDoor('south') && DOOR_COLS_NS.includes(tx)) {
          map[ty][tx] = 'D';
        } else if (isW && hasDoor('west') && DOOR_ROWS_EW.includes(ty)) {
          map[ty][tx] = 'D';
        } else if (isE && hasDoor('east') && DOOR_ROWS_EW.includes(ty)) {
          map[ty][tx] = 'D';
        } else {
          map[ty][tx] = 'W';
        }
        continue;
      }

      // ── Inner ring (1 tile from walls): lantern sconces at interior corners,
      //    plain stone along the wall strip ──
      const isInnerRing =
        ty === 1 || ty === TILES_Y - 2 || tx === 1 || tx === TILES_X - 2;
      if (isInnerRing) {
        const isInnerCorner =
          (ty === 1 || ty === TILES_Y - 2) && (tx === 1 || tx === TILES_X - 2);
        map[ty][tx] = isInnerCorner ? 'H' : 'G';
        continue;
      }

      // ── Main interior: deterministic floor variety ──
      // P = paving stones, G = gray stone, M = mosaic accent
      const seed = (tx * 7 + ty * 13) % 16;
      if (seed < 7)       map[ty][tx] = 'G'; // gray stone — most common
      else if (seed < 12) map[ty][tx] = 'P'; // paving slabs
      else                map[ty][tx] = 'M'; // mosaic accent
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

  // Black void
  ctx.fillStyle = C.black;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Camera: center on player (or slide during transition)
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
  // Zoom: scale around screen center, translate so camX/camY appears at screen center
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(Math.round(-camX), Math.round(-camY));

  const room = state.rooms.get(roomKey(state.currentRoom));
  if (room) {
    drawRoom(ctx, state);
  }

  ctx.restore();

  // HUD overlaid on top (no camera offset)
  drawHUD(ctx, state, canvasWidth, canvasHeight);

  // Scanlines over everything
  drawScanlines(ctx, canvasWidth, canvasHeight);

  // Dialogue overlay
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

  // Draw all tiles
  for (let ty = 0; ty < TILES_Y; ty++) {
    for (let tx = 0; tx < TILES_X; tx++) {
      drawTile(ctx, tx, ty, tileMap[ty][tx], frame);
    }
  }

  // Lighting: radial gradient from player (torch glow)
  drawLighting(ctx, state);

  // Floor items
  for (const item of room.items) {
    drawFloorItem(ctx, item);
  }

  // NPCs
  for (const npc of room.npcs) {
    drawSprite(ctx, npc.x - 16, npc.y - 32, npc.appearance);

    if (state.nearbyNpc === npc.id) {
      ctx.fillStyle = C.light;
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press F to talk', npc.x, npc.y - 52);
    }
  }

  // Enemies
  for (const enemy of room.enemies) {
    if (enemy.dead) {
      const fadeProg = Math.min(1, (Date.now() - enemy.deathTime) / 2000);
      ctx.globalAlpha = 1 - fadeProg;
      drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
      ctx.globalAlpha = 1;
      continue;
    }

    if (enemy.damageFlashTime > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(enemy.x - 20, enemy.y - 40, 40, 50);
      ctx.restore();
    }

    drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);

    // Enemy HP bar
    const bw = 30; const bh = 4;
    const bx = Math.round(enemy.x - bw / 2);
    const by = Math.round(enemy.y - 46);
    ctx.fillStyle = C.darkest;
    ctx.fillRect(bx, by, bw, bh);
    const hpPct = enemy.hp / enemy.maxHp;
    ctx.fillStyle = '#4a7c59';
    ctx.fillRect(bx, by, Math.round(bw * hpPct), bh);
    ctx.strokeStyle = C.mid;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  // Player damage flash
  if (state.player.damageFlashTime > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 80, 80, 0.45)';
    ctx.fillRect(state.player.x - 20, state.player.y - 40, 40, 50);
    ctx.restore();
  }

  drawSprite(ctx, state.player.x - 16, state.player.y - 32, PLAYER_APPEARANCE);

  // Player HP bar (above sprite)
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

  // Attack arc
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

  // Damage numbers
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

  // Floating texts (item pickup)
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
  // Dark overlay with a torch-light cutout from the player
  const grd = ctx.createRadialGradient(
    state.player.x, state.player.y, 0,
    state.player.x, state.player.y, 220
  );
  grd.addColorStop(0,   'rgba(0,0,0,0)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.18)');
  grd.addColorStop(1,   'rgba(0,0,0,0.62)');

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

  // Draw icon normally
  drawItemIcon(ctx, cx, ix, iy, iconSize, itemDef);

  // Draw pulsing outline directly on the same shape
  ctx.save();
  ctx.strokeStyle = `rgba(220,220,220,${0.4 + 0.6 * pulse})`;
  ctx.lineWidth = 1.5;
  const pad = 2; // slight outset so border doesn't overlap fill

  switch (itemDef.icon.shape) {
    case 'rect':
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
    case 'key':
      // Outline the key shape with a simple bounding box
      ctx.strokeRect(ix - pad, iy - pad, iconSize + pad * 2, iconSize + pad * 2);
      break;
  }
  ctx.restore();

  // Ground dot
  ctx.fillStyle = `rgba(192,192,192,${pulse * 0.45})`;
  ctx.beginPath();
  ctx.arc(cx, item.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ── ITEM ICON (shared by floor + hotbar) ──────────────────────────────
function drawItemIcon(
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

  // ── Top-left: HP box ──
  const hpBoxW = 148; const hpBoxH = 46;
  pixelBox(ctx, 12, 10, hpBoxW, hpBoxH, C.black, C.mid, 2);

  ctx.fillStyle = C.silver;
  ctx.textAlign = 'left';
  ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, 20, 28);

  const barW = 120; const barH = 10;
  const barX = 20; const barY = 33;
  ctx.fillStyle = C.darkest;
  ctx.fillRect(barX, barY, barW, barH);
  const hpPct = state.player.hp / state.player.maxHp;
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(barX, barY, Math.round(barW * hpPct), barH);
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // ── Top-right: Room info box ──
  const room = state.rooms.get(roomKey(state.currentRoom));
  const enemyCount = room ? room.enemies.filter((e) => !e.dead).length : 0;
  const infoW = 160; const infoH = 46;
  pixelBox(ctx, cw - infoW - 12, 10, infoW, infoH, C.black, C.mid, 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = C.silver;
  ctx.fillText(
    `Room ${state.currentRoom.x},${state.currentRoom.y}`,
    cw - 20, 28
  );
  ctx.fillStyle = enemyCount > 0 ? '#cc2936' : C.dim;
  ctx.fillText(`Enemies: ${enemyCount}`, cw - 20, 46);

  // ── Bottom-center: Hotbar ──
  drawHotbar(ctx, state, cw, ch);

  // ── Bottom-right: Key hints ──
  ctx.textAlign = 'right';
  ctx.fillStyle = C.dim;
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText('[E] Inventory', cw - 14, ch - 54);
  ctx.fillText('[F] Talk',      cw - 14, ch - 40);
  ctx.fillText('[LMB] Attack',  cw - 14, ch - 26);
  ctx.fillText('[Q] Use Item',  cw - 14, ch - 12);

  // ── Mouse crosshair (noir style: small plus) ──
  const mx = state.mousePos.x;
  const my = state.mousePos.y;
  ctx.strokeStyle = C.silver;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx - 7, my); ctx.lineTo(mx + 7, my);
  ctx.moveTo(mx, my - 7); ctx.lineTo(mx, my + 7);
  ctx.stroke();
  // Center dot
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

    pixelBox(
      ctx, sx, startY, slotSize, slotSize,
      isSelected ? '#1a1a2a' : C.black,
      isSelected ? C.light : C.mid,
      isSelected ? 2 : 1
    );

    // Slot number
    ctx.fillStyle = C.dim;
    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1).toString(), sx + 4, startY + 12);

    // Item icon
    const itemId = state.player.hotbar[i];
    if (itemId) {
      const itemDef = ITEMS[itemId];
      if (itemDef) {
        const is = 22;
        const ix = sx + slotSize / 2 - is / 2;
        const iy = startY + slotSize / 2 - is / 2 + 3;
        drawItemIcon(ctx, sx + slotSize / 2, ix, iy, is, itemDef);
      }
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

  // NPC name header bar
  ctx.fillStyle = C.mid;
  ctx.fillRect(panelX + 2, panelY + 2, panelW - 4, 22);
  ctx.fillStyle = C.white;
  ctx.font = 'bold 13px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(npc.name, panelX + 14, panelY + 17);

  // Dialogue line
  const line = npc.dialogue[state.dialogue.currentLine] ?? '';
  ctx.fillStyle = C.accent;
  ctx.font = '11px "Space Mono", monospace';
  wrapText(ctx, line, panelX + 14, panelY + 50, panelW - 28, 17);

  // Hint
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
