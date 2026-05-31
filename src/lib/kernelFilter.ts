export type EdgeMode = "black" | "white" | "copy";

export interface KernelPreset {
  name: string;
  kernel: number[];
  divisor: number;
}

export const PRESETS: KernelPreset[] = [
  {
    name: "Тождественное",
    kernel: [0, 0, 0,  0, 1, 0,  0, 0, 0],
    divisor: 1,
  },
  {
    name: "Повышение резкости",
    kernel: [0, -1, 0,  -1, 5, -1,  0, -1, 0],
    divisor: 1,
  },
  {
    name: "Гаусс 3×3",
    kernel: [1, 2, 1,  2, 4, 2,  1, 2, 1],
    divisor: 16,
  },
  {
    name: "Прямоугольное размытие",
    kernel: [1, 1, 1,  1, 1, 1,  1, 1, 1],
    divisor: 9,
  },
  {
    name: "Прюитт X",
    kernel: [-1, 0, 1,  -1, 0, 1,  -1, 0, 1],
    divisor: 1,
  },
  {
    name: "Прюитт Y",
    kernel: [-1, -1, -1,  0, 0, 0,  1, 1, 1],
    divisor: 1,
  },
];

export interface ConvolveOptions {
  kernel: number[];   // 9 values, row-major
  divisor: number;
  channels: boolean[]; // always length 4: [R, G, B, A]
  edgeMode: EdgeMode;
}

export function applyKernel(src: ImageData, opts: ConvolveOptions): ImageData {
  const { width: w, height: h } = src;
  const padded = padImage(src, opts.edgeMode);
  const pw = w + 2;
  const pd = padded.data;

  const out = new Uint8ClampedArray(src.data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        if (!opts.channels[c]) continue;

        let sum = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pi = ((y + ky) * pw + (x + kx)) * 4 + c;
            sum += pd[pi] * opts.kernel[ky * 3 + kx];
          }
        }

        out[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(sum / opts.divisor)));
      }
    }
  }

  return new ImageData(out, w, h);
}

function padImage(src: ImageData, mode: EdgeMode): ImageData {
  const { width: w, height: h, data } = src;
  const pw = w + 2;
  const ph = h + 2;
  const out = new Uint8ClampedArray(pw * ph * 4);

  // Copy main body offset by (1,1)
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
    // Horizontal border rows
    for (let x = 0; x < w; x++) {
      copyPixel(data, (0 * w + x) * 4,         out, (0 * pw + (x + 1)) * 4);
      copyPixel(data, ((h - 1) * w + x) * 4,   out, ((ph - 1) * pw + (x + 1)) * 4);
    }
    // Vertical border cols
    for (let y = 0; y < h; y++) {
      copyPixel(data, (y * w + 0) * 4,          out, ((y + 1) * pw + 0) * 4);
      copyPixel(data, (y * w + (w - 1)) * 4,    out, ((y + 1) * pw + (pw - 1)) * 4);
    }
    // Corners
    copyPixel(data, 0,                              out, 0);
    copyPixel(data, (w - 1) * 4,                   out, (pw - 1) * 4);
    copyPixel(data, ((h - 1) * w) * 4,             out, ((ph - 1) * pw) * 4);
    copyPixel(data, ((h - 1) * w + (w - 1)) * 4,  out, ((ph - 1) * pw + (pw - 1)) * 4);
  } else {
    const v = mode === "black" ? 0 : 255;
    fillBorder(out, pw, ph, v);
  }

  return new ImageData(out, pw, ph);
}

function copyPixel(src: Uint8ClampedArray, si: number, dst: Uint8ClampedArray, di: number) {
  dst[di]     = src[si];
  dst[di + 1] = src[si + 1];
  dst[di + 2] = src[si + 2];
  dst[di + 3] = src[si + 3];
}

function fillBorder(out: Uint8ClampedArray, pw: number, ph: number, v: number) {
  for (let x = 0; x < pw; x++) {
    setPixel(out, (0 * pw + x) * 4, v, 255);
    setPixel(out, ((ph - 1) * pw + x) * 4, v, 255);
  }
  for (let y = 1; y < ph - 1; y++) {
    setPixel(out, (y * pw + 0) * 4, v, 255);
    setPixel(out, (y * pw + (pw - 1)) * 4, v, 255);
  }
}

function setPixel(buf: Uint8ClampedArray, i: number, rgb: number, a: number) {
  buf[i] = buf[i + 1] = buf[i + 2] = rgb;
  buf[i + 3] = a;
}
