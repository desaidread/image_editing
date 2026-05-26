export interface ChannelLevels {
  blackPoint: number; // 0–254
  gamma: number;      // 0.1–9.9
  whitePoint: number; // 1–255
}

export type ChannelKey = "master" | "r" | "g" | "b" | "a";

export interface LevelsSettings {
  master: ChannelLevels;
  r: ChannelLevels;
  g: ChannelLevels;
  b: ChannelLevels;
  a: ChannelLevels;
}

export const DEFAULT_CH: ChannelLevels = { blackPoint: 0, gamma: 1.0, whitePoint: 255 };

export const DEFAULT_LEVELS: LevelsSettings = {
  master: { ...DEFAULT_CH },
  r: { ...DEFAULT_CH },
  g: { ...DEFAULT_CH },
  b: { ...DEFAULT_CH },
  a: { ...DEFAULT_CH },
};

export function buildLUT({ blackPoint, gamma, whitePoint }: ChannelLevels): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const range = Math.max(1, whitePoint - blackPoint);
  for (let i = 0; i < 256; i++) {
    if (i <= blackPoint) { lut[i] = 0; continue; }
    if (i >= whitePoint) { lut[i] = 255; continue; }
    lut[i] = Math.round(Math.pow((i - blackPoint) / range, 1 / gamma) * 255);
  }
  return lut;
}

export function applyLevels(src: ImageData, s: LevelsSettings): ImageData {
  const mLUT = buildLUT(s.master);
  const rLUT = buildLUT(s.r);
  const gLUT = buildLUT(s.g);
  const bLUT = buildLUT(s.b);
  const aLUT = buildLUT(s.a);
  const d = src.data;
  const out = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) {
    out[i]     = rLUT[mLUT[d[i]]];
    out[i + 1] = gLUT[mLUT[d[i + 1]]];
    out[i + 2] = bLUT[mLUT[d[i + 2]]];
    out[i + 3] = aLUT[d[i + 3]];
  }
  return new ImageData(out, src.width, src.height);
}

export function computeHistogram(img: ImageData, ch: ChannelKey): Uint32Array {
  const hist = new Uint32Array(256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let v: number;
    switch (ch) {
      case "master": v = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]); break;
      case "r": v = d[i]; break;
      case "g": v = d[i + 1]; break;
      case "b": v = d[i + 2]; break;
      default:  v = d[i + 3];
    }
    hist[v]++;
  }
  return hist;
}

// gamma ↔ normalized slider position [0,1]
export function gammaToNorm(gamma: number): number {
  return (1 - Math.log10(Math.max(0.01, gamma))) / 2;
}
export function normToGamma(n: number): number {
  return Math.max(0.1, Math.min(9.9, Math.pow(10, 1 - 2 * n)));
}
