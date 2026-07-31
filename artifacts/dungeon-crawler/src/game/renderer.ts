import { GameState, Doorway, Rarity, Room, RoomType } from './types';
import { drawSprite, PLAYER_APPEARANCE } from './sprite';
import { drawPlayerSprite } from './playerSprite';
import { roomKey, ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, ITEMS, RARITY_COLORS } from './world';

// ── PALETTE ───────────────────────────────────────────────────────────
const C = {
  black:    '#060508',
  darkest:  '#0e0b12',
  dark:     '#1a1520',
  mid:      '#3a3248',
  gray:     '#5a4e6e',
  silver:   '#9080a8',
  light:    '#c8b8e0',
  white:    '#f0e8ff',
  bright:   '#ffffff',
  accent:   '#e8deff',
  dim:      '#4a405c',
  amber:    '#c89040',
  amberDim: '#7a5020',
  gold:     '#e0c840',
};

const TILES_X = Math.floor(ROOM_WIDTH / TILE_SIZE);   // 15
const TILES_Y = Math.floor(ROOM_HEIGHT / TILE_SIZE);  // 10
const DOOR_COLS_NS = [7, 8];
const DOOR_ROWS_EW = [4, 5];
const ZOOM = 1.8;

// ── TILE DRAWING ─────────────────────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  tx: number, ty: number,
  tile: string,
  frame: number
): void {
  const x = Math.round(tx * TILE_SIZE);
  const y = Math.round(ty * TILE_SIZE);
  const TS = TILE_SIZE;

  switch (tile) {
    case 'W': drawWall(ctx, x, y, TS); break;
    case 'V': drawCornerPillar(ctx, x, y, TS); break;
    case 'D': drawDoor(ctx, x, y, TS, frame); break;
    case 'G': drawFloor(ctx, x, y, TS, tx, ty, 0); break;
    case 'P': drawFloor(ctx, x, y, TS, tx, ty, 1); break;
    case 'M': drawFloorMoss(ctx, x, y, TS); break;
    case 'H': drawHollowCorner(ctx, x, y, TS); break;
    case 'T': drawTorch(ctx, x, y, TS, frame); break;
    default:
      ctx.fillStyle = C.dark;
      ctx.fillRect(x, y, TS, TS);
  }
}

// 2D/3D wall: top-cap + front-face + left-shadow
function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
  const capH = 7;

  // Front face — main stone body
  ctx.fillStyle = '#2e2840';
  ctx.fillRect(x, y + capH, TS, TS - capH);

  // Top cap — represents the top surface of the wall block (lighter, angled look)
  ctx.fillStyle = '#48406a';
  ctx.fillRect(x, y, TS, capH);

  // Top cap highlight line
  ctx.fillStyle = '#5c5280';
  ctx.fillRect(x, y, TS, 1);

  // Left shadow strip — adds 3D depth
  ctx.fillStyle = '#1c1828';
  ctx.fillRect(x, y + capH, 2, TS - capH);

  // Horizontal mortar lines on front face
  ctx.fillStyle = '#1a1425';
  ctx.fillRect(x + 2, y + capH + 6, TS - 4, 1);
  ctx.fillRect(x + 2, y + capH + 14, TS - 4, 1);
  ctx.fillRect(x + 2, y + capH + 22, TS - 4, 1);

  // Vertical mortar (alternating brick offset)
  ctx.fillStyle = '#1a1425';
  ctx.fillRect(x + 8, y + capH, 1, 6);
  ctx.fillRect(x + 24, y + capH + 7, 1, 7);
  ctx.fillRect(x + 16, y + capH + 15, 1, 7);

  // Bottom shadow line — ground shadow
  ctx.fillStyle = '#100c18';
  ctx.fillRect(x, y + TS - 2, TS, 2);

  // Edge outline
  ctx.strokeStyle = '#0e0a16';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, TS, TS);
}

