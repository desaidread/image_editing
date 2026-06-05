import { useState, useCallback } from "react";
import { decodeGb7, encodeGb7, getGb7Info } from "../lib/gb7";

export interface ImageMeta {
  width: number;
  height: number;
  colorDepth: number;
  fileName: string;
  format: "png" | "jpg" | "gb7" | null;
  hasMask: boolean | null;
}

export type ActiveTool = "none" | "eyedropper";

export interface PickedPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

const defaultMeta: ImageMeta = {
  width: 0, height: 0, colorDepth: 0, fileName: "", format: null, hasMask: null,
};

function getChannelCount(meta: ImageMeta): number {
  if (!meta.format) return 0;
  if (meta.format === "gb7") return meta.hasMask ? 2 : 1;
  return meta.hasMask === true ? 4 : 3;
}

export function useImageStore() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [meta, setMeta] = useState<ImageMeta>(defaultMeta);
  const [error, setError] = useState<string | null>(null);
  const [canvasRef, setCanvasRef] = useState<React.RefObject<HTMLCanvasElement | null> | null>(null);

  // Lab 2
  const [activeChannels, setActiveChannels] = useState<boolean[]>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>("none");
  const [pickedPixel, setPickedPixel] = useState<PickedPixel | null>(null);

  // Lab 3
  const [previewImageData, setPreviewImageData] = useState<ImageData | null>(null);
  const [levelsOpen, setLevelsOpen] = useState(false);

  // Lab 4
  const [viewScale, setViewScale] = useState(1.0);
  const [resizeOpen, setResizeOpen] = useState(false);
  // Increments only when a brand-new file is loaded — used to trigger auto-fit
  // exactly once per load (not on in-place edits like filters/levels/resize).
  const [loadToken, setLoadToken] = useState(0);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let newMeta: ImageMeta;
      let data: ImageData;

      if (ext === "gb7") {
        const buf = await file.arrayBuffer();
        const info = getGb7Info(buf);
        data = decodeGb7(buf);
        newMeta = {
          width: data.width, height: data.height,
          colorDepth: info.hasMask ? 8 : 7,
          fileName: file.name, format: "gb7", hasMask: info.hasMask,
        };
      } else {
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = url;
        });
        URL.revokeObjectURL(url);
        const offscreen = document.createElement("canvas");
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const ctx = offscreen.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        const isJpeg = ext === "jpg" || ext === "jpeg";
        const transparent = !isJpeg && hasTransparency(data.data);
        newMeta = {
          width: img.naturalWidth, height: img.naturalHeight,
          colorDepth: isJpeg ? 24 : transparent ? 32 : 24,
          fileName: file.name, format: isJpeg ? "jpg" : "png",
          hasMask: isJpeg ? null : transparent,
        };
      }

      const count = getChannelCount(newMeta);
      setImageData(data);
      setMeta(newMeta);
      setActiveChannels(new Array(count).fill(true));
      setActiveTool("none");
      setPickedPixel(null);
      setPreviewImageData(null);
      setLevelsOpen(false);
      setViewScale(1.0);
      setLoadToken((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  const downloadAs = useCallback(
    (format: "png" | "jpg" | "gb7") => {
      if (!imageData) return;
      const baseName = meta.fileName.replace(/\.[^.]+$/, "") || "image";
      if (format === "gb7") {
        const bytes = encodeGb7(imageData);
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" });
        triggerDownload(URL.createObjectURL(blob), `${baseName}.gb7`);
      } else {
        // Export the full-resolution source image — NOT the on-screen canvas,
        // which is scaled by the zoom slider and may have channels masked out.
        const off = document.createElement("canvas");
        off.width = imageData.width;
        off.height = imageData.height;
        off.getContext("2d")!.putImageData(imageData, 0, 0);
        const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
        off.toBlob(
          (blob) => { if (blob) triggerDownload(URL.createObjectURL(blob), `${baseName}.${format}`); },
          mimeType, format === "jpg" ? 0.92 : undefined
        );
      }
    },
    [imageData, canvasRef, meta.fileName]
  );

  const toggleChannel = useCallback((index: number) => {
    setActiveChannels((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }, []);

  const pickPixel = useCallback((x: number, y: number) => {
    if (!imageData) return;
    const idx = (y * imageData.width + x) * 4;
    setPickedPixel({
      x, y,
      r: imageData.data[idx],
      g: imageData.data[idx + 1],
      b: imageData.data[idx + 2],
      a: imageData.data[idx + 3],
    });
  }, [imageData]);

  const openLevels = useCallback(() => setLevelsOpen(true), []);

  const closeLevels = useCallback(() => {
    setLevelsOpen(false);
    setPreviewImageData(null);
  }, []);

  const commitLevels = useCallback((newData: ImageData) => {
    setImageData(newData);
    setPreviewImageData(null);
    setLevelsOpen(false);
    setPickedPixel(null);
  }, []);

  const [kernelOpen, setKernelOpen] = useState(false);
  const openKernel = useCallback(() => setKernelOpen(true), []);
  const closeKernel = useCallback(() => {
    setKernelOpen(false);
    setPreviewImageData(null);
  }, []);
  const commitKernel = useCallback((newData: ImageData) => {
    setImageData(newData);
    setPreviewImageData(null);
    setPickedPixel(null);
    setKernelOpen(false);
  }, []);

  const openResize = useCallback(() => setResizeOpen(true), []);
  const closeResize = useCallback(() => setResizeOpen(false), []);
  const commitResize = useCallback((newData: ImageData) => {
    setImageData(newData);
    setMeta(prev => ({ ...prev, width: newData.width, height: newData.height }));
    setPreviewImageData(null);
    setPickedPixel(null);
    setResizeOpen(false);
  }, []);

  const channelCount = getChannelCount(meta);

  return {
    imageData, meta, error, loadFile, downloadAs, setCanvasRef,
    channelCount, activeChannels, activeTool, pickedPixel,
    toggleChannel, setActiveTool, pickPixel,
    previewImageData, setPreviewImageData,
    levelsOpen, openLevels, closeLevels, commitLevels,
    viewScale, setViewScale, loadToken,
    resizeOpen, openResize, closeResize, commitResize,
    kernelOpen, openKernel, closeKernel, commitKernel,
  };
}

function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

function triggerDownload(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
