import { GameState } from './types';
import { drawSprite, PLAYER_APPEARANCE } from './sprite';
import { roomKey, ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, ITEMS } from './world';

const WALL_THICKNESS = 16;

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.imageSmoothingEnabled = false;

  // Clear to black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate camera offset (center player on screen, or show transition)
  let cameraOffsetX = canvasWidth / 2 - state.player.x;
  let cameraOffsetY = canvasHeight / 2 - state.player.y;

  // If transitioning, slide camera
  if (state.transition && state.transition.active) {
    const progress =
      (Date.now() - state.transition.startTime) / state.transition.duration;
    const t = Math.min(1, progress);

    const fromX = state.transition.fromRoom.x * ROOM_WIDTH;
    const fromY = state.transition.fromRoom.y * ROOM_HEIGHT;
    const toX = state.transition.toRoom.x * ROOM_WIDTH;
    const toY = state.transition.toRoom.y * ROOM_HEIGHT;

    const currentWorldX = fromX + (toX - fromX) * t;
    const currentWorldY = fromY + (toY - fromY) * t;

    cameraOffsetX = canvasWidth / 2 - currentWorldX - ROOM_WIDTH / 2;
    cameraOffsetY = canvasHeight / 2 - currentWorldY - ROOM_HEIGHT / 2;
  }

  ctx.save();
  ctx.translate(cameraOffsetX, cameraOffsetY);

  // Render current room
  const room = state.rooms.get(roomKey(state.currentRoom));
  if (room) {
    drawRoom(ctx, state);
  }

  ctx.restore();

  // Draw HUD (no camera offset)
  drawHUD(ctx, state, canvasWidth, canvasHeight);

  // Draw dialogue overlay if active
  if (state.dialogue.active) {
    drawDialogue(ctx, state, canvasWidth, canvasHeight);
  }
}

