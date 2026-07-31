import { useRef, useState, useCallback, useEffect } from 'react';
import { InputState } from '../game/input';

// Returns true only on touch/coarse-pointer devices (phones, tablets)
function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isTouch;
}

interface MobileControlsProps {
  inputRef: React.MutableRefObject<InputState | null>;
  inventoryOpen: boolean;
  shopOpen: boolean;
  onAttack: () => void;
  onToggleInventory: () => void;
  onCloseInventory: () => void;
}

const BASE_R  = 56; // joystick base radius (px)
const KNOB_R  = 22; // thumb knob radius (px)
const MAX_DISP = BASE_R - KNOB_R; // max knob displacement
const DEAD_ZONE = 0.22; // fraction of MAX_DISP before keys activate

const MOVE_KEYS = ['w', 'a', 's', 'd'] as const;

// Thin glass ring + bright knob
const ringStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.05)',
  border: '2px solid rgba(255,255,255,0.20)',
  boxShadow: 'inset 0 0 16px rgba(0,0,0,0.4)',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

function glassBtn(color: string, size = 64, fontSize = 26): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle at 35% 35%, ${color}bb, ${color}33)`,
    border: `2px solid ${color}88`,
    boxShadow: `0 0 14px ${color}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
    color: '#fff',
    flexShrink: 0,
  };
}

export default function MobileControls({
  inputRef,
  inventoryOpen,
  shopOpen,
  onAttack,
  onToggleInventory,
  onCloseInventory,
}: MobileControlsProps) {
  const isTouch = useIsTouchDevice();
  if (!isTouch) return null;
  const joystickRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const isReturning = useRef(false);

  // ── Movement helpers ──────────────────────────────────────────────────
  const releaseMovement = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    for (const k of MOVE_KEYS) input.releaseVirtualKey(k);
    setKnob({ x: 0, y: 0 });
    isReturning.current = true;
    activeTouchId.current = null;
  }, [inputRef]);

  const applyDelta = useCallback((dx: number, dy: number) => {
    const input = inputRef.current;
    if (!input) return;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamp = Math.min(dist, MAX_DISP);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    isReturning.current = false;
    setKnob({ x: nx * clamp, y: ny * clamp });

    const frac = clamp / MAX_DISP;
    if (frac < DEAD_ZONE) {
      for (const k of MOVE_KEYS) input.releaseVirtualKey(k);
      return;
    }

    // Map angle to 8-directional WASD.
    // atan2(ny, nx): 0° = right, 90° = down (screen Y+ is down), 180° = left, 270° = up
    const angle = Math.atan2(ny, nx);
    const deg = ((angle * 180) / Math.PI + 360) % 360;

    // Each key is active within ±67.5° of its cardinal direction (covers diagonals)
    const goRight = deg >= 292.5 || deg <= 67.5;   // 0°  centre
    const goDown  = deg >= 22.5  && deg <= 157.5;  // 90° centre
    const goLeft  = deg >= 112.5 && deg <= 247.5;  // 180° centre
    const goUp    = deg >= 202.5 && deg <= 337.5;  // 270° centre

    goUp    ? input.pressVirtualKey('w') : input.releaseVirtualKey('w');
    goDown  ? input.pressVirtualKey('s') : input.releaseVirtualKey('s');
    goLeft  ? input.pressVirtualKey('a') : input.releaseVirtualKey('a');
    goRight ? input.pressVirtualKey('d') : input.releaseVirtualKey('d');
  }, [inputRef]);

  // ── Touch handlers for joystick ───────────────────────────────────────
  const onJoyStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    const rect = joystickRef.current!.getBoundingClientRect();
    baseCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    applyDelta(touch.clientX - baseCenter.current.x, touch.clientY - baseCenter.current.y);
  }, [applyDelta]);

  // Window-level listeners so dragging outside the base still works
  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;
      const touch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId.current);
      if (!touch) return;
      e.preventDefault();
      applyDelta(touch.clientX - baseCenter.current.x, touch.clientY - baseCenter.current.y);
    };
    const onEnd = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;
      const touch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId.current);
      if (!touch) return;
      releaseMovement();
    };

    window.addEventListener('touchmove',   onMove, { passive: false });
    window.addEventListener('touchend',    onEnd,  { passive: false });
    window.addEventListener('touchcancel', onEnd,  { passive: false });
    return () => {
      window.removeEventListener('touchmove',   onMove);
      window.removeEventListener('touchend',    onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [applyDelta, releaseMovement]);

  // Release movement keys when an overlay opens mid-movement
  useEffect(() => {
    if (inventoryOpen || shopOpen) releaseMovement();
  }, [inventoryOpen, shopOpen, releaseMovement]);

  // ── Attack / Inventory handlers ───────────────────────────────────────
  const handleAttack = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAttack();
  }, [onAttack]);

  const handleInvToggle = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleInventory();
  }, [onToggleInventory]);

  const handleInvClose = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCloseInventory();
  }, [onCloseInventory]);

  // ── Render ────────────────────────────────────────────────────────────

  // When shop is open, hide everything (shop has its own UI)
  if (shopOpen) return null;

  // When inventory is open, just show a floating close button
  if (inventoryOpen) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        pointerEvents: 'auto',
      }}>
        <div
          style={glassBtn('#cc4444', 64, 22)}
          onTouchStart={handleInvClose}
          onMouseDown={handleInvClose}
        >
          ✕ CLOSE
        </div>
      </div>
    );
  }

  // Normal gameplay controls
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 200,
    }}>
      {/* ── Joystick (bottom-left) ─────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        left: 28,
        width: BASE_R * 2,
        height: BASE_R * 2,
        pointerEvents: 'auto',
        touchAction: 'none',
      }}>
        {/* Base ring */}
        <div
          ref={joystickRef}
          onTouchStart={onJoyStart}
          style={ringStyle}
        />
        {/* Cross hair guides (subtle) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', width: '60%', height: 1, background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ position: 'absolute', width: 1, height: '60%', background: 'rgba(255,255,255,0.10)' }} />
        </div>
        {/* Knob */}
        <div style={{
          position: 'absolute',
          left: BASE_R - KNOB_R + knob.x,
          top:  BASE_R - KNOB_R + knob.y,
          width:  KNOB_R * 2,
          height: KNOB_R * 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), rgba(200,210,255,0.35))',
          border: '2px solid rgba(255,255,255,0.55)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          // Only animate the spring-back to center, not live movement
          transition: isReturning.current ? 'left 0.15s cubic-bezier(.22,.68,0,1.2), top 0.15s cubic-bezier(.22,.68,0,1.2)' : 'none',
        }} />
      </div>

      {/* ── Action buttons (bottom-right) ─────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        right: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        pointerEvents: 'auto',
      }}>
        {/* Inventory */}
        <div
          style={glassBtn('#8866dd', 56, 24)}
          onTouchStart={handleInvToggle}
          onMouseDown={handleInvToggle}
          title="Inventory (E)"
        >
          🎒
        </div>

        {/* Attack */}
        <div
          style={glassBtn('#dd5533', 72, 30)}
          onTouchStart={handleAttack}
          onMouseDown={handleAttack}
          title="Attack"
        >
          ⚔️
        </div>
      </div>
    </div>
  );
}
