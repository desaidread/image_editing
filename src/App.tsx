import { useCallback } from "react";
import Toolbar from "./components/Toolbar";
import CanvasView from "./components/CanvasView";
import StatusBar from "./components/StatusBar";
import ChannelsPanel from "./components/ChannelsPanel";
import LevelsDialog from "./components/LevelsDialog";
import ResizeDialog from "./components/ResizeDialog";
import { useImageStore } from "./hooks/useImageStore";
import "./App.css";

export default function App() {
  const {
    imageData, meta, error, loadFile, downloadAs, setCanvasRef,
    channelCount, activeChannels, activeTool, pickedPixel,
    toggleChannel, setActiveTool, pickPixel,
    previewImageData, setPreviewImageData,
    levelsOpen, openLevels, closeLevels, commitLevels,
    viewScale, setViewScale,
    resizeOpen, openResize, closeResize, commitResize,
  } = useImageStore();

  const handleCanvasReady = useCallback(
    (ref: React.RefObject<HTMLCanvasElement | null>) => setCanvasRef(ref),
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
        onOpenLevels={openLevels}
        viewScale={viewScale}
        onViewScaleChange={setViewScale}
        onOpenResize={openResize}
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
          previewImageData={previewImageData}
          activeChannels={activeChannels}
          channelCount={channelCount}
          activeTool={activeTool}
          viewScale={viewScale}
          onCanvasReady={handleCanvasReady}
          onPixelPick={pickPixel}
          onAutoFit={setViewScale}
        />
      </div>
      <StatusBar meta={meta} pickedPixel={pickedPixel} />

      {levelsOpen && imageData && (
        <LevelsDialog
          imageData={imageData}
          channelCount={channelCount}
          onApply={commitLevels}
          onPreview={setPreviewImageData}
          onClose={closeLevels}
        />
      )}

      {resizeOpen && imageData && (
        <ResizeDialog
          imageData={imageData}
          onApply={commitResize}
          onClose={closeResize}
        />
      )}
    </div>
  );
}
