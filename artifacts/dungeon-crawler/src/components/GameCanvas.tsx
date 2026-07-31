import { useEffect, useRef, useState } from 'react';
import { GameState, Player, EquippedItems, Rarity } from '../game/types';
import { createWorld, roomKey, ITEMS, getShopInventory, RARITY_COLORS, RARITY_PRICES } from '../game/world';
import { PLAYER_APPEARANCE } from '../game/sprite';
import { InputState } from '../game/input';
import { update } from '../game/gameLoop';
import { render } from '../game/renderer';
import { loadPlayerSprites } from '../game/playerSprite';
import { equipItem, unequipItem, removeItem, addItem, buyItem, recalculateStats } from '../game/inventory';

// ── RAINBOW CSS ───────────────────────────────────────────────────────
const RAINBOW_STYLE = `
@keyframes rainbowBorder {
  0%   { box-shadow: 0 0 0 2px hsl(0,100%,60%),   0 0 8px 1px hsl(0,100%,60%); }
  16%  { box-shadow: 0 0 0 2px hsl(60,100%,60%),  0 0 8px 1px hsl(60,100%,60%); }
  33%  { box-shadow: 0 0 0 2px hsl(120,100%,60%), 0 0 8px 1px hsl(120,100%,60%); }
  50%  { box-shadow: 0 0 0 2px hsl(180,100%,60%), 0 0 8px 1px hsl(180,100%,60%); }
  66%  { box-shadow: 0 0 0 2px hsl(240,100%,60%), 0 0 8px 1px hsl(240,100%,60%); }
  83%  { box-shadow: 0 0 0 2px hsl(300,100%,60%), 0 0 8px 1px hsl(300,100%,60%); }
  100% { box-shadow: 0 0 0 2px hsl(360,100%,60%), 0 0 8px 1px hsl(360,100%,60%); }
}
@keyframes rainbowText {
  0%   { color: hsl(0,100%,70%);   }
  16%  { color: hsl(60,100%,70%);  }
  33%  { color: hsl(120,100%,70%); }
  50%  { color: hsl(180,100%,70%); }
  66%  { color: hsl(240,100%,70%); }
  83%  { color: hsl(300,100%,70%); }
  100% { color: hsl(360,100%,70%); }
}
.chromatic-border {
  animation: rainbowBorder 2s linear infinite;
  border: 1px solid transparent !important;
}
.chromatic-text {
  animation: rainbowText 2s linear infinite;
}
`;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [, setForceUpdate] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load player sprite sheets (non-blocking — renders fall back to nothing until ready)
    loadPlayerSprites();

    if (!gameStateRef.current) {
      const rooms = createWorld();
      const player: Player = {
        x: 240,
        y: 160,
        hp: 100,
        maxHp: 100,
        speed: 120,
        attackCooldown: 600,
        lastAttackTime: 0,
        damageFlashTime: 0,
        inventory: [],
        equipped: { weapon: null, armor: null, offhand: null, accessory: null },
        hotbar: [null, null, null, null, null, null],
        selectedHotbarSlot: 0,
        gold: 999999,
        facingAngle: Math.PI / 2, // default facing south (down)
        isMoving: false,
      };

      gameStateRef.current = {
        player,
        currentRoom: { x: 0, y: 0 },
        rooms,
        damageNumbers: [],
        floatingTexts: [],
        attackArc: null,
        dialogue: { active: false, npcId: null, currentLine: 0 },
        transition: null,
        inventoryOpen: false,
        inventoryCursor: 0,
        shopOpen: false,
        mousePos: { x: 0, y: 0 },
        nearbyNpc: null,
        time: 0,
        screenFlash: null,
        visitedRooms: new Set<string>(['0,0']),
        roomEntryText: null,
        itemPickupBanner: null,
      };
    }

    if (!inputRef.current) {
      inputRef.current = new InputState(canvas);
    }

    const loop = (time: number) => {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;

      const state = gameStateRef.current;
      const input = inputRef.current;
      if (!state || !input) return;

      // Sync overlay states
      if (state.inventoryOpen !== inventoryOpen) setInventoryOpen(state.inventoryOpen);
      if (state.shopOpen !== shopOpen) setShopOpen(state.shopOpen);

      update(state, Math.min(dt, 0.1), input, canvas.width, canvas.height);

      const ctx = canvas.getContext('2d');
      if (ctx) render(ctx, state, canvas.width, canvas.height);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [inventoryOpen, shopOpen]);

  const handleInventoryClose = () => {
    if (gameStateRef.current) {
      gameStateRef.current.inventoryOpen = false;
      setInventoryOpen(false);
    }
  };

  const handleShopClose = () => {
    if (gameStateRef.current) {
      gameStateRef.current.shopOpen = false;
      setShopOpen(false);
    }
  };

  const handleEquipItem = (itemId: string) => {
    if (gameStateRef.current) {
      equipItem(gameStateRef.current.player, itemId);
      setForceUpdate((n) => n + 1);
    }
  };

  const handleUnequipItem = (slot: keyof EquippedItems) => {
    if (gameStateRef.current) {
      unequipItem(gameStateRef.current.player, slot);
      setForceUpdate((n) => n + 1);
    }
  };

  const handleDropItem = (itemId: string) => {
    if (gameStateRef.current) {
      const state = gameStateRef.current;
      if (removeItem(state.player, itemId, 1)) {
        const room = state.rooms.get(roomKey(state.currentRoom));
        if (room) {
          room.items.push({
            id: `drop-${Date.now()}`,
            itemId,
            x: state.player.x + (Math.random() - 0.5) * 40,
            y: state.player.y + (Math.random() - 0.5) * 40,
            spawnTime: Date.now(),
          });
        }
        recalculateStats(state.player);
        setForceUpdate((n) => n + 1);
      }
    }
  };

  const handleAddToHotbar = (itemId: string, slot: number) => {
    if (gameStateRef.current) {
      gameStateRef.current.player.hotbar[slot] = itemId;
      setForceUpdate((n) => n + 1);
    }
  };

  const handleBuyItem = (itemId: string): boolean => {
    if (gameStateRef.current) {
      const success = buyItem(gameStateRef.current.player, itemId);
      if (success) setForceUpdate((n) => n + 1);
      return success;
    }
    return false;
  };

  return (
    <>
      <style>{RAINBOW_STYLE}</style>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ cursor: 'none' }} />

      {inventoryOpen && gameStateRef.current && (
        <InventoryOverlay
          player={gameStateRef.current.player}
          onClose={handleInventoryClose}
          onEquip={handleEquipItem}
          onUnequip={handleUnequipItem}
          onDrop={handleDropItem}
          onAddToHotbar={handleAddToHotbar}
        />
      )}

      {shopOpen && gameStateRef.current && (
        <ShopOverlay
          player={gameStateRef.current.player}
          onClose={handleShopClose}
          onBuy={handleBuyItem}
        />
      )}
    </>
  );
}

