import { useCallback } from "react";
import Toolbar from "./components/Toolbar";
import CanvasView from "./components/CanvasView";
import StatusBar from "./components/StatusBar";
import { useImageStore } from "./hooks/useImageStore";
import "./App.css";

export default function App() {
  const { imageData, meta, error, loadFile, downloadAs, setCanvasRef } = useImageStore();

  const handleCanvasReady = useCallback(
    (ref: React.RefObject<HTMLCanvasElement | null>) => {
      setCanvasRef(ref);
    },
    [setCanvasRef]
  );

  return (
    <div className="app-layout">
      <Toolbar
        hasImage={imageData !== null}
        onLoad={loadFile}
        onDownload={downloadAs}
        error={error}
      />
      <CanvasView imageData={imageData} onCanvasReady={handleCanvasReady} />
      <StatusBar meta={meta} />
    </div>
  );
}
