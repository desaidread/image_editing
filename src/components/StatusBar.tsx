import "./StatusBar.css";
import type { ImageMeta, PickedPixel } from "../hooks/useImageStore";
import { rgbToLab } from "../lib/colorUtils";

interface Props {
  meta: ImageMeta;
  pickedPixel: PickedPixel | null;
}

export default function StatusBar({ meta, pickedPixel }: Props) {
  const { width, height, colorDepth, fileName, format, hasMask } = meta;

  if (!format) {
    return (
      <div className="status-bar">
        <span className="status-item muted">Нет изображения</span>
      </div>
    );
  }

  const formatLabel = format.toUpperCase();
  const maskLabel = format === "gb7" ? "Маска" : "Прозрачность";

  let labSection: React.ReactNode = null;
  if (pickedPixel) {
    const [L, a, b] = rgbToLab(pickedPixel.r, pickedPixel.g, pickedPixel.b);
    labSection = (
      <>
        <span className="status-sep" />
        <span className="status-item status-pixel">
          <span className="status-key">Пиксель</span>{" "}
          ({pickedPixel.x}, {pickedPixel.y})
        </span>
        <span className="status-sep" />
        <span className="status-item">
          <span className="status-key">RGB:</span>{" "}
          <span className="status-r">{pickedPixel.r}</span>{" "}
          <span className="status-g">{pickedPixel.g}</span>{" "}
          <span className="status-b">{pickedPixel.b}</span>
        </span>
        <span className="status-sep" />
        <span className="status-item">
          <span className="status-key">LAB:</span>{" "}
          L*{L.toFixed(1)} a*{a.toFixed(1)} b*{b.toFixed(1)}
        </span>
        <span className="status-sep" />
        <span className="status-item">
          <span
            className="status-swatch"
            style={{ background: `rgb(${pickedPixel.r},${pickedPixel.g},${pickedPixel.b})` }}
          />
        </span>
      </>
    );
  }

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
      {hasMask !== null && (
        <>
          <span className="status-sep" />
          <span className="status-item">
            <span className="status-key">{maskLabel}:</span>{" "}
            <span className={hasMask ? "status-mask-yes" : "status-mask-no"}>
              {hasMask ? "есть" : "нет"}
            </span>
          </span>
        </>
      )}
      {labSection}
    </div>
  );
}
