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
import { SKEL_ATTACK_DURATION_MS } from './enemySprite';
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

export const PLAYER_HITBOX_RADIUS = 20;
export const ENEMY_HITBOX_RADIUS = 20;
const NPC_HITBOX_RADIUS = 14;
const ITEM_PICKUP_RADIUS = 16;
const ATTACK_RANGE = 60;
const ATTACK_ARC_ANGLE = Math.PI / 2;
// Hitbox center is above the feet (bottom-anchor) to align with the visible character body.
// player.y is the feet; hitbox center is (player.x, player.y - HITBOX_OFFSET_Y).
export const HITBOX_OFFSET_Y = 36;
// Enemies and NPCs use the same bottom-anchor convention. These offsets bring
// the collision center up from the feet to the visible body centre.
export const ENEMY_HITBOX_OFFSET_Y = 30; // sprite is 84 px tall; body centre ~30 px above feet
export const NPC_HITBOX_OFFSET_Y = 16;   // procedural sprite; body centre ~16 px above npc.y
// Door trigger: fires when the hitbox CENTER is within this many px of the wall.
// Must be > wallPadding so the trigger zone is reachable.
const DOOR_THRESHOLD = 68;
const DOORWAY_HALF_WIDTH = 40; // half-width of the door opening in pixels
const PROVIDENCE_RADIUS = 220;

// ── Sprite-rect hitboxes ─────────────────────────────────────────────────────
// All sprites are bottom-anchored (.y = feet). These return the AABB in world
// space used for collision detection, attack hits, and hitbox visualisation.
// The draw size is 84×84 for players/enemies, but the actual body is narrower,
// so hitbox width is trimmed to the visible torso/body width.
export const PLAYER_SPRITE_W = 84;
export const PLAYER_SPRITE_H = 84;
export const ENEMY_SPRITE_W  = 84;
export const ENEMY_SPRITE_H  = 84;
export const NPC_SPRITE_W    = 32;
export const NPC_SPRITE_H    = 32;

// ── Hitbox dimensions (damage + door triggers) ───────────────────────────────
// Covers the full visible body so hits / door triggers feel fair.
export const PLAYER_HITBOX_W = 36;
export const PLAYER_HITBOX_H = 74; // feet up through head (sprite is 84 px tall)
export const ENEMY_HITBOX_W  = 36;
export const ENEMY_HITBOX_H  = 74;
export const NPC_HITBOX_W    = 20;
export const NPC_HITBOX_H    = 22;

// ── Collision box dimensions (physical movement blocking only) ────────────────
// Smaller than the hitbox so the player can get close enough to attack / talk.
export const PLAYER_COLL_W = 16;
export const PLAYER_COLL_H = 24; // just the lower body / legs
export const ENEMY_COLL_W  = 16;
export const ENEMY_COLL_H  = 24;

export interface Rect { x: number; y: number; w: number; h: number; }

// Hitbox rects — used for damage detection and door triggers
export function playerRect(p: { x: number; y: number }): Rect {
  return { x: p.x - PLAYER_HITBOX_W / 2, y: p.y - PLAYER_HITBOX_H, w: PLAYER_HITBOX_W, h: PLAYER_HITBOX_H };
}
export function enemyRect(e: { x: number; y: number }): Rect {
  return { x: e.x - ENEMY_HITBOX_W / 2, y: e.y - ENEMY_HITBOX_H, w: ENEMY_HITBOX_W, h: ENEMY_HITBOX_H };
}
export function npcRect(n: { x: number; y: number }): Rect {
  return { x: n.x - NPC_HITBOX_W / 2, y: n.y - NPC_HITBOX_H, w: NPC_HITBOX_W, h: NPC_HITBOX_H };
}

// Collision rects — smaller boxes used only for movement blocking (walls, enemies, NPCs).
// Keeping these small lets the player get close enough to attack and interact.
export function playerCollRect(p: { x: number; y: number }): Rect {
  return { x: p.x - PLAYER_COLL_W / 2, y: p.y - PLAYER_COLL_H, w: PLAYER_COLL_W, h: PLAYER_COLL_H };
}
export function enemyCollRect(e: { x: number; y: number }): Rect {
  return { x: e.x - ENEMY_COLL_W / 2, y: e.y - ENEMY_COLL_H, w: ENEMY_COLL_W, h: ENEMY_COLL_H };
}
export function rectCenter(r: Rect): Vector2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
// Minimum translation vector to push `b` out of `a`. Returns null when not overlapping.
function getRectMTV(a: Rect, b: Rect): Vector2 | null {
  if (!rectsOverlap(a, b)) return null;
  const ox1 = (a.x + a.w) - b.x;   // push b rightward
  const ox2 = (b.x + b.w) - a.x;   // push b leftward
  const oy1 = (a.y + a.h) - b.y;   // push b downward
  const oy2 = (b.y + b.h) - a.y;   // push b upward
  const mx = ox1 < ox2 ? ox1 : -ox2;
  const my = oy1 < oy2 ? oy1 : -oy2;
  return Math.abs(mx) < Math.abs(my) ? { x: mx, y: 0 } : { x: 0, y: my };
}
// Closest point on `rect` to point `p` (used for attack-range checks on large sprites).
function closestPointOnRect(rect: Rect, p: Vector2): Vector2 {
  return {
    x: Math.max(rect.x, Math.min(p.x, rect.x + rect.w)),
    y: Math.max(rect.y, Math.min(p.y, rect.y + rect.h)),
  };
}

