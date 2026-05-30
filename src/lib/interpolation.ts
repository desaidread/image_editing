export type InterpolationMethod = "bilinear" | "nearest";

export interface InterpInfo {
  label: string;
  tooltip: string;
}

export const INTERP_INFO: Record<InterpolationMethod, InterpInfo> = {
  bilinear: {
    label: "Билинейная",
    tooltip:
      "Взвешенное среднее четырёх ближайших пикселей. Даёт гладкие переходы без ступенчатости. Оптимальный баланс скорости и качества для большинства задач.",
  },
  nearest: {
    label: "Ближайший сосед",
    tooltip:
      "Каждый выходной пиксель получает значение ближайшего входного пикселя. Очень быстрый метод, сохраняет чёткие края, но при увеличении даёт «пиксельный» эффект.",
  },
};

export const INTERP_METHODS: InterpolationMethod[] = ["bilinear", "nearest"];

export const ZOOM_LEVELS = [12, 25, 33, 50, 67, 75, 100, 150, 200, 300] as const;

export function resizeImageData(
  src: ImageData,
  newWidth: number,
  newHeight: number,
  method: InterpolationMethod = "bilinear",
): ImageData {
  const dw = Math.max(1, Math.round(newWidth));
  const dh = Math.max(1, Math.round(newHeight));
  return method === "nearest" ? _nearest(src, dw, dh) : _bilinear(src, dw, dh);
}

function _nearest(src: ImageData, dw: number, dh: number): ImageData {
  const { width: sw, height: sh, data: sd } = src;
  const out = new Uint8ClampedArray(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;
  for (let dy = 0; dy < dh; dy++) {
    const sy = Math.min(sh - 1, Math.floor(dy * yRatio));
    for (let dx = 0; dx < dw; dx++) {
      const sx = Math.min(sw - 1, Math.floor(dx * xRatio));
      const si = (sy * sw + sx) * 4;
      const di = (dy * dw + dx) * 4;
      out[di]     = sd[si];
      out[di + 1] = sd[si + 1];
      out[di + 2] = sd[si + 2];
      out[di + 3] = sd[si + 3];
    }
  }
  return new ImageData(out, dw, dh);
}

function _bilinear(src: ImageData, dw: number, dh: number): ImageData {
  const { width: sw, height: sh, data: sd } = src;
  const out = new Uint8ClampedArray(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;
  for (let dy = 0; dy < dh; dy++) {
    const fy = (dy + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = fy - y0;
    const ty1 = 1 - ty;
    for (let dx = 0; dx < dw; dx++) {
      const fx = (dx + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = fx - x0;
      const tx1 = 1 - tx;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      const di = (dy * dw + dx) * 4;
      for (let c = 0; c < 4; c++) {
        out[di + c] = Math.round(
          sd[i00 + c] * tx1 * ty1 +
          sd[i10 + c] * tx  * ty1 +
          sd[i01 + c] * tx1 * ty  +
          sd[i11 + c] * tx  * ty,
        );
      }
    }
  }
  return new ImageData(out, dw, dh);
}
