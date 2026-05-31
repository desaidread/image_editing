import { useRef } from "react";
import type { ActiveTool } from "../hooks/useImageStore";
import { ZOOM_LEVELS } from "../lib/interpolation";
import "./Toolbar.css";

interface Props {
  hasImage: boolean;
  onLoad: (file: File) => void;
  onDownload: (format: "png" | "jpg" | "gb7") => void;
  error: string | null;
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  onOpenLevels: () => void;
  viewScale: number;
  onViewScaleChange: (scale: number) => void;
  onOpenResize: () => void;
  onOpenKernel: () => void;
}

export default function Toolbar({
  hasImage, onLoad, onDownload, error,
  activeTool, onToolChange,
  onOpenLevels,
  viewScale, onViewScaleChange,
  onOpenResize,
  onOpenKernel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onLoad(file); e.target.value = ""; }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onLoad(file);
  };

  const scalePct = Math.round(viewScale * 100);

  return (
    <div className="toolbar" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="toolbar-left">
        <span className="app-title">Image Editor</span>
      </div>

      <div className="toolbar-center">
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.gb7"
          onChange={handleChange} className="file-input-hidden" />
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          <IconOpen /> Открыть
        </button>

        <div className="toolbar-sep" />

        <button
          className={`btn btn-tool${activeTool === "eyedropper" ? " btn-tool-active" : ""}`}
          disabled={!hasImage}
          onClick={() => onToolChange(activeTool === "eyedropper" ? "none" : "eyedropper")}
          title="Пипетка"
        >
          <IconEyedropper /> Пипетка
        </button>

        <button
          className="btn btn-tool"
          disabled={!hasImage}
          onClick={onOpenLevels}
          title="Уровни (градационная коррекция)"
        >
          <IconLevels /> Уровни
        </button>

        <button
          className="btn btn-tool"
          disabled={!hasImage}
          onClick={onOpenResize}
          title="Изменить размер изображения"
        >
          <IconResize /> Размер
        </button>

        <button
          className="btn btn-tool"
          disabled={!hasImage}
          onClick={onOpenKernel}
          title="Фильтрация (свёртка с ядром)"
        >
          <IconKernel /> Фильтр
        </button>

        <div className="toolbar-sep" />

        <div className="zoom-group">
          <label className="label">Масштаб:</label>
          <select
            className="zoom-select"
            value={scalePct}
            disabled={!hasImage}
            onChange={(e) => onViewScaleChange(parseInt(e.target.value) / 100)}
          >
            {ZOOM_LEVELS.map(pct => (
              <option key={pct} value={pct}>{pct}%</option>
            ))}
          </select>
        </div>

        {error && <span className="error-badge" title={error}>Ошибка!</span>}
      </div>

      <div className="toolbar-right">
        <span className="label">Скачать:</span>
        <button className="btn btn-secondary" disabled={!hasImage} onClick={() => onDownload("png")}>PNG</button>
        <button className="btn btn-secondary" disabled={!hasImage} onClick={() => onDownload("jpg")}>JPG</button>
        <button className="btn btn-secondary" disabled={!hasImage} onClick={() => onDownload("gb7")}>GB7</button>
      </div>
    </div>
  );
}

function IconOpen() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4a1 1 0 0 1 1-1h3l2 2h5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconEyedropper() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2.5a2.5 2.5 0 0 1 3.5 3.5L13 7.5 8.5 3l1.5-1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8.5 3L3.5 8 2 10.5 1 15l4.5-1 2.5-1.5 5-5L8.5 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="3.5" cy="12.5" r="1" fill="currentColor"/>
    </svg>
  );
}

function IconLevels() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="10" width="3" height="5" fill="currentColor" opacity="0.5"/>
      <rect x="5" y="6"  width="3" height="9" fill="currentColor" opacity="0.7"/>
      <rect x="9" y="3"  width="3" height="12" fill="currentColor"/>
      <rect x="13" y="7" width="3" height="8" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}

function IconResize() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="7" y="7" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1"/>
      <path d="M9 4h3M12 4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconKernel() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="6" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="11" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="6" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="6" y="6" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.4"/>
      <rect x="11" y="6" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="11" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="6" y="11" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="11" y="11" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}
