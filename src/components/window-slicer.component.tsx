import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import { Vector3 } from "@kitware/vtk.js/types";
import { Fragment, useEffect, useRef, useState } from "react";
import { ViewTypes, vtkInteractorStyleImage } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider";
import { EditorToolType } from './editor.models';
import { hexToRgb } from '../utils/utils';

interface Props {
  axis: any,
}
export const WindowSlicer = ({
  axis,
}: Props) => {
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(0);
  const [minSlice, setMinSlice] = useState(0);
  const [colorWindow, setColorWindow] = useState(255);
  const [colorLevel, setColorLevel] = useState(2);

  const {
    editorContext,
    renderAllWindows,
    activeTool,
    labels,
    activeLabel,
  } = useThreeDEditorContext();
  const [context, setContext] = useState<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorContext) return;
    const {
      windowVolume,
      imageData,
      painter,
      widgets,
      // change later corresponding to axis
      windowsSliceData,
    } = editorContext;
    const {windowSlice, imageSlice} = windowsSliceData[axis];
    const {
      genericRenderWindow,
      renderer,
      renderWindow,
      camera,
      widgetManager,
    } = windowSlice;
    const {image, labelMap} = imageSlice;

    genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
    widgetManager.setRenderer(renderer);

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
      renderer.getActiveCamera().set({focalPoint, position});
      renderer.resetCamera();
    }

    const ready = () => {
      renderer.resetCamera();
      genericRenderWindow.resize();
      widgetManager.enablePicking();
    }

    // label map pipeline
    labelMap.mapper.setInputConnection(painter.getOutputPort());
    labelMap.actor.setMapper(labelMap.mapper);
    labelMap.ofunc.addPoint(0, 0);
    labelMap.ofunc.addPoint(1, 1);
    labelMap.ofunc.addPoint(2, 1);
    labelMap.ofunc.addPoint(3, 1);
    // labelMap.cfunc.addRGBPoint(0, 0, 0, 0);
    
    labelMap.cfunc.addRGBPoint(1, 1, 0, 0);
    labelMap.cfunc.addRGBPoint(2, 0, 1, 0);
    labelMap.cfunc.addRGBPoint(3, 0, 0, 1);
    labelMap.actor.getProperty().setRGBTransferFunction(0, labelMap.cfunc);
    labelMap.actor.getProperty().setScalarOpacity(0, labelMap.ofunc);
    // labelMap.actor.getProperty().setOpacity(0.5);

    image.actor.setMapper(image.mapper);
    image.actor.getProperty().setColorWindow(255);
    image.actor.getProperty().setColorLevel(2);

    // ----------------------------------------------------------------------------
    // Painting
    // ----------------------------------------------------------------------------
    const  handles = {
      paintHandle: widgetManager.addWidget(widgets.paintWidget, ViewTypes.SLICE),
      polygonHandle: widgetManager.addWidget(widgets.polygonWidget, ViewTypes.SLICE),
    };
    const initializeHandle = (handle: any) => {
      handle.onStartInteractionEvent(() => {
        painter.startStroke();
      });
      handle.onEndInteractionEvent(() => {
        painter.endStroke();
        let scalars = labelMap.mapper.getInputData().getPointData().getScalars();
        let range = scalars.getRange();
        console.log(range)
      });
    }
    handles.paintHandle.onStartInteractionEvent(() => {
      painter.startStroke();
      painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
      windowVolume.renderWindow.render();
    });
    handles.paintHandle.onInteractionEvent(() => {
      painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
      windowVolume.renderWindow.render();
    });
    initializeHandle(handles.paintHandle);
    
    handles.polygonHandle.onEndInteractionEvent(() => {
      const points = handles.polygonHandle.getPoints();
      painter.paintPolygon(points);
      handles.polygonHandle.updateRepresentationForRender();
      windowVolume.renderWindow.render();
    });
    initializeHandle(handles.polygonHandle);

    handles.polygonHandle.setOutputBorder(true);

    ready();

    // set input data
    image.mapper.setInputData(imageData);
    // add actors to renderers
    renderer.addActor(image.actor);
    renderer.addActor(labelMap.actor);

    // set slicing mode
    image.mapper.setSlicingMode(axis);
    image.mapper.setSlice(0);

    setCamera(axis, renderer, imageData);

    // update panel
    const extent: any = imageData.getExtent();
    setMaxSlice(extent[axis * 2 + 1]);
    setMinSlice(extent[axis * 2]);

    const update = () => {
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
      console.log("on modified")
    }

    image.mapper.onModified(update);
    // trigger initial update
    update();
    renderWindow.render();

    const value: any = {
      widgetManager,
      widgets,
      labelMap,
      image,
      handles,
      renderWindow,
      renderer,
      painter,
      camera,
    }
    setContext(value);
    console.log(`Done init window slice: ${axis}`);

  }, [editorContext, axis]);

  useEffect(() => {
    if (!context) return;
    const {
      labelMap,
      renderWindow,
    } = context;

    labelMap.ofunc.addPoint(0, 0);
    for (const label of labels) {
      const rgb = hexToRgb(label.color);
      // labelMap.cfunc.addRGBPoint(label.maskValue, rgb[0], rgb[1], rgb[2]);
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
    setCurrentSlice(slice);
    context.image.mapper.setSlice(slice);
    renderAllWindows();
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

  const handleContainerOnMouseEnter = () => {
    if (!context || !context.painter || !activeLabel) return;
    const {painter, widgetManager, widgets} = context;

    if (activeTool) {
      painter.setSlicingMode(axis);
    }
    if (activeTool?.type === EditorToolType.SEGMENT_BRUSH) {
      widgetManager.grabFocus(widgets.paintWidget);
    } else if (activeTool?.type === EditorToolType.SEGMENT_POLY) {
      widgetManager.grabFocus(widgets.polygonWidget);
    }
  }

  const handleContainerOnMouseLeave = () => {
    if (!context) return;
    const {widgetManager} = context;
    widgetManager.releaseFocus();
  }

  const handleContainerOnMouseMove = () => {
  }

  return (
    <Fragment>
      <div className='relative bg-red-300'
        style={{
          width: "400px",
          height: "400px",
        }}
        onMouseEnter={() => handleContainerOnMouseEnter()}
        onMouseLeave={() => handleContainerOnMouseLeave()}
        onMouseMove={() => handleContainerOnMouseMove()}
      >
        <div
          ref={containerRef}
          className="relative bg-rose-300"
        >
          <span className="absolute top-1 right-1 text-lg font-bold text-white">{axis}</span>
        </div>
        <div className='absolute top-1 left-1 flex flex-col gap-2 p-2 border rounded bg-white'
        >
          <div className='flex items-center gap-2'>
            <input 
              type="range"
              min="0"
              max={maxSlice}
              value={currentSlice}
              onChange={(e) => handleSliceChanged(parseInt(e.target.value))}
            />
            <span>Slice: {currentSlice}/{maxSlice}</span>
          </div>
          <div className='flex items-center gap-2'>
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
          <div className='flex items-center gap-2'>
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
        </div>
      </div>
    </Fragment>
  )
}
