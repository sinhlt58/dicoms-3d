import '@kitware/vtk.js/Rendering/Profiles/All';
import { useEffect, useMemo, useRef, useState } from "react";
import { vtkColorMaps } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider"
import { classnames, hexToRgb } from '../utils/utils';

interface Props {
  windowId: number;
}
export const WindowVolume = ({
  windowId,
}: Props) => {
  const {
    activeWindow,
    setActiveWindow,
    editorContext,
    volume3dVisibility,
    slices3dVisibility,
    label3dVisibility,
    labels,
  } = useThreeDEditorContext();
  const isWindowActive = useMemo(() => activeWindow === windowId, [activeWindow, windowId]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const [realTimeUpdate, setRealTimeUpdate] = useState<boolean>(false);
  const realTimeUpdateRef = useRef<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    realTimeUpdateRef.current = realTimeUpdate;
  }, [realTimeUpdate]);

  useEffect(() => {
    if (!editorContext || !containerRef.current) return;

    const {
      imageData,
      painter,
      windowVolume,
      imageVolume,
      labelFilterVolume,
    } = editorContext;
    const {genericRenderWindow, renderer, renderWindow} = windowVolume;
    genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
    genericRenderWindow.resize();

    imageVolume.mapper.setInputData(imageData);
    imageVolume.actor.setMapper(imageVolume.mapper);

    imageVolume.cfunc.applyColorMap(vtkColorMaps.getPresetByName("Cool to Warm"));
    // const range = vtkImage.getPointData().getScalars().getRange();
    imageVolume.cfunc.setMappingRange(0, 256);
    // lookupTable.setMappingRange(0, 256);
    imageVolume.cfunc.updateRange();

    for (let i=0; i<=8; i++) {
      imageVolume.ofunc.addPoint(i * 32, i / 8);
    }

    imageVolume.actor.getProperty().setRGBTransferFunction(0, imageVolume.cfunc);
    imageVolume.actor.getProperty().setScalarOpacity(0, imageVolume.ofunc);
    imageVolume.actor.setVisibility(false);
    
    // set up filter label map
    labelFilterVolume.mapper.setInputConnection(painter.getOutputPort());
    labelFilterVolume.actor.setMapper(labelFilterVolume.mapper);
    labelFilterVolume.actor.getProperty().setRGBTransferFunction(0, labelFilterVolume.cfunc);
    labelFilterVolume.actor.getProperty().setScalarOpacity(0, labelFilterVolume.ofunc);
    labelFilterVolume.actor.getProperty().setInterpolationTypeToNearest();
    
    renderer.addVolume(labelFilterVolume.actor);
    renderer.addVolume(imageVolume.actor);

    renderer.resetCamera();
    renderWindow.render();

    const loop = setInterval(() => {
      if (!realTimeUpdateRef.current) return;
      renderWindow.render();
    }, 1/30*1000);

    return () => {
      clearInterval(loop);
    }

  }, [editorContext]);

  useEffect(() => {
    if (!editorContext) return;
    const {
      labelFilterVolume,
    } = editorContext;

    labelFilterVolume.ofunc.addPoint(0, 0);
    for (const label of labels) {
      const rgb = hexToRgb(label.color);
      labelFilterVolume.cfunc.addRGBPoint(label.maskValue, rgb[0], rgb[1], rgb[2]);
      labelFilterVolume.ofunc.addPoint(label.maskValue, label.opacity / 100);
    }
  }, [labels, editorContext]);

  useEffect(() => {
    if (!editorContext) return;
    const {
      imageVolume,
    } = editorContext;

    imageVolume.actor.setVisibility(volume3dVisibility);

  }, [editorContext, volume3dVisibility]);

  useEffect(() => {
    if (!editorContext) return;
    const {
      windowVolume,
      windowsSliceArray,
    } = editorContext;

    for (const windowSliceData of windowsSliceArray) {
      if (slices3dVisibility) {
        windowVolume.renderer.addActor(windowSliceData.imageSlice.image.actor);
      } else {
        windowVolume.renderer.removeActor(windowSliceData.imageSlice.image.actor);
      }
    }
  }, [editorContext, slices3dVisibility]);

  useEffect(() => {
    if (!editorContext) return;
    const {
      labelFilterVolume,
    } = editorContext;

    labelFilterVolume.actor.setVisibility(label3dVisibility);
  }, [editorContext, label3dVisibility]);

  const handleContainerOnMouseEnter = () => {
    setActiveWindow(windowId);
  }

  const handleContainerOnMouseLeave = () => {
    setActiveWindow(-1);
  }

  const handleRefreshClick = () => {
    if (!editorContext || isRefreshing) return;
    setIsRefreshing(true);
    editorContext.windowVolume.renderWindow.render();
    setIsRefreshing(false);
  }

  return (
    <div
      onMouseEnter={handleContainerOnMouseEnter}
      onMouseLeave={handleContainerOnMouseLeave}
      className={classnames(
        "w-full h-full flex items-center justify-center relative",
        {"border-2 border-white": !isWindowActive},
        {"border-2 border-blue-400": isWindowActive},
      )}
    >
      <div className="w-full h-full"
        ref={containerRef}
      >
      </div>
      <div className="absolute right-1 bottom-1 flex items-center gap-1 bg-white p-1 rounded">
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={realTimeUpdate}
            onChange={e =>setRealTimeUpdate(e.target.checked)}
          />
          <span>Real time</span>
        </div>
        <button
          className="border rounded px-4 py-1 disabled:opacity-50"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}