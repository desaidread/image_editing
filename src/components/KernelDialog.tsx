import { useRef, useState, useEffect, useCallback } from "react";
import { PRESETS, applyKernel } from "../lib/kernelFilter";
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

const CHANNEL_LABELS: Record<number, string[]> = {
  1: ["Серый"],
  2: ["Серый", "Альфа"],
  3: ["R", "G", "B"],
  4: ["R", "G", "B", "A"],
};

const CHANNEL_COLORS: string[] = ["#e06c75", "#98c379", "#61afef", "#cccccc"];

function toRgbaChannels(checked: boolean[], count: number): boolean[] {
  if (count === 1) return [checked[0], checked[0], checked[0], false];
  if (count === 2) return [checked[0], checked[0], checked[0], checked[1]];
  if (count === 3) return [checked[0], checked[1], checked[2], false];
  return [...checked];
}

const EDGE_LABELS: Record<EdgeMode, string> = {
  copy: "Копирование",
  black: "Чёрный",
  white: "Белый",
};

export default function KernelDialog({
  imageData, channelCount, onApply, onPreview, onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [presetIdx, setPresetIdx] = useState(0);
  const [kernelVals, setKernelVals] = useState<string[]>(PRESETS[0].kernel.map(String));
  const [divisorStr, setDivisorStr] = useState(String(PRESETS[0].divisor));
  const [channels, setChannels] = useState<boolean[]>(() =>
    Array.from({ length: channelCount }, (_, i) => channelCount === 4 ? i < 3 : true)
  );
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("copy");
  const [previewOn, setPreviewOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [workerError, setWorkerError] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => { workerRef.current?.terminate(); };
  }, []);

  function buildOpts(): ConvolveOptions {
    const kernel = kernelVals.map(v => parseFloat(v) || 0);
    const divisor = Math.max(0.001, parseFloat(divisorStr) || 1);
    return { kernel, divisor, channels: toRgbaChannels(channels, channelCount), edgeMode };
  }

  const runTask = useCallback((opts: ConvolveOptions, onDone: (result: ImageData) => void) => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setProcessing(true);
    setWorkerError(false);

    // Synchronous fallback — guarantees the filter is applied even if the
    // Web Worker fails to construct, fails to load, or never responds.
    const runSync = () => {
      try {
        const result = applyKernel(imageData, opts);
        setProcessing(false);
        onDone(result);
      } catch {
        setProcessing(false);
      }
    };

    let w: Worker;
    try {
      w = new KernelWorker();
    } catch {
      setWorkerError(true);
      runSync();
      return;
    }
    workerRef.current = w;

    // Watchdog: if the worker is silently dead (no message, no error),
    // give up after a short delay and process on the main thread.
    const watchdog = window.setTimeout(() => {
      if (workerRef.current !== w) return;
      setWorkerError(true);
      w.terminate();
      workerRef.current = null;
      runSync();
    }, 4000);

    w.onmessage = (e) => {
      window.clearTimeout(watchdog);
      const result = new ImageData(
        new Uint8ClampedArray(e.data.buffer), e.data.width, e.data.height,
      );
      setProcessing(false);
      w.terminate();
      if (workerRef.current === w) workerRef.current = null;
      onDone(result);
    };

    w.onerror = () => {
      window.clearTimeout(watchdog);
      setWorkerError(true);
      w.terminate();
      if (workerRef.current === w) workerRef.current = null;
      runSync();
    };

    try {
      const buffer = imageData.data.buffer.slice(0);
      w.postMessage({ buffer, width: imageData.width, height: imageData.height, opts }, [buffer]);
    } catch {
      window.clearTimeout(watchdog);
      setWorkerError(true);
      w.terminate();
      workerRef.current = null;
      runSync();
    }
  }, [imageData]);

  useEffect(() => {
    if (!previewOn) return;
    runTask(buildOpts(), onPreview);
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

  function handleApply() {
    runTask(buildOpts(), onApply);
  }

  function handleClose() {
    workerRef.current?.terminate();
    onPreview(null);
    dialogRef.current?.close();
    onClose();
  }

  const labels = CHANNEL_LABELS[channelCount] ?? CHANNEL_LABELS[3];

  return (
    <dialog
      ref={dialogRef}
      className="kernel-dialog"
      onCancel={(e) => { e.preventDefault(); handleClose(); }}
    >
      <div className="kd-header">
        <span className="kd-title">Фильтр — свёртка ядром</span>
        <button className="kd-close" onClick={handleClose} aria-label="Закрыть">✕</button>
      </div>

      <div className="kd-body">
        {/* Preset */}
        <div className="kd-row">
          <label className="kd-label">Пресет</label>
          <select
            className="kd-select"
            value={presetIdx}
            onChange={(e) => handlePresetChange(Number(e.target.value))}
          >
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </div>

        {/* Kernel grid + divisor */}
        <div className="kd-kernel-section">
          <div className="kd-kernel-grid">
            {kernelVals.map((v, i) => (
              <input
                key={i}
                type="number"
                className={`kd-cell${i === 4 ? " kd-cell-center" : ""}`}
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
          <div className="kd-divisor-wrap">
            <span className="kd-divisor-sign">÷</span>
            <input
              type="number"
              className="kd-cell kd-divisor-input"
              value={divisorStr}
              step="any"
              title="Делитель"
              onChange={(e) => setDivisorStr(e.target.value)}
            />
          </div>
        </div>

        {/* Channels */}
        <div className="kd-section">
          <span className="kd-section-label">Каналы</span>
          <div className="kd-chips">
            {labels.map((lbl, i) => (
              <button
                key={i}
                className={`kd-chip${channels[i] ? " kd-chip-on" : ""}`}
                style={channels[i] ? { borderColor: CHANNEL_COLORS[i], color: CHANNEL_COLORS[i] } : {}}
                onClick={() => {
                  const next = [...channels];
                  next[i] = !next[i];
                  setChannels(next);
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Edge mode */}
        <div className="kd-section">
          <span className="kd-section-label">Заполнение края</span>
          <div className="kd-seg">
            {(["copy", "black", "white"] as EdgeMode[]).map((m) => (
              <button
                key={m}
                className={`kd-seg-btn${edgeMode === m ? " kd-seg-active" : ""}`}
                onClick={() => setEdgeMode(m)}
              >
                {EDGE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="kd-preview-row">
          <label className="kd-toggle-label">
            <input
              type="checkbox"
              checked={previewOn}
              onChange={(e) => handleTogglePreview(e.target.checked)}
            />
            <span>Предпросмотр</span>
          </label>
          {processing && <span className="kd-spinner" title="Обработка…" />}
          {workerError && <span className="kd-warn" title="Worker недоступен, используется синхронный режим">⚠ sync</span>}
        </div>
      </div>

      <div className="kd-footer">
        <button className="btn btn-secondary" onClick={() => handlePresetChange(presetIdx)}>
          Сброс
        </button>
        <div className="kd-footer-right">
          <button className="btn btn-secondary" onClick={handleClose}>Закрыть</button>
          <button className="btn btn-primary" disabled={processing} onClick={handleApply}>
            {processing ? "…" : "Применить"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
