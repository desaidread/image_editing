export type EdgeMode = "black" | "white" | "copy";

export interface KernelPreset {
  name: string;
  kernel: number[];
  divisor: number;
}

export const PRESETS: KernelPreset[] = [
  { name: "Тождественное",       kernel: [0, 0, 0,  0, 1, 0,  0, 0, 0],   divisor: 1  },
  { name: "Повышение резкости",  kernel: [0, -1, 0,  -1, 5, -1,  0, -1, 0], divisor: 1  },
  { name: "Гаусс 3×3",           kernel: [1, 2, 1,  2, 4, 2,  1, 2, 1],    divisor: 16 },
  { name: "Прямоугольное размытие", kernel: [1, 1, 1,  1, 1, 1,  1, 1, 1], divisor: 9  },
  { name: "Прюитт X",            kernel: [-1, 0, 1,  -1, 0, 1,  -1, 0, 1], divisor: 1  },
  { name: "Прюитт Y",            kernel: [-1, -1, -1,  0, 0, 0,  1, 1, 1], divisor: 1  },
];

export interface ConvolveOptions {
  kernel: number[];    // 9 values, row-major 3×3
  divisor: number;
  channels: boolean[]; // always length 4: [R, G, B, A]
  edgeMode: EdgeMode;
}

/** Works with raw typed arrays — safe to use in Web Workers (no ImageData). */
export function applyKernelBuffer(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: ConvolveOptions,
): Uint8ClampedArray {
  const padded = padBuffer(data, width, height, opts.edgeMode);
  const pw = width + 2;
  const out = new Uint8ClampedArray(data); // start as copy; unfiltered channels preserved

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        if (!opts.channels[c]) continue;
        let sum = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            sum += padded[((y + ky) * pw + (x + kx)) * 4 + c] * opts.kernel[ky * 3 + kx];
          }
        }
        out[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(sum / opts.divisor)));
      }
    }
  }
  return out;
}

/** Convenience wrapper for main-thread use. */
export function applyKernel(src: ImageData, opts: ConvolveOptions): ImageData {
  const result = applyKernelBuffer(src.data, src.width, src.height, opts);
  return new ImageData(new Uint8ClampedArray(result.buffer as ArrayBuffer), src.width, src.height);
}

function padBuffer(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  mode: EdgeMode,
): Uint8ClampedArray {
  const pw = w + 2;
  const ph = h + 2;
  const out = new Uint8ClampedArray(pw * ph * 4);

  // Copy main body at offset (1, 1)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = ((y + 1) * pw + (x + 1)) * 4;
      out[di]     = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = data[si + 3];
    }
  }

  if (mode === "copy") {
    // Top and bottom border rows (x = 0..w-1, at padded x+1)
    for (let x = 0; x < w; x++) {
      cp(data, x * 4,             out, (x + 1) * 4);
      cp(data, ((h - 1) * w + x) * 4, out, ((ph - 1) * pw + (x + 1)) * 4);
    }
    // Left and right border cols (y = 0..h-1, at padded y+1)
    for (let y = 0; y < h; y++) {
      cp(data, (y * w) * 4,             out, ((y + 1) * pw) * 4);
      cp(data, (y * w + (w - 1)) * 4,   out, ((y + 1) * pw + (pw - 1)) * 4);
    }
    // Four corners
    cp(data, 0,                              out, 0);
    cp(data, (w - 1) * 4,                   out, (pw - 1) * 4);
    cp(data, ((h - 1) * w) * 4,             out, ((ph - 1) * pw) * 4);
    cp(data, ((h - 1) * w + (w - 1)) * 4,  out, ((ph - 1) * pw + (pw - 1)) * 4);
  } else {
    const v = mode === "black" ? 0 : 255;
    for (let x = 0; x < pw; x++) {
      fill(out, x * 4, v);
      fill(out, ((ph - 1) * pw + x) * 4, v);
    }
    for (let y = 1; y < ph - 1; y++) {
      fill(out, (y * pw) * 4, v);
      fill(out, (y * pw + (pw - 1)) * 4, v);
    }
  }
  return out;
}

function cp(src: Uint8ClampedArray, si: number, dst: Uint8ClampedArray, di: number) {
  dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
}

function fill(buf: Uint8ClampedArray, i: number, v: number) {
  buf[i] = buf[i + 1] = buf[i + 2] = v; buf[i + 3] = 255;
}
