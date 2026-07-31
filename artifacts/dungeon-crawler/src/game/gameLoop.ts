import {
  GameState,
  Enemy,
  Vector2,
  DamageNumber,
  FloatingText,
  FloorItem,
  Doorway,
} from './types';
import { InputState } from './input';
import { roomKey, ROOM_WIDTH, ROOM_HEIGHT, ITEMS } from './world';
import {
  addItem,
  useConsumable,
  getAttackDamage,
  recalculateStats,
  removeItem,
} from './inventory';

const PLAYER_HITBOX_RADIUS = 12;
const ENEMY_HITBOX_RADIUS = 14;
const NPC_HITBOX_RADIUS = 14;
const ITEM_PICKUP_RADIUS = 16;
const ATTACK_RANGE = 60;
const ATTACK_ARC_ANGLE = Math.PI / 2;
const DOORWAY_WIDTH = 64;
const PROVIDENCE_RADIUS = 220;

function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function update(
  state: GameState,
  dt: number,
  input: InputState,
  canvasWidth: number,
  canvasHeight: number
): void {
  state.time += dt;
  state.mousePos = { ...input.mousePos };

  // Expire screen flash
  if (
    state.screenFlash &&
    Date.now() - state.screenFlash.startTime >= state.screenFlash.duration
  ) {
    state.screenFlash = null;
  }

  // If in transition, don't update game state
  if (state.transition && state.transition.active) {
    const elapsed = Date.now() - state.transition.startTime;
    if (elapsed >= state.transition.duration) {
      state.currentRoom = state.transition.toRoom;
      state.player.x = state.transition.entryPoint.x;
      state.player.y = state.transition.entryPoint.y;
      state.transition = null;
    }
    return;
  }

  // Dialogue input
  if (state.dialogue.active) {
    if (input.isKeyDown(' ') || input.isKeyDown('enter')) {
      const npc = getCurrentRoom(state)?.npcs.find(
        (n) => n.id === state.dialogue.npcId
      );
      if (npc) {
        if (state.dialogue.currentLine < npc.dialogue.length - 1) {
          state.dialogue.currentLine++;
          input.keys.delete(' ');
          input.keys.delete('enter');
        } else {
          state.dialogue.active = false;
          state.dialogue.npcId = null;
          state.dialogue.currentLine = 0;
          input.keys.delete(' ');
          input.keys.delete('enter');
        }
      }
    }
    if (input.isKeyDown('escape')) {
      state.dialogue.active = false;
      state.dialogue.npcId = null;
      state.dialogue.currentLine = 0;
      input.keys.delete('escape');
    }
    return;
  }

  // Shop pause
  if (state.shopOpen) {
    return;
  }

  // Inventory input
  if (input.isKeyDown('e')) {
    state.inventoryOpen = !state.inventoryOpen;
    input.keys.delete('e');
  }

  if (state.inventoryOpen) {
    return;
  }

  // Hotbar selection (1-6)
  for (let i = 1; i <= 6; i++) {
    if (input.isKeyDown(i.toString())) {
      state.player.selectedHotbarSlot = i - 1;
      input.keys.delete(i.toString());
    }
  }

  // Use hotbar item (Q)
  if (input.isKeyDown('q')) {
    const itemId = state.player.hotbar[state.player.selectedHotbarSlot];
    if (itemId) {
      const item = ITEMS[itemId];
      const room = getCurrentRoom(state);

      if (item?.type === 'consumable' && item.healAmount) {
        if (useConsumable(state.player, itemId)) {
          addFloatingText(state, `Used ${item.name}`, state.player.x, state.player.y - 20);
          // Remove from hotbar if depleted
          const invItem = state.player.inventory.find((i) => i.itemId === itemId);
          if (!invItem || invItem.quantity === 0) {
            state.player.hotbar[state.player.selectedHotbarSlot] = null;
          }
        }
      } else if (item?.type === 'active') {
        // Special active item effects
        if (item.effect === 'providence' && room) {
          triggerProvidence(state, room);
          removeItem(state.player, itemId, 1);
          addFloatingText(state, 'Providence!', state.player.x, state.player.y - 30);
          // Remove from hotbar if depleted
          const invItem = state.player.inventory.find((i) => i.itemId === itemId);
          if (!invItem || invItem.quantity === 0) {
            state.player.hotbar[state.player.selectedHotbarSlot] = null;
          }
        }
      }
    }
    input.keys.delete('q');
  }

  const room = getCurrentRoom(state);
  if (!room) return;

  // Player movement (WASD)
  const moveDir = { x: 0, y: 0 };
  if (input.isKeyDown('w')) moveDir.y -= 1;
  if (input.isKeyDown('s')) moveDir.y += 1;
  if (input.isKeyDown('a')) moveDir.x -= 1;
  if (input.isKeyDown('d')) moveDir.x += 1;

  if (moveDir.x !== 0 || moveDir.y !== 0) {
    const len = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y);
    moveDir.x /= len;
    moveDir.y /= len;

    const newX = state.player.x + moveDir.x * state.player.speed * dt;
    const newY = state.player.y + moveDir.y * state.player.speed * dt;

    const wallPadding = PLAYER_HITBOX_RADIUS + 16;
    const canMove =
      newX >= wallPadding &&
      newX <= ROOM_WIDTH - wallPadding &&
      newY >= wallPadding &&
      newY <= ROOM_HEIGHT - wallPadding;

    let enemyCollision = false;
    for (const enemy of room.enemies) {
      if (enemy.dead) continue;
      const dist = distance({ x: newX, y: newY }, enemy);
      if (dist < PLAYER_HITBOX_RADIUS + ENEMY_HITBOX_RADIUS) {
        enemyCollision = true;
        break;
      }
    }

    let npcCollision = false;
    for (const npc of room.npcs) {
      const dist = distance({ x: newX, y: newY }, npc);
      if (dist < PLAYER_HITBOX_RADIUS + NPC_HITBOX_RADIUS) {
        npcCollision = true;
        break;
      }
    }

    if (canMove && !enemyCollision && !npcCollision) {
      state.player.x = newX;
      state.player.y = newY;
    }
  }

  // Check doorway transitions
  for (const doorway of room.doorways) {
    if (isPlayerAtDoorway(state.player, doorway)) {
      startRoomTransition(state, doorway);
      return;
    }
  }

  // Player attack (left mouse)
  if (input.consumeMouseClick()) {
    const now = Date.now();
    if (now - state.player.lastAttackTime >= state.player.attackCooldown) {
      state.player.lastAttackTime = now;
      performPlayerAttack(state, canvasWidth, canvasHeight);
    }
  }

  // Check NPC interaction
  state.nearbyNpc = null;
  for (const npc of room.npcs) {
    const dist = distance(state.player, npc);
    if (dist < 40) {
      state.nearbyNpc = npc.id;
      if (input.isKeyDown('f')) {
        if (npc.isShopkeeper) {
          // Open the shop overlay (React handles the display)
          state.shopOpen = true;
        } else {
          state.dialogue.active = true;
          state.dialogue.npcId = npc.id;
          state.dialogue.currentLine = 0;
        }
        input.keys.delete('f');
      }
      break;
    }
  }

  // Item pickup
  for (let i = room.items.length - 1; i >= 0; i--) {
    const item = room.items[i];
    const dist = distance(state.player, item);
    if (dist < ITEM_PICKUP_RADIUS) {
      addItem(state.player, item.itemId, 1);
      const itemDef = ITEMS[item.itemId];
      addFloatingText(state, `+${itemDef?.name ?? item.itemId}`, item.x, item.y - 10);
      room.items.splice(i, 1);
      recalculateStats(state.player);
    }
  }

  // Enemy AI
  for (const enemy of room.enemies) {
    if (enemy.dead) continue;

    const distToPlayer = distance(enemy, state.player);

    if (distToPlayer < 180) enemy.aggro = true;

    if (enemy.aggro) {
      const ang = angle(enemy, state.player);
      enemy.x += Math.cos(ang) * enemy.speed * dt;
      enemy.y += Math.sin(ang) * enemy.speed * dt;

      if (distToPlayer < 28) {
        const now = Date.now();
        if (now - enemy.lastAttackTime >= enemy.attackCooldown) {
          enemy.lastAttackTime = now;
          damagePlayer(state, 8);
        }
      }
    } else {
      const now = Date.now();
      if (now < enemy.waypointPauseUntil) {
        // paused
      } else if (!enemy.waypoint) {
        enemy.waypoint = {
          x: 50 + Math.random() * (ROOM_WIDTH - 100),
          y: 50 + Math.random() * (ROOM_HEIGHT - 100),
        };
      } else {
        const distToWaypoint = distance(enemy, enemy.waypoint);
        if (distToWaypoint < 10) {
          enemy.waypoint = null;
          enemy.waypointPauseUntil = now + 1000 + Math.random() * 2000;
        } else {
          const ang = angle(enemy, enemy.waypoint);
          enemy.x += Math.cos(ang) * (enemy.speed * 0.4) * dt;
          enemy.y += Math.sin(ang) * (enemy.speed * 0.4) * dt;
        }
      }
    }
  }

  // Fade damage flash
  if (state.player.damageFlashTime > 0) state.player.damageFlashTime -= dt;
  for (const enemy of room.enemies) {
    if (enemy.damageFlashTime > 0) enemy.damageFlashTime -= dt;
  }

  // Remove old damage numbers
  state.damageNumbers = state.damageNumbers.filter(
    (dn) => Date.now() - dn.startTime < dn.duration
  );

  // Remove old floating texts
  state.floatingTexts = state.floatingTexts.filter(
    (ft) => Date.now() - ft.startTime < ft.duration
  );

  // Clear attack arc
  if (state.attackArc && Date.now() - state.attackArc.startTime >= state.attackArc.duration) {
    state.attackArc = null;
  }

  // Remove dead enemies after fade
  for (let i = room.enemies.length - 1; i >= 0; i--) {
    const enemy = room.enemies[i];
    if (enemy.dead && Date.now() - enemy.deathTime > 2000) {
      room.enemies.splice(i, 1);
    }
  }
}