// ── COLOUR TOKENS ─────────────────────────────────────────────────────
const INV_C = {
  bg:        '#080808',
  panel:     '#0d0d0d',
  border:    '#f0f0f0',
  borderMid: '#3a3a3a',
  borderDim: '#1a2030',
  white:     '#f0f0f0',
  silver:    '#909090',
  dim:       '#505050',
  selBg:     '#0c1c2c',
  selBorder: '#5599cc',
  atkColor:  '#ff9977',
  defColor:  '#77aaff',
  hpColor:   '#77dd77',
  dropRed:   '#cc2936',
  gold:      '#e0c840',
};

// Rarity colors for React UI
const RARITY_UI_COLORS: Record<Rarity, string> = {
  common:    '#888888',
  uncommon:  '#4caf50',
  rare:      '#2196f3',
  epic:      '#9c27b0',
  legendary: '#ff9800',
  chromatic: '#ffffff', // animated via CSS
};

const RARITY_LABEL: Record<Rarity, string> = {
  common:    'COMMON',
  uncommon:  'UNCOMMON',
  rare:      'RARE',
  epic:      'EPIC',
  legendary: 'LEGENDARY',
  chromatic: 'CHROMATIC',
};

const EQUIPPABLE_TYPES = new Set(['weapon', 'armor', 'offhand', 'accessory']);

const EQUIP_SLOTS: { key: keyof EquippedItems; label: string }[] = [
  { key: 'weapon',    label: 'Weapon'    },
  { key: 'armor',     label: 'Armor'     },
  { key: 'offhand',   label: 'Offhand'   },
  { key: 'accessory', label: 'Accessory' },
];

