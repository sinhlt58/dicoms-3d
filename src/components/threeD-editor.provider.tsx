import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { vtkPaintFilter, vtkPaintWidget, vtkSplineWidget, vtkWidgetManager } from "../vtk_import";
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

    // init stuff for window volume
    const windowVolume = createGenericWindow();
    const imageVolume = {
      mapper: vtkVolumeMapper.newInstance(),
      actor: vtkVolume.newInstance(),
      lookupTable: vtkColorTransferFunction.newInstance(),
      piecewiseFunc: vtkPiecewiseFunction.newInstance(),
    };

    // init for window slice
    const windowSliceK = createGenericWindow();
    const imageSliceK = {
      imageSlice: {
        mapper: vtkImageMapper.newInstance() as any,
        actor: vtkImageSlice.newInstance() as any,
      },
      labelMap: {
        mapper: vtkImageMapper.newInstance() as any,
        actor: vtkImageSlice.newInstance() as any,
        lookupTable: vtkColorTransferFunction.newInstance(),
        piecewiseFunc: vtkPiecewiseFunction.newInstance(),
      },
    };

    setContext({
      imageData,

      painter,
      widgets,

      windowVolume,
      imageVolume,
      
      windowSliceK,
      imageSliceK,
    });
  }, [imageData]);
  
  const value: ThreeDEditorState = {
    editorContext: context,
  };

  return (
    <ThreeDEditorContext.Provider value={value}>
      <div className="h-full w-full flex gap-1 flex-wrap">
        <WindowVolume />
      </div>
    </ThreeDEditorContext.Provider>
  )
}