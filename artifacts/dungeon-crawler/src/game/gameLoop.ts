import {
  GameState,
  Enemy,
  Vector2,
  DamageNumber,
  FloatingText,
  FloorItem,
  Doorway,
  Room,
} from './types';
import { InputState } from './input';
import { roomKey, ROOM_WIDTH, ROOM_HEIGHT, TILE_SIZE, ITEMS } from './world';
import {
  addItem,
  useConsumable,
  getAttackDamage,
  recalculateStats,
  removeItem,
} from './inventory';
import {
  sfxDoorEnter,
  sfxInventoryOpen,
  sfxInventoryClose,
  sfxHotbarSelect,
  sfxUseItem,
  sfxShopOpen,
  sfxShrineActivate,
  sfxShrineGrantHp,
  sfxShrineUsed,
  sfxPickupItem,
  sfxTrapTrigger,
  sfxTrapReset,
  sfxAttackSwing,
  sfxAttackHit,
  sfxAttackMiss,
  sfxPlayerHurt,
  sfxPlayerDeath,
  sfxEnemyHurt,
  sfxEnemyDeath,
  sfxEnemyExplode,
  sfxEnemyAlert,
  sfxHealConsume,
  sfxRoomEnterNormal,
  sfxRoomEnterShop,
  sfxRoomEnterTreasure,
  sfxRoomEnterTrap,
  sfxRoomEnterShrine,
  sfxRoomEnterHallway,
} from './audio';

const PLAYER_HITBOX_RADIUS = 20;
const ENEMY_HITBOX_RADIUS = 20;
const NPC_HITBOX_RADIUS = 14;
const ITEM_PICKUP_RADIUS = 16;
const ATTACK_RANGE = 60;
const ATTACK_ARC_ANGLE = Math.PI / 2;
// Door trigger threshold: player must be within this many pixels of the wall edge.
// Must be >= wallPadding (PLAYER_HITBOX_RADIUS + 16 = 28) so the door is reachable.
const DOOR_THRESHOLD = 36;
const DOORWAY_HALF_WIDTH = 40; // half-width of the door opening in pixels
const PROVIDENCE_RADIUS = 220;

