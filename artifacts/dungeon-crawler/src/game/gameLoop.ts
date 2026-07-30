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
} from './inventory';

const PLAYER_HITBOX_RADIUS = 12;
const ENEMY_HITBOX_RADIUS = 14;
const NPC_HITBOX_RADIUS = 14;
const ITEM_PICKUP_RADIUS = 16;
const ATTACK_RANGE = 60;
const ATTACK_ARC_ANGLE = Math.PI / 2; // 90 degrees
const DOORWAY_WIDTH = 64;

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

  // If in transition, don't update game state
  if (state.transition && state.transition.active) {
    const elapsed = Date.now() - state.transition.startTime;
    if (elapsed >= state.transition.duration) {
      // Transition complete
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
          // Consume key to prevent immediate advance
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

  // Inventory input
  if (input.isKeyDown('e')) {
    state.inventoryOpen = !state.inventoryOpen;
    input.keys.delete('e');
  }

  if (state.inventoryOpen) {
    // Inventory is handled by React overlay
    return;
  }

  // Hotbar selection
  for (let i = 1; i <= 6; i++) {
    if (input.isKeyDown(i.toString())) {
      state.player.selectedHotbarSlot = i - 1;
      input.keys.delete(i.toString());
    }
  }

  // Use hotbar item (right-click or Q)
  if (input.isKeyDown('q')) {
    const itemId = state.player.hotbar[state.player.selectedHotbarSlot];
    if (itemId) {
      const item = ITEMS[itemId];
      if (item?.type === 'consumable') {
        if (useConsumable(state.player, itemId)) {
          addFloatingText(
            state,
            `Used ${item.name}`,
            state.player.x,
            state.player.y - 20
          );
          // Remove from hotbar if consumed
          const invItem = state.player.inventory.find(
            (i) => i.itemId === itemId
          );
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

    // Check wall collision
    const wallPadding = PLAYER_HITBOX_RADIUS + 16; // room wall thickness
    const canMove =
      newX >= wallPadding &&
      newX <= ROOM_WIDTH - wallPadding &&
      newY >= wallPadding &&
      newY <= ROOM_HEIGHT - wallPadding;

    // Check enemy collision
    let enemyCollision = false;
    for (const enemy of room.enemies) {
      if (enemy.dead) continue;
      const dist = distance({ x: newX, y: newY }, enemy);
      if (dist < PLAYER_HITBOX_RADIUS + ENEMY_HITBOX_RADIUS) {
        enemyCollision = true;
        break;
      }
    }

    // Check NPC collision
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
        state.dialogue.active = true;
        state.dialogue.npcId = npc.id;
        state.dialogue.currentLine = 0;
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
      addFloatingText(
        state,
        `+${itemDef.name}`,
        item.x,
        item.y - 10
      );
      room.items.splice(i, 1);

      // Recalc stats in case it was armor
      recalculateStats(state.player);
    }
  }

  // Enemy AI
  for (const enemy of room.enemies) {
    if (enemy.dead) continue;

    const distToPlayer = distance(enemy, state.player);

    // Aggro check
    if (distToPlayer < 180) {
      enemy.aggro = true;
    }

    if (enemy.aggro) {
      // Move toward player
      const ang = angle(enemy, state.player);
      const moveX = Math.cos(ang) * enemy.speed * dt;
      const moveY = Math.sin(ang) * enemy.speed * dt;
      enemy.x += moveX;
      enemy.y += moveY;

      // Attack player if in range
      if (distToPlayer < 28) {
        const now = Date.now();
        if (now - enemy.lastAttackTime >= enemy.attackCooldown) {
          enemy.lastAttackTime = now;
          damagePlayer(state, 8);
        }
      }
    } else {
      // Patrol
      const now = Date.now();
      if (now < enemy.waypointPauseUntil) {
        // Paused
      } else if (!enemy.waypoint) {
        // Pick new waypoint
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
  if (state.player.damageFlashTime > 0) {
    state.player.damageFlashTime -= dt;
  }
  for (const enemy of room.enemies) {
    if (enemy.damageFlashTime > 0) {
      enemy.damageFlashTime -= dt;
    }
  }

  // Remove old damage numbers
  state.damageNumbers = state.damageNumbers.filter(
    (dn) => Date.now() - dn.startTime < dn.duration
  );

  // Remove old floating texts
  state.floatingTexts = state.floatingTexts.filter(
    (ft) => Date.now() - ft.startTime < ft.duration
  );

  // Clear attack arc if expired
  if (
    state.attackArc &&
    Date.now() - state.attackArc.startTime >= state.attackArc.duration
  ) {
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

  // Calculate attack direction from player to mouse
  const playerScreenX = canvasWidth / 2;
  const playerScreenY = canvasHeight / 2;
  const attackAngle = Math.atan2(
    state.mousePos.y - playerScreenY,
    state.mousePos.x - playerScreenX
  );

  // Create attack arc visual
  state.attackArc = {
    x: state.player.x,
    y: state.player.y,
    angle: attackAngle,
    startTime: Date.now(),
    duration: 150,
  };

  const damage = getAttackDamage(state.player);

  // Check which enemies are hit
  for (const enemy of room.enemies) {
    if (enemy.dead) continue;

    const dist = distance(state.player, enemy);
    if (dist > ATTACK_RANGE) continue;

    const angleToEnemy = angle(state.player, enemy);
    let angleDiff = Math.abs(angleToEnemy - attackAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff <= ATTACK_ARC_ANGLE / 2) {
      // Hit!
      enemy.hp -= damage;
      enemy.damageFlashTime = 0.15;
      addDamageNumber(state, damage, '#ffffff', enemy.x, enemy.y - 20);

      if (enemy.hp <= 0) {
        enemy.dead = true;
        enemy.deathTime = Date.now();
        // Drop item
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
}

function damagePlayer(state: GameState, damage: number): void {
  state.player.hp -= damage;
  state.player.damageFlashTime = 0.2;
  addDamageNumber(
    state,
    damage,
    '#cc2936',
    state.player.x,
    state.player.y - 20
  );

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    // Game over (could add a screen here)
  }
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
    x,
    y,
    value,
    color,
    startTime: Date.now(),
    duration: 1000,
  });
}

function addFloatingText(
  state: GameState,
  text: string,
  x: number,
  y: number
): void {
  state.floatingTexts.push({
    id: `txt-${Date.now()}-${Math.random()}`,
    text,
    x,
    y,
    startTime: Date.now(),
    duration: 1500,
  });
}

function isPlayerAtDoorway(player: Vector2, doorway: Doorway): boolean {
  const padding = 16;
  const doorCenter = DOORWAY_WIDTH / 2;

  switch (doorway.side) {
    case 'north':
      return (
        player.y < padding + 10 &&
        player.x > ROOM_WIDTH / 2 - doorCenter &&
        player.x < ROOM_WIDTH / 2 + doorCenter
      );
    case 'south':
      return (
        player.y > ROOM_HEIGHT - padding - 10 &&
        player.x > ROOM_WIDTH / 2 - doorCenter &&
        player.x < ROOM_WIDTH / 2 + doorCenter
      );
    case 'east':
      return (
        player.x > ROOM_WIDTH - padding - 10 &&
        player.y > ROOM_HEIGHT / 2 - doorCenter &&
        player.y < ROOM_HEIGHT / 2 + doorCenter
      );
    case 'west':
      return (
        player.x < padding + 10 &&
        player.y > ROOM_HEIGHT / 2 - doorCenter &&
        player.y < ROOM_HEIGHT / 2 + doorCenter
      );
  }
}

function startRoomTransition(state: GameState, doorway: Doorway): void {
  const toRoomKey = roomKey(doorway.toRoom);
  if (!state.rooms.has(toRoomKey)) return;

  // Calculate entry point in new room
  let entryX = ROOM_WIDTH / 2;
  let entryY = ROOM_HEIGHT / 2;
  const padding = 40;

  switch (doorway.side) {
    case 'north':
      entryY = ROOM_HEIGHT - padding;
      break;
    case 'south':
      entryY = padding;
      break;
    case 'east':
      entryX = padding;
      break;
    case 'west':
      entryX = ROOM_WIDTH - padding;
      break;
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
