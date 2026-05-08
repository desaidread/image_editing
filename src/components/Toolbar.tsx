import { useRef } from "react";
import "./Toolbar.css";

interface Props {
  hasImage: boolean;
  onLoad: (file: File) => void;
  onDownload: (format: "png" | "jpg" | "gb7") => void;
  error: string | null;
}

export default function Toolbar({ hasImage, onLoad, onDownload, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoad(file);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onLoad(file);
  };

  return (
    <div className="toolbar" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="toolbar-left">
        <span className="app-title">Image Editor</span>
      </div>

      <div className="toolbar-center">
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gb7"
          onChange={handleChange}
          className="file-input-hidden"
        />
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          <IconOpen /> Открыть
        </button>

        {error && <span className="error-badge" title={error}>Ошибка!</span>}
      </div>

      <div className="toolbar-right">
        <span className="label">Скачать:</span>
        <button className="btn btn-secondary" disabled={!hasImage} onClick={() => onDownload("png")}>
          PNG
        </button>
        <button className="btn btn-secondary" disabled={!hasImage} onClick={() => onDownload("jpg")}>
          JPG
        </button>
        <button className="btn btn-secondary" disabled={!hasImage} onClick={() => onDownload("gb7")}>
          GB7
        </button>
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
