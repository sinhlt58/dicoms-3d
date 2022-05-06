import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData"
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { Fragment, useEffect, useRef, useState } from "react";
import { ImageConstants, ViewTypes, vtkInteractorStyleImage, vtkPaintFilter, vtkPaintWidget, vtkSplineWidget, vtkWidgetManager } from './vtk_import';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import { Vector3 } from '@kitware/vtk.js/types';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

const {SlicingMode} = ImageConstants;

interface Props {
  image: vtkImageData,
  axis: "I" | "J" | "K",
}
export const VTKSliceExample = ({
  image,
  axis,
}: Props) => {
  const [currentSlice, setCurrentSlice] = useState(0);
  const [maxSlice, setMaxSlice] = useState(0);
  const [minSlice, setMinSlice] = useState(0);
  const [colorWindow, setColorWindow] = useState(255);
  const [colorLevel, setColorLevel] = useState(127);

  const context = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!image || !containerRef.current) return;

    if (!context.current) {
      let sliceMode = SlicingMode.K;
      if (axis === "I") {
        sliceMode = SlicingMode.I;
      } else if (axis === "J") {
        sliceMode = SlicingMode.J;
      }

      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      // set 2D view
      const camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);
      const istyle = vtkInteractorStyleImage.newInstance();
      istyle.setInteractionMode('IMAGE_SLICING');
      renderWindow.getInteractor().setInteractorStyle(istyle);

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

      // widget manager and vtkPaintFilter
      const widgetManager = vtkWidgetManager.newInstance();
      widgetManager.setRenderer(renderer);
      // Widgets
      const widgets = {
        paintWidget: vtkPaintWidget.newInstance(),
        polygonWidget: vtkSplineWidget.newInstance({
          resetAfterPointPlacement: true,
          resolution: 1,
        }),
      };
      const handles = {
        paintHandle: widgetManager.addWidget(widgets.paintWidget, ViewTypes.SLICE),
        polygonHandle: widgetManager.addWidget(widgets.polygonWidget, ViewTypes.SLICE),
      }
      handles.polygonHandle.setOutputBorder(true);
      widgetManager.grabFocus(widgets.paintWidget);
      // widgetManager.grabFocus(widgets.polygonWidget);
      
      // Paint filter
      const painter = vtkPaintFilter.newInstance();
      
      painter.setRadius(20);
      widgets.paintWidget.setRadius(20);

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

      // ----------------------------------------------------------------------------
      // Ready logic
      // ----------------------------------------------------------------------------
      const ready = () => {
        renderer.resetCamera();
        genericRenderWindow.resize();
        widgetManager.enablePicking();
      }
      
      // label map
      const labelMap = {
        imageMapper: vtkImageMapper.newInstance() as any,
        actor: vtkImageSlice.newInstance() as any,
        cfunc: vtkColorTransferFunction.newInstance(),
        ofunc: vtkPiecewiseFunction.newInstance(),
      };
      // label map pipeline
      labelMap.actor.setMapper(labelMap.imageMapper);
      labelMap.imageMapper.setInputConnection(painter.getOutputPort());
      // set up label map color and opacity mapping
      labelMap.cfunc.addRGBPoint(1, 0, 0, 1);
      labelMap.ofunc.addPoint(0, 0);
      labelMap.ofunc.addPoint(1, 1);
      labelMap.actor.getProperty().setRGBTransferFunction(labelMap.cfunc);
      labelMap.actor.getProperty().setPiecewiseFunction(labelMap.ofunc);
      labelMap.actor.getProperty().setOpacity(0.5);

      // actor, mapper pipeline
      const mapper = vtkImageMapper.newInstance() as any;
      const actor = vtkImageSlice.newInstance() as any;
      // mapper.setSliceAtFocalPoint(true);
    
      actor.setMapper(mapper);
      actor.getProperty().setColorWindow(255);
      actor.getProperty().setColorLevel(127);

      ready();

      // set input data
      mapper.setInputData(image);
      // add actors to renderers
      renderer.addViewProp(actor);
      renderer.addViewProp(labelMap.actor);
      // update paint filter
      painter.setBackgroundImage(image);
      painter.setLabel(1);

      // set slicing mode
      mapper.setSlicingMode(sliceMode);
      mapper.setSlice(0);
      painter.setSlicingMode(sliceMode);

      setCamera(sliceMode, renderer, image);

      // update panel
      const extent: any = image.getExtent();
      setMaxSlice(extent[sliceMode * 2 + 1]);
      setMinSlice(extent[sliceMode * 2]);

      const update = () => {
        const slicingMode = mapper.getSlicingMode() % 3;
        const ijk: Vector3 = [0, 0, 0];
        const position: Vector3 = [0, 0, 0];
        ijk[slicingMode] = mapper.getSlice();
        image.indexToWorld(ijk, position);

        widgets.paintWidget.getManipulator().setHandleOrigin(position);
        widgets.polygonWidget.getManipulator().setHandleOrigin(position);
        painter.setSlicingMode(slicingMode);

        handles.paintHandle.updateRepresentationForRender();
        handles.polygonHandle.updateRepresentationForRender();
        labelMap.imageMapper.set(mapper.get('slice', 'slicingMode'));
      }

      mapper.onModified(update);
      // trigger initial update
      update();
      renderWindow.render();

      context.current = {
        widgetManager,
        widgets,
        labelMap,
        mapper,
        actor,
        handles,
        renderWindow,
        renderer,
        painter,
        camera,
      }

    } else {
      // const {mapper, renderer, renderWindow} = context.current;
      // mapper.setInputData(image);
      // renderer.resetCamera();
      // renderWindow.render();
    }

  }, [image, axis]);

  const handleGrab = () => {
    if (context.current) {
      const {widgetManager, widgets} = context.current;
      widgetManager.grabFocus(widgets.polygonWidget);
    }
  }

  const handleSliceChanged = (slice: number) => {
    setCurrentSlice(slice);
    context.current.mapper.setSlice(slice);
    context.current.renderWindow.render();
  }

  const handleColorWindowChanged = (level: number) => {
    setColorWindow(level);
    context.current.actor.getProperty().setColorWindow(level);
    context.current.renderWindow.render();
  }

  const handleColorLevelChanged = (level: number) => {
    setColorLevel(level);
    context.current.actor.getProperty().setColorLevel(level);
    context.current.renderWindow.render();
  }

  return (
    <Fragment>
      <div className='relative'
        style={{
          width: "46%",
          height: "46%",
        }}
      >
        <div ref={containerRef} className="relative bg-rose-300"
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