const TYPE_TAG: Record<string, string> = {
  weapon:    'WPN',
  armor:     'ARM',
  offhand:   'OFF',
  perk:      'PRK',
  consumable:'ITM',
  active:    'ACT',
  quest:     'QST',
};

// Category grouping for inventory display
type InvCategory = 'weapons' | 'armor' | 'perks' | 'items';

function getCategory(type: string): InvCategory {
  if (type === 'weapon') return 'weapons';
  if (type === 'armor' || type === 'offhand') return 'armor';
  if (type === 'perk' || type === 'accessory') return 'perks';
  return 'items'; // consumable, active, quest
}

const CATEGORY_LABELS: Record<InvCategory, string> = {
  weapons: '⚔  WEAPONS',
  armor:   '🛡  ARMOR',
  perks:   '✦  PERKS',
  items:   '◈  ITEMS',
};

const CATEGORY_ORDER: InvCategory[] = ['weapons', 'armor', 'perks', 'items'];

// ── PIXEL BOX (React) ─────────────────────────────────────────────────
function PixelBox({ children, style, className }: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={{ position: 'relative', background: INV_C.bg, border: `2px solid ${INV_C.border}`, ...style }}>
      {[['0','0'],['calc(100% - 3px)','0'],['0','calc(100% - 3px)'],['calc(100% - 3px)','calc(100% - 3px)']].map(([l, t], i) => (
        <span key={i} style={{ position: 'absolute', left: l, top: t, width: 3, height: 3, background: INV_C.border, display: 'block' }} />
      ))}
      {children}
    </div>
  );
}

// ── RARITY BADGE ──────────────────────────────────────────────────────
function RarityBadge({ rarity, fontSize = 9 }: { rarity: Rarity; fontSize?: number }) {
  const isChromatic = rarity === 'chromatic';
  return (
    <span
      className={isChromatic ? 'chromatic-text' : undefined}
      style={{
        fontSize,
        fontFamily: 'monospace',
        letterSpacing: 1,
        color: isChromatic ? undefined : RARITY_UI_COLORS[rarity],
        fontWeight: 'bold',
      }}
    >
      {RARITY_LABEL[rarity]}
    </span>
  );
}

// ── HOTBAR SLOT ───────────────────────────────────────────────────────
function HotbarSlot({ index, itemId, isSelected, onAssign }: {
  index: number;
  itemId: string | null;
  isSelected: boolean;
  onAssign: () => void;
}) {
  const item = itemId ? ITEMS[itemId] : null;
  const isChromatic = item?.rarity === 'chromatic';
  return (
    <div
      onClick={onAssign}
      className={isChromatic ? 'chromatic-border' : undefined}
      title={item ? `Slot ${index + 1}: ${item.name}` : `Slot ${index + 1}: empty`}
      style={{
        width: 52, height: 52, flexShrink: 0,
        border: `2px solid ${isSelected ? INV_C.selBorder : INV_C.borderMid}`,
        background: isSelected ? INV_C.selBg : '#111',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.1s',
      }}
    >
      <span style={{ fontSize: 9, color: INV_C.dim, position: 'absolute', top: 3, left: 5, fontFamily: 'monospace' }}>
        {index + 1}
      </span>
      {item ? (
        <span
          className={isChromatic ? 'chromatic-text' : undefined}
          style={{
            fontSize: 9,
            color: isChromatic ? undefined : RARITY_UI_COLORS[item.rarity as Rarity] ?? INV_C.silver,
            fontFamily: 'monospace', textAlign: 'center', padding: '0 4px', lineHeight: 1.2,
          }}
        >
          {item.name.length > 7 ? item.name.slice(0, 6) + '…' : item.name}
        </span>
      ) : (
        <span style={{ fontSize: 14, color: '#252535', fontFamily: 'monospace' }}>—</span>
      )}
    </div>
  );
}

// ── INVENTORY OVERLAY ─────────────────────────────────────────────────
interface InventoryOverlayProps {
  player: Player;
  onClose: () => void;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: keyof EquippedItems) => void;
  onDrop: (itemId: string) => void;
  onAddToHotbar: (itemId: string, slot: number) => void;
}