function drawRoom(ctx: CanvasRenderingContext2D, state: GameState): void {
  const room = state.rooms.get(roomKey(state.currentRoom));
  if (!room) return;

  // Draw floor tiles
  const tilesX = Math.floor(ROOM_WIDTH / TILE_SIZE);
  const tilesY = Math.floor(ROOM_HEIGHT / TILE_SIZE);
  const floorColors = ['#2a2a2a', '#252525', '#1f1f1f'];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const colorIdx = (tx + ty) % floorColors.length;
      ctx.fillStyle = floorColors[colorIdx];
      ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Tile border
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw walls (with doorways)
  drawWalls(ctx, room.doorways);

  // Draw lighting (radial gradient from player)
  drawLighting(ctx, state);

  // Draw items on floor
  for (const item of room.items) {
    drawFloorItem(ctx, item);
  }

  // Draw NPCs
  for (const npc of room.npcs) {
    drawSprite(ctx, npc.x - 16, npc.y - 32, npc.appearance);

    // Show "Press F to talk" if nearby
    if (state.nearbyNpc === npc.id) {
      ctx.fillStyle = '#e0c840';
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press F to talk', npc.x, npc.y - 50);
    }
  }

  // Draw enemies
  for (const enemy of room.enemies) {
    if (enemy.dead) {
      // Draw faded corpse
      const fadeProg = Math.min(
        1,
        (Date.now() - enemy.deathTime) / 2000
      );
      ctx.globalAlpha = 1 - fadeProg;
      drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);
      ctx.globalAlpha = 1;
      continue;
    }

    // Flash red if damaged
    if (enemy.damageFlashTime > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
      ctx.fillRect(enemy.x - 20, enemy.y - 40, 40, 50);
      ctx.restore();
    }

    drawSprite(ctx, enemy.x - 16, enemy.y - 32, enemy.appearance);

    // Health bar
    const barW = 30;
    const barH = 4;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - 45;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, barY, barW, barH);
    const hpPct = enemy.hp / enemy.maxHp;
    ctx.fillStyle = '#4a7c59';
    ctx.fillRect(barX, barY, barW * hpPct, barH);
  }

  // Draw player
  if (state.player.damageFlashTime > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
    ctx.fillRect(state.player.x - 20, state.player.y - 40, 40, 50);
    ctx.restore();
  }

  drawSprite(
    ctx,
    state.player.x - 16,
    state.player.y - 32,
    PLAYER_APPEARANCE
  );

  // Player health bar
  const barW = 40;
  const barH = 5;
  const barX = state.player.x - barW / 2;
  const barY = state.player.y - 50;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(barX, barY, barW, barH);
  const hpPct = state.player.hp / state.player.maxHp;
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(barX, barY, barW * hpPct, barH);

  // Draw attack arc
  if (state.attackArc) {
    const arc = state.attackArc;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffe84d';
    ctx.beginPath();
    ctx.moveTo(arc.x, arc.y);
    const arcStart = arc.angle - Math.PI / 4;
    const arcEnd = arc.angle + Math.PI / 4;
    ctx.arc(arc.x, arc.y, 60, arcStart, arcEnd);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Draw damage numbers
  for (const dn of state.damageNumbers) {
    const elapsed = Date.now() - dn.startTime;
    const t = elapsed / dn.duration;
    const yOffset = -t * 30;
    const alpha = 1 - t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dn.color;
    ctx.font = 'bold 14px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(dn.value.toString(), dn.x, dn.y + yOffset);
    ctx.restore();
  }

  // Draw floating texts
  for (const ft of state.floatingTexts) {
    const elapsed = Date.now() - ft.startTime;
    const t = elapsed / ft.duration;
    const yOffset = -t * 20;
    const alpha = 1 - t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e0c840';
    ctx.font = '11px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y + yOffset);
    ctx.restore();
  }
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  doorways: Array<{ side: string }>
): void {
  const hasDoor = (side: string) => doorways.some((d) => d.side === side);
  const doorWidth = 64;

  // Draw wall rectangles with pseudo-3D effect
  const wallColor = '#3a3a3a';
  const wallHighlight = '#4a4a4a';
  const wallShadow = '#2a2a2a';

  // North wall
  if (!hasDoor('north')) {
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, ROOM_WIDTH, WALL_THICKNESS);
    ctx.fillStyle = wallHighlight;
    ctx.fillRect(0, 0, ROOM_WIDTH, 2);
    ctx.fillStyle = wallShadow;
    ctx.fillRect(0, WALL_THICKNESS - 2, ROOM_WIDTH, 2);
  } else {
    // Wall with doorway gap
    const gapStart = ROOM_WIDTH / 2 - doorWidth / 2;
    const gapEnd = ROOM_WIDTH / 2 + doorWidth / 2;
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, gapStart, WALL_THICKNESS);
    ctx.fillRect(gapEnd, 0, ROOM_WIDTH - gapEnd, WALL_THICKNESS);
    // Doorway floor
    ctx.fillStyle = '#353535';
    ctx.fillRect(gapStart, 0, doorWidth, WALL_THICKNESS);
  }

  // South wall
  if (!hasDoor('south')) {
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, ROOM_HEIGHT - WALL_THICKNESS, ROOM_WIDTH, WALL_THICKNESS);
    ctx.fillStyle = wallHighlight;
    ctx.fillRect(0, ROOM_HEIGHT - WALL_THICKNESS, ROOM_WIDTH, 2);
    ctx.fillStyle = wallShadow;
    ctx.fillRect(0, ROOM_HEIGHT - 2, ROOM_WIDTH, 2);
  } else {
    const gapStart = ROOM_WIDTH / 2 - doorWidth / 2;
    const gapEnd = ROOM_WIDTH / 2 + doorWidth / 2;
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, ROOM_HEIGHT - WALL_THICKNESS, gapStart, WALL_THICKNESS);
    ctx.fillRect(
      gapEnd,
      ROOM_HEIGHT - WALL_THICKNESS,
      ROOM_WIDTH - gapEnd,
      WALL_THICKNESS
    );
    ctx.fillStyle = '#353535';
    ctx.fillRect(gapStart, ROOM_HEIGHT - WALL_THICKNESS, doorWidth, WALL_THICKNESS);
  }

  // West wall
  if (!hasDoor('west')) {
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, WALL_THICKNESS, ROOM_HEIGHT);
    ctx.fillStyle = wallHighlight;
    ctx.fillRect(0, 0, 2, ROOM_HEIGHT);
    ctx.fillStyle = wallShadow;
    ctx.fillRect(WALL_THICKNESS - 2, 0, 2, ROOM_HEIGHT);
  } else {
    const gapStart = ROOM_HEIGHT / 2 - doorWidth / 2;
    const gapEnd = ROOM_HEIGHT / 2 + doorWidth / 2;
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, WALL_THICKNESS, gapStart);
    ctx.fillRect(0, gapEnd, WALL_THICKNESS, ROOM_HEIGHT - gapEnd);
    ctx.fillStyle = '#353535';
    ctx.fillRect(0, gapStart, WALL_THICKNESS, doorWidth);
  }

  // East wall
  if (!hasDoor('east')) {
    ctx.fillStyle = wallColor;
    ctx.fillRect(ROOM_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, ROOM_HEIGHT);
    ctx.fillStyle = wallHighlight;
    ctx.fillRect(ROOM_WIDTH - WALL_THICKNESS, 0, 2, ROOM_HEIGHT);
    ctx.fillStyle = wallShadow;
    ctx.fillRect(ROOM_WIDTH - 2, 0, 2, ROOM_HEIGHT);
  } else {
    const gapStart = ROOM_HEIGHT / 2 - doorWidth / 2;
    const gapEnd = ROOM_HEIGHT / 2 + doorWidth / 2;
    ctx.fillStyle = wallColor;
    ctx.fillRect(ROOM_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, gapStart);
    ctx.fillRect(
      ROOM_WIDTH - WALL_THICKNESS,
      gapEnd,
      WALL_THICKNESS,
      ROOM_HEIGHT - gapEnd
    );
    ctx.fillStyle = '#353535';
    ctx.fillRect(ROOM_WIDTH - WALL_THICKNESS, gapStart, WALL_THICKNESS, doorWidth);
  }
}

