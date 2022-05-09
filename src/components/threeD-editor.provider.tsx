import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { createContext, useContext, useEffect, useRef } from "react";
import { vtkPaintFilter, vtkPaintWidget, vtkSplineWidget, vtkWidgetManager } from "../vtk_import";


interface ThreeDEditorState {
  context: any;
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

  const contextRef = useRef<any>();

  useEffect(() => {
    if (!imageData) return;

    if (!contextRef.current) {
      const createGenericWindow = () => {
        const genericRenderWindow = vtkGenericRenderWindow.newInstance();
        const renderer = genericRenderWindow.getRenderer();
        const renderWindow = genericRenderWindow.getRenderWindow();
        const camera = renderer.getActiveCamera();
        const widgetManager = vtkWidgetManager.newInstance();

        return {
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

      contextRef.current = {
        imageData,
        windowVolume,
        painter,
        widgets,
      };
    }
  }, []);
  
  const value: ThreeDEditorState = {
    context: contextRef.current,
  };

  return (
    <ThreeDEditorContext.Provider value={value}>

    </ThreeDEditorContext.Provider>
  )
}