function drawCornerPillar(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
  // Darker pillar at room corners
  const capH = 7;
  ctx.fillStyle = '#1e1a2c';
  ctx.fillRect(x, y + capH, TS, TS - capH);
  ctx.fillStyle = '#302a44';
  ctx.fillRect(x, y, TS, capH);
  ctx.fillStyle = '#0e0a16';
  ctx.fillRect(x, y + TS - 2, TS, 2);
  ctx.strokeStyle = '#0a0810';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, TS, TS);
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number, frame: number): void {
  // Door arch — dark void with warm glow at edges
  ctx.fillStyle = '#080412';
  ctx.fillRect(x, y, TS, TS);

  // Amber torch glow from beyond the door
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
  const glow = ctx.createRadialGradient(x + TS / 2, y + TS / 2, 0, x + TS / 2, y + TS / 2, TS * 0.7);
  glow.addColorStop(0, `rgba(180, 120, 40, ${0.18 + pulse * 0.12})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, TS, TS);

  // Arch frame — stone surround
  ctx.fillStyle = '#3a3054';
  ctx.fillRect(x, y, 4, TS);          // left pillar
  ctx.fillRect(x + TS - 4, y, 4, TS); // right pillar
  ctx.fillRect(x, y, TS, 5);          // top lintel
  // Keystone highlight
  ctx.fillStyle = '#504468';
  ctx.fillRect(x + TS / 2 - 3, y, 6, 5);

  // Door handle / knob
  ctx.fillStyle = `rgba(200, 140, 50, ${0.7 + pulse * 0.3})`;
  ctx.fillRect(x + TS / 2 - 2, y + TS - 10, 4, 6);

  ctx.strokeStyle = '#1a1428';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, TS, TS);
}

function drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number, tx: number, ty: number, variant: number): void {
  // Warm stone floor
  ctx.fillStyle = variant === 0 ? '#221c2e' : '#251e32';
  ctx.fillRect(x, y, TS, TS);

  // Subtle grout lines
  ctx.fillStyle = '#18141e';
  if ((tx + ty) % 2 === 0) {
    ctx.fillRect(x, y, TS, 1);
    ctx.fillRect(x, y, 1, TS);
  } else {
    ctx.fillRect(x + TS - 1, y, 1, TS);
    ctx.fillRect(x, y + TS - 1, TS, 1);
  }

  // Occasional stone mark
  const seed = (tx * 11 + ty * 7) % 10;
  if (seed < 2) {
    ctx.fillStyle = '#1e1828';
    ctx.fillRect(x + 8 + seed * 6, y + 10, 3, 2);
    ctx.fillRect(x + 16, y + 20, 4, 2);
  }
}

function drawFloorMoss(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
  ctx.fillStyle = '#1e1c2a';
  ctx.fillRect(x, y, TS, TS);
  // Moss patches
  ctx.fillStyle = '#1a2218';
  ctx.fillRect(x + 4, y + 6, 5, 3);
  ctx.fillRect(x + 18, y + 18, 4, 3);
  ctx.fillStyle = '#182018';
  ctx.fillRect(x + 10, y + 12, 3, 3);
}

function drawHollowCorner(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number): void {
  ctx.fillStyle = '#1a1624';
  ctx.fillRect(x, y, TS, TS);
  ctx.fillStyle = '#141020';
  ctx.fillRect(x + 4, y + 4, TS - 8, TS - 8);
}

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, TS: number, frame: number): void {
  ctx.fillStyle = '#221c2e';
  ctx.fillRect(x, y, TS, TS);
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
  // Flame
  ctx.fillStyle = `rgba(220, 140, 40, ${0.7 + pulse * 0.3})`;
  ctx.fillRect(x + 13, y + 8, 6, 8);
  ctx.fillStyle = `rgba(255, 220, 100, ${0.5 + pulse * 0.4})`;
  ctx.fillRect(x + 14, y + 9, 4, 5);
  // Handle
  ctx.fillStyle = '#6b4c2a';
  ctx.fillRect(x + 14, y + 16, 4, 10);
}

// ── HALLWAY TILEMAP ──────────────────────────────────────────────────
function generateHallwayTileMap(dir: 'horizontal' | 'vertical'): string[][] {
  const map: string[][] = [];
  for (let ty = 0; ty < TILES_Y; ty++) {
    map[ty] = [];
    for (let tx = 0; tx < TILES_X; tx++) {
      const isN = ty === 0, isS = ty === TILES_Y - 1;
      const isW = tx === 0, isE = tx === TILES_X - 1;
      if ((isN || isS) && (isW || isE)) { map[ty][tx] = 'V'; continue; }

      if (dir === 'horizontal') {
        // Corridor through rows 3-6
        const inCorridor = ty >= 3 && ty <= 6;
        if (isN || isS) { map[ty][tx] = 'W'; continue; }
        if (isW) { map[ty][tx] = inCorridor ? 'D' : 'W'; continue; }
        if (isE) { map[ty][tx] = inCorridor ? 'D' : 'W'; continue; }
        map[ty][tx] = inCorridor ? 'G' : 'W';
      } else {
        // Corridor through columns 6-8
        const inCorridor = tx >= 6 && tx <= 8;
        if (isW || isE) { map[ty][tx] = 'W'; continue; }
        if (isN) { map[ty][tx] = inCorridor ? 'D' : 'W'; continue; }
        if (isS) { map[ty][tx] = inCorridor ? 'D' : 'W'; continue; }
        map[ty][tx] = inCorridor ? 'G' : 'W';
      }
    }
  }
  return map;
}

// ── ROOM TILEMAP ─────────────────────────────────────────────────────
function generateTileMap(doorways: Doorway[]): string[][] {
  const hasDoor = (side: string) => doorways.some(d => d.side === side);
  const map: string[][] = [];

  for (let ty = 0; ty < TILES_Y; ty++) {
    map[ty] = [];
    for (let tx = 0; tx < TILES_X; tx++) {
      const isN = ty === 0, isS = ty === TILES_Y - 1;
      const isW = tx === 0, isE = tx === TILES_X - 1;
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

      const isInnerRing = ty === 1 || ty === TILES_Y - 2 || tx === 1 || tx === TILES_X - 2;
      if (isInnerRing) {
        const isInnerCorner = (ty === 1 || ty === TILES_Y - 2) && (tx === 1 || tx === TILES_X - 2);
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

// ── RENDER TILES FOR A ROOM ───────────────────────────────────────────
function renderRoomTiles(
  ctx: CanvasRenderingContext2D,
  room: Room,
  frame: number,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  const tileMap = room.roomType === 'hallway' && room.hallwayDir
    ? generateHallwayTileMap(room.hallwayDir)
    : generateTileMap(room.doorways);

  for (let ty = 0; ty < TILES_Y; ty++) {
    for (let tx = 0; tx < TILES_X; tx++) {
      drawTile(ctx, tx, ty, tileMap[ty][tx], frame);
    }
  }

  // Room type tint overlay
  if (room.roomType && room.roomType !== 'normal' && room.roomType !== 'hallway') {
    const tintColors: Record<string, string> = {
      shop:        'rgba(224, 200, 64, 0.04)',
      treasure:    'rgba(33, 150, 243, 0.06)',
      trap:        'rgba(200, 40, 40, 0.07)',
      advancement: 'rgba(100, 160, 255, 0.06)',
    };
    const tint = tintColors[room.roomType];
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    }
  }

  ctx.restore();
}

// ── MAIN RENDER ───────────────────────────────────────────────────────
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

  if (state.transition?.active) {
    const progress = (Date.now() - state.transition.startTime) / state.transition.duration;
    const t = Math.min(1, progress);
    const fromX = state.transition.fromRoom.x * ROOM_WIDTH + ROOM_WIDTH / 2;
    const fromY = state.transition.fromRoom.y * ROOM_HEIGHT + ROOM_HEIGHT / 2;
    const toX   = state.transition.toRoom.x * ROOM_WIDTH + ROOM_WIDTH / 2;
    const toY   = state.transition.toRoom.y * ROOM_HEIGHT + ROOM_HEIGHT / 2;
    // Use offset-based camera during transition
    camX = state.player.x + (toX - fromX) * t;
    camY = state.player.y + (toY - fromY) * t;
  }

  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(Math.round(-camX), Math.round(-camY));

  const currentRoom = state.rooms.get(roomKey(state.currentRoom));

  // ── Draw ghost shadows of visited adjacent rooms ─────────────────────
  if (currentRoom) {
    for (const doorway of currentRoom.doorways) {
      const neighborKey = roomKey(doorway.toRoom);
      if (state.visitedRooms.has(neighborKey)) {
        const neighborRoom = state.rooms.get(neighborKey);
        if (neighborRoom) {
          const offset = doorwayOffset(doorway.side);
          ctx.save();
          ctx.translate(offset.x, offset.y);
          renderRoomTiles(ctx, neighborRoom, state.time ?? 0, 0.18);
          ctx.restore();
        }
      }
    }
  }

  // ── Draw current room ────────────────────────────────────────────────
  if (currentRoom) {
    drawRoom(ctx, state, currentRoom);
  }

  ctx.restore();

  // ── HUD ──────────────────────────────────────────────────────────────
  drawHUD(ctx, state, canvasWidth, canvasHeight);

  // Screen flash
  if (state.screenFlash) {
    const elapsed = Date.now() - state.screenFlash.startTime;
    const t = elapsed / state.screenFlash.duration;
    if (t < 1) {
      ctx.save();
      ctx.fillStyle = state.screenFlash.color;
      ctx.globalAlpha = state.screenFlash.alpha * (1 - t);
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
  }

  // Room entry text
  if (state.roomEntryText) {
    const elapsed = Date.now() - state.roomEntryText.startTime;
    const t = elapsed / 2200;
    const alpha = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.font = 'bold 22px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.amber;
    ctx.fillText(state.roomEntryText.text, canvasWidth / 2, canvasHeight / 2 - 60);
    ctx.restore();
  }

  // Item pickup banner — bold yellow, top-center
  if (state.itemPickupBanner) {
    const BANNER_DURATION = 2000;
    const elapsed = Date.now() - state.itemPickupBanner.startTime;
    const t = elapsed / BANNER_DURATION;
    // Fade in 0–15%, hold, fade out 75–100%
    const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = 'bold 16px "Space Mono", monospace';
    ctx.textAlign = 'center';
    // Drop shadow for legibility
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(state.itemPickupBanner.text, canvasWidth / 2 + 1, 85 + 1);
    ctx.fillStyle = '#ffe066';
    ctx.fillText(state.itemPickupBanner.text, canvasWidth / 2, 85);
    ctx.restore();
  }

  if (state.dialogue.active) {
    drawDialogue(ctx, state, canvasWidth, canvasHeight);
  }
}

function doorwayOffset(side: 'north' | 'south' | 'east' | 'west'): { x: number; y: number } {
  switch (side) {
    case 'north': return { x: 0,           y: -ROOM_HEIGHT };
    case 'south': return { x: 0,           y:  ROOM_HEIGHT };
    case 'east':  return { x:  ROOM_WIDTH,  y: 0 };
    case 'west':  return { x: -ROOM_WIDTH,  y: 0 };
  }
}

// ── ROOM ─────────────────────────────────────────────────────────────
function drawRoom(ctx: CanvasRenderingContext2D, state: GameState, room: Room): void {
  const frame = state.time ?? 0;

  // Tiles
  renderRoomTiles(ctx, room, frame, 1);

  // Trap tiles
  if (room.traps) {
    for (const trap of room.traps) {
      const tx = trap.tileX * TILE_SIZE;
      const ty = trap.tileY * TILE_SIZE;
      const TS = TILE_SIZE;
      const flash = trap.triggerFlash;

      if (flash > 0) {
        ctx.fillStyle = `rgba(220, 40, 40, ${flash * 0.6})`;
        ctx.fillRect(tx, ty, TS, TS);
        // Spikes
        ctx.fillStyle = `rgba(200, 60, 60, ${flash})`;
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.moveTo(tx + 6 + s * 10, ty + TS);
          ctx.lineTo(tx + 10 + s * 10, ty + TS - 14);
          ctx.lineTo(tx + 14 + s * 10, ty + TS);
          ctx.fill();
        }
      } else {
        // Pressure plate indicator
        ctx.strokeStyle = 'rgba(160, 50, 50, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 4, ty + 4, TS - 8, TS - 8);
        ctx.fillStyle = 'rgba(120, 30, 30, 0.15)';
        ctx.fillRect(tx + 4, ty + 4, TS - 8, TS - 8);
        // X mark
        ctx.strokeStyle = 'rgba(180, 60, 60, 0.25)';
        ctx.beginPath();
        ctx.moveTo(tx + 8, ty + 8); ctx.lineTo(tx + TS - 8, ty + TS - 8);
        ctx.moveTo(tx + TS - 8, ty + 8); ctx.lineTo(tx + 8, ty + TS - 8);
        ctx.stroke();
      }
    }
  }

  // Lighting
  drawLighting(ctx, state, room);

  // Floor items
  for (const item of room.items) drawFloorItem(ctx, item);

  // NPCs
  for (const npc of room.npcs) {
    drawSprite(ctx, npc.x - 16, npc.y - 32, npc.appearance);

    if (state.nearbyNpc === npc.id) {
      let prompt = npc.isShopkeeper ? 'Press F to shop' : 'Press F to talk';
      if (npc.isShrine) prompt = npc.shrineUsed ? 'Shrine depleted' : 'Press F to receive blessing';
      ctx.fillStyle = npc.isShopkeeper ? C.gold : (npc.isShrine ? '#88aaff' : C.light);
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, npc.x, npc.y - 52);
    }

    // Shrine glow
    if (npc.isShrine && !npc.shrineUsed) {
      const pulse = 0.4 + 0.6 * Math.sin(Date.now() / 600);
      ctx.save();
      ctx.globalAlpha = pulse * 0.3;
      const gr = ctx.createRadialGradient(npc.x, npc.y - 16, 0, npc.x, npc.y - 16, 40);
      gr.addColorStop(0, '#6699ff');
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y - 16, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Enemies
  for (const enemy of room.enemies) {
    if (enemy.dead) {
      const isChaserCountdown = enemy.enemyType === 'chaser' && !enemy.exploded && enemy.explodeTime !== undefined;

      if (isChaserCountdown) {
        const timeLeft = Math.max(0, enemy.explodeTime! - Date.now());
        const progress = 1 - timeLeft / (enemy.explodeDelay ?? 1500);
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / Math.max(20, 120 - progress * 90));
        const ringR = (enemy.explodeRadius ?? 90) * (0.25 + 0.75 * progress);

        ctx.save();
        ctx.globalAlpha = 0.06 + progress * 0.14 + pulse * 0.06;
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 16, ringR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.4 + pulse * 0.4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2 + progress * 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 16, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = 0.8;
        drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
        ctx.globalAlpha = 1;
      } else if (enemy.enemyType === 'chaser' && enemy.exploded) {
        const elapsed = Date.now() - (enemy.explodeTime ?? enemy.deathTime);
        ctx.globalAlpha = 1 - Math.min(1, elapsed / 600);
        drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 1 - Math.min(1, (Date.now() - enemy.deathTime) / 2000);
        drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
        ctx.globalAlpha = 1;
      }
      continue;
    }

    if (enemy.damageFlashTime > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = enemy.enemyType === 'chaser'
        ? 'rgba(255, 120, 60, 0.45)'
        : 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(enemy.x - 20, enemy.y - 40, 40, 50);
      ctx.restore();
    }

    drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);

    if (!enemy.isBoss) {
      const bw = 30, bh = 4;
      const bx = Math.round(enemy.x - bw / 2);
      const by = Math.round(enemy.y - 46);
      ctx.fillStyle = C.darkest;
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = enemy.enemyType === 'chaser' ? '#cc3311' : '#4a7c59';
      ctx.fillRect(bx, by, Math.round(bw * (enemy.hp / enemy.maxHp)), bh);
      ctx.strokeStyle = C.mid;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
    }
  }

  // Player flash
  if (state.player.damageFlashTime > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 80, 80, 0.45)';
    ctx.fillRect(state.player.x - 20, state.player.y - 40, 40, 50);
    ctx.restore();
  }

  // Player sprite
  drawPlayerSprite(
    ctx,
    state.player.x,
    state.player.y,
    state.player.facingAngle,
    state.player.isMoving,
    state.time,
  );

  // Player HP bar (in-world)
  const pw = 40, ph = 5;
  const ppx = Math.round(state.player.x - pw / 2);
  const ppy = Math.round(state.player.y - 52);
  ctx.fillStyle = C.darkest;
  ctx.fillRect(ppx, ppy, pw, ph);
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(ppx, ppy, Math.round(pw * (state.player.hp / state.player.maxHp)), ph);
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1;
  ctx.strokeRect(ppx, ppy, pw, ph);

  // Attack arc
  if (state.attackArc) {
    const arc = state.attackArc;
    ctx.save();
    ctx.globalAlpha = 0.45;
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
    const t = (Date.now() - dn.startTime) / dn.duration;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = dn.color;
    ctx.font = 'bold 13px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(dn.value.toString(), dn.x, dn.y - t * 28);
    ctx.restore();
  }

  // Floating texts
  for (const ft of state.floatingTexts) {
    const t = (Date.now() - ft.startTime) / ft.duration;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = C.silver;
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y - t * 18);
    ctx.restore();
  }
}

// ── LIGHTING ─────────────────────────────────────────────────────────
function drawLighting(ctx: CanvasRenderingContext2D, state: GameState, room: Room): void {
  // Room type affects light radius
  const radii: Record<string, number> = {
    trap: 160,
    treasure: 260,
    shop: 240,
    advancement: 280,
    hallway: 120,
    normal: 220,
  };
  const radius = radii[room.roomType ?? 'normal'] ?? 220;

  const grd = ctx.createRadialGradient(
    state.player.x, state.player.y, 0,
    state.player.x, state.player.y, radius
  );
  grd.addColorStop(0,    'rgba(0,0,0,0)');
  grd.addColorStop(0.4,  'rgba(0,0,0,0.15)');
  grd.addColorStop(1,    'rgba(0,0,0,0.72)');

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
        i === 0 ? ctx.moveTo(hcx + r * Math.cos(a), hcy + r * Math.sin(a))
                : ctx.lineTo(hcx + r * Math.cos(a), hcy + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }

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

  ctx.restore();

  ctx.fillStyle = `rgba(192,192,192,${pulse * 0.4})`;
  ctx.beginPath();
  ctx.arc(cx, item.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

// ── ITEM ICON (shared by floor + hotbar) ─────────────────────────────
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  centerX: number, ix: number, iy: number,
  size: number, itemDef: any
): void {
  ctx.save();
  ctx.fillStyle = itemDef.icon.color;

  switch (itemDef.icon.shape) {
    case 'rect':
      ctx.fillRect(ix, iy, size, size);
      ctx.strokeStyle = '#0a0810';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix, iy, size, size);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, iy + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0810';
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
      const hcx = centerX, hcy = iy + size / 2;
      ctx.strokeStyle = itemDef.icon.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        i === 0 ? ctx.moveTo(hcx + r * Math.cos(a), hcy + r * Math.sin(a))
                : ctx.lineTo(hcx + r * Math.cos(a), hcy + r * Math.sin(a));
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
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number): void {
  ctx.font = '12px "Space Mono", monospace';
  ctx.textBaseline = 'alphabetic';

  // Top-left: HP + Gold
  const hpBoxW = 162, hpBoxH = 60;
  pixelBox(ctx, 12, 10, hpBoxW, hpBoxH, C.black, C.mid, 2);
  ctx.fillStyle = C.silver;
  ctx.textAlign = 'left';
  ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, 20, 28);

  const barW = 134, barH = 10, barX = 20, barY = 33;
  ctx.fillStyle = C.darkest;
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(barX, barY, Math.round(barW * (state.player.hp / state.player.maxHp)), barH);
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = C.gold;
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText(`◈ ${(state.player.gold ?? 0).toLocaleString()}`, 20, 54);

  // Boss HP bar
  const room = state.rooms.get(roomKey(state.currentRoom));
  const boss = room?.enemies.find(e => e.isBoss && !e.dead);
  if (boss) {
    const bw = Math.min(500, cw - 120);
    const bh = 18;
    const bx = Math.round(cw / 2 - bw / 2);
    const by = 14;

    ctx.font = 'bold 13px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.gold;
    ctx.fillText(boss.bossName ?? 'BOSS', cw / 2, by - 5);

    pixelBox(ctx, bx - 3, by, bw + 6, bh + 4, C.black, C.gold, 2);
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(bx, by + 2, bw, bh);
    const fillW = Math.round(bw * Math.max(0, boss.hp / boss.maxHp));
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(bx, by + 2, fillW, bh);
    ctx.fillStyle = '#cc1122';
    ctx.fillRect(bx, by + 2, fillW, Math.round(bh * 0.55));
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${boss.hp} / ${boss.maxHp}`, cw / 2, by + bh - 3);
  }

  // Top-right: Room info
  const enemyCount = room ? room.enemies.filter(e => !e.dead).length : 0;
  const infoW = 180, infoH = 46;
  pixelBox(ctx, cw - infoW - 12, 10, infoW, infoH, C.black, C.mid, 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.silver;
  ctx.font = '12px "Space Mono", monospace';

  const roomLabel = room?.label ?? `Room ${state.currentRoom.x},${state.currentRoom.y}`;
  const roomTypeLabel = room?.roomType === 'hallway' ? ' [HALL]'
    : room?.roomType === 'shop' ? ' [SHOP]'
    : room?.roomType === 'treasure' ? ' [CHEST]'
    : room?.roomType === 'trap' ? ' [TRAP]'
    : room?.roomType === 'advancement' ? ' [SHRINE]'
    : '';
  ctx.fillText(roomLabel + roomTypeLabel, cw - 20, 28);
  ctx.fillStyle = enemyCount > 0 ? '#cc2936' : C.dim;
  ctx.fillText(`Enemies: ${enemyCount}`, cw - 20, 46);

  // Hotbar
  drawHotbar(ctx, state, cw, ch);

  // Key hints
  ctx.textAlign = 'right';
  ctx.fillStyle = C.dim;
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText('[E] Inventory',  cw - 14, ch - 54);
  ctx.fillText('[F] Talk/Shop',  cw - 14, ch - 40);
  ctx.fillText('[LMB] Attack',   cw - 14, ch - 26);
  ctx.fillText('[Q/num] Use Item', cw - 14, ch - 12);

  // Mouse crosshair
  const mx = state.mousePos.x, my = state.mousePos.y;
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
function drawHotbar(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number): void {
  const slotSize = 48, gap = 3, count = 6;
  const totalW = count * slotSize + (count - 1) * gap;
  const startX = Math.round(cw / 2 - totalW / 2);
  const startY = ch - 68;

  for (let i = 0; i < count; i++) {
    const sx = startX + i * (slotSize + gap);
    const isSelected = i === state.player.selectedHotbarSlot;
    const itemId = state.player.hotbar[i];
    const itemDef = itemId ? ITEMS[itemId] : null;
    const rarity = itemDef?.rarity as Rarity | undefined;

    ctx.fillStyle = isSelected ? '#16102a' : C.black;
    ctx.fillRect(sx, startY, slotSize, slotSize);

    if (itemDef && rarity === 'chromatic') {
      ctx.save();
      ctx.strokeStyle = getRainbowGradient(ctx, sx, startY, slotSize, slotSize);
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.strokeRect(sx, startY, slotSize, slotSize);
      ctx.restore();
    } else {
      ctx.strokeStyle = isSelected ? C.amber : C.mid;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(sx, startY, slotSize, slotSize);
    }

    // Selected glow
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = `rgba(200, 144, 64, 0.25)`;
      ctx.lineWidth = 4;
      ctx.strokeRect(sx - 2, startY - 2, slotSize + 4, slotSize + 4);
      ctx.restore();
    }

    ctx.fillStyle = isSelected ? C.amber : C.dim;
    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1).toString(), sx + 4, startY + 12);

    if (itemDef) {
      const is = 22;
      const ix = sx + slotSize / 2 - is / 2;
      const iy = startY + slotSize / 2 - is / 2 + 3;
      drawItemIcon(ctx, sx + slotSize / 2, ix, iy, is, itemDef);
    }
  }

  // Tooltip
  const selectedId = state.player.hotbar[state.player.selectedHotbarSlot];
  if (selectedId) {
    const itemDef = ITEMS[selectedId];
    if (itemDef) {
      const tx = startX + state.player.selectedHotbarSlot * (slotSize + gap) + slotSize / 2;
      ctx.font = '10px "Space Mono", monospace';
      const tw = ctx.measureText(itemDef.name).width + 16;
      pixelBox(ctx, tx - tw / 2, startY - 28, tw, 22, C.black, C.mid, 1);
      ctx.textAlign = 'center';
      ctx.fillStyle = C.light;
      ctx.fillText(itemDef.name, tx, startY - 12);
    }
  }
}

