import { ItemDef, Room, Enemy, NPC, FloorItem, Vector2, Rarity } from './types';
import { getNpcAppearance } from './sprite';

// ── RARITY COLOURS (used by renderer for item borders) ───────────────
export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#888888',
  uncommon:  '#4caf50',
  rare:      '#2196f3',
  epic:      '#9c27b0',
  legendary: '#ff9800',
  chromatic: 'rainbow', // handled specially in renderer
};

export const RARITY_PRICES: Record<Rarity, number> = {
  common:    50,
  uncommon:  200,
  rare:      500,
  epic:      1200,
  legendary: 3000,
  chromatic: 7500,
};

// ── ITEM REGISTRY ─────────────────────────────────────────────────────
export const ITEMS: Record<string, ItemDef> = {

  // ── WEAPONS ──────────────────────────────────────────────────────────
  'splinters': {
    id: 'splinters', name: 'Splinters', type: 'weapon', rarity: 'common',
    description: 'Shards of rotten wood. Better than bare hands.',
    price: 50,
    icon: { shape: 'rect', color: '#6b4c2a' },
    damageBonus: 5,
  },
  'wooden-sword': {
    id: 'wooden-sword', name: 'Wooden Sword', type: 'weapon', rarity: 'uncommon',
    description: 'A crude but reliable blade carved from dungeon timber.',
    price: 200,
    icon: { shape: 'rect', color: '#8B4513' },
    damageBonus: 8,
  },
  'iron-sword': {
    id: 'iron-sword', name: 'Iron Sword', type: 'weapon', rarity: 'rare',
    description: 'Forged in fire. Dependable in the dark.',
    price: 500,
    icon: { shape: 'rect', color: '#C0C0C0' },
    damageBonus: 18,
  },
  'dragon-head': {
    id: 'dragon-head', name: 'Dragon Head', type: 'weapon', rarity: 'epic',
    description: 'The skull of an ancient wyrm, repurposed as a weapon. Breathes ruin.',
    price: 1200,
    icon: { shape: 'rect', color: '#e05020' },
    damageBonus: 30,
  },
  'godhead': {
    id: 'godhead', name: 'Godhead', type: 'weapon', rarity: 'legendary',
    description: 'A weapon of divine origin. Each strike carries the weight of creation.',
    price: 3000,
    icon: { shape: 'rect', color: '#ffe566' },
    damageBonus: 50,
  },

  // ── ARMOR ─────────────────────────────────────────────────────────────
  'leather-tunic': {
    id: 'leather-tunic', name: 'Leather Tunic', type: 'armor', rarity: 'uncommon',
    description: 'Supple hides stitched together in haste.',
    price: 200,
    icon: { shape: 'trapezoid', color: '#d2b48c' },
    maxHpBonus: 20,
  },
  'birthright': {
    id: 'birthright', name: 'Birthright', type: 'armor', rarity: 'rare',
    description: 'Armor passed down through sacred bloodlines. It remembers every battle.',
    price: 500,
    icon: { shape: 'trapezoid', color: '#8899cc' },
    maxHpBonus: 30,
  },
  'holy-mantle': {
    id: 'holy-mantle', name: 'Holy Mantle', type: 'armor', rarity: 'epic',
    description: 'A sacred mantle that absorbs divine punishment. The first hit always misses.',
    price: 1200,
    icon: { shape: 'trapezoid', color: '#d4a8ff' },
    maxHpBonus: 50,
  },

  // ── OFFHAND ───────────────────────────────────────────────────────────
  'iron-shield': {
    id: 'iron-shield', name: 'Iron Shield', type: 'offhand', rarity: 'uncommon',
    description: 'Cold iron. Reliable. Nothing more.',
    price: 200,
    icon: { shape: 'hexagon', color: '#C0C0C0' },
    maxHpBonus: 15,
  },

  // ── PERKS (passive, auto-apply from inventory) ────────────────────────
  'lambs-blood': {
    id: 'lambs-blood', name: 'Lambs Blood', type: 'perk', rarity: 'uncommon',
    description: 'Marked by the innocent. A shield against the unworthy.',
    price: 200,
    icon: { shape: 'circle', color: '#cc5566' },
    maxHpBonus: 20,
  },
  'right-of-birth': {
    id: 'right-of-birth', name: 'Right of Birth', type: 'perk', rarity: 'uncommon',
    description: 'Your lineage is a weapon. Your blood knows how to fight.',
    price: 200,
    icon: { shape: 'circle', color: '#88aacc' },
    damageBonus: 8,
  },
  'testament': {
    id: 'testament', name: 'Testament', type: 'perk', rarity: 'rare',
    description: 'Written in the blood of the faithful. It endures.',
    price: 500,
    icon: { shape: 'circle', color: '#aaccee' },
    maxHpBonus: 15,
    damageBonus: 8,
  },
  'benediction': {
    id: 'benediction', name: 'Benediction', type: 'perk', rarity: 'rare',
    description: 'A holy blessing upon your strikes. Each blow carries divine weight.',
    price: 500,
    icon: { shape: 'circle', color: '#eeddaa' },
    damageBonus: 12,
  },
  'cell-of-god': {
    id: 'cell-of-god', name: 'Cell of God', type: 'perk', rarity: 'rare',
    description: 'A fragment of divine life embedded within you. Unyielding vitality.',
    price: 500,
    icon: { shape: 'circle', color: '#88ffcc' },
    maxHpBonus: 30,
  },
  'living-stone': {
    id: 'living-stone', name: 'Living Stone', type: 'perk', rarity: 'rare',
    description: 'Stone that breathes. Stone that endures. Become unmovable.',
    price: 500,
    icon: { shape: 'circle', color: '#aaaaaa' },
    maxHpBonus: 25,
  },
  'first-flesh': {
    id: 'first-flesh', name: 'First Flesh', type: 'perk', rarity: 'epic',
    description: 'The primordial body, before death existed. Before gods knew suffering.',
    price: 1200,
    icon: { shape: 'circle', color: '#ffaa88' },
    maxHpBonus: 40,
  },
  'god-corpse': {
    id: 'god-corpse', name: 'God Corpse', type: 'perk', rarity: 'epic',
    description: 'The remains of a fallen deity. Even in death, it grants power.',
    price: 1200,
    icon: { shape: 'circle', color: '#ccaaff' },
    maxHpBonus: 28,
    damageBonus: 12,
  },
  'world-seed': {
    id: 'world-seed', name: 'World Seed', type: 'perk', rarity: 'legendary',
    description: 'The origin of all creation. Hold it and feel the weight of everything.',
    price: 3000,
    icon: { shape: 'circle', color: '#66ffaa' },
    maxHpBonus: 35,
    damageBonus: 18,
  },
  'legacy': {
    id: 'legacy', name: 'Legacy', type: 'perk', rarity: 'legendary',
    description: 'The weight of all who came before you. Their sacrifice amplifies every strike.',
    price: 3000,
    icon: { shape: 'circle', color: '#ffcc44' },
    damageBonus: 22,
  },
  'hollow-god': {
    id: 'hollow-god', name: 'Hollow God', type: 'perk', rarity: 'legendary',
    description: 'A god emptied of mercy. What remains is pure, unrestrained power.',
    price: 3000,
    icon: { shape: 'circle', color: '#cc88ff' },
    damageBonus: 30,
  },

  // ── CHROMATIC PAIR: CREED & CHROMACY ─────────────────────────────────
  'creed': {
    id: 'creed', name: 'Creed', type: 'perk', rarity: 'chromatic',
    description: 'A binding oath etched into your soul. Alone, it sharpens. With Chromacy, it becomes everything.',
    price: 7500,
    icon: { shape: 'hexagon', color: '#ffffff' },
    damageBonus: 25,
  },
  'chromacy': {
    id: 'chromacy', name: 'Chromacy', type: 'perk', rarity: 'chromatic',
    description: 'The spectrum of all things. Alone, it fortifies. With Creed, it becomes everything.',
    price: 7500,
    icon: { shape: 'hexagon', color: '#ffffff' },
    maxHpBonus: 50,
  },

  // ── ACTIVE / CONSUMABLE ITEMS (hotbar) ────────────────────────────────
  'husk': {
    id: 'husk', name: 'Husk', type: 'consumable', rarity: 'common',
    description: 'An empty vessel holding just enough to keep you going.',
    price: 50,
    icon: { shape: 'circle', color: '#996633' },
    healAmount: 15,
  },
  'health-potion': {
    id: 'health-potion', name: 'Health Potion', type: 'consumable', rarity: 'uncommon',
    description: 'A vial of crimson restoration. The dungeon standard.',
    price: 200,
    icon: { shape: 'circle', color: '#cc2936' },
    healAmount: 40,
  },
  'primordial-cell': {
    id: 'primordial-cell', name: 'Primordial Cell', type: 'consumable', rarity: 'uncommon',
    description: 'A primal unit of divine matter. Consumes itself to restore you.',
    price: 200,
    icon: { shape: 'circle', color: '#44ddaa' },
    healAmount: 30,
  },
  'anomaly': {
    id: 'anomaly', name: 'Anomaly', type: 'consumable', rarity: 'rare',
    description: 'An inexplicable phenomenon. Reality bends to mend your wounds.',
    price: 500,
    icon: { shape: 'circle', color: '#44aaff' },
    healAmount: 50,
  },
  'heart-of-chimera': {
    id: 'heart-of-chimera', name: 'Heart of Chimera', type: 'consumable', rarity: 'epic',
    description: 'A monstrous heart that refuses to stop beating. Transfers its vitality to you.',
    price: 1200,
    icon: { shape: 'circle', color: '#ff6688' },
    healAmount: 75,
  },
  'providence': {
    id: 'providence', name: 'Providence', type: 'active', rarity: 'legendary',
    description: 'Divine intervention. Calls lightning upon all nearby enemies, dealing 40% of their max HP.',
    price: 3000,
    icon: { shape: 'hexagon', color: '#ffe44d' },
    effect: 'providence',
  },

  // ── QUEST ─────────────────────────────────────────────────────────────
  'dungeon-key': {
    id: 'dungeon-key', name: 'Dungeon Key', type: 'quest', rarity: 'rare',
    description: 'Opens something. Somewhere. Keep it.',
    price: 0,
    icon: { shape: 'key', color: '#e0c840' },
  },
};