function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// ── Hitbox-centre helpers ────────────────────────────────────────────────────
// All sprites are bottom-anchored; .y is the feet. These return the
// collision circle centre in world space so every distance/angle call is
// consistent with the visible body.
function playerCenter(p: { x: number; y: number }): Vector2 {
  return { x: p.x, y: p.y - HITBOX_OFFSET_Y };
}
function enemyCenter(e: { x: number; y: number }): Vector2 {
  return { x: e.x, y: e.y - ENEMY_HITBOX_OFFSET_Y };
}
function npcCenter(n: { x: number; y: number }): Vector2 {
  return { x: n.x, y: n.y - NPC_HITBOX_OFFSET_Y };
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
      state.justTransitioned = true;

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

  // Determine movement bounds (narrowed for hallways).
  // Bounds are in player.y (feet) / player.x (centre) coordinates.
  // We keep the sprite rect fully inside the walkable tile area.
  const xHalf = PLAYER_SPRITE_W / 2 + 8; // centre must be this far from side walls (50 px)
  let xMin = xHalf, xMax = ROOM_WIDTH - xHalf;
  let yMin = PLAYER_SPRITE_H + 8; // feet so top-of-sprite clears the top wall (92 px)
  let yMax = ROOM_HEIGHT - 8;     // feet so sprite clears the bottom wall (312 px)

  if (room.roomType === 'hallway') {
    if (room.hallwayDir === 'horizontal') {
      yMin = Math.max(yMin, 3 * TILE_SIZE + 4 + PLAYER_SPRITE_H);
      yMax = Math.min(yMax, 7 * TILE_SIZE - 4);
    } else {
      xMin = Math.max(xMin, 6 * TILE_SIZE + 4 + PLAYER_SPRITE_W / 2);
      xMax = Math.min(xMax, 9 * TILE_SIZE - 4 - PLAYER_SPRITE_W / 2);
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
      const pr = playerCollRect({ x: px, y: py });
      for (const enemy of room!.enemies) {
        if (enemy.dead) continue;
        if (rectsOverlap(pr, enemyCollRect(enemy))) return true;
      }
      return false;
    }
    function collidesWithNpcs(px: number, py: number): boolean {
      const pr = playerCollRect({ x: px, y: py });
      for (const npc of room!.npcs) {
        if (rectsOverlap(pr, npcRect(npc))) return true;
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
  // If we just arrived via a transition, suppress triggers until the player
  // steps off every doorway zone (prevents instant bounce-back).
  const atAnyDoorway = room.doorways.some(d => isPlayerAtDoorway(state.player, d));
  if (state.justTransitioned) {
    if (!atAnyDoorway) state.justTransitioned = false;
  } else {
    for (const doorway of room.doorways) {
      if (isPlayerAtDoorway(state.player, doorway)) {
        sfxDoorEnter();
        startRoomTransition(state, doorway);
        return;
      }
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
    const dist = distance(rectCenter(playerRect(state.player)), rectCenter(npcRect(npc)));
    if (dist < 60) {
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
    // Enemies only aggro after the player lands a hit on them
    if (enemy.hasBeenHit && !enemy.aggro) {
      sfxEnemyAlert();
      enemy.aggro = true;
    }

    if (enemy.aggro) {
      if (enemy.spriteType === 'skeleton') {
        // ── Skeleton AI ──────────────────────────────────────────────────────
        // State: attacking (locked in place) → walk toward player → attack again
        const now = Date.now();
        const isInAttackAnim = now - enemy.lastAttackTime < SKEL_ATTACK_DURATION_MS;

        if (isInAttackAnim) {
          // Stand completely still while the attack animation plays out
        } else {
          // Walk toward player using the smaller collision rects for angle calc
          const ang = angle(rectCenter(enemyCollRect(enemy)), rectCenter(playerCollRect(state.player)));
          enemy.x += Math.cos(ang) * enemy.speed * dt;
          enemy.y += Math.sin(ang) * enemy.speed * dt;

          // Trigger attack only when hitboxes are actually touching and cooldown is done
          if (
            rectsOverlap(enemyRect(enemy), playerRect(state.player)) &&
            now - enemy.lastAttackTime >= enemy.attackCooldown
          ) {
            enemy.lastAttackTime = now;
            damagePlayer(state, 8);
          }
        }
      } else {
        // ── Default AI (bats, standard enemies) ──────────────────────────────
        const ang = angle(rectCenter(enemyRect(enemy)), rectCenter(playerRect(state.player)));
        enemy.x += Math.cos(ang) * enemy.speed * dt;
        enemy.y += Math.sin(ang) * enemy.speed * dt;

        // Melee: attack whenever the enemy rect overlaps the player rect
        if (rectsOverlap(enemyRect(enemy), playerRect(state.player))) {
          const now = Date.now();
          if (now - enemy.lastAttackTime >= enemy.attackCooldown) {
            enemy.lastAttackTime = now;
            damagePlayer(state, 8);
          }
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

    // Push-apart: use smaller collision rects so enemies don't block from too far away.
    const mtv = getRectMTV(playerCollRect(state.player), enemyCollRect(enemy));
    if (mtv) {
      enemy.x += mtv.x;
      enemy.y += mtv.y;
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
        if (distance(playerCenter(state.player), enemyCenter(enemy)) <= (enemy.explodeRadius ?? 90)) {
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
    const pc = rectCenter(playerRect(state.player));
    const ec = rectCenter(enemyRect(enemy));
    // Use closest point on enemy rect for distance — large sprites are hittable from their edges
    const closest = closestPointOnRect(enemyRect(enemy), pc);
    const dist = distance(pc, closest);
    if (dist > ATTACK_RANGE) continue;

    // Arc direction: centre-to-centre for a stable angle (avoids NaN when overlapping)
    const angleToEnemy = (Math.abs(ec.x - pc.x) < 0.01 && Math.abs(ec.y - pc.y) < 0.01)
      ? attackAngle
      : angle(pc, ec);
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
    if (distance(playerCenter(state.player), enemyCenter(enemy)) <= PROVIDENCE_RADIUS) {
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
  // Use hitbox center (body, not feet) for door triggering
  const hitX = player.x;
  const hitY = player.y - HITBOX_OFFSET_Y;
  const T = DOOR_THRESHOLD;
  const hw = DOORWAY_HALF_WIDTH;
  switch (doorway.side) {
    case 'north':
      return hitY < T && hitX > ROOM_WIDTH / 2 - hw && hitX < ROOM_WIDTH / 2 + hw;
    case 'south':
      return hitY > ROOM_HEIGHT - T && hitX > ROOM_WIDTH / 2 - hw && hitX < ROOM_WIDTH / 2 + hw;
    case 'east':
      return hitX > ROOM_WIDTH - T && hitY > ROOM_HEIGHT / 2 - hw && hitY < ROOM_HEIGHT / 2 + hw;
    case 'west':
      return hitX < T && hitY > ROOM_HEIGHT / 2 - hw && hitY < ROOM_HEIGHT / 2 + hw;
  }
}

function startRoomTransition(state: GameState, doorway: Doorway): void {
  const toRoomKey = roomKey(doorway.toRoom);
  if (!state.rooms.has(toRoomKey)) return;

  // Mark destination as visited
  state.visitedRooms.add(toRoomKey);

  let entryX = ROOM_WIDTH / 2;
  let entryY = ROOM_HEIGHT / 2;
  // xPadding only needs to clear wallPadding (36).
  // yPadding must also clear HITBOX_OFFSET_Y (36) because player.y is feet and
  // yMin = wallPadding + HITBOX_OFFSET_Y = 72; spawning below that locks movement.
  const xPadding = 56; // must be > xMin (PLAYER_SPRITE_W/2 + 8 = 50) so player spawns in-bounds
  const yPadding = 96; // must be > yMin (PLAYER_SPRITE_H + 8 = 92) so player spawns in-bounds

  // For hallway rooms, spawn player in the corridor center
  const destRoom = state.rooms.get(toRoomKey);
  if (destRoom?.roomType === 'hallway') {
    if (destRoom.hallwayDir === 'horizontal') {
      // Horizontal hallway: y corridor runs rows 3–7 (tiles), yMin = 3*TILE_SIZE+4+PLAYER_SPRITE_H = 184
      // ROOM_HEIGHT/2 = 160 is below yMin, so use corridor midpoint instead
      entryY = 3 * TILE_SIZE + 4 + PLAYER_SPRITE_H + 10; // = 194, safely inside [184, 220]
      entryX = doorway.side === 'east' ? xPadding : ROOM_WIDTH - xPadding;
    } else {
      entryX = ROOM_WIDTH / 2;
      entryY = doorway.side === 'south' ? yPadding : ROOM_HEIGHT - yPadding;
    }
  } else {
    switch (doorway.side) {
      case 'north': entryY = ROOM_HEIGHT - yPadding; break;
      case 'south': entryY = yPadding; break;
      case 'east':  entryX = xPadding; break;
      case 'west':  entryX = ROOM_WIDTH - xPadding; break;
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
