import { useRef, useEffect, useState, useCallback } from "react";
import {
  type ChannelKey, type LevelsSettings, type ChannelLevels,
  DEFAULT_LEVELS, computeHistogram, applyLevels, gammaToNorm, normToGamma,
} from "../lib/levels";
import "./LevelsDialog.css";

const HIST_W = 256;
const HIST_H = 96;
const SL_H = 20;
const MK = 7; // marker half-width

interface Props {
  imageData: ImageData;
  channelCount: number;
  onApply: (data: ImageData) => void;
  onPreview: (data: ImageData | null) => void;
  onClose: () => void;
}

const CH_OPTIONS: { key: ChannelKey; label: string; minCh: number }[] = [
  { key: "master", label: "Мастер (RGB)", minCh: 1 },
  { key: "r",      label: "Красный (R)",  minCh: 3 },
  { key: "g",      label: "Зелёный (G)",  minCh: 3 },
  { key: "b",      label: "Синий (B)",    minCh: 3 },
  { key: "a",      label: "Альфа (A)",    minCh: 2 },
];

function drawMarker(ctx: CanvasRenderingContext2D, x: number, fill: string, stroke: string) {
  ctx.beginPath();
  ctx.moveTo(x, SL_H);
  ctx.lineTo(x - MK, SL_H - MK * 1.4);
  ctx.lineTo(x + MK, SL_H - MK * 1.4);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export default function LevelsDialog({ imageData, channelCount, onApply, onPreview, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const histRef   = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLCanvasElement>(null);

  const [settings, setSettings] = useState<LevelsSettings>(() => structuredClone(DEFAULT_LEVELS));
  const [activeCh, setActiveCh] = useState<ChannelKey>("master");
  const [logScale, setLogScale] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);

  // stable refs for mouse handlers
  const stateRef = useRef({ settings, activeCh, previewOn });
  stateRef.current = { settings, activeCh, previewOn };

  const dragRef = useRef<"black" | "white" | "gamma" | null>(null);
  const rafRef  = useRef<number | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const schedulePreview = useCallback((s: LevelsSettings) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      onPreview(applyLevels(imageData, s));
    });
  }, [imageData, onPreview]);

  const ch: ChannelLevels = settings[activeCh];

  const applyUpdate = (next: LevelsSettings, doPreview: boolean) => {
    setSettings(next);
    if (doPreview) schedulePreview(next);
    else onPreview(null);
  };

  const update = (patch: Partial<ChannelLevels>) => {
    const next = { ...settings, [activeCh]: { ...ch, ...patch } };
    applyUpdate(next, previewOn);
  };

  // draw histogram
  useEffect(() => {
    const canvas = histRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const hist = computeHistogram(imageData, activeCh);
    const maxV = Math.max(1, ...hist);

    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, HIST_W, HIST_H);

    const COLOR: Record<ChannelKey, string> = {
      master: "#aaa", r: "#e06c75", g: "#98c379", b: "#61afef", a: "#ccc",
    };
    ctx.fillStyle = COLOR[activeCh];

    for (let i = 0; i < 256; i++) {
      const h = (logScale
        ? Math.log(hist[i] + 1) / Math.log(maxV + 1)
        : hist[i] / maxV) * HIST_H;
      ctx.fillRect(i, HIST_H - h, 1, h);
    }
  }, [imageData, activeCh, logScale]);

  // draw slider
  useEffect(() => {
    const canvas = sliderRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, HIST_W, SL_H);

    const grad = ctx.createLinearGradient(0, 0, HIST_W, 0);
    grad.addColorStop(0, "#000");
    grad.addColorStop(1, "#fff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, HIST_W, SL_H - MK * 1.4);

    const { blackPoint, gamma, whitePoint } = ch;
    const gNorm = gammaToNorm(gamma);
    const gX = (blackPoint + gNorm * (whitePoint - blackPoint)) / 255 * HIST_W;

    drawMarker(ctx, blackPoint / 255 * HIST_W, "#111", "#aaa");
    drawMarker(ctx, whitePoint / 255 * HIST_W, "#eee", "#777");
    drawMarker(ctx, gX, "#888", "#bbb");
  }, [ch]);

  // mouse drag on slider canvas
  useEffect(() => {
    const canvas = sliderRef.current!;

    const onDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const { settings: s, activeCh: ac } = stateRef.current;
      const lvl = s[ac];
      const gNorm = gammaToNorm(lvl.gamma);
      const gX  = (lvl.blackPoint + gNorm * (lvl.whitePoint - lvl.blackPoint)) / 255 * HIST_W;
      const bX  = lvl.blackPoint / 255 * HIST_W;
      const wX  = lvl.whitePoint / 255 * HIST_W;
      const dists = [Math.abs(x - bX), Math.abs(x - wX), Math.abs(x - gX)];
      const min = Math.min(...dists);
      if (min < MK + 4) {
        dragRef.current = (["black", "white", "gamma"] as const)[dists.indexOf(min)];
        e.preventDefault();
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x   = Math.max(0, Math.min(HIST_W, e.clientX - rect.left));
      const val = Math.round(x / HIST_W * 255);
      const { settings: s, activeCh: ac, previewOn: po } = stateRef.current;
      const lvl = s[ac];
      let patch: Partial<ChannelLevels>;
      if (dragRef.current === "black") {
        patch = { blackPoint: Math.min(val, lvl.whitePoint - 2) };
      } else if (dragRef.current === "white") {
        patch = { whitePoint: Math.max(val, lvl.blackPoint + 2) };
      } else {
        const range = lvl.whitePoint - lvl.blackPoint;
        const gNorm = range > 0
          ? Math.max(0.001, Math.min(0.999, (val - lvl.blackPoint) / range))
          : 0.5;
        patch = { gamma: normToGamma(gNorm) };
      }
      const next = { ...s, [ac]: { ...lvl, ...patch } };
      setSettings(next);
      if (po) schedulePreview(next);
    };

    const onUp = () => { dragRef.current = null; };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [schedulePreview]);

  const handleReset = () => {
    // Reset ALL channels (master + R/G/B/A) to defaults, per spec
    // ("приводит все значения входных уровней к исходным").
    applyUpdate(structuredClone(DEFAULT_LEVELS), previewOn);
  };

  const handleCancel = () => { onPreview(null); onClose(); };

  const handleApply = () => onApply(applyLevels(imageData, settings));

  const handlePreviewToggle = (on: boolean) => {
    setPreviewOn(on);
    if (on) schedulePreview(settings);
    else onPreview(null);
  };

  const visibleCh = CH_OPTIONS.filter(o =>
    o.minCh <= (o.key === "a" ? (channelCount === 2 || channelCount === 4 ? 2 : 99) : channelCount)
  );

  return (
    <dialog
      ref={dialogRef}
      className="levels-dialog"
      onCancel={(e) => { e.preventDefault(); handleCancel(); }}
    >
      <div className="ld-header">
        <span className="ld-title">Уровни</span>
        <button className="ld-close" onClick={handleCancel} title="Закрыть">✕</button>
      </div>

      <div className="ld-row ld-top">
        <div className="ld-field">
          <label>Канал:</label>
          <select value={activeCh} onChange={e => setActiveCh(e.target.value as ChannelKey)}>
            {visibleCh.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <label className="ld-check">
          <input type="checkbox" checked={logScale} onChange={e => setLogScale(e.target.checked)} />
          Лог. шкала
        </label>
      </div>

      <div className="ld-hist-wrap">
        <canvas ref={histRef} className="ld-hist" width={HIST_W} height={HIST_H} />
      </div>

      <div className="ld-slider-wrap">
        <canvas ref={sliderRef} className="ld-slider" width={HIST_W} height={SL_H} />
      </div>

      <div className="ld-inputs">
        <div className="ld-input-group">
          <label>Чёрная</label>
          <input type="number" min={0} max={ch.whitePoint - 1} value={ch.blackPoint}
            onChange={e => update({ blackPoint: Math.max(0, Math.min(+e.target.value, ch.whitePoint - 1)) })} />
        </div>
        <div className="ld-input-group">
          <label>Гамма</label>
          <input type="number" min={0.10} max={9.99} step={0.01} value={ch.gamma.toFixed(2)}
            onChange={e => update({ gamma: Math.max(0.1, Math.min(9.9, +e.target.value)) })} />
        </div>
        <div className="ld-input-group">
          <label>Белая</label>
          <input type="number" min={ch.blackPoint + 1} max={255} value={ch.whitePoint}
            onChange={e => update({ whitePoint: Math.max(ch.blackPoint + 1, Math.min(255, +e.target.value)) })} />
        </div>
      </div>

      <div className="ld-footer">
        <label className="ld-check">
          <input type="checkbox" checked={previewOn} onChange={e => handlePreviewToggle(e.target.checked)} />
          Предпросмотр
        </label>
        <div className="ld-actions">
          <button className="btn btn-secondary" onClick={handleReset}>Сброс</button>
          <button className="btn btn-secondary" onClick={handleCancel}>Отмена</button>
          <button className="btn btn-primary" onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}
