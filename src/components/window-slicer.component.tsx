import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import { Vector3 } from "@kitware/vtk.js/types";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureOn, fitImageBoundToCamera, InteractionEventTypes, SlicingMode, vtkInteractorStyleImageCustom } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider";
import { EditorTool, EditorToolType } from "./editor.models";
import { classnames, hexToRgb } from "../utils/utils";
import { normalize } from "@kitware/vtk.js/Common/Core/Math";

interface Props {
  axis: any,
  windowId: number,
}
export const WindowSlicer = forwardRef(({
  axis,
  windowId,
}: Props, ref: any) => {
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(0);
  const [minSlice, setMinSlice] = useState(0);

  const {
    activeWindow,
    setActiveWindow,
    editorContext,
    activeTool,
    crossHairVisibility,
    labels,
    setSliceColorLevel,
    setSliceWindowLevel,
    setBrushRadius,
  } = useThreeDEditorContext();
  const [context, setContext] = useState<any>();
  const isWindowActive = useMemo(() => activeWindow === windowId, [activeWindow, windowId]);

  const crossHairVisibilityRef = useRef<boolean>(false);
  const [isResliceCursorOnInteraction, setIsResliceCursorOnInteraction] = useState(false);

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
    const slice = image.mapper.getSlice()
    ijk[slicingMode] = slice;
    imageData.indexToWorld(ijk, position);
    setCurrentSlice(slice);
    widgets.paintWidget.getManipulator().setHandleOrigin(position);
    widgets.polygonWidget.getManipulator().setHandleOrigin(position);

    handles.paintHandle.updateRepresentationForRender();
    handles.polygonHandle.updateRepresentationForRender();
    labelMap.mapper.set(image.mapper.get("slice", "slicingMode"));
  }, []);

  const moveResliceCursorToImageCenter = useCallback((
    widgets,
    imageData,
  ) => {
    const imageCenter = imageData.getCenter();
    widgets.resliceCursorWidget.setCenter(imageCenter);
  }, []);

  const moveResliceCursorToSlice = useCallback((
    axis,
    widgets: any,
    imageData: any,
    image: any,
  ) => {
    const widgetState = widgets.resliceCursorWidget.getWidgetState();
    let center = widgetState.getCenter();
    const ijkCenter = imageData.worldToIndex(center);
    let slice = image.mapper.getSlice();
    if (slice < 0) {
      slice = 0;
      image.mapper.setSlice(0);
    }
    ijkCenter[axis] = slice;
    // move center
    center = imageData.indexToWorld(ijkCenter);
    // set cursor center to new position
    widgets.resliceCursorWidget.setCenter(center);
  }, []);

  const moveSliceToResliceCursor = useCallback((
    axis,
    widgets: any,
    image: any,
    imageData: any,
  ) => {
    const widgetState = widgets.resliceCursorWidget.getWidgetState();
    const center = widgetState.getCenter();
    const centerIJK = imageData.worldToIndex(center);
    // to make the widget display before the slice
    const snapSlice =  Math.floor(centerIJK[axis]);
    image.mapper.setSlice(snapSlice);
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
    const otherSlicesData = windowsSliceArray.filter((sliceData: any) => sliceData.axis !== axis);

    // update panel
    const extent: any = imageData.getExtent();
    const minSlice = extent[axis * 2];
    const maxSlice = extent[axis * 2 + 1];
    setMaxSlice(maxSlice);
    setMinSlice(minSlice);

    // set 2D view
    const isstyle = vtkInteractorStyleImageCustom.newInstance({
      axis,
      image,
      renderer,
      widgetManager,
      minSlice,
      maxSlice,
    });
    renderWindow.getInteractor().setInteractorStyle(isstyle);
    camera.setParallelProjection(true);

    isstyle.onInteractionEvent((e: any) => {
      const eventType = e.type;
      if (eventType === InteractionEventTypes.WindowLevel) {
        const {newWindow, newLevel} = e;
        for (const sliceData of otherSlicesData) {
          const property = sliceData.imageSlice.image.actor.getProperty();
          property.setColorWindow(newWindow);
          property.setColorLevel(newLevel);
          sliceData.windowSlice.renderWindow.render();
          setSliceWindowLevel(newWindow);
          setSliceColorLevel(newLevel);
        }
      } else if (eventType === InteractionEventTypes.Slice) {
        if (!crossHairVisibilityRef.current) return;
        moveResliceCursorToSlice(axis, widgets, imageData, image);
        for (const sliceData of otherSlicesData) {
          moveSliceToResliceCursor(sliceData.axis, widgets, sliceData.imageSlice.image, imageData);
          sliceData.windowSlice.renderWindow.render();
        }
      } else if (eventType === InteractionEventTypes.Undo) {
        if (painter.canUndo()) {
          painter.undo();
        }
      } else if (eventType === InteractionEventTypes.Redo) {
        if (painter.canRedo()) {
          painter.redo();
        }
      } else if (eventType === InteractionEventTypes.IncreaseOrDecrease) {
        const {direction} = e;
        let radius = painter.getRadius();
        radius += direction * 0.5;
        if (radius < 0.1) radius = 0.1;
        if (radius > 20) radius = 20;
        radius = parseFloat(radius.toFixed(1));
        painter.setRadius(radius);
        widgets.paintWidget.setRadius(radius);
        setBrushRadius(radius);
      }
    });

    const setCamera = (axis: any, renderer: vtkRenderer, data: vtkImageData) => {
      const ijk: Vector3 = [0, 0, 0];
      const position: Vector3 = [0, 0, 0];
      const focalPoint: Vector3 = [0, 0, 0];
      data.indexToWorld(ijk, focalPoint);
      ijk[axis] = 1;
      data.indexToWorld(ijk, position);

      // setting up vector
      const upVector: Vector3 = [0, 0, 0];
      switch (axis) {
        case SlicingMode.I: // K as height
          ijk[0] = 0; ijk[1] = 0; ijk[2] = 1;
          break;
        case SlicingMode.J: // K as height
          ijk[0] = 0; ijk[1] = 0; ijk[2] = 1;
          break;
        case SlicingMode.K: // J as height
          ijk[0] = 0; ijk[1] = 1; ijk[2] = 0;
          break;
        default:
      }
      data.indexToWorld(ijk, upVector);
      const imagePos = data.getOrigin();
      upVector[0] = upVector[0] - imagePos[0];
      upVector[1] = upVector[1] - imagePos[1];
      upVector[2] = upVector[2] - imagePos[2];
      // need to normalize up vector
      // some how other features might be broken
      // like brush tool not display correctly
      normalize(upVector); 

      renderer.getActiveCamera().set({
        position: position,
        focalPoint: focalPoint,
        viewUp: upVector,
      });
      const bounds = image.actor.getBounds();
      renderer.resetCamera(bounds);

      fitImageBoundToCamera(axis, renderer, bounds);
    }

    const ready = () => {
      widgetManager.enablePicking();
    }

    // label map pipeline
    labelMap.mapper.setInputConnection(painter.getOutputPort());
    labelMap.actor.setMapper(labelMap.mapper);
    labelMap.actor.getProperty().setRGBTransferFunction(0, labelMap.cfunc);
    labelMap.actor.getProperty().setScalarOpacity(0, labelMap.ofunc);
    labelMap.actor.getProperty().setUseLookupTableScalarRange(true);
    labelMap.actor.getProperty().setInterpolationTypeToNearest();

    image.actor.setMapper(image.mapper);
    image.actor.getProperty().setColorWindow(1000);
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
    handles.resliceCursorHandle.setVisibility(false);

    handles.resliceCursorHandle.onActivateHandle(() => {
      if (!crossHairVisibilityRef.current) return;
      moveResliceCursorToSlice(axis, widgets, imageData, image);
      for (const sliceData of otherSlicesData) {
        moveSliceToResliceCursor(sliceData.axis, widgets, sliceData.imageSlice.image, imageData);
        sliceData.windowSlice.renderWindow.render();
      }
    });

    handles.resliceCursorHandle.onStartInteractionEvent(() => {
      setIsResliceCursorOnInteraction(true);
    })

    handles.resliceCursorHandle.onInteractionEvent(({
      computeFocalPointOffset,
      canUpdateFocalPoint,
    }: any) => {
      if (!crossHairVisibilityRef.current) return;
      moveSliceToResliceCursor(axis, widgets, image, imageData);
      for (const sliceData of otherSlicesData) {
        moveSliceToResliceCursor(sliceData.axis, widgets, sliceData.imageSlice.image, imageData);
      }
    });

    handles.resliceCursorHandle.onEndInteractionEvent(() => {
      setIsResliceCursorOnInteraction(false);
      // handle scroll case
      moveResliceCursorToSlice(axis, widgets, imageData, image);
      for (const sliceData of otherSlicesData) {
        moveSliceToResliceCursor(sliceData.axis, widgets, sliceData.imageSlice.image, imageData);
      }
    });
    
    ready();

    genericRenderWindow.onResize(() => {
      setCamera(axis, renderer, imageData);
    });

    // set priorities to disabled scrolling from reslice cursor
    // also prevent using tool when press shift, ctrol, alt
    // pan, dolly, spin always have higer priority than tools
    // we return EVENT_ABORT in vtkInteractorStyleImageCustom
    // so to prevent tool to process event
    // higher value means having higher priority
    isstyle.setPriority(2);
    handles.resliceCursorHandle.setPriority(1);
    handles.paintHandle.setPriority(1);
    handles.polygonHandle.setPriority(1);

    // set input data
    image.mapper.setInputData(imageData);
    // add actors to renderers
    renderer.addViewProp(image.actor);
    renderer.addViewProp(labelMap.actor);

    // set slicing mode
    image.mapper.setSlicingMode(axis);
    image.mapper.setSlice(0);

    image.mapper.onModified(() => {
      update(image, imageData, widgets, painter, handles, labelMap);
    });
    // trigger initial update
    update(image, imageData, widgets, painter, handles, labelMap);
    setCamera(axis, renderer, imageData);

    renderWindow.render();

    const value: any = {
      axis,
      imageData,
      widgetManager,
      isstyle,
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
      otherSlicesData,
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
    setSliceWindowLevel,
    setSliceColorLevel,
    setBrushRadius,
  ]);

  // enabled/disabled window level based on active tools
  useEffect(() => {
    if (!context) return;
    const {isstyle} = context;
    if (!isWindowActive) return;

    if (isResliceCursorOnInteraction || 
       (activeTool && activeTool.type !== EditorToolType.NAVIGATION_CROSS_HAIR)) {
      isstyle.setEnabledWindowLevel(false);
    } else {
      isstyle.setEnabledWindowLevel(true);
    }
  }, [context, isResliceCursorOnInteraction, activeTool, isWindowActive]);

  useEffect(() => {
    if (!context) return;
    const {
      labelMap,
      renderWindow,
    } = context;

    // labelMap.ofunc.addPoint(0, 0);
    for (const label of labels) {
      const rgb = hexToRgb(label.color);
      labelMap.cfunc.addRGBPointLong(label.maskValue, rgb[0], rgb[1], rgb[2]);
      labelMap.ofunc.addPoint(label.maskValue, label.opacity / 100);
    }

    renderWindow.render();
  }, [labels, context]);

  useEffect(() => {
    crossHairVisibilityRef.current = crossHairVisibility;
    if (!context) return;
    const {
      axis,
      handles,
      renderWindow,
      widgets,
      imageData,
      image,
    } = context;
    handles.resliceCursorHandle.setVisibility(crossHairVisibility);
    handles.resliceCursorHandle.setEnabled(crossHairVisibility);

    if (crossHairVisibility) {
      moveResliceCursorToImageCenter(widgets, imageData);
      moveSliceToResliceCursor(axis, widgets, image, imageData);
    }

    renderWindow.render();

  }, [
    crossHairVisibility,
    context,
    moveResliceCursorToImageCenter,
    moveSliceToResliceCursor,
  ]);

  const updateHandlesVisibility = useCallback((
    visible: boolean,
    context: any,
    activeTool: EditorTool | undefined,
  ) => {
    if (!context) return;
    const {handles, renderWindow} = context;
    if (activeTool?.type === EditorToolType.SEGMENT_BRUSH){
      handles.paintHandle.setVisibility(visible);
    }
    if (activeTool?.type === EditorToolType.SEGMENT_POLY){
      handles.polygonHandle.setVisibility(visible);
    }

    if (activeTool?.type !== EditorToolType.SEGMENT_BRUSH) {
      handles.paintHandle.setVisibility(false);
    }
    if (activeTool?.type !== EditorToolType.SEGMENT_POLY) {
      handles.polygonHandle.setVisibility(false);
      handles.polygonHandle.reset();
    }
    renderWindow.render();
  }, []);

  useEffect(() => {
    if (!context) return;
    if (activeWindow !== windowId) return;

    const {
      axis,
      image,
      imageData,
      painter,
      widgetManager,
      widgets,
      handles,
      labelMap,
    } = context;

    widgetManager.releaseFocus();
    if (activeTool) {
      painter.setSlicingMode(axis);
      update(image, imageData, widgets, painter, handles, labelMap);
    }
    if (activeTool?.type === EditorToolType.SEGMENT_BRUSH) {
      widgetManager.grabFocus(widgets.paintWidget);
    } else if (activeTool?.type === EditorToolType.SEGMENT_POLY) {
      widgetManager.grabFocus(widgets.polygonWidget);
    } else if (activeTool?.type === EditorToolType.NAVIGATION_CROSS_HAIR) {
      handles.resliceCursorHandle.setDragable(true);
    } else if (!activeTool) {
      handles.resliceCursorHandle.setDragable(false);
      widgetManager.releaseFocus();
    }

    updateHandlesVisibility(!!activeTool, context, activeTool);

  }, [activeTool, context, activeWindow, windowId, update, updateHandlesVisibility]);

  const handleSliceChanged = (slice: number) => {
    if (!context) return;
    const {
      axis,
      widgets,
      imageData,
      image,
      windowsSliceArray,
    } = context;

    setCurrentSlice(slice);
    image.mapper.setSlice(slice);
    
    moveResliceCursorToSlice(axis, widgets, imageData, image);

    for (const sliceData of windowsSliceArray) {
      sliceData.windowSlice.renderWindow.render();
    }
  }

  const handleContainerOnMouseEnter = () => {
    setActiveWindow(windowId);
    if (!context) return;

    const {
      axis,
      image,
      imageData,
      isstyle,
      painter,
      widgetManager,
      widgets,
      handles,
      labelMap,
    } = context;

    isstyle.setIsWindowActive(true);
    if (activeTool) {
      painter.setSlicingMode(axis);
      update(image, imageData, widgets, painter, handles, labelMap);
    }
    if (activeTool?.type === EditorToolType.SEGMENT_BRUSH) {
      widgetManager.grabFocus(widgets.paintWidget);
    } else if (activeTool?.type === EditorToolType.SEGMENT_POLY) {
      widgetManager.grabFocus(widgets.polygonWidget);
    } else if (activeTool?.type === EditorToolType.NAVIGATION_CROSS_HAIR) {
      handles.resliceCursorHandle.setDragable(true);
    }
    updateHandlesVisibility(true, context, activeTool);
  }

  const handleContainerOnMouseLeave = () => {
    setActiveWindow(-1);
    if (!context) return;

    const {
      isstyle,
      widgetManager,
      handles,
    } = context;
    context.painter.clearHistory();

    isstyle.setIsWindowActive(false);
    handles.resliceCursorHandle.setDragable(false);
    widgetManager.releaseFocus();
    updateHandlesVisibility(false, context, activeTool);
  }

  const handleContainerOnMouseMove = () => {
  }

  return (
    <div
      className={classnames(
      "w-full h-full relative",
      {"border-2 border-white": !isWindowActive},
      {"border-2 border-blue-400": isWindowActive},
    )} 
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
      <div className="absolute top-1 left-1 flex flex-col gap-2 px-1 border rounded bg-white w-1/2 opacity-60"
      >
        <div className="flex items-center gap-2 w-full">
          <span>Slice: {currentSlice}/{maxSlice}</span>
          <input 
            className="flex-1"
            type="range"
            min={minSlice}
            max={maxSlice}
            value={currentSlice}
            onChange={(e) => handleSliceChanged(parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
})
