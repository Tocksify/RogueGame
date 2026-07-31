/**
 * audio.ts — Sound effect placeholders
 *
 * Every function logs "[SFX] <name>" so you can hear which sound fires
 * and exactly when, then swap in a real implementation later.
 *
 * To wire a real audio file, replace the console.log inside any function
 * with: new Audio('/sounds/<file>.mp3').play()
 * or use a library like Howler.js for pooling + volume control.
 */

function play(name: string): void {
  console.log(`[SFX] ${name}`);
}

// ── UI ────────────────────────────────────────────────────────────────────────

/** Mouse/touch hovers over a button or menu option */
export function sfxUiHover()         { play('ui_hover'); }

/** A UI button or option is clicked/tapped */
export function sfxUiClick()         { play('ui_click'); }

/** Inventory panel slides open */
export function sfxInventoryOpen()   { play('inventory_open'); }

/** Inventory panel closes */
export function sfxInventoryClose()  { play('inventory_close'); }

/** Player equips an item from inventory */
export function sfxEquipItem()       { play('equip_item'); }

/** Player unequips an item */
export function sfxUnequipItem()     { play('unequip_item'); }

/** Hotbar slot selection changes (number key pressed) */
export function sfxHotbarSelect()    { play('hotbar_select'); }

/** Item used from hotbar (Q or double-press) */
export function sfxUseItem()         { play('use_item'); }

/** Shop panel opens */
export function sfxShopOpen()        { play('shop_open'); }

/** Shop panel closes */
export function sfxShopClose()       { play('shop_close'); }

/** Successful item purchase in shop */
export function sfxBuyItem()         { play('buy_item'); }

/** Attempted purchase with insufficient gold */
export function sfxCantAfford()      { play('cant_afford'); }

// ── EXPLORATION ───────────────────────────────────────────────────────────────

/** Player walks over and auto-picks up a floor item */
export function sfxPickupItem()      { play('pickup_item'); }

/** Player picks up gold coins */
export function sfxPickupGold()      { play('pickup_gold'); }

/** Player steps through a doorway (transition begins) */
export function sfxDoorEnter()       { play('door_enter'); }

/** Entering a standard combat room */
export function sfxRoomEnterNormal() { play('room_enter_normal'); }

/** Entering the shop room */
export function sfxRoomEnterShop()   { play('room_enter_shop'); }

/** Entering a treasure room */
export function sfxRoomEnterTreasure() { play('room_enter_treasure'); }

/** Entering a trap room */
export function sfxRoomEnterTrap()   { play('room_enter_trap'); }

/** Entering the shrine/advancement room */
export function sfxRoomEnterShrine() { play('room_enter_shrine'); }

/** Entering a hallway corridor between rooms */
export function sfxRoomEnterHallway() { play('room_enter_hallway'); }

// ── COMBAT ────────────────────────────────────────────────────────────────────

/** Player swings their weapon (plays even on miss) */
export function sfxAttackSwing()     { play('attack_swing'); }

/** Player's weapon connects with an enemy */
export function sfxAttackHit()       { play('attack_hit'); }

/** Player's swing hits no target */
export function sfxAttackMiss()      { play('attack_miss'); }

/** Player takes damage from any source */
export function sfxPlayerHurt()      { play('player_hurt'); }

/** Player HP reaches zero */
export function sfxPlayerDeath()     { play('player_death'); }

/** An enemy takes a hit from the player */
export function sfxEnemyHurt()       { play('enemy_hurt'); }

/** A normal enemy dies */
export function sfxEnemyDeath()      { play('enemy_death'); }

/** An exploding enemy's death boom */
export function sfxEnemyExplode()    { play('enemy_explode'); }

/** Enemy spots the player and becomes aggressive */
export function sfxEnemyAlert()      { play('enemy_alert'); }

/** A pressure-plate trap fires (spikes pop up) */
export function sfxTrapTrigger()     { play('trap_trigger'); }

/** Trap spikes retract after cooldown */
export function sfxTrapReset()       { play('trap_reset'); }

// ── SPECIAL / MAGIC ───────────────────────────────────────────────────────────

/** Player presses F to interact with the shrine */
export function sfxShrineActivate()  { play('shrine_activate'); }

/** Shrine grants the HP bonus */
export function sfxShrineGrantHp()   { play('shrine_grant_hp'); }

/** Player tries to use an already-spent shrine */
export function sfxShrineUsed()      { play('shrine_already_used'); }

/** Player drinks a heal potion or consumable */
export function sfxHealConsume()     { play('heal_consume'); }

/** Screen flash effect (damage taken, level up, etc.) */
export function sfxScreenFlash()     { play('screen_flash'); }
