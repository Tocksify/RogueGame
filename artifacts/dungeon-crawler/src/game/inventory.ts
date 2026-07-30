import { Player, InventoryItem, EquippedItems } from './types';
import { ITEMS } from './world';

export function addItem(player: Player, itemId: string, quantity = 1): void {
  const existing = player.inventory.find((i) => i.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    player.inventory.push({ itemId, quantity });
  }
}

export function removeItem(
  player: Player,
  itemId: string,
  quantity = 1
): boolean {
  const existing = player.inventory.find((i) => i.itemId === itemId);
  if (!existing || existing.quantity < quantity) return false;
  existing.quantity -= quantity;
  if (existing.quantity <= 0) {
    player.inventory = player.inventory.filter((i) => i.itemId !== itemId);
  }
  return true;
}

export function equipItem(player: Player, itemId: string): void {
  const item = ITEMS[itemId];
  if (!item) return;

  const slot =
    item.type === 'weapon'
      ? 'weapon'
      : item.type === 'armor'
        ? 'armor'
        : item.type === 'offhand'
          ? 'offhand'
          : item.type === 'accessory'
            ? 'accessory'
            : null;

  if (!slot) return;

  // Unequip current item in that slot
  const current = player.equipped[slot as keyof EquippedItems];
  if (current) {
    addItem(player, current, 1);
  }

  // Remove from inventory
  if (!removeItem(player, itemId, 1)) return;

  // Equip
  player.equipped[slot as keyof EquippedItems] = itemId;

  // Apply stat changes
  recalculateStats(player);
}

export function unequipItem(player: Player, slot: keyof EquippedItems): void {
  const itemId = player.equipped[slot];
  if (!itemId) return;

  addItem(player, itemId, 1);
  player.equipped[slot] = null;

  recalculateStats(player);
}

export function recalculateStats(player: Player): void {
  // Base max HP
  let maxHp = 100;

  // Add bonuses from equipped items
  for (const itemId of Object.values(player.equipped)) {
    if (itemId) {
      const item = ITEMS[itemId];
      if (item?.maxHpBonus) maxHp += item.maxHpBonus;
    }
  }

  player.maxHp = maxHp;
  if (player.hp > player.maxHp) player.hp = player.maxHp;
}

export function useConsumable(player: Player, itemId: string): boolean {
  const item = ITEMS[itemId];
  if (!item || item.type !== 'consumable') return false;

  if (item.healAmount) {
    player.hp = Math.min(player.maxHp, player.hp + item.healAmount);
    return removeItem(player, itemId, 1);
  }

  return false;
}

export function getAttackDamage(player: Player): number {
  let damage = 15; // base damage
  const weaponId = player.equipped.weapon;
  if (weaponId) {
    const weapon = ITEMS[weaponId];
    if (weapon?.damageBonus) damage += weapon.damageBonus;
  }
  return damage;
}