function getCurrentRoom(state: GameState) {
  return state.rooms.get(roomKey(state.currentRoom));
}

function performPlayerAttack(
  state: GameState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const room = getCurrentRoom(state);
  if (!room) return;

  const playerScreenX = canvasWidth / 2;
  const playerScreenY = canvasHeight / 2;
  const attackAngle = Math.atan2(
    state.mousePos.y - playerScreenY,
    state.mousePos.x - playerScreenX
  );

  state.attackArc = {
    x: state.player.x,
    y: state.player.y,
    angle: attackAngle,
    startTime: Date.now(),
    duration: 150,
  };

  const damage = getAttackDamage(state.player);

  for (const enemy of room.enemies) {
    if (enemy.dead) continue;
    const dist = distance(state.player, enemy);
    if (dist > ATTACK_RANGE) continue;

    const angleToEnemy = angle(state.player, enemy);
    let angleDiff = Math.abs(angleToEnemy - attackAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff <= ATTACK_ARC_ANGLE / 2) {
      enemy.hp -= damage;
      enemy.damageFlashTime = 0.15;
      addDamageNumber(state, damage, '#ffffff', enemy.x, enemy.y - 20);

      if (enemy.hp <= 0) {
        enemy.dead = true;
        enemy.deathTime = Date.now();
        const room2 = getCurrentRoom(state);
        if (room2) {
          room2.items.push({
            id: `drop-${Date.now()}-${Math.random()}`,
            itemId: enemy.dropItemId,
            x: enemy.x,
            y: enemy.y,
            spawnTime: Date.now(),
          });
        }
      }
    }
  }
}