export const ROOM_WIDTH = 480;
export const ROOM_HEIGHT = 320;
export const TILE_SIZE = 32;

let itemIdCounter = 0;

function createFloorItem(itemId: string, x: number, y: number): FloorItem {
  return {
    id: `item-${itemIdCounter++}`,
    itemId,
    x,
    y,
    spawnTime: Date.now(),
  };
}

let enemyIdCounter = 0;

function createEnemy(
  x: number,
  y: number,
  appearanceId: string,
  baseColor: string,
  dropItemId: string
): Enemy {
  return {
    id: `enemy-${enemyIdCounter++}`,
    x,
    y,
    hp: 30,
    maxHp: 30,
    speed: 80,
    aggro: false,
    lastAttackTime: 0,
    attackCooldown: 1500,
    waypoint: null,
    waypointPauseUntil: 0,
    appearance: getNpcAppearance(appearanceId, baseColor),
    damageFlashTime: 0,
    dead: false,
    deathTime: 0,
    dropItemId,
    enemyType: 'standard',
  };
}

/** A fast red enemy that explodes 1.5 s after death. Run! */
function createChaserEnemy(x: number, y: number): Enemy {
  return {
    id: `enemy-${enemyIdCounter++}`,
    x,
    y,
    hp: 45,
    maxHp: 45,
    speed: 145,
    aggro: true, // always chasing from spawn
    lastAttackTime: 0,
    attackCooldown: 1200,
    waypoint: null,
    waypointPauseUntil: 0,
    appearance: getNpcAppearance('skeleton-1', '#cc3311'),
    damageFlashTime: 0,
    dead: false,
    deathTime: 0,
    dropItemId: 'health-potion',
    enemyType: 'chaser',
    explodeDelay: 1500,
    explodeRadius: 90,
    explodeDamage: 40,
    exploded: false,
  };
}

