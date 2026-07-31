import { ItemDef, Room, Enemy, NPC, FloorItem, Vector2, Rarity, Trap, RoomType } from './types';
import { getNpcAppearance } from './sprite';

// ── RARITY COLOURS ───────────────────────────────────────────────────
export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#888888',
  uncommon:  '#4caf50',
  rare:      '#2196f3',
  epic:      '#9c27b0',
  legendary: '#ff9800',
  chromatic: 'rainbow',
};

export const RARITY_PRICES: Record<Rarity, number> = {
  common:    50,
  uncommon:  200,
  rare:      500,
  epic:      1200,
  legendary: 3000,
  chromatic: 7500,
};

// ── ITEM REGISTRY ────────────────────────────────────────────────────
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
    description: 'The skull of an ancient wyrm, repurposed as a weapon.',
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
    description: 'Armor passed down through sacred bloodlines.',
    price: 500,
    icon: { shape: 'trapezoid', color: '#8899cc' },
    maxHpBonus: 30,
  },
  'holy-mantle': {
    id: 'holy-mantle', name: 'Holy Mantle', type: 'armor', rarity: 'epic',
    description: 'A sacred mantle that absorbs divine punishment.',
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

  // ── PERKS ────────────────────────────────────────────────────────────
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
    description: 'A holy blessing upon your strikes.',
    price: 500,
    icon: { shape: 'circle', color: '#eeddaa' },
    damageBonus: 12,
  },
  'cell-of-god': {
    id: 'cell-of-god', name: 'Cell of God', type: 'perk', rarity: 'rare',
    description: 'A fragment of divine life embedded within you.',
    price: 500,
    icon: { shape: 'circle', color: '#88ffcc' },
    maxHpBonus: 30,
  },
  'living-stone': {
    id: 'living-stone', name: 'Living Stone', type: 'perk', rarity: 'rare',
    description: 'Stone that breathes. Stone that endures.',
    price: 500,
    icon: { shape: 'circle', color: '#aaaaaa' },
    maxHpBonus: 25,
  },
  'first-flesh': {
    id: 'first-flesh', name: 'First Flesh', type: 'perk', rarity: 'epic',
    description: 'The primordial body, before death existed.',
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
    description: 'The origin of all creation.',
    price: 3000,
    icon: { shape: 'circle', color: '#66ffaa' },
    maxHpBonus: 35,
    damageBonus: 18,
  },
  'legacy': {
    id: 'legacy', name: 'Legacy', type: 'perk', rarity: 'legendary',
    description: 'The weight of all who came before you.',
    price: 3000,
    icon: { shape: 'circle', color: '#ffcc44' },
    damageBonus: 22,
  },
  'hollow-god': {
    id: 'hollow-god', name: 'Hollow God', type: 'perk', rarity: 'legendary',
    description: 'A god emptied of mercy. What remains is pure power.',
    price: 3000,
    icon: { shape: 'circle', color: '#cc88ff' },
    damageBonus: 30,
  },

  // ── CHROMATIC PAIR ────────────────────────────────────────────────────
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

  // ── CONSUMABLES ───────────────────────────────────────────────────────
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
    description: 'A monstrous heart that refuses to stop beating.',
    price: 1200,
    icon: { shape: 'circle', color: '#ff6688' },
    healAmount: 75,
  },
  'providence': {
    id: 'providence', name: 'Providence', type: 'active', rarity: 'legendary',
    description: 'Divine intervention. Calls lightning upon all nearby enemies, dealing 40% max HP.',
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
let trapIdCounter = 0;

function createFloorItem(itemId: string, x: number, y: number): FloorItem {
  return { id: `item-${itemIdCounter++}`, itemId, x, y, spawnTime: Date.now() };
}

function createTrap(tileX: number, tileY: number, damage = 12): Trap {
  return {
    id: `trap-${trapIdCounter++}`,
    tileX, tileY,
    damage,
    cooldownMs: 1800,
    lastTriggerTime: 0,
    triggerFlash: 0,
  };
}

let enemyIdCounter = 0;

function createEnemy(x: number, y: number, appearanceId: string, baseColor: string, dropItemId: string): Enemy {
  return {
    id: `enemy-${enemyIdCounter++}`, x, y,
    hp: 30, maxHp: 30, speed: 80, aggro: false,
    lastAttackTime: 0, attackCooldown: 1500,
    waypoint: null, waypointPauseUntil: 0,
    appearance: getNpcAppearance(appearanceId, baseColor),
    damageFlashTime: 0, dead: false, deathTime: 0,
    dropItemId, enemyType: 'standard',
  };
}

function createChaserEnemy(x: number, y: number): Enemy {
  return {
    id: `enemy-${enemyIdCounter++}`, x, y,
    hp: 45, maxHp: 45, speed: 145, aggro: true,
    lastAttackTime: 0, attackCooldown: 1200,
    waypoint: null, waypointPauseUntil: 0,
    appearance: getNpcAppearance('skeleton-1', '#cc3311'),
    damageFlashTime: 0, dead: false, deathTime: 0,
    dropItemId: 'health-potion', enemyType: 'chaser',
    explodeDelay: 1500, explodeRadius: 90, explodeDamage: 40, exploded: false,
  };
}

function createGreedBoss(): Enemy {
  return {
    id: `enemy-${enemyIdCounter++}`,
    x: 240, y: 160,
    hp: 500, maxHp: 500, speed: 52, aggro: false,
    lastAttackTime: 0, attackCooldown: 900,
    waypoint: null, waypointPauseUntil: 0,
    appearance: getNpcAppearance('merchant', '#c8a800'),
    damageFlashTime: 0, dead: false, deathTime: 0,
    dropItemId: 'godhead', enemyType: 'boss',
    isBoss: true, bossName: 'Greed',
  };
}

// ── HALLWAY HELPER ───────────────────────────────────────────────────
function makeHallway(coord: Vector2, dir: 'horizontal' | 'vertical', doorways: Room['doorways']): Room {
  return {
    coord,
    enemies: [],
    npcs: [],
    items: [],
    doorways,
    roomType: 'hallway',
    hallwayDir: dir,
  };
}

// ── SHOP ROOM ────────────────────────────────────────────────────────
function makeShopRoom(coord: Vector2, doorways: Room['doorways']): Room {
  return {
    coord,
    enemies: [],
    npcs: [{
      id: `shop-${coord.x}-${coord.y}`,
      name: 'The Merchant',
      x: 240,
      y: 130,
      dialogue: [
        'Ah... another wanderer. Welcome.',
        'My wares have survived worse than you. Browse freely.',
        'Press F to open my shop.',
      ],
      appearance: getNpcAppearance('merchant', '#e0c840'),
      isShopkeeper: true,
    }],
    items: [
      createFloorItem('health-potion', 130, 230),
      createFloorItem('husk', 170, 230),
    ],
    doorways,
    roomType: 'shop',
    label: 'SHOP',
  };
}

// ── TREASURE ROOM ────────────────────────────────────────────────────
function makeTreasureRoom(coord: Vector2, doorways: Room['doorways'], drops: string[]): Room {
  const items = drops.map((id, i) => createFloorItem(id, 160 + i * 70, 160));
  return {
    coord, enemies: [], npcs: [],
    items, doorways,
    roomType: 'treasure',
    label: 'TREASURE',
  };
}

// ── TRAP ROOM ────────────────────────────────────────────────────────
function makeTrapRoom(coord: Vector2, doorways: Room['doorways'], rewardItems: string[]): Room {
  const traps: Trap[] = [
    createTrap(3, 3), createTrap(11, 3), createTrap(3, 6), createTrap(11, 6),
    createTrap(5, 5), createTrap(7, 4), createTrap(9, 5),
    createTrap(6, 7), createTrap(8, 2),
  ];
  const items = rewardItems.map((id, i) => createFloorItem(id, 200 + i * 60, 160));
  return {
    coord,
    enemies: [createEnemy(300, 120, 'skeleton-3', '#884444', 'health-potion')],
    npcs: [],
    items, traps, doorways,
    roomType: 'trap',
    label: 'DANGER',
  };
}

// ── ADVANCEMENT ROOM ─────────────────────────────────────────────────
function makeAdvancementRoom(coord: Vector2, doorways: Room['doorways']): Room {
  const shrineNpc: Room['npcs'][0] = {
    id: `shrine-${coord.x}-${coord.y}`,
    name: 'Ancient Shrine',
    x: 240,
    y: 140,
    dialogue: [
      'The altar hums with ancient energy...',
      'Offer your resolve. Press F to channel its power.',
      'You feel stronger already.',
    ],
    appearance: getNpcAppearance('elder-mira', '#88aaff'),
    isShrine: true,
    shrineUsed: false,
    shrineEffect: 'hp',
  };
  return {
    coord, enemies: [], npcs: [shrineNpc],
    items: [], doorways,
    roomType: 'advancement',
    label: 'SHRINE',
  };
}

// ── WORLD CREATION ───────────────────────────────────────────────────
export function createWorld(): Map<string, Room> {
  const rooms = new Map<string, Room>();

  const set = (r: Room) => rooms.set(roomKey(r.coord), r);

  // ── Starting room (0,0) ──────────────────────────────────────────────
  set({
    coord: { x: 0, y: 0 },
    enemies: [],
    npcs: [
      {
        id: 'elder-mira',
        name: 'Elder Mira',
        x: 110,
        y: 155,
        dialogue: [
          'Ah, a new soul finds their way to the depths... Welcome, traveler.',
          'The dungeon grows darker below. Seek the artifact, but beware the Bone Lord.',
          'The doors lead to hallways now — watch your step. Some rooms are not what they seem.',
        ],
        appearance: getNpcAppearance('elder-mira', '#52c066'),
      },
      {
        id: 'merchant',
        name: 'The Merchant',
        x: 370,
        y: 100,
        dialogue: ['Ah... a customer.', 'Press F near me to browse my stock.'],
        appearance: getNpcAppearance('merchant', '#e0c840'),
        isShopkeeper: true,
      },
    ],
    items: [
      createFloorItem('wooden-sword', 340, 200),
      createFloorItem('health-potion', 320, 230),
      createFloorItem('leather-tunic', 365, 215),
    ],
    doorways: [
      { side: 'east',  toRoom: { x: 0.5, y: 0 } },
      { side: 'south', toRoom: { x: 0,   y: 0.5 } },
    ],
    roomType: 'normal',
  });

  // ── Hallway (0,0)→(1,0) horizontal ───────────────────────────────────
  set(makeHallway({ x: 0.5, y: 0 }, 'horizontal', [
    { side: 'west', toRoom: { x: 0,   y: 0 } },
    { side: 'east', toRoom: { x: 1,   y: 0 } },
  ]));

  // ── Room (1,0) — CHASER ROOM ──────────────────────────────────────────
  set({
    coord: { x: 1, y: 0 },
    enemies: [
      createChaserEnemy(300, 100),
      createChaserEnemy(150, 220),
      createChaserEnemy(360, 210),
    ],
    npcs: [],
    items: [createFloorItem('health-potion', 100, 80)],
    doorways: [
      { side: 'west', toRoom: { x: 0.5, y: 0   } },
      { side: 'south', toRoom: { x: 1,   y: 0.5 } },
      { side: 'east',  toRoom: { x: 1.5, y: 0   } },
    ],
    roomType: 'normal',
  });

  // ── Hallway (1,0)→(2,0) horizontal ───────────────────────────────────
  set(makeHallway({ x: 1.5, y: 0 }, 'horizontal', [
    { side: 'west', toRoom: { x: 1, y: 0 } },
    { side: 'east', toRoom: { x: 2, y: 0 } },
  ]));

  // ── Room (2,0) — SHOP ROOM ────────────────────────────────────────────
  set(makeShopRoom({ x: 2, y: 0 }, [
    { side: 'west', toRoom: { x: 1.5, y: 0 } },
    { side: 'south', toRoom: { x: 2, y: 0.5 } },
  ]));

  // ── Hallway (0,0)→(0,1) vertical ─────────────────────────────────────
  set(makeHallway({ x: 0, y: 0.5 }, 'vertical', [
    { side: 'north', toRoom: { x: 0, y: 0   } },
    { side: 'south', toRoom: { x: 0, y: 1   } },
  ]));

  // ── Room (0,1) — BOSS ARENA ───────────────────────────────────────────
  set({
    coord: { x: 0, y: 1 },
    enemies: [createGreedBoss()],
    npcs: [],
    items: [],
    doorways: [
      { side: 'north', toRoom: { x: 0,   y: 0.5 } },
      { side: 'east',  toRoom: { x: 0.5, y: 1   } },
    ],
    roomType: 'normal',
    label: 'BOSS',
  });

  // ── Hallway (0,1)→(1,1) horizontal ───────────────────────────────────
  set(makeHallway({ x: 0.5, y: 1 }, 'horizontal', [
    { side: 'west', toRoom: { x: 0, y: 1 } },
    { side: 'east', toRoom: { x: 1, y: 1 } },
  ]));

  // ── Hallway (1,0)→(1,1) vertical ─────────────────────────────────────
  set(makeHallway({ x: 1, y: 0.5 }, 'vertical', [
    { side: 'north', toRoom: { x: 1, y: 0 } },
    { side: 'south', toRoom: { x: 1, y: 1 } },
  ]));

  // ── Room (1,1) — TREASURE ROOM ────────────────────────────────────────
  set(makeTreasureRoom({ x: 1, y: 1 }, [
    { side: 'north', toRoom: { x: 1,   y: 0.5 } },
    { side: 'west',  toRoom: { x: 0.5, y: 1   } },
    { side: 'south', toRoom: { x: 1,   y: 1.5 } },
  ], ['iron-sword', 'iron-shield', 'health-potion']));

  // ── Hallway (1,1)→(1,2) vertical ─────────────────────────────────────
  set(makeHallway({ x: 1, y: 1.5 }, 'vertical', [
    { side: 'north', toRoom: { x: 1, y: 1 } },
    { side: 'south', toRoom: { x: 1, y: 2 } },
  ]));

  // ── Room (1,2) — TRAP ROOM ────────────────────────────────────────────
  set(makeTrapRoom({ x: 1, y: 2 }, [
    { side: 'north', toRoom: { x: 1,   y: 1.5 } },
    { side: 'east',  toRoom: { x: 1.5, y: 2   } },
  ], ['anomaly', 'benediction']));

  // ── Hallway (1,2)→(2,2) horizontal ───────────────────────────────────
  set(makeHallway({ x: 1.5, y: 2 }, 'horizontal', [
    { side: 'west', toRoom: { x: 1, y: 2 } },
    { side: 'east', toRoom: { x: 2, y: 2 } },
  ]));

  // ── Room (2,2) — ADVANCEMENT ROOM ────────────────────────────────────
  set(makeAdvancementRoom({ x: 2, y: 2 }, [
    { side: 'west',  toRoom: { x: 1.5, y: 2   } },
    { side: 'north', toRoom: { x: 2,   y: 1.5 } },
  ]));

  // ── Hallway (2,0)→(2,1) vertical ─────────────────────────────────────
  set(makeHallway({ x: 2, y: 0.5 }, 'vertical', [
    { side: 'north', toRoom: { x: 2, y: 0 } },
    { side: 'south', toRoom: { x: 2, y: 1 } },
  ]));

  // ── Room (2,1) — standard combat room ────────────────────────────────
  set({
    coord: { x: 2, y: 1 },
    enemies: [
      createEnemy(150, 120, 'skeleton-2', '#e0c840', 'health-potion'),
      createEnemy(320, 200, 'skeleton-4', '#e0c840', 'dungeon-key'),
    ],
    npcs: [],
    items: [],
    doorways: [
      { side: 'north', toRoom: { x: 2,   y: 0.5 } },
      { side: 'south', toRoom: { x: 2,   y: 1.5 } },
    ],
    roomType: 'normal',
  });

  // ── Hallway (2,1)→(2,2) vertical ─────────────────────────────────────
  set(makeHallway({ x: 2, y: 1.5 }, 'vertical', [
    { side: 'north', toRoom: { x: 2, y: 1 } },
    { side: 'south', toRoom: { x: 2, y: 2 } },
  ]));

  return rooms;
}

export function roomKey(coord: Vector2): string {
  return `${coord.x},${coord.y}`;
}

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