function triggerProvidence(state: GameState, room: typeof state.rooms extends Map<string, infer R> ? R : never): void {
  let hitCount = 0;
  for (const enemy of room.enemies) {
    if (enemy.dead) continue;
    const dist = distance(state.player, enemy);
    if (dist <= PROVIDENCE_RADIUS) {
      const dmg = Math.max(1, Math.round(enemy.maxHp * 0.4));
      enemy.hp -= dmg;
      enemy.damageFlashTime = 0.4;
      addDamageNumber(state, dmg, '#ffe44d', enemy.x, enemy.y - 20);
      hitCount++;

      if (enemy.hp <= 0) {
        enemy.dead = true;
        enemy.deathTime = Date.now();
        room.items.push({
          id: `drop-${Date.now()}-${Math.random()}`,
          itemId: enemy.dropItemId,
          x: enemy.x,
          y: enemy.y,
          spawnTime: Date.now(),
        });
      }
    }
  }

  // Lightning flash
  state.screenFlash = {
    color: '#ffffcc',
    alpha: 0.75,
    startTime: Date.now(),
    duration: 450,
  };
}

function damagePlayer(state: GameState, damage: number): void {
  state.player.hp -= damage;
  state.player.damageFlashTime = 0.2;
  addDamageNumber(state, damage, '#cc2936', state.player.x, state.player.y - 20);
  if (state.player.hp <= 0) state.player.hp = 0;
}