/** The Greed boss. */
function createGreedBoss(): Enemy {
  return {
    id: `enemy-${enemyIdCounter++}`,
    x: 240,
    y: 160,
    hp: 500,
    maxHp: 500,
    speed: 52,
    aggro: false,
    lastAttackTime: 0,
    attackCooldown: 900,
    waypoint: null,
    waypointPauseUntil: 0,
    appearance: getNpcAppearance('merchant', '#c8a800'),
    damageFlashTime: 0,
    dead: false,
    deathTime: 0,
    dropItemId: 'godhead',
    enemyType: 'boss',
    isBoss: true,
    bossName: 'Greed',
  };
}

export function createWorld(): Map<string, Room> {
  const rooms = new Map<string, Room>();

  // ── Starting room (0,0) ──────────────────────────────────────────────
  rooms.set('0,0', {
    coord: { x: 0, y: 0 },
    enemies: [],
    npcs: [
      {
        id: 'elder-mira',
        name: 'Elder Mira',
        x: 120,
        y: 160,
        dialogue: [
          'Ah, a new soul finds their way to the depths... Welcome, traveler.',
          'The dungeon grows darker below. Seek the artifact, but beware the Bone Lord.',
          'Take the sword near the chest — you will need it. Now go.',
        ],
        appearance: getNpcAppearance('elder-mira', '#52c066'),
      },
      {
        id: 'merchant',
        name: 'The Merchant',
        x: 370,
        y: 100,
        dialogue: [
          'Ah... a customer. How refreshing.',
          'I carry wares from places you have never been and should never go.',
          'Press F near me to browse my stock.',
        ],
        appearance: getNpcAppearance('merchant', '#e0c840'),
        isShopkeeper: true,
      },
    ],
    items: [
      createFloorItem('wooden-sword', 340, 200),
      createFloorItem('health-potion', 320, 220),
      createFloorItem('leather-tunic', 360, 220),
    ],
    doorways: [
      { side: 'east', toRoom: { x: 1, y: 0 } },
      { side: 'south', toRoom: { x: 0, y: 1 } },
    ],
  });

  // ── Room (1,0) — east of start: CHASER ROOM ──────────────────────────
  rooms.set('1,0', {
    coord: { x: 1, y: 0 },
    enemies: [
      createChaserEnemy(300, 100),
      createChaserEnemy(150, 220),
      createChaserEnemy(360, 210),
    ],
    npcs: [],
    items: [createFloorItem('health-potion', 100, 80)],
    doorways: [
      { side: 'west', toRoom: { x: 0, y: 0 } },
      { side: 'south', toRoom: { x: 1, y: 1 } },
    ],
  });

  // ── Room (0,1) — south of start: BOSS ARENA ──────────────────────────
  rooms.set('0,1', {
    coord: { x: 0, y: 1 },
    enemies: [createGreedBoss()],
    npcs: [],
    items: [],
    doorways: [
      { side: 'north', toRoom: { x: 0, y: 0 } },
    ],
  });

  // ── Room (1,1) — southeast ────────────────────────────────────────────
  rooms.set('1,1', {
    coord: { x: 1, y: 1 },
    enemies: [createEnemy(200, 100, 'skeleton-2', '#e0c840', 'health-potion')],
    npcs: [],
    items: [createFloorItem('iron-shield', 100, 250)],
    doorways: [
      { side: 'north', toRoom: { x: 1, y: 0 } },
      { side: 'west', toRoom: { x: 0, y: 1 } },
      { side: 'south', toRoom: { x: 1, y: 2 } },
    ],
  });

  // ── Room (1,2) — deeper south ─────────────────────────────────────────
  rooms.set('1,2', {
    coord: { x: 1, y: 2 },
    enemies: [
      createEnemy(150, 120, 'skeleton-3', '#e0c840', 'health-potion'),
      createEnemy(320, 200, 'skeleton-4', '#e0c840', 'dungeon-key'),
    ],
    npcs: [],
    items: [],
    doorways: [
      { side: 'north', toRoom: { x: 1, y: 1 } },
      { side: 'east', toRoom: { x: 2, y: 2 } },
    ],
  });

  // ── Room (2,2) — east wing ────────────────────────────────────────────
  rooms.set('2,2', {
    coord: { x: 2, y: 2 },
    enemies: [],
    npcs: [],
    items: [createFloorItem('health-potion', 240, 160)],
    doorways: [{ side: 'west', toRoom: { x: 1, y: 2 } }],
  });

  return rooms;
}

export function roomKey(coord: Vector2): string {
  return `${coord.x},${coord.y}`;
}

// Returns all item IDs sorted for shop display (by type then rarity)
export function getShopInventory(): string[] {
  const rarityOrder: Record<Rarity, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, chromatic: 5,
  };
  const typeOrder: Record<string, number> = {
    weapon: 0, armor: 1, offhand: 2, perk: 3, consumable: 4, active: 5, quest: 99,
  };
  return Object.keys(ITEMS)
    .filter(id => ITEMS[id].type !== 'quest')
    .sort((a, b) => {
      const ta = typeOrder[ITEMS[a].type] ?? 99;
      const tb = typeOrder[ITEMS[b].type] ?? 99;
      if (ta !== tb) return ta - tb;
      return (rarityOrder[ITEMS[a].rarity] ?? 0) - (rarityOrder[ITEMS[b].rarity] ?? 0);
    });
}
