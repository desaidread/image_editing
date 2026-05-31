import { applyKernel } from "../lib/kernelFilter";
import type { ConvolveOptions } from "../lib/kernelFilter";

interface WorkerInput {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  opts: ConvolveOptions;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { buffer, width, height, opts } = e.data;
  const data = new Uint8ClampedArray(buffer);
  const imgData = new ImageData(data, width, height);
  const result = applyKernel(imgData, opts);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).postMessage(
    { buffer: result.data.buffer, width: result.width, height: result.height },
    [result.data.buffer],
  );
};
