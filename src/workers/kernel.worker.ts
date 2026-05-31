import { applyKernelBuffer } from "../lib/kernelFilter";
import type { ConvolveOptions } from "../lib/kernelFilter";

interface WorkerInput {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  opts: ConvolveOptions;
}

// No ImageData usage here — applyKernelBuffer works with raw typed arrays only.
self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { buffer, width, height, opts } = e.data;
  const data = new Uint8ClampedArray(buffer);
  const result = applyKernelBuffer(data, width, height, opts);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).postMessage(
    { buffer: result.buffer, width, height },
    [result.buffer],
  );
};
