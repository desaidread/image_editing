import { useCallback } from "react";
import Toolbar from "./components/Toolbar";
import CanvasView from "./components/CanvasView";
import StatusBar from "./components/StatusBar";
import ChannelsPanel from "./components/ChannelsPanel";
import { useImageStore } from "./hooks/useImageStore";
import "./App.css";

export default function App() {
  const {
    imageData,
    meta,
    error,
    loadFile,
    downloadAs,
    setCanvasRef,
    channelCount,
    activeChannels,
    activeTool,
    pickedPixel,
    toggleChannel,
    setActiveTool,
    pickPixel,
  } = useImageStore();

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
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />
      <div className="app-main">
        <ChannelsPanel
          imageData={imageData}
          channelCount={channelCount}
          activeChannels={activeChannels}
          onToggle={toggleChannel}
        />
        <CanvasView
          imageData={imageData}
          activeChannels={activeChannels}
          channelCount={channelCount}
          activeTool={activeTool}
          onCanvasReady={handleCanvasReady}
          onPixelPick={pickPixel}
        />
      </div>
      <StatusBar meta={meta} pickedPixel={pickedPixel} />
    </div>
  );
}
