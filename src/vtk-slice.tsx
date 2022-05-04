import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData"
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { Fragment, useEffect, useRef } from "react";
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

      // const fullScreenWindow = vtkFullScreenRenderWindow.newInstance();
      // fullScreenWindow.addController(containerRef.current);
      // const apiSpecificRenderWindow = fullScreenWindow
      //     .getInteractor()
      //     .getView();
      // const renderer = fullScreenWindow.getRenderer();
      // const renderWindow = fullScreenWindow.getRenderWindow();
      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
      // genericRenderWindow.resize();
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      // set 2D view
      renderer.getActiveCamera().setParallelProjection(true);
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
      // widgetManager.grabFocus(widgets.polygonWidget);
      widgetManager.grabFocus(widgets.polygonWidget);
      
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

  return (
    <Fragment>
      <div ref={containerRef} className="relative"
        style={{
          width: "46%",
          height: "46%",
        }}
      >
        <span className="absolute top-1 left-1 text-lg font-bold text-white">{axis}</span>
      </div>
    </Fragment>
  )
}