function addDamageNumber(
  state: GameState,
  value: number,
  color: string,
  x: number,
  y: number
): void {
  state.damageNumbers.push({
    id: `dmg-${Date.now()}-${Math.random()}`,
    x, y, value, color,
    startTime: Date.now(),
    duration: 1000,
  });
}

function addFloatingText(state: GameState, text: string, x: number, y: number): void {
  state.floatingTexts.push({
    id: `txt-${Date.now()}-${Math.random()}`,
    text, x, y,
    startTime: Date.now(),
    duration: 1500,
  });
}

function isPlayerAtDoorway(player: Vector2, doorway: Doorway): boolean {
  const padding = 16;
  const doorCenter = DOORWAY_WIDTH / 2;
  switch (doorway.side) {
    case 'north':
      return player.y < padding + 10 && player.x > ROOM_WIDTH / 2 - doorCenter && player.x < ROOM_WIDTH / 2 + doorCenter;
    case 'south':
      return player.y > ROOM_HEIGHT - padding - 10 && player.x > ROOM_WIDTH / 2 - doorCenter && player.x < ROOM_WIDTH / 2 + doorCenter;
    case 'east':
      return player.x > ROOM_WIDTH - padding - 10 && player.y > ROOM_HEIGHT / 2 - doorCenter && player.y < ROOM_HEIGHT / 2 + doorCenter;
    case 'west':
      return player.x < padding + 10 && player.y > ROOM_HEIGHT / 2 - doorCenter && player.y < ROOM_HEIGHT / 2 + doorCenter;
  }
}

function startRoomTransition(state: GameState, doorway: Doorway): void {
  const toRoomKey = roomKey(doorway.toRoom);
  if (!state.rooms.has(toRoomKey)) return;

  let entryX = ROOM_WIDTH / 2;
  let entryY = ROOM_HEIGHT / 2;
  const padding = 40;

  switch (doorway.side) {
    case 'north': entryY = ROOM_HEIGHT - padding; break;
    case 'south': entryY = padding; break;
    case 'east':  entryX = padding; break;
    case 'west':  entryX = ROOM_WIDTH - padding; break;
  }

  state.transition = {
    active: true,
    fromRoom: state.currentRoom,
    toRoom: doorway.toRoom,
    startTime: Date.now(),
    duration: 300,
    entryPoint: { x: entryX, y: entryY },
  };
}
