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

interface InventoryOverlayProps {
  player: Player;
  onClose: () => void;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: keyof EquippedItems) => void;
  onDrop: (itemId: string) => void;
  onAddToHotbar: (itemId: string, slot: number) => void;
}

function InventoryOverlay({
  player,
  onClose,
  onEquip,
  onUnequip,
  onDrop,
  onAddToHotbar,
}: InventoryOverlayProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<keyof EquippedItems | null>(
    null
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const isEquipped = (itemId: string): boolean => {
    return Object.values(player.equipped).includes(itemId);
  };

  const getEquipSlot = (
    itemId: string
  ): keyof EquippedItems | null => {
    const item = ITEMS[itemId];
    if (!item) return null;
    switch (item.type) {
      case 'weapon':
        return 'weapon';
      case 'armor':
        return 'armor';
      case 'offhand':
        return 'offhand';
      case 'accessory':
        return 'accessory';
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="w-[90%] max-w-5xl h-[80%] bg-[#1a1a1a] border-2 border-[#e0c840] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#3a3a3a]">
          <h2 className="text-xl font-bold text-[#e0c840]">Inventory</h2>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Bag */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm text-[#aaaaaa] mb-3">Bag</h3>
            <div className="grid grid-cols-4 gap-3">
              {player.inventory.map((invItem) => {
                const item = ITEMS[invItem.itemId];
                if (!item) return null;

                const equipped = isEquipped(invItem.itemId);
                const selected = selectedItem === invItem.itemId;

                return (
                  <div
                    key={invItem.itemId}
                    onClick={() => setSelectedItem(invItem.itemId)}
                    className={`
                      relative p-3 bg-[#2a2a2a] border-2 cursor-pointer
                      ${selected ? 'border-[#e0c840]' : 'border-[#3a3a3a]'}
                      hover:border-[#e0c840]/50 transition-colors
                    `}
                  >
                    {equipped && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-[#e0c840] text-[#1a1a1a] text-xs flex items-center justify-center font-bold">
                        E
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xs text-white mb-1">{item.name}</div>
                      <div className="text-xs text-[#aaaaaa]">
                        ×{invItem.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Equipped + Actions */}
          <div className="w-80 border-l border-[#3a3a3a] p-4 flex flex-col gap-4">
            <div>
              <h3 className="text-sm text-[#aaaaaa] mb-3">Equipped</h3>
              <div className="space-y-2">
                {(['weapon', 'armor', 'offhand', 'accessory'] as const).map(
                  (slot) => {
                    const itemId = player.equipped[slot];
                    const item = itemId ? ITEMS[itemId] : null;

                    return (
                      <div
                        key={slot}
                        onClick={() =>
                          itemId ? setSelectedSlot(slot) : null
                        }
                        className={`
                          p-2 bg-[#2a2a2a] border-2 cursor-pointer
                          ${selectedSlot === slot && itemId ? 'border-[#e0c840]' : 'border-[#3a3a3a]'}
                          hover:border-[#e0c840]/50 transition-colors
                        `}
                      >
                        <div className="text-xs text-[#aaaaaa] mb-1 capitalize">
                          {slot}
                        </div>
                        <div className="text-xs text-white">
                          {item ? item.name : 'Empty'}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-1 flex flex-col gap-2">
              {selectedItem && (
                <>
                  <button
                    onClick={() => {
                      if (getEquipSlot(selectedItem)) {
                        onEquip(selectedItem);
                        setSelectedItem(null);
                      }
                    }}
                    disabled={!getEquipSlot(selectedItem)}
                    className="px-3 py-2 bg-[#e0c840] text-[#1a1a1a] font-bold text-sm hover:bg-[#e0c840]/90 disabled:bg-[#3a3a3a] disabled:text-[#666666] disabled:cursor-not-allowed"
                  >
                    Equip
                  </button>
                  <button
                    onClick={() => {
                      onDrop(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="px-3 py-2 bg-[#cc2936] text-white font-bold text-sm hover:bg-[#cc2936]/90"
                  >
                    Drop
                  </button>
                  <div className="mt-2">
                    <div className="text-xs text-[#aaaaaa] mb-1">
                      Add to Hotbar:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[0, 1, 2, 3, 4, 5].map((slot) => (
                        <button
                          key={slot}
                          onClick={() => {
                            onAddToHotbar(selectedItem, slot);
                            setSelectedItem(null);
                          }}
                          className="px-2 py-1 bg-[#3a3a3a] text-white text-xs hover:bg-[#4a4a4a]"
                        >
                          {slot + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedSlot && player.equipped[selectedSlot] && (
                <button
                  onClick={() => {
                    onUnequip(selectedSlot);
                    setSelectedSlot(null);
                  }}
                  className="px-3 py-2 bg-[#e0c840] text-[#1a1a1a] font-bold text-sm hover:bg-[#e0c840]/90"
                >
                  Unequip
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#3a3a3a] text-xs text-[#aaaaaa] text-center">
          Press [E] or [Esc] to close
        </div>
      </div>
    </div>
  );
}
