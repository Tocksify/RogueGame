import { ItemDef, Room, Enemy, NPC, FloorItem, Vector2, Doorway } from './types';
import { getNpcAppearance } from './sprite';

export const ITEMS: Record<string, ItemDef> = {
  'wooden-sword': {
    id: 'wooden-sword',
    name: 'Wooden Sword',
    type: 'weapon',
    icon: { shape: 'rect', color: '#8B4513' },
    damageBonus: 5,
  },
  'iron-sword': {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'weapon',
    icon: { shape: 'rect', color: '#C0C0C0' },
    damageBonus: 10,
  },
  'health-potion': {
    id: 'health-potion',
    name: 'Health Potion',
    type: 'consumable',
    icon: { shape: 'circle', color: '#cc2936' },
    healAmount: 30,
  },
  'leather-tunic': {
    id: 'leather-tunic',
    name: 'Leather Tunic',
    type: 'armor',
    icon: { shape: 'trapezoid', color: '#d2b48c' },
    maxHpBonus: 15,
  },
  'iron-shield': {
    id: 'iron-shield',
    name: 'Iron Shield',
    type: 'offhand',
    icon: { shape: 'hexagon', color: '#C0C0C0' },
    maxHpBonus: 10,
  },
  'dungeon-key': {
    id: 'dungeon-key',
    name: 'Dungeon Key',
    type: 'quest',
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
  };
}

export function createWorld(): Map<string, Room> {
  const rooms = new Map<string, Room>();

  // Starting room (0,0)
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
    ],
    items: [
      createFloorItem('wooden-sword', 360, 160),
      createFloorItem('health-potion', 340, 180),
      createFloorItem('leather-tunic', 380, 180),
    ],
    doorways: [
      { side: 'east', toRoom: { x: 1, y: 0 } },
      { side: 'south', toRoom: { x: 0, y: 1 } },
    ],
  });

  // Room (1,0) — east of start, has a skeleton warrior
  rooms.set('1,0', {
    coord: { x: 1, y: 0 },
    enemies: [createEnemy(300, 160, 'skeleton-1', '#e0c840', 'iron-sword')],
    npcs: [],
    items: [],
    doorways: [
      { side: 'west', toRoom: { x: 0, y: 0 } },
      { side: 'south', toRoom: { x: 1, y: 1 } },
    ],
  });

  // Room (0,1) — south of start
  rooms.set('0,1', {
    coord: { x: 0, y: 1 },
    enemies: [],
    npcs: [],
    items: [createFloorItem('health-potion', 240, 160)],
    doorways: [
      { side: 'north', toRoom: { x: 0, y: 0 } },
      { side: 'east', toRoom: { x: 1, y: 1 } },
    ],
  });

  // Room (1,1) — southeast
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

  // Room (1,2) — deeper south
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

  // Room (2,2) — east wing
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
