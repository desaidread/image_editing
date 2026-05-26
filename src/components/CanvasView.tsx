import { useRef, useEffect } from "react";
import type { ActiveTool } from "../hooks/useImageStore";
import "./CanvasView.css";

interface Props {
  imageData: ImageData | null;
  previewImageData: ImageData | null;
  activeChannels: boolean[];
  channelCount: number;
  activeTool: ActiveTool;
  onCanvasReady: (ref: React.RefObject<HTMLCanvasElement | null>) => void;
  onPixelPick: (x: number, y: number) => void;
}

export default function CanvasView({
  imageData,
  previewImageData,
  activeChannels,
  channelCount,
  activeTool,
  onCanvasReady,
  onPixelPick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onCanvasReady(canvasRef);
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const base = previewImageData ?? imageData;
    if (!canvas || !base) return;

    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext("2d")!;

    if (activeChannels.length === 0 || activeChannels.every(Boolean)) {
      ctx.putImageData(base, 0, 0);
    } else {
      ctx.putImageData(applyChannelMask(base, activeChannels, channelCount), 0, 0);
    }
  }, [imageData, previewImageData, activeChannels, channelCount]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "eyedropper") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((e.clientX - rect.left) * scaleX)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((e.clientY - rect.top) * scaleY)));
    onPixelPick(x, y);
  };

  return (
    <div className="canvas-wrapper">
      {imageData ? (
        <canvas
          ref={canvasRef}
          className={`main-canvas${activeTool === "eyedropper" ? " cursor-eyedropper" : ""}`}
          onClick={handleClick}
        />
      ) : (
        <div className="canvas-placeholder">
          <div className="placeholder-content">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="12" width="48" height="40" rx="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="22" cy="26" r="5" stroke="currentColor" strokeWidth="2" />
              <path d="M8 42 L20 30 L32 42 L44 28 L56 42" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <p>Загрузите изображение</p>
            <span>PNG, JPG или GB7</span>
          </div>
        </div>
      )}
    </div>
  );
}

function applyChannelMask(src: ImageData, activeChannels: boolean[], channelCount: number): ImageData {
  const data = src.data;
  const out = new Uint8ClampedArray(data.length);
  const onlyAlpha =
    channelCount === 4 &&
    !activeChannels[0] && !activeChannels[1] && !activeChannels[2] && activeChannels[3];

  for (let i = 0; i < data.length; i += 4) {
    if (channelCount === 1) {
      const v = activeChannels[0] ? data[i] : 0;
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = 255;
    } else if (channelCount === 2) {
      const v = activeChannels[0] ? data[i] : 0;
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = activeChannels[1] ? data[i + 3] : 255;
    } else if (onlyAlpha) {
      const a = data[i + 3];
      out[i] = out[i + 1] = out[i + 2] = a;
      out[i + 3] = 255;
    } else {
      out[i]     = activeChannels[0] ? data[i] : 0;
      out[i + 1] = activeChannels[1] ? data[i + 1] : 0;
      out[i + 2] = activeChannels[2] ? data[i + 2] : 0;
      out[i + 3] = channelCount === 4 && activeChannels[3] ? data[i + 3] : 255;
    }
  }
  return new ImageData(out, src.width, src.height);
}
