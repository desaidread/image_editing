import "./StatusBar.css";
import type { ImageMeta } from "../hooks/useImageStore";

interface Props {
  meta: ImageMeta;
}

export default function StatusBar({ meta }: Props) {
  const { width, height, colorDepth, fileName, format } = meta;

  if (!format) {
    return (
      <div className="status-bar">
        <span className="status-item muted">Нет изображения</span>
      </div>
    );
  }

  const formatLabel = format.toUpperCase();

  return (
    <div className="status-bar">
      <span className="status-item" title="Имя файла">{fileName}</span>
      <span className="status-sep" />
      <span className="status-item">
        <span className="status-key">Размер:</span> {width} × {height} px
      </span>
      <span className="status-sep" />
      <span className="status-item">
        <span className="status-key">Глубина цвета:</span> {colorDepth} бит
      </span>
      <span className="status-sep" />
      <span className="status-item">
        <span className="status-key">Формат:</span> {formatLabel}
      </span>
    </div>
  );
}
