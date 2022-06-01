import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import { Vector3 } from "@kitware/vtk.js/types";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { CaptureOn, resliceCursorHelpers, SlicingMode, ViewTypes, vtkInteractorStyleImage, xyzToViewType } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider";
import { EditorToolType } from './editor.models';
import { hexToRgb } from '../utils/utils';

interface Props {
  axis: any,
}
export const WindowSlicer = forwardRef(({axis}: Props, ref: any) => {
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(0);
  const [minSlice, setMinSlice] = useState(0);
  const [colorWindow, setColorWindow] = useState(255);
  const [colorLevel, setColorLevel] = useState(2);
  // camera
  const [cameraZoom, setCameraZoom] = useState(1);
  const cameraParallelScaleRef = useRef<number>();

  const {
    editorContext,
    renderAllWindows,
    activeTool,
    labels,
    activeLabel,
    slices3dVisibility,
  } = useThreeDEditorContext();
  const [context, setContext] = useState<any>();

  const isFirstMove = useRef<boolean>(true);

  const update = useCallback((
    image: any,
    imageData: any,
    widgets: any,
    painter: any,
    handles: any,
    labelMap: any,
  ) => {
    const slicingMode = image.mapper.getSlicingMode() % 3;
    const ijk: Vector3 = [0, 0, 0];
    const position: Vector3 = [0, 0, 0];
    ijk[slicingMode] = image.mapper.getSlice();
    imageData.indexToWorld(ijk, position);

    widgets.paintWidget.getManipulator().setHandleOrigin(position);
    widgets.polygonWidget.getManipulator().setHandleOrigin(position);
    painter.setSlicingMode(slicingMode);

    handles.paintHandle.updateRepresentationForRender();
    handles.polygonHandle.updateRepresentationForRender();
    labelMap.mapper.set(image.mapper.get('slice', 'slicingMode'));
  }, []);

  const moveResliceCursorToSlice = useCallback((
    axis,
    widgets: any,
    imageData: any,
    image: any,
    slice?: number,
  ) => {
    const widgetState = widgets.resliceCursorWidget.getWidgetState();
    let center = widgetState.getCenter();
    const ijkCenter = imageData.worldToIndex(center);
    ijkCenter[axis] = slice !== undefined ? slice : image.mapper.getSlice();
    // move center
    center = imageData.indexToWorld(ijkCenter);
    // set cursor center to new position
    widgets.resliceCursorWidget.setCenter(center);
  }, []);

  const moveSliceToResliceCursor = useCallback((
    widgets: any,
    image: any,
  ) => {
    const widgetState = widgets.resliceCursorWidget.getWidgetState();
    const center = widgetState.getCenter();
    let slice = image.mapper.getSliceAtPosition(center);
    slice = Math.round(slice);
    image.mapper.setSlice(slice);
    setCurrentSlice(slice);
  }, []);

  useEffect(() => {
    if (!editorContext || !ref.current) return;
    const {
      windowVolume,
      imageData,
      painter,
      widgets,
      windowsSliceData,
      windowsSliceArray,
    } = editorContext;
    const {windowSlice, imageSlice, handles} = windowsSliceData[axis];
    const {
      genericRenderWindow,
      renderer,
      renderWindow,
      camera,
      widgetManager,
    } = windowSlice;
    const {image, labelMap} = imageSlice;

    // set 2D view
    camera.setParallelProjection(true);
    const isstyle = vtkInteractorStyleImage.newInstance();
    isstyle.setInteractionMode('IMAGE_SLICING');
    renderWindow.getInteractor().setInteractorStyle(isstyle);

    const setCamera = (sliceMode: any, renderer: vtkRenderer, data: vtkImageData) => {
      const ijk: Vector3 = [0, 0, 0];
      const position: Vector3 = [0, 0, 0];
      const focalPoint: Vector3 = [0, 0, 0];
      data.indexToWorld(ijk, focalPoint);
      ijk[sliceMode] = 1;
      data.indexToWorld(ijk, position);

      renderer.getActiveCamera().set({
        position: position,
        focalPoint: focalPoint,
      });
      const bounds = image.actor.getBounds();
      renderer.resetCamera(bounds);
      if (sliceMode === SlicingMode.I) {
        renderer.getActiveCamera().roll(-90);
      }
    }

    const ready = () => {
      renderer.resetCamera();
      genericRenderWindow.resize();
      widgetManager.enablePicking();
    }

    // label map pipeline
    labelMap.mapper.setInputConnection(painter.getOutputPort());
    labelMap.actor.setMapper(labelMap.mapper);
    labelMap.actor.getProperty().setRGBTransferFunction(0, labelMap.cfunc);
    labelMap.actor.getProperty().setScalarOpacity(0, labelMap.ofunc);
    labelMap.actor.getProperty().setUseLookupTableScalarRange(true);

    image.actor.setMapper(image.mapper);
    image.actor.getProperty().setColorWindow(255);
    image.actor.getProperty().setColorLevel(2);

    // ----------------------------------------------------------------------------
    // Painting
    // ----------------------------------------------------------------------------
    const initializeHandle = (handle: any) => {
      handle.onStartInteractionEvent(() => {
        painter.startStroke();
      });
      handle.onEndInteractionEvent(() => {
        painter.endStroke();
      });
    }
    // paint
    handles.paintHandle.onStartInteractionEvent(() => {
      painter.startStroke();
      painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
    });
    handles.paintHandle.onInteractionEvent(() => {
      painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
    });
    initializeHandle(handles.paintHandle);
    // poly
    handles.polygonHandle.onEndInteractionEvent(() => {
      const points = handles.polygonHandle.getPoints();
      painter.paintPolygon(points);
      handles.polygonHandle.updateRepresentationForRender();
    });
    initializeHandle(handles.polygonHandle);
    handles.polygonHandle.setOutputBorder(true);
    // reslice cursor
    handles.resliceCursorHandle.getRepresentations()[0].setScaleInPixels(true);

    widgetManager.setCaptureOn(CaptureOn.MOUSE_MOVE);

    handles.resliceCursorHandle.onActivateHandle(() => {
      moveResliceCursorToSlice(axis, widgets, imageData, image);
      for (const sliceData of windowsSliceArray) {
        if (sliceData.axis !== axis) {
          sliceData.windowSlice.renderWindow.render();
        }
      }
    });
    handles.resliceCursorHandle.onStartInteractionEvent(() => {
      
    });
    handles.resliceCursorHandle.onEndInteractionEvent(() => {
      isFirstMove.current = true;
    });
    // listen to other slice windows too
    // move slices to reslice cursor center
    for (const sliceData of windowsSliceArray) {
      handles.resliceCursorHandle.onActivateHandle(() => {
        if (sliceData.axis === axis) {
          moveResliceCursorToSlice(axis, widgets, imageData, image);
        } else {
          moveSliceToResliceCursor(widgets, sliceData.imageSlice.image);
        }
      });

      sliceData.handles.resliceCursorHandle.onStartInteractionEvent(() => {
        if (sliceData.axis === axis) {
          // handle scroll case
          moveResliceCursorToSlice(axis, widgets, imageData, image); 
        } else {
          moveSliceToResliceCursor(widgets, image);
        }
      });

      sliceData.handles.resliceCursorHandle.onInteractionEvent(({
        computeFocalPointOffset,
        canUpdateFocalPoint,
      }: any) => {
        moveSliceToResliceCursor(widgets, image);
      });
    }

    ready();

    // set input data
    image.mapper.setInputData(imageData);
    // add actors to renderers
    renderer.addActor(image.actor);
    renderer.addActor(labelMap.actor);

    // set slicing mode
    image.mapper.setSlicingMode(axis);
    image.mapper.setSlice(0);

    // update panel
    const extent: any = imageData.getExtent();
    setMaxSlice(extent[axis * 2 + 1]);
    setMinSlice(extent[axis * 2]);

    image.mapper.onModified(() => {
      update(image, imageData, widgets, painter, handles, labelMap);
    });
    // trigger initial update
    update(image, imageData, widgets, painter, handles, labelMap);
    setCamera(axis, renderer, imageData);

    cameraParallelScaleRef.current = camera.getParallelScale();
    renderWindow.render();

    const widgetState = widgets.resliceCursorWidget.getWidgetState();
    const center = widgetState.getCenter();
    let slice = image.mapper.getSliceAtPosition(center);
    slice = Math.round(slice)
    // image.mapper.setSlice(slice);
    // setCurrentSlice(slice);
    console.log(`axis: ${axis}, slice: ${slice}`);

    const value: any = {
      axis,
      imageData,
      widgetManager,
      widgets,
      labelMap,
      image,
      handles,
      renderWindow,
      renderer,
      painter,
      camera,
      windowVolume,
      windowsSliceArray,
    }
    setContext(value);
    console.log(`Done init window slice: ${axis}`);

  }, [
    editorContext,
    ref,
    axis,
    update,
    moveResliceCursorToSlice,
    moveSliceToResliceCursor,
  ]);

  useEffect(() => {
    if (!context) return;
    const {
      labelMap,
      renderWindow,
    } = context;

    labelMap.ofunc.addPoint(0, 0);
    for (const label of labels) {
      const rgb = hexToRgb(label.color);
      labelMap.cfunc.addRGBPoint(label.maskValue, rgb[0], rgb[1], rgb[2]);
      labelMap.ofunc.addPoint(label.maskValue, label.opacity / 100);
    }

    renderWindow.render();
  }, [labels, context]);

  useEffect(() => {
    if (!context) return;
    if (!activeLabel) {
      context.widgetManager.releaseFocus();
    }

  }, [activeLabel, context]);

  const handleSliceChanged = (slice: number) => {
    if (!context) return;
    const {
      axis,
      widgets,
      imageData,
      image,
      renderWindow,
      windowsSliceArray,
    } = context;

    setCurrentSlice(slice);
    image.mapper.setSlice(slice);
    
    moveResliceCursorToSlice(axis, widgets, imageData, image);

    for (const sliceData of windowsSliceArray) {
      sliceData.windowSlice.renderWindow.render();
    }
  }

  const handleColorWindowChanged = (level: number) => {
    setColorWindow(level);
    context.image.actor.getProperty().setColorWindow(level);
    renderAllWindows();
  }

  const handleColorLevelChanged = (level: number) => {
    setColorLevel(level);
    context.image.actor.getProperty().setColorLevel(level);
    renderAllWindows();
  }

  const handleCameraZoomChanged = (level: number) => {
    if (!cameraParallelScaleRef.current) return;
    setCameraZoom(level);
    const v = cameraParallelScaleRef.current - (level - 1) * 5;
    context.camera.setParallelScale(v);
    context.renderWindow.render();
  }

  const updateHandlesVisibility = (visible: boolean) => {
    if (!context) return;
    const {handles, renderWindow} = context;
    if (activeTool?.type === EditorToolType.SEGMENT_BRUSH){
      handles.paintHandle.setVisibility(visible);
    }
    if (activeTool?.type === EditorToolType.SEGMENT_POLY){
      // handles.polygonHandle.setVisibility(visible);
    }
    renderWindow.render();
  }

  const handleContainerOnMouseEnter = () => {
    if (!context || !context.painter || !activeLabel) return;
    const {
      image,
      imageData,
      painter,
      widgetManager,
      widgets,
      handles,
      labelMap,
      windowVolume,
    } = context;

    if (activeTool) {
      painter.setSlicingMode(axis);
      update(image, imageData, widgets, painter, handles, labelMap);
    }
    if (activeTool?.type === EditorToolType.SEGMENT_BRUSH) {
      widgetManager.grabFocus(widgets.paintWidget);
    } else if (activeTool?.type === EditorToolType.SEGMENT_POLY) {
      widgetManager.grabFocus(widgets.polygonWidget);
    }
    updateHandlesVisibility(true);
  }

  const handleContainerOnMouseLeave = () => {
    if (!context) return;
    const {widgetManager} = context;
    if (activeTool) {
      widgetManager.releaseFocus();
    }
    updateHandlesVisibility(false);
  }

  const handleContainerOnMouseMove = () => {
  }

  return (
    <div className='w-full h-full relative'
      onMouseEnter={() => handleContainerOnMouseEnter()}
      onMouseLeave={() => handleContainerOnMouseLeave()}
      onMouseMove={() => handleContainerOnMouseMove()}
    >
      <div
        ref={ref}
        className="w-full h-full relative"
      >
        <span className="absolute top-1 right-1 text-lg font-bold text-white">{axis}</span>
      </div>
      <div className='absolute top-1 left-1 flex flex-col gap-2 p-2 border rounded bg-white'
      >
        <div className='flex items-center gap-2'>
          <input 
            type="range"
            min={minSlice}
            max={maxSlice}
            value={currentSlice}
            onChange={(e) => handleSliceChanged(parseInt(e.target.value))}
          />
          <span>Slice: {currentSlice}/{maxSlice}</span>
        </div>
        <div className='flex items-center gap-2 hidden'>
          <input 
            type="range"
            min="0"
            max="255"
            value={colorWindow}
            step="2"
            onChange={(e) => handleColorWindowChanged(parseInt(e.target.value))}
          />
          <span>Window level: {colorWindow}</span>
        </div>
        <div className='flex items-center gap-2 hidden'>
          <input
            type="range"
            min="0"
            max="255"
            value={colorLevel}
            step="2"
            onChange={(e) => handleColorLevelChanged(parseInt(e.target.value))}
          />
          <span>Color level: {colorLevel}</span>
        </div>
        <div className='flex items-center gap-2'>
          <input
            type="range"
            min="1"
            max="200"
            value={cameraZoom}
            step="1"
            onChange={(e) => handleCameraZoomChanged(parseInt(e.target.value))}
          />
          <span>Zoom: {cameraZoom}</span>
        </div>
      </div>
    </div>
  )
})
