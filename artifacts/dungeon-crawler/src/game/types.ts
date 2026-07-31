export type HairStyle = 'bald' | 'buzz' | 'short' | 'long' | 'ponytail' | 'spiky' | 'mohawk';
export type Accessory = 'none' | 'glasses' | 'beard' | 'earrings';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'chromatic';
export type RoomType = 'normal' | 'shop' | 'treasure' | 'trap' | 'advancement' | 'hallway';

export interface SpriteAppearance {
  cloth: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eye: string;
  bodyW: number;
  bodyH: number;
  headSize: number;
  accessory: Accessory;
  hat?: boolean;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface ItemDef {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'offhand' | 'perk' | 'consumable' | 'active' | 'quest';
  rarity: Rarity;
  description: string;
  price: number;
  icon: { shape: string; color: string };
  damageBonus?: number;
  maxHpBonus?: number;
  healAmount?: number;
  effect?: string; // 'providence' | etc.
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface EquippedItems {
  weapon: string | null;
  armor: string | null;
  offhand: string | null;
  accessory: string | null;
}

export interface FloorItem {
  id: string;
  itemId: string;
  x: number;
  y: number;
  spawnTime: number;
}

export interface Trap {
  id: string;
  tileX: number;
  tileY: number;
  damage: number;
  cooldownMs: number;
  lastTriggerTime: number;
  triggerFlash: number; // animation timer
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackCooldown: number;
  lastAttackTime: number;
  damageFlashTime: number;
  inventory: InventoryItem[];
  equipped: EquippedItems;
  hotbar: (string | null)[]; // 6 slots, item IDs
  selectedHotbarSlot: number;
  gold: number;
  // Animation state
  facingAngle: number; // radians, updated when moving (atan2 in screen space)
  isMoving: boolean;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  aggro: boolean;
  lastAttackTime: number;
  attackCooldown: number;
  waypoint: Vector2 | null;
  waypointPauseUntil: number;
  appearance: SpriteAppearance;
  damageFlashTime: number;
  dead: boolean;
  deathTime: number;
  dropItemId: string;
  // Enemy type variants
  enemyType?: 'standard' | 'chaser' | 'boss';
  isBoss?: boolean;
  bossName?: string;
  // Explosion (chaser)
  explodeDelay?: number;
  explodeRadius?: number;
  explodeDamage?: number;
  explodeTime?: number;
  exploded?: boolean;
  // Sprite-sheet override — when set, renderer uses real artwork instead of procedural sprite
  spriteType?: 'bat' | 'skeleton';
  // Aggro-on-hit: enemy only chases/attacks after the player has landed a hit on it
  hasBeenHit?: boolean;
}

export interface NPC {
  id: string;
  name: string;
  x: number;
  y: number;
  dialogue: string[];
  appearance: SpriteAppearance;
  isShopkeeper?: boolean;
  // Advancement shrine
  isShrine?: boolean;
  shrineUsed?: boolean;
  shrineEffect?: 'atk' | 'hp' | 'speed';
}

export interface Doorway {
  side: 'north' | 'south' | 'east' | 'west';
  toRoom: Vector2;
}

export interface Room {
  coord: Vector2;
  enemies: Enemy[];
  npcs: NPC[];
  items: FloorItem[];
  doorways: Doorway[];
  roomType?: RoomType;
  hallwayDir?: 'horizontal' | 'vertical';
  traps?: Trap[];
  // Label for minimap / entry text
  label?: string;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface AttackArc {
  x: number;
  y: number;
  angle: number;
  startTime: number;
  duration: number;
}

export interface DialogueState {
  active: boolean;
  npcId: string | null;
  currentLine: number;
}

export interface RoomTransition {
  active: boolean;
  fromRoom: Vector2;
  toRoom: Vector2;
  startTime: number;
  duration: number;
  entryPoint: Vector2;
}

export interface ScreenFlash {
  color: string;
  alpha: number;
  startTime: number;
  duration: number;
}

export interface GameState {
  player: Player;
  currentRoom: Vector2;
  rooms: Map<string, Room>;
  damageNumbers: DamageNumber[];
  floatingTexts: FloatingText[];
  attackArc: AttackArc | null;
  dialogue: DialogueState;
  transition: RoomTransition | null;
  inventoryOpen: boolean;
  inventoryCursor: number;
  shopOpen: boolean;
  mousePos: Vector2;
  nearbyNpc: string | null;
  time: number;
  screenFlash: ScreenFlash | null;
  visitedRooms: Set<string>;
  roomEntryText: { text: string; startTime: number } | null;
  itemPickupBanner: { text: string; startTime: number } | null;
}
