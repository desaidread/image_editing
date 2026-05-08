import { useRef, useEffect } from "react";
import "./CanvasView.css";

interface Props {
  imageData: ImageData | null;
  onCanvasReady: (ref: React.RefObject<HTMLCanvasElement | null>) => void;
}

export default function CanvasView({ imageData, onCanvasReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onCanvasReady(canvasRef);
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <div className="canvas-wrapper">
      {imageData ? (
        <canvas ref={canvasRef} className="main-canvas" />
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
