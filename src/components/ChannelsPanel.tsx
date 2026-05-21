import { useEffect, useRef } from "react";
import "./ChannelsPanel.css";

const CHANNEL_NAMES: Record<number, string[]> = {
  1: ["Серый"],
  2: ["Серый", "Альфа"],
  3: ["R", "G", "B"],
  4: ["R", "G", "B", "A"],
};

// Maps logical channel index to byte offset in RGBA ImageData
function channelByteIndex(chIdx: number, channelCount: number): number {
  if (channelCount === 2 && chIdx === 1) return 3; // Alpha byte
  return chIdx; // R=0, G=1, B=2, A=3
}

interface ThumbProps {
  imageData: ImageData;
  chIdx: number;
  channelCount: number;
}

function ChannelThumb({ imageData, chIdx, channelCount }: ThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    const bi = channelByteIndex(chIdx, channelCount);
    for (let i = 0; i < src.length; i += 4) {
      const v = src[i + bi];
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = 255;
    }
    ctx.putImageData(new ImageData(out, imageData.width, imageData.height), 0, 0);
  }, [imageData, chIdx, channelCount]);

  return <canvas ref={canvasRef} className="channel-thumb" />;
}

interface Props {
  imageData: ImageData | null;
  channelCount: number;
  activeChannels: boolean[];
  onToggle: (index: number) => void;
}

export default function ChannelsPanel({ imageData, channelCount, activeChannels, onToggle }: Props) {
  const channelNames = CHANNEL_NAMES[channelCount] ?? [];

  return (
    <div className="channels-panel">
      <span className="channels-title">Каналы</span>
      {imageData && channelNames.length > 0 ? (
        <div className="channels-list">
          {channelNames.map((name, idx) => (
            <button
              key={`${channelCount}-${name}`}
              className={`channel-item ${activeChannels[idx] ? "ch-active" : "ch-inactive"}`}
              onClick={() => onToggle(idx)}
              title={`${activeChannels[idx] ? "Скрыть" : "Показать"} канал ${name}`}
            >
              <div className="channel-thumb-wrap">
                <ChannelThumb imageData={imageData} chIdx={idx} channelCount={channelCount} />
              </div>
              <div className="channel-footer">
                <span className="channel-label">{name}</span>
                <span className="channel-eye" aria-hidden="true">
                  {activeChannels[idx] ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <ellipse cx="8" cy="8" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M4.5 5.3A7 4.5 0 0 0 1 8c1.2 2.5 4 4.5 7 4.5a7 7 0 0 0 3.2-.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M7 3.6A7 7 0 0 1 8 3.5c3 0 5.8 2 7 4.5a9 9 0 0 1-1.5 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="channels-empty">Нет изображения</p>
      )}
    </div>
  );
}