function drawLighting(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Radial gradient from player
  const gradient = ctx.createRadialGradient(
    state.player.x,
    state.player.y,
    0,
    state.player.x,
    state.player.y,
    200
  );
  gradient.addColorStop(0, 'rgba(255, 140, 66, 0.15)');
  gradient.addColorStop(0.5, 'rgba(255, 140, 66, 0.05)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.restore();
}

function drawFloorItem(ctx: CanvasRenderingContext2D, item: any): void {
  const itemDef = ITEMS[item.itemId];
  if (!itemDef) return;

  // Glowing dot
  const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(224, 200, 64, ${pulse})`;
  ctx.beginPath();
  ctx.arc(item.x, item.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // Draw icon above
  const iconSize = 12;
  ctx.save();
  ctx.fillStyle = itemDef.icon.color;
  const x = item.x - iconSize / 2;
  const y = item.y - iconSize - 4;

  switch (itemDef.icon.shape) {
    case 'rect':
      ctx.fillRect(x, y, iconSize, iconSize);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(item.x, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'trapezoid':
      ctx.beginPath();
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + iconSize - 2, y);
      ctx.lineTo(x + iconSize, y + iconSize);
      ctx.lineTo(x, y + iconSize);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hexagon':
      ctx.strokeStyle = itemDef.icon.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const cx = item.x;
      const cy = y + iconSize / 2;
      const r = iconSize / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    case 'key':
      ctx.fillRect(x, y + 4, iconSize * 0.6, 4);
      ctx.fillRect(x + iconSize * 0.6, y, 4, iconSize);
      ctx.fillRect(x + iconSize * 0.6 + 4, y + 2, 2, 3);
      ctx.fillRect(x + iconSize * 0.6 + 4, y + 7, 2, 3);
      break;
  }

  ctx.restore();
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.font = '12px "Space Mono", monospace';
  ctx.textAlign = 'left';

  // Top left: HP
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `HP: ${state.player.hp}/${state.player.maxHp}`,
    16,
    24
  );

  const barW = 120;
  const barH = 12;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(16, 32, barW, barH);
  const hpPct = state.player.hp / state.player.maxHp;
  ctx.fillStyle = '#cc2936';
  ctx.fillRect(16, 32, barW * hpPct, barH);

  // Top right: Room info
  const room = state.rooms.get(roomKey(state.currentRoom));
  const enemyCount = room ? room.enemies.filter((e) => !e.dead).length : 0;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `Room ${state.currentRoom.x},${state.currentRoom.y}`,
    canvasWidth - 16,
    24
  );
  ctx.fillText(`Enemies: ${enemyCount}`, canvasWidth - 16, 42);

  // Bottom center: Hotbar
  drawHotbar(ctx, state, canvasWidth, canvasHeight);

  // Bottom right: Key hints
  ctx.textAlign = 'right';
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '10px "Space Mono", monospace';
  ctx.fillText('[E] Inventory', canvasWidth - 16, canvasHeight - 60);
  ctx.fillText('[F] Talk', canvasWidth - 16, canvasHeight - 46);
  ctx.fillText('[LMB] Attack', canvasWidth - 16, canvasHeight - 32);
  ctx.fillText('[Q] Use Item', canvasWidth - 16, canvasHeight - 18);

  // Mouse crosshair
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(state.mousePos.x - 6, state.mousePos.y);
  ctx.lineTo(state.mousePos.x + 6, state.mousePos.y);
  ctx.moveTo(state.mousePos.x, state.mousePos.y - 6);
  ctx.lineTo(state.mousePos.x, state.mousePos.y + 6);
  ctx.stroke();
}

function drawHotbar(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const slotSize = 48;
  const slotCount = 6;
  const totalWidth = slotCount * slotSize + (slotCount - 1) * 4;
  const startX = canvasWidth / 2 - totalWidth / 2;
  const startY = canvasHeight - 70;

  for (let i = 0; i < slotCount; i++) {
    const x = startX + i * (slotSize + 4);
    const isSelected = i === state.player.selectedHotbarSlot;

    // Slot background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, startY, slotSize, slotSize);

    // Border
    ctx.strokeStyle = isSelected ? '#e0c840' : '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, startY, slotSize, slotSize);

    // Slot number
    ctx.fillStyle = '#666666';
    ctx.font = '9px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1).toString(), x + 4, startY + 12);

    // Item icon
    const itemId = state.player.hotbar[i];
    if (itemId) {
      const itemDef = ITEMS[itemId];
      if (itemDef) {
        const iconSize = 24;
        const iconX = x + slotSize / 2 - iconSize / 2;
        const iconY = startY + slotSize / 2 - iconSize / 2;

        ctx.fillStyle = itemDef.icon.color;
        switch (itemDef.icon.shape) {
          case 'rect':
            ctx.fillRect(iconX, iconY, iconSize, iconSize);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(
              iconX + iconSize / 2,
              iconY + iconSize / 2,
              iconSize / 2,
              0,
              Math.PI * 2
            );
            ctx.fill();
            break;
          case 'trapezoid':
            ctx.beginPath();
            ctx.moveTo(iconX + 4, iconY);
            ctx.lineTo(iconX + iconSize - 4, iconY);
            ctx.lineTo(iconX + iconSize, iconY + iconSize);
            ctx.lineTo(iconX, iconY + iconSize);
            ctx.closePath();
            ctx.fill();
            break;
          case 'hexagon':
            ctx.strokeStyle = itemDef.icon.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const cx = iconX + iconSize / 2;
            const cy = iconY + iconSize / 2;
            const r = iconSize / 2;
            for (let j = 0; j < 6; j++) {
              const angle = (Math.PI / 3) * j;
              const px = cx + r * Math.cos(angle);
              const py = cy + r * Math.sin(angle);
              if (j === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            break;
          case 'key':
            ctx.fillRect(iconX, iconY + 8, iconSize * 0.6, 6);
            ctx.fillRect(iconX + iconSize * 0.6, iconY, 6, iconSize);
            ctx.fillRect(iconX + iconSize * 0.6 + 6, iconY + 3, 3, 4);
            ctx.fillRect(iconX + iconSize * 0.6 + 6, iconY + 11, 3, 4);
            break;
        }
      }
    }
  }

  // Tooltip for selected slot
  const selectedItemId = state.player.hotbar[state.player.selectedHotbarSlot];
  if (selectedItemId) {
    const itemDef = ITEMS[selectedItemId];
    if (itemDef) {
      const tooltipX = startX + state.player.selectedHotbarSlot * (slotSize + 4) + slotSize / 2;
      const tooltipY = startY - 8;
      ctx.font = '11px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(itemDef.name, tooltipX, tooltipY);
    }
  }
}

function drawDialogue(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const room = state.rooms.get(roomKey(state.currentRoom));
  if (!room) return;

  const npc = room.npcs.find((n) => n.id === state.dialogue.npcId);
  if (!npc) return;

  const panelHeight = 120;
  const panelY = canvasHeight - panelHeight - 20;

  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(40, panelY, canvasWidth - 80, panelHeight);

  // Border
  ctx.strokeStyle = '#e0c840';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, panelY, canvasWidth - 80, panelHeight);

  // NPC name
  ctx.fillStyle = '#e0c840';
  ctx.font = 'bold 14px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(npc.name, 56, panelY + 24);

  // Dialogue text
  const line = npc.dialogue[state.dialogue.currentLine];
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px "Space Mono", monospace';
  wrapText(ctx, line, 56, panelY + 50, canvasWidth - 112, 16);

  // Hint
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = 'right';
  const hint =
    state.dialogue.currentLine < npc.dialogue.length - 1
      ? 'Press Space/Enter to continue'
      : 'Press Space/Enter to close';
  ctx.fillText(hint, canvasWidth - 56, panelY + panelHeight - 12);
}

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
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}
