import { useRef, useState, useEffect, useCallback } from "react";
import { PRESETS } from "../lib/kernelFilter";
import type { EdgeMode, ConvolveOptions } from "../lib/kernelFilter";
import KernelWorker from "../workers/kernel.worker?worker";
import "./KernelDialog.css";

interface Props {
  imageData: ImageData;
  channelCount: number;
  onApply: (newData: ImageData) => void;
  onPreview: (data: ImageData | null) => void;
  onClose: () => void;
}

function channelLabels(count: number): string[] {
  if (count === 1) return ["Серый"];
  if (count === 2) return ["Серый", "Альфа"];
  if (count === 3) return ["R", "G", "B"];
  return ["R", "G", "B", "A"];
}

function toRgbaChannels(checked: boolean[], count: number): boolean[] {
  if (count === 1) return [checked[0], checked[0], checked[0], false];
  if (count === 2) return [checked[0], checked[0], checked[0], checked[1]];
  if (count === 3) return [checked[0], checked[1], checked[2], false];
  return [...checked];
}

const DEFAULT_PRESET = 0;

export default function KernelDialog({
  imageData, channelCount, onApply, onPreview, onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [presetIdx, setPresetIdx] = useState(DEFAULT_PRESET);
  const [kernelVals, setKernelVals] = useState<string[]>(
    PRESETS[DEFAULT_PRESET].kernel.map(String)
  );
  const [divisorStr, setDivisorStr] = useState(String(PRESETS[DEFAULT_PRESET].divisor));
  const [channels, setChannels] = useState<boolean[]>(
    new Array(channelCount).fill(true).map((_, i) =>
      // don't filter alpha by default
      channelCount === 4 ? i < 3 : true
    )
  );
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("copy");
  const [previewOn, setPreviewOn] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => { workerRef.current?.terminate(); };
  }, []);

  function buildOpts(): ConvolveOptions {
    const kernel = kernelVals.map(v => parseFloat(v) || 0);
    const divisor = Math.max(0.001, parseFloat(divisorStr) || 1);
    return { kernel, divisor, channels: toRgbaChannels(channels, channelCount), edgeMode };
  }

  const runWorker = useCallback((opts: ConvolveOptions, onDone: (result: ImageData) => void) => {
    workerRef.current?.terminate();
    const w = new KernelWorker();
    workerRef.current = w;
    setProcessing(true);
    const buffer = imageData.data.buffer.slice(0);
    w.postMessage({ buffer, width: imageData.width, height: imageData.height, opts }, [buffer]);
    w.onmessage = (e) => {
      const result = new ImageData(new Uint8ClampedArray(e.data.buffer), e.data.width, e.data.height);
      setProcessing(false);
      w.terminate();
      if (workerRef.current === w) workerRef.current = null;
      onDone(result);
    };
  }, [imageData]);

  // Re-run preview whenever kernel/options change while preview is on
  useEffect(() => {
    if (!previewOn) return;
    runWorker(buildOpts(), onPreview);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOn, kernelVals, divisorStr, channels, edgeMode]);

  function handlePresetChange(idx: number) {
    const p = PRESETS[idx];
    setPresetIdx(idx);
    setKernelVals(p.kernel.map(String));
    setDivisorStr(String(p.divisor));
  }

  function handleTogglePreview(on: boolean) {
    setPreviewOn(on);
    if (!on) {
      workerRef.current?.terminate();
      workerRef.current = null;
      setProcessing(false);
      onPreview(null);
    }
  }

  function handleReset() {
    handlePresetChange(presetIdx);
  }

  function handleApply() {
    runWorker(buildOpts(), (result) => {
      onApply(result);
    });
  }

  function handleClose() {
    workerRef.current?.terminate();
    onPreview(null);
    dialogRef.current?.close();
    onClose();
  }

  const labels = channelLabels(channelCount);

  return (
    <dialog
      ref={dialogRef}
      className="kernel-dialog"
      onCancel={(e) => { e.preventDefault(); handleClose(); }}
    >
      <div className="kd-header">
        <span className="kd-title">Фильтр (свёртка)</span>
        <button className="kd-close" onClick={handleClose}>✕</button>
      </div>

      <div className="kd-body">
        {/* Preset selector */}
        <div className="kd-field">
          <label className="kd-label">Пресет</label>
          <select
            className="kd-select"
            value={presetIdx}
            onChange={(e) => handlePresetChange(parseInt(e.target.value))}
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 3×3 kernel grid */}
        <div className="kd-kernel-wrap">
          <div className="kd-kernel-grid">
            {kernelVals.map((v, i) => (
              <input
                key={i}
                type="number"
                className="kd-cell"
                value={v}
                step="any"
                onChange={(e) => {
                  const next = [...kernelVals];
                  next[i] = e.target.value;
                  setKernelVals(next);
                }}
              />
            ))}
          </div>
          <div className="kd-divisor-row">
            <label className="kd-label">Делитель</label>
            <input
              type="number"
              className="kd-cell kd-divisor"
              value={divisorStr}
              step="any"
              onChange={(e) => setDivisorStr(e.target.value)}
            />
          </div>
        </div>

        {/* Channel checkboxes */}
        <div className="kd-section-label">Каналы</div>
        <div className="kd-channels">
          {labels.map((lbl, i) => (
            <label key={i} className="kd-check">
              <input
                type="checkbox"
                checked={channels[i]}
                onChange={(e) => {
                  const next = [...channels];
                  next[i] = e.target.checked;
                  setChannels(next);
                }}
              />
              {lbl}
            </label>
          ))}
        </div>

        {/* Edge handling */}
        <div className="kd-section-label">Заполнение края</div>
        <div className="kd-edges">
          {(["copy", "black", "white"] as EdgeMode[]).map((m) => (
            <label key={m} className="kd-check">
              <input
                type="radio"
                name="edgeMode"
                value={m}
                checked={edgeMode === m}
                onChange={() => setEdgeMode(m)}
              />
              {m === "copy" ? "Копирование" : m === "black" ? "Чёрный" : "Белый"}
            </label>
          ))}
        </div>

        {/* Preview */}
        <label className="kd-check kd-preview-check">
          <input
            type="checkbox"
            checked={previewOn}
            onChange={(e) => handleTogglePreview(e.target.checked)}
          />
          Предпросмотр
          {processing && <span className="kd-spinner" />}
        </label>
      </div>

      <div className="kd-footer">
        <button className="btn btn-secondary" onClick={handleReset}>Сброс</button>
        <div className="kd-footer-right">
          <button className="btn btn-secondary" onClick={handleClose}>Закрыть</button>
          <button className="btn btn-primary" disabled={processing} onClick={handleApply}>
            Применить
          </button>
        </div>
      </div>
    </dialog>
  );
}
