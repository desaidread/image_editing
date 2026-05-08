import { useState, useCallback } from "react";
import { decodeGb7, encodeGb7 } from "../lib/gb7";

export interface ImageMeta {
  width: number;
  height: number;
  colorDepth: number;
  fileName: string;
  format: "png" | "jpg" | "gb7" | null;
}

export interface ImageStore {
  imageData: ImageData | null;
  meta: ImageMeta;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  downloadAs: (format: "png" | "jpg" | "gb7") => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null> | null;
  setCanvasRef: (ref: React.RefObject<HTMLCanvasElement | null>) => void;
}

const defaultMeta: ImageMeta = {
  width: 0,
  height: 0,
  colorDepth: 0,
  fileName: "",
  format: null,
};

export function useImageStore() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [meta, setMeta] = useState<ImageMeta>(defaultMeta);
  const [error, setError] = useState<string | null>(null);
  const [canvasRef, setCanvasRef] = useState<React.RefObject<HTMLCanvasElement | null> | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "gb7") {
        const buf = await file.arrayBuffer();
        const data = decodeGb7(buf);
        setImageData(data);
        setMeta({
          width: data.width,
          height: data.height,
          colorDepth: 7,
          fileName: file.name,
          format: "gb7",
        });
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
        const data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        setImageData(data);
        setMeta({
          width: img.naturalWidth,
          height: img.naturalHeight,
          colorDepth: ext === "jpg" || ext === "jpeg" ? 24 : 32,
          fileName: file.name,
          format: ext === "jpg" || ext === "jpeg" ? "jpg" : "png",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  const downloadAs = useCallback(
    (format: "png" | "jpg" | "gb7") => {
      if (!imageData || !canvasRef?.current) return;

      const canvas = canvasRef.current;
      const baseName = meta.fileName.replace(/\.[^.]+$/, "") || "image";

      if (format === "gb7") {
        const bytes = encodeGb7(imageData);
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" });
        triggerDownload(URL.createObjectURL(blob), `${baseName}.gb7`);
      } else {
        const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
        const ext = format === "jpg" ? "jpg" : "png";
        canvas.toBlob(
          (blob) => {
            if (blob) triggerDownload(URL.createObjectURL(blob), `${baseName}.${ext}`);
          },
          mimeType,
          format === "jpg" ? 0.92 : undefined
        );
      }
    },
    [imageData, canvasRef, meta.fileName]
  );

  return { imageData, meta, error, loadFile, downloadAs, setCanvasRef };
}

function triggerDownload(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
