import { useRef, useEffect } from "react";
import type { ActiveTool } from "../hooks/useImageStore";
import { resizeImageData, ZOOM_LEVELS } from "../lib/interpolation";
import "./CanvasView.css";

interface Props {
  imageData: ImageData | null;
  previewImageData: ImageData | null;
  activeChannels: boolean[];
  channelCount: number;
  activeTool: ActiveTool;
  viewScale: number;
  loadToken: number;
  onCanvasReady: (ref: React.RefObject<HTMLCanvasElement | null>) => void;
  onPixelPick: (x: number, y: number) => void;
  onAutoFit: (scale: number) => void;
}

export default function CanvasView({
  imageData,
  previewImageData,
  activeChannels,
  channelCount,
  activeTool,
  viewScale,
  loadToken,
  onCanvasReady,
  onPixelPick,
  onAutoFit,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    onCanvasReady(canvasRef);
  }, [onCanvasReady]);

  // Auto-fit only on a fresh file load (keyed by loadToken), NOT on in-place
  // edits such as filters/levels/resize — those must preserve the user's zoom.
  useEffect(() => {
    if (!imageData || !wrapperRef.current || loadToken === 0) return;
    const wrapper = wrapperRef.current;
    // padding is 24px each side; require ≥50px margin beyond padding
    const availW = wrapper.clientWidth - 48 - 50;
    const availH = wrapper.clientHeight - 48 - 50;
    const ideal = Math.min(availW / imageData.width, availH / imageData.height);
    // largest preset zoom level that fits
    const fit = [...ZOOM_LEVELS]
      .slice()
      .reverse()
      .find(pct => pct / 100 <= ideal) ?? ZOOM_LEVELS[0];
    onAutoFit(fit / 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadToken]);

  // Render: scale image with our interpolation, draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const base = previewImageData ?? imageData;
    if (!canvas || !base) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const masked =
        activeChannels.length === 0 || activeChannels.every(Boolean)
          ? base
          : applyChannelMask(base, activeChannels, channelCount);

      const scaledW = Math.max(1, Math.round(masked.width * viewScale));
      const scaledH = Math.max(1, Math.round(masked.height * viewScale));
      const scaled = resizeImageData(masked, scaledW, scaledH, "bilinear");

      canvas.width = scaledW;
      canvas.height = scaledH;
      canvas.getContext("2d")!.putImageData(scaled, 0, 0);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [imageData, previewImageData, activeChannels, channelCount, viewScale]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "eyedropper" || !imageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const imgX = Math.max(0, Math.min(imageData.width - 1, Math.floor(cx / viewScale)));
    const imgY = Math.max(0, Math.min(imageData.height - 1, Math.floor(cy / viewScale)));
    onPixelPick(imgX, imgY);
  };

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
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
