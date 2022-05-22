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
import { EditorLabel, EditorTool } from "./editor.models";
import { ThreeDEditorNav } from "./threeD-editor-nav.component";
import { WindowSlicer } from "./window-slicer.component";
import { WindowVolume } from "./window-volume.component";

interface ThreeDEditorState {
  editorContext: any;
  renderAllWindows: () => void;

  activeTool: EditorTool | undefined;
  setActiveTool: (v: EditorTool | undefined) => void;

  activeLabel: EditorLabel | undefined;
  setActiveLabel: (v: EditorLabel | undefined) => void;

  labels: EditorLabel[];
  setLabels: (v: EditorLabel[]) => void;
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
  const [activeTool ,setActiveTool] = useState<EditorTool>();
  const [activeLabel, setActiveLabel] = useState<EditorLabel>();
  const [labels, setLabels] = useState<EditorLabel[]>([
    {
      id: 0,
      name: "Dog",
      color: "",
      opacity: 1,
      maskValue: 1,
    },
    {
      id: 1,
      name: "Cat",
      color: "",
      opacity: 1,
      maskValue: 2,
    },
    {
      id: 2,
      name: "Bird",
      color: "",
      opacity: 1,
      maskValue: 3,
    },
  ]);

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
    const labelFilterVolume = {
      mapper: vtkVolumeMapper.newInstance(),
      actor: vtkVolume.newInstance(),
      cfunc: vtkColorTransferFunction.newInstance(),
      ofunc: vtkPiecewiseFunction.newInstance(),
    };

    // init for windows slice
    const windowsSliceData: any = {};
    const axes = [SlicingMode.K, SlicingMode.I, SlicingMode.J];
    for (const axis of axes) {
      const windowSlice = createGenericWindow();
      const imageSlice = {
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
      windowsSliceData[axis] = {
        windowSlice,
        imageSlice,
      }
    }

    setContext({
      imageData,

      painter,
      widgets,

      windowVolume,
      imageVolume,
      labelFilterVolume,
      
      windowsSliceData,
    });
  }, [imageData]);

  const renderAllWindows = () => {
    if (!context) return;
    const {windowVolume, windowsSliceData} = context;
    windowVolume.renderWindow.render();
    for (const k of Object.keys(windowsSliceData)) {
      windowsSliceData[k].windowSlice.renderWindow.render();
    }
  }
  
  const value: ThreeDEditorState = {
    editorContext: context,
    renderAllWindows,
    activeTool,
    setActiveTool,
    activeLabel,
    setActiveLabel,
    labels,
    setLabels,
  };

  return (
    <ThreeDEditorContext.Provider value={value}>
      <div className="h-full w-full flex">
        <ThreeDEditorNav />
        <div className="flex-auto flex flex-wrap gap-4 p-2">
          <WindowVolume />
          <WindowSlicer axis={SlicingMode.K} />
          <WindowSlicer axis={SlicingMode.I} />
          <WindowSlicer axis={SlicingMode.J} />
        </div>
      </div>
    </ThreeDEditorContext.Provider>
  )
}