// ── DIALOGUE ──────────────────────────────────────────────────────────
function drawDialogue(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number): void {
  const room = state.rooms.get(roomKey(state.currentRoom));
  if (!room) return;
  const npc = room.npcs.find(n => n.id === state.dialogue.npcId);
  if (!npc) return;

  const panelH = 128, panelW = cw - 80, panelX = 40, panelY = ch - panelH - 24;
  pixelBox(ctx, panelX, panelY, panelW, panelH, 'rgba(6,5,8,0.94)', C.silver, 2);
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
  ctx.fillText(isLast ? '[Space] Close' : '[Space] Continue', panelX + panelW - 14, panelY + panelH - 10);
}

// ── HELPERS ───────────────────────────────────────────────────────────
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

function getRainbowGradient(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
): CanvasGradient {
  const t = Date.now() / 15;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0,    `hsl(${t % 360}, 100%, 65%)`);
  grad.addColorStop(0.17, `hsl(${(t + 60) % 360}, 100%, 65%)`);
  grad.addColorStop(0.33, `hsl(${(t + 120) % 360}, 100%, 65%)`);
  grad.addColorStop(0.5,  `hsl(${(t + 180) % 360}, 100%, 65%)`);
  grad.addColorStop(0.67, `hsl(${(t + 240) % 360}, 100%, 65%)`);
  grad.addColorStop(0.83, `hsl(${(t + 300) % 360}, 100%, 65%)`);
  grad.addColorStop(1,    `hsl(${(t + 360) % 360}, 100%, 65%)`);
  return grad;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(' ');
  let line = '', cy = y;
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
