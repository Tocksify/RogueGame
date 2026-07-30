import { useEffect, useRef, useState } from 'react';
import { GameState, Player, EquippedItems } from '../game/types';
import { createWorld, roomKey, ITEMS } from '../game/world';
import { PLAYER_APPEARANCE } from '../game/sprite';
import { InputState } from '../game/input';
import { update } from '../game/gameLoop';
import { render } from '../game/renderer';
import { equipItem, unequipItem, removeItem, addItem } from '../game/inventory';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryCursor, setInventoryCursor] = useState(0);
  const [, setForceUpdate] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize game state
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
        equipped: {
          weapon: null,
          armor: null,
          offhand: null,
          accessory: null,
        },
        hotbar: [null, null, null, null, null, null],
        selectedHotbarSlot: 0,
      };

      gameStateRef.current = {
        player,
        currentRoom: { x: 0, y: 0 },
        rooms,
        damageNumbers: [],
        floatingTexts: [],
        attackArc: null,
        dialogue: {
          active: false,
          npcId: null,
          currentLine: 0,
        },
        transition: null,
        inventoryOpen: false,
        inventoryCursor: 0,
        mousePos: { x: 0, y: 0 },
        nearbyNpc: null,
        time: 0,
      };
    }

    // Initialize input
    if (!inputRef.current) {
      inputRef.current = new InputState(canvas);
    }

    // Game loop
    const loop = (time: number) => {
      const dt = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;

      const state = gameStateRef.current;
      const input = inputRef.current;
      if (!state || !input) return;

      // Sync inventory open state
      if (state.inventoryOpen !== inventoryOpen) {
        setInventoryOpen(state.inventoryOpen);
      }

      update(state, Math.min(dt, 0.1), input, canvas.width, canvas.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        render(ctx, state, canvas.width, canvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [inventoryOpen]);

  // Inventory overlay handlers
  const handleInventoryClose = () => {
    if (gameStateRef.current) {
      gameStateRef.current.inventoryOpen = false;
      setInventoryOpen(false);
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

  return (
    <>
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ cursor: 'none' }}
      />

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
    </>
  );
}

// ── COLOUR TOKENS (matches renderer noir palette) ─────────────────────
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
};

// Which item types can be equipped into an equipment slot
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
  accessory: 'ACC',
  consumable:'CSM',
  quest:     'QST',
};

const TYPE_COLOR: Record<string, string> = {
  weapon:    '#ff9977',
  armor:     '#77aaff',
  offhand:   '#aaccff',
  accessory: '#cc88ff',
  consumable:'#77dd77',
  quest:     '#e0c840',
};

interface InventoryOverlayProps {
  player: Player;
  onClose: () => void;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: keyof EquippedItems) => void;
  onDrop: (itemId: string) => void;
  onAddToHotbar: (itemId: string, slot: number) => void;
}

function PixelBox({ children, style, className }: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: INV_C.bg,
        border: `2px solid ${INV_C.border}`,
        ...style,
      }}
    >
      {/* Corner dots */}
      {[['0','0'],['calc(100% - 3px)','0'],['0','calc(100% - 3px)'],['calc(100% - 3px)','calc(100% - 3px)']].map(([l, t], i) => (
        <span key={i} style={{
          position: 'absolute', left: l, top: t,
          width: 3, height: 3, background: INV_C.border, display: 'block',
        }} />
      ))}
      {children}
    </div>
  );
}

function HotbarSlot({ index, itemId, isSelected, onAssign }: {
  index: number;
  itemId: string | null;
  isSelected: boolean;
  onAssign: () => void;
}) {
  const item = itemId ? ITEMS[itemId] : null;
  return (
    <div
      onClick={onAssign}
      title={item ? `Slot ${index + 1}: ${item.name} — click to assign selected item` : `Slot ${index + 1}: empty`}
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
        <span style={{ fontSize: 10, color: TYPE_COLOR[item.type] ?? INV_C.silver, fontFamily: 'monospace', textAlign: 'center', padding: '0 4px', lineHeight: 1.2 }}>
          {item.name.length > 7 ? item.name.slice(0, 6) + '…' : item.name}
        </span>
      ) : (
        <span style={{ fontSize: 14, color: '#252535', fontFamily: 'monospace' }}>—</span>
      )}
    </div>
  );
}

