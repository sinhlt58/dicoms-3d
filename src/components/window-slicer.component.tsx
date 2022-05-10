import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import { Vector3 } from "@kitware/vtk.js/types";
import { Fragment, useEffect, useRef, useState } from "react";
import { ViewTypes, vtkInteractorStyleImage } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider";

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
  } = useThreeDEditorContext();
  const context = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorContext) return;
    const {
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
    labelMap.actor.setMapper(labelMap.mapper);
    labelMap.mapper.setInputConnection(painter.getOutputPort());
    // set up label map color and opacity mapping
    labelMap.cfunc.addRGBPoint(1, 0, 0, 1);
    labelMap.ofunc.addPoint(0, 0);
    labelMap.ofunc.addPoint(1, 1);
    labelMap.actor.getProperty().setRGBTransferFunction(labelMap.cfunc);
    labelMap.actor.getProperty().setPiecewiseFunction(labelMap.ofunc);
    labelMap.actor.getProperty().setOpacity(0.5);

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
      });
    }
    handles.paintHandle.onStartInteractionEvent(() => {
      painter.startStroke();
      painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
    });
    handles.paintHandle.onInteractionEvent(() => {
      painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
    });
    initializeHandle(handles.paintHandle);
    
    handles.polygonHandle.onEndInteractionEvent(() => {
      const points = handles.polygonHandle.getPoints();
      painter.paintPolygon(points);
    
      handles.polygonHandle.updateRepresentationForRender();
    });
    initializeHandle(handles.polygonHandle);

    ready();

    // set input data
    image.mapper.setInputData(imageData);
    // add actors to renderers
    renderer.addViewProp(image.actor);
    renderer.addViewProp(labelMap.actor)
    // update paint filter
    painter.setLabel(1);

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
    }

    image.mapper.onModified(update);
    // trigger initial update
    update();
    renderWindow.render();

    context.current = {
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
    console.log(`Done init window slice: ${axis}`);

  }, [editorContext, axis]);

  const handleSliceChanged = (slice: number) => {
    setCurrentSlice(slice);
    context.current.image.mapper.setSlice(slice);
    renderAllWindows();
  }

  const handleColorWindowChanged = (level: number) => {
    setColorWindow(level);
    context.current.image.actor.getProperty().setColorWindow(level);
    renderAllWindows();
  }

  const handleColorLevelChanged = (level: number) => {
    setColorLevel(level);
    context.current.image.actor.getProperty().setColorLevel(level);
    renderAllWindows();
  }

  const handleContainerOnMouseEnter = () => {
    if (!context.current || !context.current.painter) return;
    const {painter, widgetManager, widgets} = context.current;
    painter.setSlicingMode(axis);
    widgetManager.grabFocus(widgets.paintWidget);
  }

  const handleContainerOnMouseLeave = () => {
    if (!context.current) return;
    const {widgetManager} = context.current;
    widgetManager.releaseFocus();
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
