import { SpriteAppearance, HairStyle, Accessory } from './types';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], h: number, salt: number): T {
  return arr[Math.floor(h / (salt || 1)) % arr.length];
}

const SKIN_TONES = [
  '#f2d0a9',
  '#e8b788',
  '#d39c68',
  '#b97f4d',
  '#8d5f3c',
  '#6b4530',
] as const;

const HAIR_COLORS = [
  '#1a1a1a',
  '#3a2a1c',
  '#5c3a21',
  '#8a5a2e',
  '#c9a24c',
  '#e8dcc0',
  '#8c8c8c',
  '#5a5a5a',
  '#7a2020',
] as const;

const HAIR_STYLES: readonly HairStyle[] = [
  'bald',
  'buzz',
  'short',
  'long',
  'ponytail',
  'spiky',
  'mohawk',
];

const EYE_COLORS = ['#080808', '#2b1a0e', '#25405c', '#2f4d33'] as const;

const ACCESSORIES: readonly Accessory[] = [
  'none',
  'none',
  'none',
  'glasses',
  'beard',
  'earrings',
];

const CLOTH_COLORS = [
  '#f0f0f0',
  '#c0d0e8',
  '#52a0e0',
  '#52c066',
  '#e05252',
  '#d4a054',
  '#8c52e0',
  '#e08840',
  '#404040',
  '#e0c840',
  '#40b0b0',
  '#c060a0',
] as const;

function jitterColor(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount * 0.7);
  const b = clamp((n & 0xff) + amount * 0.5);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const PLAYER_APPEARANCE: SpriteAppearance = {
  cloth: '#f0f0f0',
  skin: '#f2d0a9',
  hair: '#1a1a1a',
  hairStyle: 'short',
  eye: '#080808',
  bodyW: 16,
  bodyH: 16,
  headSize: 12,
  accessory: 'none',
  hat: false,
};

const appearanceCache = new Map<string, SpriteAppearance>();

export function getNpcAppearance(
  id: string,
  baseColor: string
): SpriteAppearance {
  const cacheKey = `${id}|${baseColor}`;
  const cached = appearanceCache.get(cacheKey);
  if (cached) return cached;
  const h = hashStr(id);
  const jitterAmt = ((h >>> 3) % 41) - 20;
  const appearance: SpriteAppearance = {
    cloth: jitterColor(baseColor, jitterAmt),
    skin: pick(SKIN_TONES, h, 2),
    hair: pick(HAIR_COLORS, h, 8),
    hairStyle: pick(HAIR_STYLES, h, 32),
    eye: pick(EYE_COLORS, h, 128),
    bodyW: 15 + (h % 3),
    bodyH: 15 + ((h >>> 5) % 4),
    headSize: 11 + ((h >>> 9) % 2),
    accessory: pick(ACCESSORIES, h, 512),
  };
  appearanceCache.set(cacheKey, appearance);
  return appearance;
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  hxL: number,
  hyT: number,
  hs: number,
  color: string,
  style: HairStyle
) {
  ctx.fillStyle = color;
  switch (style) {
    case 'bald':
      break;
    case 'buzz':
      ctx.fillRect(hxL, hyT - 1, hs, 3);
      break;
    case 'short':
      ctx.fillRect(hxL - 1, hyT - 2, hs + 2, 4);
      ctx.fillRect(hxL - 1, hyT, 2, hs * 0.4);
      ctx.fillRect(hxL + hs - 1, hyT, 2, hs * 0.4);
      break;
    case 'long':
      ctx.fillRect(hxL - 1, hyT - 2, hs + 2, 4);
      ctx.fillRect(hxL - 2, hyT, 3, hs + 3);
      ctx.fillRect(hxL + hs - 1, hyT, 3, hs + 3);
      break;
    case 'ponytail':
      ctx.fillRect(hxL - 1, hyT - 2, hs + 2, 4);
      ctx.fillRect(hxL + hs, hyT + 1, 3, hs * 0.9);
      break;
    case 'spiky':
      for (let i = 0; i < 3; i++)
        ctx.fillRect(hxL + i * (hs / 3), hyT - 4, hs / 3 - 1, 5);
      break;
    case 'mohawk':
      ctx.fillRect(hxL + hs * 0.35, hyT - 5, hs * 0.3, 6);
      break;
  }
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  ap: SpriteAppearance,
  hat?: boolean
) {
  const useHat = hat !== undefined ? hat : ap.hat ?? false;
  const px = Math.round(wx + 16);
  const py = Math.round(wy + 8);
  const cx = px + 8;
  const bw = ap.bodyW;
  const bh = ap.bodyH;
  const bodyBottom = py + 4 + 16;
  const bx = Math.round(cx - bw / 2);
  const by = Math.round(bodyBottom - bh);
  ctx.fillStyle = ap.cloth;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
  const hs = ap.headSize;
  const headBottom = py + 8;
  const hxL = Math.round(cx - hs / 2);
  const hyT = Math.round(headBottom - hs);
  ctx.fillStyle = ap.skin;
  ctx.fillRect(hxL, hyT, hs, hs);
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(hxL, hyT, hs, hs);
  ctx.fillStyle = ap.eye;
  ctx.fillRect(
    Math.round(hxL + hs * 0.2),
    Math.round(hyT + hs * 0.4),
    Math.round(hs * 0.22),
    Math.round(hs * 0.22)
  );
  ctx.fillRect(
    Math.round(hxL + hs * 0.58),
    Math.round(hyT + hs * 0.4),
    Math.round(hs * 0.22),
    Math.round(hs * 0.22)
  );
  if (useHat) {
    ctx.fillStyle = '#555555';
    ctx.fillRect(hxL - 1, hyT - 3, hs + 2, 3);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(hxL + 1, hyT - 7, hs - 2, 5);
  } else {
    drawHair(ctx, hxL, hyT, hs, ap.hair, ap.hairStyle);
  }
  if (ap.accessory === 'glasses') {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(hxL + hs * 0.14),
      Math.round(hyT + hs * 0.36),
      Math.round(hs * 0.32),
      Math.round(hs * 0.28)
    );
    ctx.strokeRect(
      Math.round(hxL + hs * 0.54),
      Math.round(hyT + hs * 0.36),
      Math.round(hs * 0.32),
      Math.round(hs * 0.28)
    );
  } else if (ap.accessory === 'beard') {
    ctx.fillStyle = ap.hair;
    ctx.fillRect(
      Math.round(hxL + hs * 0.15),
      Math.round(hyT + hs * 0.7),
      Math.round(hs * 0.7),
      Math.round(hs * 0.3)
    );
  } else if (ap.accessory === 'earrings') {
    ctx.fillStyle = '#e8d98a';
    ctx.fillRect(hxL - 2, Math.round(hyT + hs * 0.5), 2, 2);
    ctx.fillRect(hxL + hs, Math.round(hyT + hs * 0.5), 2, 2);
  }
}
