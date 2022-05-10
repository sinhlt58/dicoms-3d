import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { createContext, useContext, useEffect, useState } from "react";
import { SlicingMode, vtkPaintFilter, vtkPaintWidget, vtkSplineWidget, vtkWidgetManager } from "../vtk_import";
import { WindowSlicer } from "./window-slicer.component";
import { WindowVolume } from "./window-volume.component";


interface ThreeDEditorState {
  editorContext: any;
}

export const ThreeDEditorContext = createContext({} as ThreeDEditorState);
export const useThreeDEditorContext = () => {
  return useContext(ThreeDEditorContext);
}

interface ThreeDEditorProviderProps {
  imageData: vtkImageData,
}
export const ThreeDEditorProvider = ({
  imageData,
}: ThreeDEditorProviderProps) => {

  const [context, setContext] = useState<any>();

  useEffect(() => {
    if (!imageData) return;

    const createGenericWindow = () => {
      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();
      const camera = renderer.getActiveCamera();
      const widgetManager = vtkWidgetManager.newInstance();

      return {
        genericRenderWindow,
        renderer,
        renderWindow,
        camera,
        widgetManager,
      }
    }
 
    const painter = vtkPaintFilter.newInstance();
    const widgets = {
      paintWidget: vtkPaintWidget.newInstance(),
      polygonWidget: vtkSplineWidget.newInstance({
        resetAfterPointPlacement: true,
        resolution: 1,
      }),
    };
    painter.setBackgroundImage(imageData);
    const radius = 20;
    painter.setRadius(radius);
    widgets.paintWidget.setRadius(radius);

    // init stuff for window volume
    const windowVolume = createGenericWindow();
    const imageVolume = {
      mapper: vtkVolumeMapper.newInstance(),
      actor: vtkVolume.newInstance(),
      cfunc: vtkColorTransferFunction.newInstance(),
      ofunc: vtkPiecewiseFunction.newInstance(),
    };

    // init for window slice
    const windowSliceK = createGenericWindow();
    const imageSliceK = {
      image: {
        mapper: vtkImageMapper.newInstance() as any,
        actor: vtkImageSlice.newInstance() as any,
      },
      labelMap: {
        mapper: vtkImageMapper.newInstance() as any,
        actor: vtkImageSlice.newInstance() as any,
        cfunc: vtkColorTransferFunction.newInstance(),
        ofunc: vtkPiecewiseFunction.newInstance(),
      },
    };
    const windowsSliceData = {
      [SlicingMode.K]: {
        windowSlice: windowSliceK,
        imageSlice: imageSliceK,
      }
    }

    setContext({
      imageData,

      painter,
      widgets,

      windowVolume,
      imageVolume,
      
      windowsSliceData,
    });
  }, [imageData]);
  
  const value: ThreeDEditorState = {
    editorContext: context,
  };

  return (
    <ThreeDEditorContext.Provider value={value}>
      <div className="h-full w-full flex gap-1 flex-wrap">
        <WindowVolume />
        <WindowSlicer axis={SlicingMode.K} />
      </div>
    </ThreeDEditorContext.Provider>
  )
}