function InventoryOverlay({ player, onClose, onEquip, onUnequip, onDrop, onAddToHotbar }: InventoryOverlayProps) {
  const [itemCursor, setItemCursor] = useState(0);
  const [actionCursor, setActionCursor] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<InvCategory>('weapons');

  // Build flat list of all inventory items grouped by category
  const categoryItems = (() => {
    const groups: Record<InvCategory, typeof player.inventory> = {
      weapons: [], armor: [], perks: [], items: [],
    };
    for (const invItem of player.inventory) {
      const def = ITEMS[invItem.itemId];
      if (!def) continue;
      const cat = getCategory(def.type);
      groups[cat].push(invItem);
    }
    return groups;
  })();

  const currentItems = categoryItems[activeCategory];
  const clampedCursor = Math.min(itemCursor, Math.max(0, currentItems.length - 1));
  const selectedInvItem = currentItems[clampedCursor] ?? null;
  const selectedItemId = selectedInvItem?.itemId ?? null;
  const selectedItemDef = selectedItemId ? ITEMS[selectedItemId] : null;

  const equippedSlot: keyof EquippedItems | null = selectedItemId
    ? (Object.entries(player.equipped).find(([, v]) => v === selectedItemId)?.[0] as keyof EquippedItems) ?? null
    : null;
  const canEquip = selectedItemDef ? EQUIPPABLE_TYPES.has(selectedItemDef.type) : false;
  const isPerk = selectedItemDef?.type === 'perk';
  const isHotbarItem = selectedItemDef?.type === 'consumable' || selectedItemDef?.type === 'active';

  const actions: string[] = [];
  if (canEquip) actions.push(equippedSlot ? 'Unequip' : 'Equip');
  actions.push('Drop');
  actions.push('Cancel');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 's', 'a', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }

      if (key === 'escape') {
        if (actionCursor !== null) setActionCursor(null);
        else onClose();
        return;
      }
      if (key === 'e' && actionCursor === null) { onClose(); return; }

      // Tab through categories with left/right or A/D
      const left  = key === 'a' || key === 'arrowleft';
      const right = key === 'd' || key === 'arrowright';
      if (left || right) {
        const idx = CATEGORY_ORDER.indexOf(activeCategory);
        const next = left
          ? (idx - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length
          : (idx + 1) % CATEGORY_ORDER.length;
        setActiveCategory(CATEGORY_ORDER[next]);
        setItemCursor(0);
        setActionCursor(null);
        return;
      }

      const up   = key === 'w' || key === 'arrowup';
      const down = key === 's' || key === 'arrowdown';

      if (actionCursor !== null) {
        if (up)   setActionCursor(c => Math.max(0, (c ?? 0) - 1));
        if (down) setActionCursor(c => Math.min(actions.length - 1, (c ?? 0) + 1));
        if (key === ' ') {
          const action = actions[actionCursor];
          if (action === 'Equip'   && selectedItemId) { onEquip(selectedItemId);   setActionCursor(null); }
          if (action === 'Unequip' && equippedSlot)   { onUnequip(equippedSlot);   setActionCursor(null); }
          if (action === 'Drop'    && selectedItemId) { onDrop(selectedItemId);     setActionCursor(null); }
          if (action === 'Cancel')                    { setActionCursor(null); }
        }
      } else {
        if (up)   setItemCursor(c => Math.max(0, c - 1));
        if (down) setItemCursor(c => Math.min(Math.max(0, currentItems.length - 1), c + 1));
        if (key === ' ' && currentItems.length > 0) setActionCursor(0);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionCursor, clampedCursor, currentItems.length, actions.length, selectedItemId, equippedSlot, activeCategory, onClose, onEquip, onUnequip, onDrop]);

  const isChromatic = selectedItemDef?.rarity === 'chromatic';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.93)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Mono", monospace',
    }}>
      <PixelBox style={{ width: 780, display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

        {/* Header */}
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${INV_C.borderDim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: INV_C.white, fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }}>INVENTORY</span>
          <span style={{ color: INV_C.gold, fontSize: 10 }}>◈ {player.gold.toLocaleString()} gold</span>
          <span style={{ color: INV_C.dim, fontSize: 10 }}>[A/D] category  [W/S] browse  [E/Esc] close</span>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${INV_C.borderDim}` }}>
          {CATEGORY_ORDER.map((cat) => {
            const count = categoryItems[cat].length;
            const isActive = cat === activeCategory;
            return (
              <div
                key={cat}
                onClick={() => { setActiveCategory(cat); setItemCursor(0); setActionCursor(null); }}
                style={{
                  flex: 1, padding: '6px 12px', cursor: 'pointer', textAlign: 'center',
                  fontSize: 10, letterSpacing: 1,
                  color: isActive ? INV_C.white : INV_C.dim,
                  borderBottom: isActive ? `2px solid ${INV_C.selBorder}` : '2px solid transparent',
                  background: isActive ? INV_C.selBg : 'transparent',
                  transition: 'all 0.1s',
                }}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left panel: hotbar + item list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px', borderRight: `1px solid ${INV_C.borderDim}`, overflow: 'hidden' }}>

            {/* Hotbar row */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ color: INV_C.dim, fontSize: 9, marginBottom: 6, letterSpacing: 2 }}>HOTBAR — click slot to assign selected item</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2,3,4,5].map((i) => (
                  <HotbarSlot
                    key={i}
                    index={i}
                    itemId={player.hotbar[i]}
                    isSelected={false}
                    onAssign={() => { if (selectedItemId && isHotbarItem) onAddToHotbar(selectedItemId, i); }}
                  />
                ))}
              </div>
              {isHotbarItem && selectedItemId && (
                <div style={{ color: INV_C.selBorder, fontSize: 9, marginTop: 4 }}>
                  ↑ Click a slot to assign {selectedItemDef?.name}
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${INV_C.borderDim}`, margin: '6px 0' }} />

            {/* Item list for active category */}
            <div style={{ color: INV_C.dim, fontSize: 9, marginBottom: 6, letterSpacing: 2 }}>
              {CATEGORY_LABELS[activeCategory]} ({currentItems.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {currentItems.length === 0 ? (
                <div style={{ color: INV_C.dim, fontSize: 11, padding: '12px 0', textAlign: 'center' }}>— none held —</div>
              ) : currentItems.map((invItem, idx) => {
                const itemDef = ITEMS[invItem.itemId];
                if (!itemDef) return null;
                const isCursor = idx === clampedCursor;
                const isEquipped = Object.values(player.equipped).includes(invItem.itemId);
                const tag = TYPE_TAG[itemDef.type] ?? '???';
                const itemChromatic = itemDef.rarity === 'chromatic';
                const itemRarityColor = RARITY_UI_COLORS[itemDef.rarity as Rarity] ?? INV_C.silver;

                return (
                  <div
                    key={invItem.itemId}
                    onClick={() => { setItemCursor(idx); setActionCursor(null); }}
                    className={isCursor && itemChromatic ? 'chromatic-border' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 6px', marginBottom: 2, cursor: 'pointer',
                      background: isCursor ? INV_C.selBg : 'transparent',
                      border: `1px solid ${isCursor && !itemChromatic ? INV_C.selBorder : 'transparent'}`,
                    }}
                  >
                    <span style={{ color: isCursor ? INV_C.selBorder : INV_C.dim, fontSize: 11, width: 10 }}>
                      {isCursor ? '►' : ' '}
                    </span>
                    <span style={{ color: INV_C.dim, fontSize: 9, width: 28, flexShrink: 0 }}>[{tag}]</span>
                    <span
                      className={itemChromatic ? 'chromatic-text' : undefined}
                      style={{
                        color: itemChromatic ? undefined : (isCursor ? INV_C.white : INV_C.silver),
                        fontSize: 12, flex: 1,
                      }}
                    >
                      {itemDef.name}
                      {isEquipped && <span style={{ color: INV_C.selBorder, fontSize: 9, marginLeft: 6 }}>[E]</span>}
                    </span>
                    <span
                      className={itemChromatic ? 'chromatic-text' : undefined}
                      style={{ color: itemChromatic ? undefined : itemRarityColor, fontSize: 8, marginRight: 4 }}
                    >
                      {RARITY_LABEL[itemDef.rarity as Rarity]}
                    </span>
                    <span style={{ color: INV_C.dim, fontSize: 10 }}>×{invItem.quantity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: item detail + actions */}
          <div style={{ width: 240, display: 'flex', flexDirection: 'column', padding: '10px 14px' }}>

            {selectedItemDef ? (
              <>
                <RarityBadge rarity={selectedItemDef.rarity as Rarity} />
                <div
                  className={isChromatic ? 'chromatic-text' : undefined}
                  style={{
                    color: isChromatic ? undefined : INV_C.white,
                    fontSize: 14, fontWeight: 'bold', marginTop: 4, marginBottom: 2, lineHeight: 1.3,
                  }}
                >
                  {selectedItemDef.name}
                </div>
                {selectedInvItem && selectedInvItem.quantity > 1 && (
                  <div style={{ color: INV_C.dim, fontSize: 10, marginBottom: 4 }}>×{selectedInvItem.quantity}</div>
                )}

                {/* Description */}
                <div style={{ color: '#707090', fontSize: 10, lineHeight: 1.5, margin: '6px 0', fontStyle: 'italic' }}>
                  {selectedItemDef.description}
                </div>

                {/* Stats */}
                {(selectedItemDef.damageBonus || selectedItemDef.maxHpBonus || selectedItemDef.healAmount) && (
                  <div style={{ margin: '6px 0', padding: '6px 0', borderTop: `1px solid ${INV_C.borderDim}`, borderBottom: `1px solid ${INV_C.borderDim}` }}>
                    {selectedItemDef.damageBonus && <div style={{ color: INV_C.atkColor, fontSize: 11, marginBottom: 2 }}>ATK  +{selectedItemDef.damageBonus}</div>}
                    {selectedItemDef.maxHpBonus  && <div style={{ color: INV_C.hpColor,  fontSize: 11, marginBottom: 2 }}>HP   +{selectedItemDef.maxHpBonus}</div>}
                    {selectedItemDef.healAmount  && <div style={{ color: INV_C.hpColor,  fontSize: 11 }}>Heals {selectedItemDef.healAmount} HP</div>}
                    {selectedItemDef.effect === 'providence' && (
                      <div style={{ color: '#ffe44d', fontSize: 11 }}>40% HP to all nearby enemies</div>
                    )}
                  </div>
                )}

                {/* Perk note */}
                {isPerk && (
                  <div style={{ color: INV_C.selBorder, fontSize: 9, margin: '4px 0', letterSpacing: 1 }}>
                    ✦ HELD PASSIVELY — bonuses always active
                  </div>
                )}
                {equippedSlot && (
                  <div style={{ color: INV_C.selBorder, fontSize: 9, margin: '4px 0', letterSpacing: 1 }}>
                    ✦ EQUIPPED ({equippedSlot})
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${INV_C.borderDim}`, margin: '8px 0' }} />

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {actions.map((action, ai) => {
                    const isActionCursor = actionCursor === ai;
                    const isDestructive = action === 'Drop';
                    return (
                      <div
                        key={action}
                        onClick={() => {
                          if (action === 'Equip'   && selectedItemId) { onEquip(selectedItemId);   setActionCursor(null); }
                          if (action === 'Unequip' && equippedSlot)   { onUnequip(equippedSlot);   setActionCursor(null); }
                          if (action === 'Drop'    && selectedItemId) { onDrop(selectedItemId);     setActionCursor(null); }
                          if (action === 'Cancel')                    { setActionCursor(null); }
                        }}
                        style={{
                          padding: '6px 8px', cursor: 'pointer',
                          background: isActionCursor ? (isDestructive ? '#2a0808' : INV_C.selBg) : 'transparent',
                          border: `1px solid ${isActionCursor ? (isDestructive ? '#883333' : INV_C.selBorder) : INV_C.borderDim}`,
                          color: isDestructive ? (isActionCursor ? '#ee6666' : '#663333') : (isActionCursor ? INV_C.white : INV_C.dim),
                          fontSize: 12, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <span style={{ width: 10, color: INV_C.selBorder }}>{isActionCursor ? '►' : ' '}</span>
                        {action}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: INV_C.dim, fontSize: 11, marginTop: 8 }}>Select an item</div>
            )}

            {/* Equipped gear summary */}
            <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${INV_C.borderDim}` }}>
              <div style={{ color: INV_C.dim, fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>EQUIPPED</div>
              {EQUIP_SLOTS.map(({ key, label }) => {
                const eqId = player.equipped[key];
                const eqItem = eqId ? ITEMS[eqId] : null;
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: INV_C.dim, fontSize: 10 }}>{label}</span>
                    <span style={{ color: eqItem ? INV_C.silver : '#252535', fontSize: 10 }}>
                      {eqItem ? eqItem.name : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 16px', borderTop: `1px solid ${INV_C.borderDim}`, display: 'flex', justifyContent: 'center' }}>
          <span style={{ color: INV_C.dim, fontSize: 10 }}>
            {actionCursor !== null
              ? '[W/S] choose action   [Space] confirm   [Esc] back'
              : '[A/D] category   [W/S] browse   [Space] select   [E/Esc] close'}
          </span>
        </div>
      </PixelBox>
    </div>
  );
}

// ── SHOP OVERLAY ──────────────────────────────────────────────────────
interface ShopOverlayProps {
  player: Player;
  onClose: () => void;
  onBuy: (itemId: string) => boolean;
}

function ShopOverlay({ player, onClose, onBuy }: ShopOverlayProps) {
  const allItems = getShopInventory();
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const clampedCursor = Math.min(cursor, Math.max(0, allItems.length - 1));
  const selectedId = allItems[clampedCursor];
  const selectedDef = selectedId ? ITEMS[selectedId] : null;

  const handleBuy = () => {
    if (!selectedId) return;
    const success = onBuy(selectedId);
    if (success) {
      setMessage(`Bought ${ITEMS[selectedId]?.name}!`);
      forceUpdate(n => n + 1);
    } else {
      setMessage('Not enough gold.');
    }
    setTimeout(() => setMessage(null), 1500);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 's', ' ', 'arrowup', 'arrowdown'].includes(key)) e.preventDefault();
      if (key === 'escape' || key === 'e') { onClose(); return; }
      if (key === 'w' || key === 'arrowup')   setCursor(c => Math.max(0, c - 1));
      if (key === 's' || key === 'arrowdown') setCursor(c => Math.min(allItems.length - 1, c + 1));
      if (key === ' ' || key === 'enter') handleBuy();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedCursor, player.gold]);

  const isChromatic = selectedDef?.rarity === 'chromatic';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.94)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Mono", monospace',
    }}>
      <PixelBox style={{ width: 820, display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

        {/* Header */}
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${INV_C.borderDim}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: INV_C.gold, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 }}>◈ THE MERCHANT</span>
          <span style={{ color: INV_C.gold, fontSize: 12 }}>◈ {player.gold.toLocaleString()} gold</span>
          <span style={{ color: INV_C.dim, fontSize: 10 }}>[W/S] browse  [Space] buy  [Esc] close</span>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Item list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', borderRight: `1px solid ${INV_C.borderDim}` }}>
            {allItems.map((itemId, idx) => {
              const def = ITEMS[itemId];
              if (!def) return null;
              const isCursor = idx === clampedCursor;
              const itemChromatic = def.rarity === 'chromatic';
              const canAfford = player.gold >= def.price;
              const alreadyOwned = player.inventory.some(i => i.itemId === itemId);

              return (
                <div
                  key={itemId}
                  onClick={() => setCursor(idx)}
                  className={isCursor && itemChromatic ? 'chromatic-border' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', marginBottom: 2, cursor: 'pointer',
                    background: isCursor ? INV_C.selBg : 'transparent',
                    border: `1px solid ${isCursor && !itemChromatic ? INV_C.selBorder : 'transparent'}`,
                    opacity: canAfford ? 1 : 0.5,
                  }}
                >
                  <span style={{ color: isCursor ? INV_C.selBorder : INV_C.dim, fontSize: 11, width: 10 }}>
                    {isCursor ? '►' : ' '}
                  </span>
                  <span style={{ color: INV_C.dim, fontSize: 8, width: 28, flexShrink: 0 }}>[{TYPE_TAG[def.type] ?? '???'}]</span>
                  <span
                    className={itemChromatic ? 'chromatic-text' : undefined}
                    style={{ flex: 1, fontSize: 11, color: itemChromatic ? undefined : (isCursor ? INV_C.white : INV_C.silver) }}
                  >
                    {def.name}
                    {alreadyOwned && <span style={{ color: INV_C.dim, fontSize: 8, marginLeft: 6 }}>[owned]</span>}
                  </span>
                  <span
                    className={itemChromatic ? 'chromatic-text' : undefined}
                    style={{ color: itemChromatic ? undefined : RARITY_UI_COLORS[def.rarity as Rarity], fontSize: 8, width: 70, textAlign: 'right' }}
                  >
                    {RARITY_LABEL[def.rarity as Rarity]}
                  </span>
                  <span style={{ color: canAfford ? INV_C.gold : '#885500', fontSize: 10, width: 70, textAlign: 'right' }}>
                    ◈ {def.price.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div style={{ width: 250, display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 8 }}>
            {selectedDef ? (
              <>
                <RarityBadge rarity={selectedDef.rarity as Rarity} />
                <div
                  className={isChromatic ? 'chromatic-text' : undefined}
                  style={{ color: isChromatic ? undefined : INV_C.white, fontSize: 15, fontWeight: 'bold', lineHeight: 1.3 }}
                >
                  {selectedDef.name}
                </div>

                <div style={{ color: '#707090', fontSize: 10, lineHeight: 1.6, fontStyle: 'italic' }}>
                  {selectedDef.description}
                </div>

                {(selectedDef.damageBonus || selectedDef.maxHpBonus || selectedDef.healAmount || selectedDef.effect) && (
                  <div style={{ padding: '8px 0', borderTop: `1px solid ${INV_C.borderDim}`, borderBottom: `1px solid ${INV_C.borderDim}` }}>
                    {selectedDef.damageBonus && <div style={{ color: INV_C.atkColor, fontSize: 11, marginBottom: 2 }}>ATK  +{selectedDef.damageBonus}</div>}
                    {selectedDef.maxHpBonus  && <div style={{ color: INV_C.hpColor,  fontSize: 11, marginBottom: 2 }}>HP   +{selectedDef.maxHpBonus}</div>}
                    {selectedDef.healAmount  && <div style={{ color: INV_C.hpColor,  fontSize: 11 }}>Heals {selectedDef.healAmount} HP on use</div>}
                    {selectedDef.effect === 'providence' && (
                      <div style={{ color: '#ffe44d', fontSize: 11 }}>Deals 40% max HP to all nearby enemies</div>
                    )}
                    {selectedDef.type === 'perk' && (
                      <div style={{ color: INV_C.selBorder, fontSize: 9, marginTop: 4 }}>✦ Passive — always active when held</div>
                    )}
                  </div>
                )}

                {(selectedDef.id === 'creed' || selectedDef.id === 'chromacy') && (
                  <div style={{ color: '#aaaaff', fontSize: 9, lineHeight: 1.5, padding: '6px 0', borderTop: `1px solid ${INV_C.borderDim}` }}>
                    ⟳ OPPOSING PAIR — Hold both Creed &amp; Chromacy for synergy: +15 ATK, +20 HP
                  </div>
                )}

                <div style={{ marginTop: 'auto' }}>
                  {message && (
                    <div style={{
                      color: message.includes('Bought') ? '#77dd77' : '#cc2936',
                      fontSize: 11, textAlign: 'center', marginBottom: 8,
                    }}>
                      {message}
                    </div>
                  )}
                  <div
                    onClick={handleBuy}
                    style={{
                      padding: '10px 0',
                      background: player.gold >= selectedDef.price ? '#0a1a0a' : '#1a0a0a',
                      border: `1px solid ${player.gold >= selectedDef.price ? '#4a8a4a' : '#8a3a3a'}`,
                      color: player.gold >= selectedDef.price ? '#77dd77' : '#cc5555',
                      fontSize: 12, textAlign: 'center', cursor: 'pointer',
                      letterSpacing: 1,
                    }}
                  >
                    {player.gold >= selectedDef.price
                      ? `BUY — ◈ ${selectedDef.price.toLocaleString()}`
                      : `NEED ◈ ${(selectedDef.price - player.gold).toLocaleString()} MORE`}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: INV_C.dim, fontSize: 11 }}>Select an item to inspect</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 16px', borderTop: `1px solid ${INV_C.borderDim}`, textAlign: 'center' }}>
          <span style={{ color: INV_C.dim, fontSize: 10 }}>
            [W/S] browse   [Space / click] buy   [Esc] leave shop
          </span>
        </div>
      </PixelBox>
    </div>
  );
}
