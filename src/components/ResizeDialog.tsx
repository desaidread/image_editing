import { useRef, useState, useEffect } from "react";
import { resizeImageData, INTERP_INFO, INTERP_METHODS } from "../lib/interpolation";
import type { InterpolationMethod } from "../lib/interpolation";
import "./ResizeDialog.css";

interface Props {
  imageData: ImageData;
  onApply: (newData: ImageData) => void;
  onClose: () => void;
}

type Unit = "px" | "pct";

const MAX_PX = 10000;
const MAX_PCT = 3000;

export default function ResizeDialog({ imageData, onApply, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [unit, setUnit] = useState<Unit>("px");
  const [wStr, setWStr] = useState(String(imageData.width));
  const [hStr, setHStr] = useState(String(imageData.height));
  const [linked, setLinked] = useState(true);
  const [method, setMethod] = useState<InterpolationMethod>("bilinear");
  const [errors, setErrors] = useState<{ w?: string; h?: string }>({});

  const aspect = imageData.width / imageData.height;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function parseDims(): { w: number; h: number } | null {
    const wv = parseFloat(wStr);
    const hv = parseFloat(hStr);
    if (isNaN(wv) || isNaN(hv) || wv <= 0 || hv <= 0) return null;
    if (unit === "px") return { w: Math.round(wv), h: Math.round(hv) };
    return {
      w: Math.round(imageData.width * wv / 100),
      h: Math.round(imageData.height * hv / 100),
    };
  }

  function validate(): boolean {
    const errs: { w?: string; h?: string } = {};
    const wv = parseFloat(wStr);
    const hv = parseFloat(hStr);
    if (isNaN(wv) || wv <= 0) {
      errs.w = "Введите положительное число";
    } else if (unit === "px" && (wv < 1 || wv > MAX_PX || !Number.isInteger(wv))) {
      errs.w = `Целое от 1 до ${MAX_PX}`;
    } else if (unit === "pct" && (wv < 1 || wv > MAX_PCT)) {
      errs.w = `От 1% до ${MAX_PCT}%`;
    }
    if (isNaN(hv) || hv <= 0) {
      errs.h = "Введите положительное число";
    } else if (unit === "px" && (hv < 1 || hv > MAX_PX || !Number.isInteger(hv))) {
      errs.h = `Целое от 1 до ${MAX_PX}`;
    } else if (unit === "pct" && (hv < 1 || hv > MAX_PCT)) {
      errs.h = `От 1% до ${MAX_PCT}%`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleUnitChange(newUnit: Unit) {
    const dims = parseDims();
    if (dims) {
      if (newUnit === "px") {
        setWStr(String(dims.w));
        setHStr(String(dims.h));
      } else {
        setWStr(String(Math.round((dims.w / imageData.width) * 100)));
        setHStr(String(Math.round((dims.h / imageData.height) * 100)));
      }
    }
    setUnit(newUnit);
    setErrors({});
  }

  function handleWidthChange(val: string) {
    setWStr(val);
    if (linked) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        if (unit === "pct") setHStr(val);
        else setHStr(String(Math.round(num / aspect)));
      }
    }
  }

  function handleHeightChange(val: string) {
    setHStr(val);
    if (linked) {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        if (unit === "pct") setWStr(val);
        else setWStr(String(Math.round(num * aspect)));
      }
    }
  }

  function handleApply() {
    if (!validate()) return;
    const dims = parseDims()!;
    const newData = resizeImageData(imageData, dims.w, dims.h, method);
    onApply(newData);
  }

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  const dims = parseDims();
  const beforeMP = (imageData.width * imageData.height / 1_000_000).toFixed(2);
  const afterMP = dims ? (dims.w * dims.h / 1_000_000).toFixed(2) : "—";
  const afterSize = dims ? `${dims.w} × ${dims.h}` : "—";

  return (
    <dialog
      ref={dialogRef}
      className="resize-dialog"
      onCancel={(e) => { e.preventDefault(); handleClose(); }}
    >
      <div className="rd-header">
        <span className="rd-title">Изменить размер</span>
        <button className="rd-close" onClick={handleClose}>✕</button>
      </div>

      <div className="rd-body">
        {/* Pixel info */}
        <div className="rd-info-row">
          <div className="rd-info-box">
            <span className="rd-info-label">До</span>
            <span className="rd-info-mp">{beforeMP} МПкс</span>
            <span className="rd-info-sub">{imageData.width} × {imageData.height} пкс</span>
          </div>
          <span className="rd-arrow">→</span>
          <div className="rd-info-box">
            <span className="rd-info-label">После</span>
            <span className="rd-info-mp">{afterMP} МПкс</span>
            <span className="rd-info-sub">{afterSize} пкс</span>
          </div>
        </div>

        {/* Unit selector */}
        <div className="rd-field">
          <label className="rd-label">Единицы</label>
          <select
            className="rd-select"
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value as Unit)}
          >
            <option value="px">Пиксели</option>
            <option value="pct">Проценты</option>
          </select>
        </div>

        {/* Width / Height */}
        <div className="rd-wh-row">
          <div className="rd-wh-field">
            <label className="rd-label">Ширина</label>
            <input
              type="number"
              className={`rd-input${errors.w ? " rd-input-error" : ""}`}
              value={wStr}
              min={1}
              max={unit === "px" ? MAX_PX : MAX_PCT}
              step={unit === "px" ? 1 : 1}
              onChange={(e) => handleWidthChange(e.target.value)}
            />
            {errors.w && <span className="rd-err">{errors.w}</span>}
          </div>

          <button
            className={`rd-link-btn${linked ? " is-linked" : ""}`}
            onClick={() => setLinked(l => !l)}
            title={linked ? "Разорвать связь пропорций" : "Связать пропорции"}
          >
            {linked ? <IconLinked /> : <IconUnlinked />}
          </button>

          <div className="rd-wh-field">
            <label className="rd-label">Высота</label>
            <input
              type="number"
              className={`rd-input${errors.h ? " rd-input-error" : ""}`}
              value={hStr}
              min={1}
              max={unit === "px" ? MAX_PX : MAX_PCT}
              step={unit === "px" ? 1 : 1}
              onChange={(e) => handleHeightChange(e.target.value)}
            />
            {errors.h && <span className="rd-err">{errors.h}</span>}
          </div>
        </div>

        {/* Interpolation */}
        <div className="rd-field rd-interp-field">
          <label className="rd-label">Интерполяция</label>
          <div className="rd-interp-wrap">
            <select
              className="rd-select"
              value={method}
              onChange={(e) => setMethod(e.target.value as InterpolationMethod)}
            >
              {INTERP_METHODS.map(m => (
                <option key={m} value={m}>{INTERP_INFO[m].label}</option>
              ))}
            </select>
            <div className="rd-tip-anchor">
              <span className="rd-tip-icon">?</span>
              <div className="rd-tip-box">{INTERP_INFO[method].tooltip}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rd-footer">
        <button className="btn btn-secondary" onClick={handleClose}>Отмена</button>
        <button className="btn btn-primary" onClick={handleApply}>Применить</button>
      </div>
    </dialog>
  );
}

function IconLinked() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 4.5a2.5 2.5 0 0 1 4 0l1 1a2.5 2.5 0 0 1-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 9.5a2.5 2.5 0 0 1-4 0l-1-1a2.5 2.5 0 0 1 4-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconUnlinked() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 4.5a2.5 2.5 0 0 1 3.5-.5M9.5 6l.5.5a2.5 2.5 0 0 1-1 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 9.5a2.5 2.5 0 0 1-3.5.5M4.5 8l-.5-.5a2.5 2.5 0 0 1 1-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