function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
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
  if (state.screenFlash && Date.now() - state.screenFlash.startTime >= state.screenFlash.duration) {
    state.screenFlash = null;
  }

  // Expire room entry text
  if (state.roomEntryText && Date.now() - state.roomEntryText.startTime > 2200) {
    state.roomEntryText = null;
  }

  // Expire item pickup banner
  if (state.itemPickupBanner && Date.now() - state.itemPickupBanner.startTime > 2000) {
    state.itemPickupBanner = null;
  }

  // If in transition, don't update game state
  if (state.transition && state.transition.active) {
    const elapsed = Date.now() - state.transition.startTime;
    if (elapsed >= state.transition.duration) {
      state.currentRoom = state.transition.toRoom;
      state.player.x = state.transition.entryPoint.x;
      state.player.y = state.transition.entryPoint.y;
      state.transition = null;

      // Show room label on entry + play room-type sound
      const newRoom = state.rooms.get(roomKey(state.currentRoom));
      if (newRoom?.label) {
        state.roomEntryText = { text: newRoom.label, startTime: Date.now() };
      }
      switch (newRoom?.roomType) {
        case 'shop':        sfxRoomEnterShop();      break;
        case 'treasure':    sfxRoomEnterTreasure();  break;
        case 'trap':        sfxRoomEnterTrap();      break;
        case 'advancement': sfxRoomEnterShrine();    break;
        case 'hallway':     sfxRoomEnterHallway();   break;
        default:            sfxRoomEnterNormal();    break;
      }
    }
    return;
  }

  // Dialogue input
  if (state.dialogue.active) {
    if (input.isKeyDown(' ') || input.isKeyDown('enter')) {
      const npc = getCurrentRoom(state)?.npcs.find(n => n.id === state.dialogue.npcId);
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
  if (state.shopOpen) return;

  // Inventory input
  if (input.isKeyDown('e')) {
    state.inventoryOpen = !state.inventoryOpen;
    state.inventoryOpen ? sfxInventoryOpen() : sfxInventoryClose();
    input.keys.delete('e');
  }
  if (state.inventoryOpen) return;

  // Hotbar selection (1-6): if already selected, use the item
  for (let i = 1; i <= 6; i++) {
    if (input.isKeyDown(i.toString())) {
      const slotIndex = i - 1;
      if (state.player.selectedHotbarSlot === slotIndex) {
        // Already selected — use the item
        tryUseHotbarItem(state, slotIndex);
      } else {
        state.player.selectedHotbarSlot = slotIndex;
        sfxHotbarSelect();
      }
      input.keys.delete(i.toString());
    }
  }

  // Use hotbar item (Q)
  if (input.isKeyDown('q')) {
    tryUseHotbarItem(state, state.player.selectedHotbarSlot);
    input.keys.delete('q');
  }

  const room = getCurrentRoom(state);
  if (!room) return;

  // Determine movement bounds (narrowed for hallways)
  const wallPadding = PLAYER_HITBOX_RADIUS + 16; // 28
  let xMin = wallPadding, xMax = ROOM_WIDTH - wallPadding;
  let yMin = wallPadding, yMax = ROOM_HEIGHT - wallPadding;

  if (room.roomType === 'hallway') {
    if (room.hallwayDir === 'horizontal') {
      // Corridor runs through center rows 3-6 (tiles), with a bit of padding
      yMin = Math.max(wallPadding, 3 * TILE_SIZE + 4);
      yMax = Math.min(ROOM_HEIGHT - wallPadding, 7 * TILE_SIZE - 4);
    } else {
      // Vertical corridor through center columns 6-8
      xMin = Math.max(wallPadding, 6 * TILE_SIZE + 4);
      xMax = Math.min(ROOM_WIDTH - wallPadding, 9 * TILE_SIZE - 4);
    }
  }

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

    // Axis-separated collision: try full move, then X-only, then Y-only.
    // This lets the player slide along enemies/NPCs instead of getting stuck.
    function collidesWithEnemies(px: number, py: number): boolean {
      for (const enemy of room.enemies) {
        if (enemy.dead) continue;
        if (distance({ x: px, y: py }, enemy) < PLAYER_HITBOX_RADIUS + ENEMY_HITBOX_RADIUS) return true;
      }
      return false;
    }
    function collidesWithNpcs(px: number, py: number): boolean {
      for (const npc of room.npcs) {
        if (distance({ x: px, y: py }, npc) < PLAYER_HITBOX_RADIUS + NPC_HITBOX_RADIUS) return true;
      }
      return false;
    }
    function inBounds(px: number, py: number): boolean {
      return px >= xMin && px <= xMax && py >= yMin && py <= yMax;
    }

    // Try full move
    if (inBounds(newX, newY) && !collidesWithEnemies(newX, newY) && !collidesWithNpcs(newX, newY)) {
      state.player.x = newX;
      state.player.y = newY;
    // Slide along Y (X blocked)
    } else if (inBounds(state.player.x, newY) && !collidesWithEnemies(state.player.x, newY) && !collidesWithNpcs(state.player.x, newY)) {
      state.player.y = newY;
    // Slide along X (Y blocked)
    } else if (inBounds(newX, state.player.y) && !collidesWithEnemies(newX, state.player.y) && !collidesWithNpcs(newX, state.player.y)) {
      state.player.x = newX;
    }

    // Update facing direction from movement vector
    state.player.facingAngle = Math.atan2(moveDir.y, moveDir.x);
    state.player.isMoving = true;
  } else {
    state.player.isMoving = false;
  }

  // Check doorway transitions
  for (const doorway of room.doorways) {
    if (isPlayerAtDoorway(state.player, doorway)) {
      sfxDoorEnter();
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

  // NPC interaction
  state.nearbyNpc = null;
  for (const npc of room.npcs) {
    const dist = distance(state.player, npc);
    if (dist < 45) {
      state.nearbyNpc = npc.id;
      if (input.isKeyDown('f')) {
        if (npc.isShopkeeper) {
          state.shopOpen = true;
          sfxShopOpen();
        } else if (npc.isShrine && !npc.shrineUsed) {
          // Shrine blessing
          sfxShrineActivate();
          npc.shrineUsed = true;
          const effect = npc.shrineEffect ?? 'hp';
          if (effect === 'hp') {
            state.player.maxHp += 25;
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
            addFloatingText(state, '+25 MAX HP!', state.player.x, state.player.y - 30);
            sfxShrineGrantHp();
          } else if (effect === 'atk') {
            addFloatingText(state, '+10 ATK!', state.player.x, state.player.y - 30);
            sfxShrineGrantHp();
          }
          state.screenFlash = { color: '#aaddff', alpha: 0.35, startTime: Date.now(), duration: 500 };
          state.dialogue.active = true;
          state.dialogue.npcId = npc.id;
          state.dialogue.currentLine = 0;
        } else if (npc.isShrine && npc.shrineUsed) {
          sfxShrineUsed();
        } else if (!npc.isShrine) {
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
    if (distance(state.player, item) < ITEM_PICKUP_RADIUS) {
      addItem(state.player, item.itemId, 1);
      const itemDef = ITEMS[item.itemId];
      const itemName = itemDef?.name ?? item.itemId;
      // Show centered top-screen banner instead of floor-level floating text
      state.itemPickupBanner = { text: `+ ${itemName}`, startTime: Date.now() };
      sfxPickupItem();
      room.items.splice(i, 1);
      recalculateStats(state.player);
    }
  }

  // Trap damage (trap rooms)
  if (room.traps && room.traps.length > 0) {
    const now = Date.now();
    const playerTileX = Math.floor(state.player.x / TILE_SIZE);
    const playerTileY = Math.floor(state.player.y / TILE_SIZE);
    for (const trap of room.traps) {
      if (Math.abs(trap.tileX - playerTileX) <= 1 && Math.abs(trap.tileY - playerTileY) <= 1) {
        if (now - trap.lastTriggerTime >= trap.cooldownMs) {
          trap.lastTriggerTime = now;
          trap.triggerFlash = 1;
          damagePlayer(state, trap.damage);
          addFloatingText(state, 'TRAP!', state.player.x, state.player.y - 20);
          sfxTrapTrigger();
        }
      } else if (trap.triggerFlash > 0.05 && trap.triggerFlash - dt * 3 <= 0.05) {
        sfxTrapReset(); // spikes retract
      }
      // Decay flash
      if (trap.triggerFlash > 0) {
        trap.triggerFlash = Math.max(0, trap.triggerFlash - dt * 3);
      }
    }
  }

  // Enemy AI
  for (const enemy of room.enemies) {
    if (enemy.dead) continue;
    const distToPlayer = distance(enemy, state.player);
    // Enemies only aggro after the player lands a hit on them
    if (enemy.hasBeenHit && !enemy.aggro) {
      sfxEnemyAlert();
      enemy.aggro = true;
    }

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

    // Push-apart: never let an enemy occupy the same space as the player.
    // After every move, if they overlap, push the enemy back out.
    const MIN_DIST = PLAYER_HITBOX_RADIUS + ENEMY_HITBOX_RADIUS;
    const postDist = distance(enemy, state.player);
    if (postDist < MIN_DIST && postDist > 0.01) {
      const pushAng = angle(state.player, enemy); // away from player
      const overlap = MIN_DIST - postDist;
      enemy.x += Math.cos(pushAng) * overlap;
      enemy.y += Math.sin(pushAng) * overlap;
    } else if (postDist <= 0.01) {
      // Exactly on top — push in a fixed direction to avoid NaN
      enemy.x += MIN_DIST;
    }
  }

  // Fade damage flash
  if (state.player.damageFlashTime > 0) state.player.damageFlashTime -= dt;
  for (const enemy of room.enemies) {
    if (enemy.damageFlashTime > 0) enemy.damageFlashTime -= dt;
  }

  // Remove old damage numbers and floating texts
  state.damageNumbers = state.damageNumbers.filter(dn => Date.now() - dn.startTime < dn.duration);
  state.floatingTexts = state.floatingTexts.filter(ft => Date.now() - ft.startTime < ft.duration);

  // Clear attack arc
  if (state.attackArc && Date.now() - state.attackArc.startTime >= state.attackArc.duration) {
    state.attackArc = null;
  }

  // Chaser explosion countdown
  for (const enemy of room.enemies) {
    if (enemy.dead && enemy.enemyType === 'chaser' && !enemy.exploded) {
      if (Date.now() >= (enemy.explodeTime ?? Infinity)) {
        enemy.exploded = true;
        sfxEnemyExplode();
        if (distance(state.player, enemy) <= (enemy.explodeRadius ?? 90)) {
          damagePlayer(state, enemy.explodeDamage ?? 40);
          addFloatingText(state, 'BOOM!', enemy.x, enemy.y - 30);
        }
        state.screenFlash = { color: '#ff3300', alpha: 0.55, startTime: Date.now(), duration: 350 };
      }
    }
  }

  // Remove dead enemies after fade
  for (let i = room.enemies.length - 1; i >= 0; i--) {
    const enemy = room.enemies[i];
    if (!enemy.dead) continue;
    if (enemy.enemyType === 'chaser') {
      if (enemy.exploded && Date.now() - (enemy.explodeTime ?? enemy.deathTime) > 600) {
        room.enemies.splice(i, 1);
      }
    } else if (Date.now() - enemy.deathTime > 2000) {
      room.enemies.splice(i, 1);
    }
  }
}

function tryUseHotbarItem(state: GameState, slotIndex: number): void {
  const itemId = state.player.hotbar[slotIndex];
  if (!itemId) return;
  const item = ITEMS[itemId];
  const room = getCurrentRoom(state);

  if (item?.type === 'consumable' && item.healAmount) {
    if (useConsumable(state.player, itemId)) {
      sfxHealConsume();
      sfxUseItem();
      addFloatingText(state, `+${item.healAmount} HP`, state.player.x, state.player.y - 20);
      const invItem = state.player.inventory.find(i => i.itemId === itemId);
      if (!invItem || invItem.quantity === 0) {
        state.player.hotbar[slotIndex] = null;
      }
    }
  } else if (item?.type === 'active') {
    if (item.effect === 'providence' && room) {
      triggerProvidence(state, room);
      removeItem(state.player, itemId, 1);
      addFloatingText(state, 'Providence!', state.player.x, state.player.y - 30);
      const invItem = state.player.inventory.find(i => i.itemId === itemId);
      if (!invItem || invItem.quantity === 0) {
        state.player.hotbar[slotIndex] = null;
      }
    }
  }
}

function getCurrentRoom(state: GameState): Room | undefined {
  return state.rooms.get(roomKey(state.currentRoom));
}

function performPlayerAttack(state: GameState, canvasWidth: number, canvasHeight: number): void {
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

  sfxAttackSwing();

  const damage = getAttackDamage(state.player);
  let hitAny = false;

  for (const enemy of room.enemies) {
    if (enemy.dead) continue;
    const dist = distance(state.player, enemy);
    if (dist > ATTACK_RANGE) continue;

    const angleToEnemy = angle(state.player, enemy);
    let angleDiff = Math.abs(angleToEnemy - attackAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff <= ATTACK_ARC_ANGLE / 2) {
      hitAny = true;
      enemy.hasBeenHit = true;
      enemy.hp -= damage;
      enemy.damageFlashTime = 0.15;
      addDamageNumber(state, damage, '#ffffff', enemy.x, enemy.y - 20);
      sfxEnemyHurt();

      if (enemy.hp <= 0) {
        enemy.dead = true;
        enemy.deathTime = Date.now();
        if (enemy.enemyType === 'chaser' && enemy.explodeDelay !== undefined) {
          enemy.explodeTime = enemy.deathTime + enemy.explodeDelay;
          enemy.exploded = false;
          addFloatingText(state, '!', enemy.x, enemy.y - 30);
          sfxEnemyExplode();
        } else {
          sfxEnemyDeath();
        }
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

  if (!hitAny) sfxAttackMiss();
}

function triggerProvidence(state: GameState, room: Room): void {
  for (const enemy of room.enemies) {
    if (enemy.dead) continue;
    if (distance(state.player, enemy) <= PROVIDENCE_RADIUS) {
      const dmg = Math.max(1, Math.round(enemy.maxHp * 0.4));
      enemy.hp -= dmg;
      enemy.damageFlashTime = 0.4;
      addDamageNumber(state, dmg, '#ffe44d', enemy.x, enemy.y - 20);
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
  state.screenFlash = { color: '#ffffcc', alpha: 0.75, startTime: Date.now(), duration: 450 };
}

function damagePlayer(state: GameState, damage: number): void {
  state.player.hp -= damage;
  state.player.damageFlashTime = 0.2;
  addDamageNumber(state, damage, '#cc2936', state.player.x, state.player.y - 20);
  if (state.player.hp <= 0) {
    sfxPlayerDeath();
  } else {
    sfxPlayerHurt();
  }
  if (state.player.hp <= 0) state.player.hp = 0;
}

function addDamageNumber(state: GameState, value: number, color: string, x: number, y: number): void {
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
  const T = DOOR_THRESHOLD;
  const hw = DOORWAY_HALF_WIDTH;
  switch (doorway.side) {
    case 'north':
      return player.y < T && player.x > ROOM_WIDTH / 2 - hw && player.x < ROOM_WIDTH / 2 + hw;
    case 'south':
      return player.y > ROOM_HEIGHT - T && player.x > ROOM_WIDTH / 2 - hw && player.x < ROOM_WIDTH / 2 + hw;
    case 'east':
      return player.x > ROOM_WIDTH - T && player.y > ROOM_HEIGHT / 2 - hw && player.y < ROOM_HEIGHT / 2 + hw;
    case 'west':
      return player.x < T && player.y > ROOM_HEIGHT / 2 - hw && player.y < ROOM_HEIGHT / 2 + hw;
  }
}

function startRoomTransition(state: GameState, doorway: Doorway): void {
  const toRoomKey = roomKey(doorway.toRoom);
  if (!state.rooms.has(toRoomKey)) return;

  // Mark destination as visited
  state.visitedRooms.add(toRoomKey);

  let entryX = ROOM_WIDTH / 2;
  let entryY = ROOM_HEIGHT / 2;
  const padding = 40;

  // For hallway rooms, spawn player in the corridor center
  const destRoom = state.rooms.get(toRoomKey);
  if (destRoom?.roomType === 'hallway') {
    if (destRoom.hallwayDir === 'horizontal') {
      entryY = ROOM_HEIGHT / 2;
      entryX = doorway.side === 'east' ? padding : ROOM_WIDTH - padding;
    } else {
      entryX = ROOM_WIDTH / 2;
      entryY = doorway.side === 'south' ? padding : ROOM_HEIGHT - padding;
    }
  } else {
    switch (doorway.side) {
      case 'north': entryY = ROOM_HEIGHT - padding; break;
      case 'south': entryY = padding; break;
      case 'east':  entryX = padding; break;
      case 'west':  entryX = ROOM_WIDTH - padding; break;
    }
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