function InventoryOverlay({
  player,
  onClose,
  onEquip,
  onUnequip,
  onDrop,
  onAddToHotbar,
}: InventoryOverlayProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const selectedInvItem = selectedItemId
    ? player.inventory.find((i) => i.itemId === selectedItemId) ?? null
    : null;
  const selectedItemDef = selectedInvItem ? ITEMS[selectedInvItem.itemId] : null;

  const equippedSlot: keyof EquippedItems | null = selectedItemId
    ? (Object.entries(player.equipped).find(([, v]) => v === selectedItemId)?.[0] as keyof EquippedItems) ?? null
    : null;

  const canEquip = selectedItemDef ? EQUIPPABLE_TYPES.has(selectedItemDef.type) : false;

  const handleEquip = () => {
    if (!selectedItemId || !canEquip) return;
    onEquip(selectedItemId);
    setSelectedItemId(null);
  };

  const handleUnequip = () => {
    if (!equippedSlot) return;
    onUnequip(equippedSlot);
    setSelectedItemId(null);
  };

  const handleDrop = () => {
    if (!selectedItemId) return;
    onDrop(selectedItemId);
    setSelectedItemId(null);
  };

  const handleHotbarAssign = (slot: number) => {
    if (!selectedItemId) return;
    onAddToHotbar(selectedItemId, slot);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.93)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Mono", monospace',
    }}>
      <PixelBox style={{ width: 740, display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

        {/* ── Header ── */}
        <div style={{
          padding: '8px 16px', borderBottom: `1px solid ${INV_C.borderDim}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: INV_C.white, fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }}>INVENTORY</span>
          <span style={{ color: INV_C.dim, fontSize: 10 }}>[E / Esc] close</span>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left panel: hotbar + item list ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px', borderRight: `1px solid ${INV_C.borderDim}`, overflow: 'hidden' }}>

            {/* Hotbar row */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ color: INV_C.dim, fontSize: 9, marginBottom: 6, letterSpacing: 2 }}>HOTBAR  —  click a slot to assign selected item</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2,3,4,5].map((i) => (
                  <HotbarSlot
                    key={i}
                    index={i}
                    itemId={player.hotbar[i]}
                    isSelected={false}
                    onAssign={() => handleHotbarAssign(i)}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${INV_C.borderDim}`, margin: '8px 0' }} />

            {/* Item list */}
            <div style={{ color: INV_C.dim, fontSize: 9, marginBottom: 6, letterSpacing: 2 }}>
              ALL ITEMS ({player.inventory.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {player.inventory.length === 0 ? (
                <div style={{ color: INV_C.dim, fontSize: 11, padding: '12px 0', textAlign: 'center' }}>— empty —</div>
              ) : player.inventory.map((invItem) => {
                const itemDef = ITEMS[invItem.itemId];
                if (!itemDef) return null;
                const isSelected = selectedItemId === invItem.itemId;
                const isEquipped = Object.values(player.equipped).includes(invItem.itemId);
                const tag = TYPE_TAG[itemDef.type] ?? '???';
                const tagColor = TYPE_COLOR[itemDef.type] ?? INV_C.silver;

                return (
                  <div
                    key={invItem.itemId}
                    onClick={() => setSelectedItemId(isSelected ? null : invItem.itemId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 6px', marginBottom: 2, cursor: 'pointer',
                      background: isSelected ? INV_C.selBg : 'transparent',
                      border: `1px solid ${isSelected ? INV_C.selBorder : 'transparent'}`,
                    }}
                  >
                    <span style={{ color: isSelected ? INV_C.selBorder : INV_C.dim, fontSize: 11, width: 10 }}>
                      {isSelected ? '►' : ' '}
                    </span>
                    <span style={{ color: tagColor, fontSize: 9, width: 28, flexShrink: 0 }}>[{tag}]</span>
                    <span style={{ color: isSelected ? INV_C.white : INV_C.silver, fontSize: 12, flex: 1 }}>
                      {itemDef.name}
                      {isEquipped && <span style={{ color: INV_C.selBorder, fontSize: 9, marginLeft: 6 }}>[E]</span>}
                    </span>
                    <span style={{ color: INV_C.dim, fontSize: 10, marginRight: 2 }}>×{invItem.quantity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right panel: item detail + actions ── */}
          <div style={{ width: 228, display: 'flex', flexDirection: 'column', padding: '10px 14px', gap: 0 }}>

            {/* Selected item info */}
            {selectedItemDef ? (
              <>
                <div style={{ color: TYPE_COLOR[selectedItemDef.type] ?? INV_C.silver, fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>
                  {TYPE_TAG[selectedItemDef.type] ?? '???'}
                </div>
                <div style={{ color: INV_C.white, fontSize: 13, fontWeight: 'bold', marginBottom: 2, lineHeight: 1.3 }}>
                  {selectedItemDef.name}
                </div>
                {selectedInvItem && selectedInvItem.quantity > 1 && (
                  <div style={{ color: INV_C.dim, fontSize: 10, marginBottom: 4 }}>×{selectedInvItem.quantity}</div>
                )}

                {/* Stats */}
                {(selectedItemDef.damageBonus || selectedItemDef.maxHpBonus) && (
                  <div style={{ margin: '6px 0', padding: '6px 0', borderTop: `1px solid ${INV_C.borderDim}`, borderBottom: `1px solid ${INV_C.borderDim}` }}>
                    {selectedItemDef.damageBonus && (
                      <div style={{ color: INV_C.atkColor, fontSize: 11, marginBottom: 2 }}>ATK  +{selectedItemDef.damageBonus}</div>
                    )}
                    {selectedItemDef.maxHpBonus && (
                      <div style={{ color: INV_C.hpColor, fontSize: 11 }}>HP   +{selectedItemDef.maxHpBonus}</div>
                    )}
                    {selectedItemDef.healAmount && (
                      <div style={{ color: INV_C.hpColor, fontSize: 11 }}>Heals {selectedItemDef.healAmount} HP</div>
                    )}
                  </div>
                )}

                {/* Equip status */}
                {equippedSlot && (
                  <div style={{ color: INV_C.selBorder, fontSize: 9, margin: '4px 0', letterSpacing: 1 }}>
                    ✦ EQUIPPED ({equippedSlot})
                  </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: `1px solid ${INV_C.borderDim}`, margin: '8px 0' }} />

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {canEquip && !equippedSlot && (
                    <button onClick={handleEquip} style={{
                      padding: '6px 0', background: '#112233', border: `1px solid ${INV_C.selBorder}`,
                      color: INV_C.white, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                      letterSpacing: 1,
                    }}>
                      ► Equip
                    </button>
                  )}
                  {equippedSlot && (
                    <button onClick={handleUnequip} style={{
                      padding: '6px 0', background: '#111122', border: `1px solid #404060`,
                      color: INV_C.silver, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                      letterSpacing: 1,
                    }}>
                      Unequip
                    </button>
                  )}
                  {!canEquip && (
                    <div style={{ color: INV_C.dim, fontSize: 10, fontStyle: 'italic' }}>
                      Cannot equip — runs passively
                    </div>
                  )}
                  <button onClick={handleDrop} style={{
                    padding: '6px 0', background: '#1a0808', border: `1px solid #663333`,
                    color: '#cc6666', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                    letterSpacing: 1,
                  }}>
                    Drop
                  </button>
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

        {/* ── Footer ── */}
        <div style={{
          padding: '6px 16px', borderTop: `1px solid ${INV_C.borderDim}`,
          display: 'flex', justifyContent: 'center', gap: 32,
        }}>
          <span style={{ color: INV_C.dim, fontSize: 10 }}>[↑↓] browse   [click] select   [E/Esc] close</span>
        </div>
      </PixelBox>
    </div>
  );
}
