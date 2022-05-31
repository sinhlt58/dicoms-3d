import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { SlicingMode, ViewTypes, vtkPaintFilter, vtkPaintWidget, vtkResliceCursorWidget, vtkSplineWidget, vtkWidgetManager, xyzToViewType } from "../vtk_import";
import { EditorLabel, EditorTool } from "./editor.models";
import { ThreeDEditorNav } from "./threeD-editor-nav.component";
import { WindowSlicer } from "./window-slicer.component";
import { WindowVolume } from "./window-volume.component";

interface ThreeDEditorState {
  editorContext: any;
  renderAllWindows: () => void;

  volume3dVisibility: boolean;
  setVolume3dVisibility: (v: boolean) => void;
  slices3dVisibility: boolean;
  setSlices3dVisibility: (v: boolean) => void;
  label3dVisibility: boolean;
  setLabel3dVisibility: (v: boolean) => void;

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
  const [volume3dVisibility, setVolume3dVisibility] = useState<boolean>(false);
  const [slices3dVisibility, setSlices3dVisibility] = useState<boolean>(false);
  const [label3dVisibility, setLabel3dVisibility] = useState<boolean>(false);
  const [activeTool ,setActiveTool] = useState<EditorTool>();
  const [activeLabel, setActiveLabel] = useState<EditorLabel>();
  const [labels, setLabels] = useState<EditorLabel[]>([
    {
      id: 0,
      name: "Dog",
      color: "#FF0000",
      opacity: 100,
      maskValue: 1,
    },
    {
      id: 1,
      name: "Cat",
      color: "#00FF00",
      opacity: 100,
      maskValue: 2,
    },
    {
      id: 2,
      name: "Bird",
      color: "#0000FF",
      opacity: 100,
      maskValue: 3,
    },
  ]);
  const sliceIRef = useRef<HTMLDivElement>();
  const sliceJRef = useRef<HTMLDivElement>();
  const sliceKRef = useRef<HTMLDivElement>();

  useEffect(() => {
    if (!imageData || 
      !sliceIRef.current || !sliceJRef.current || !sliceKRef.current) return;

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
    const widgets: any = {
      paintWidget: vtkPaintWidget.newInstance(),
      polygonWidget: vtkSplineWidget.newInstance({
        resetAfterPointPlacement: true,
        resolution: 1,
      }),
      resliceCursorWidget: vtkResliceCursorWidget.newInstance(),
    };
    const resliceCursorWidgetState = widgets.resliceCursorWidget.getWidgetState();
    widgets.resliceCursorWidgetState = resliceCursorWidgetState;
    resliceCursorWidgetState.setKeepOrthogonality(true);
    resliceCursorWidgetState.setOpacity(0.6);
    resliceCursorWidgetState.setSphereRadius(10 * window.devicePixelRatio);
    resliceCursorWidgetState.setLineThickness(5);
    widgets.resliceCursorWidget.setImage(imageData);

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
    const windowsSliceArray: any = [];
    const axes = [SlicingMode.K, SlicingMode.I, SlicingMode.J];
    for (const axis of axes) {
      const windowSlice = createGenericWindow();
      let sliceRef;
      if (axis === SlicingMode.I) {
        sliceRef = sliceIRef;
      }
      if (axis === SlicingMode.J) {
        sliceRef = sliceJRef;
      }
      if (axis === SlicingMode.K) {
        sliceRef = sliceKRef;
      }
      windowSlice.genericRenderWindow.setContainer(sliceRef?.current as HTMLDivElement);
      windowSlice.genericRenderWindow.resize();
      windowSlice.widgetManager.setRenderer(windowSlice.renderer);
      // init handle widgets
      const  handles = {
        paintHandle: windowSlice.widgetManager.addWidget(widgets.paintWidget, ViewTypes.SLICE),
        polygonHandle: windowSlice.widgetManager.addWidget(widgets.polygonWidget, ViewTypes.SLICE),
        resliceCursorHandle: windowSlice.widgetManager.addWidget(widgets.resliceCursorWidget, xyzToViewType[axis]),
      };

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
      const data = {
        windowSlice,
        imageSlice,
        handles,
      }
      windowsSliceData[axis] = data;
      windowsSliceArray.push(data);
    }

    setContext({
      imageData,

      painter,
      widgets,

      windowVolume,
      imageVolume,
      labelFilterVolume,
      
      windowsSliceData,
      windowsSliceArray,
    });

    return () => {
      const releaseWindow = (window: any) => {
        window.genericRenderWindow.delete();
        window.widgetManager.delete();
      }
      const releaseScenceObject = (obj: any) => {
        if (obj.cfunc) obj.cfunc.delete();
        if (obj.ofunc) obj.ofunc.delete();
        obj.mapper.delete();
        obj.actor.delete();
      }
      
      imageData.delete();
      painter.delete();
      for (const key of Object.keys(widgets)) {
        (widgets as any)[key].delete();
      }

      releaseScenceObject(imageVolume);
      releaseScenceObject(labelFilterVolume);

      for (const windowSliceData of windowsSliceArray) {
        releaseScenceObject(windowSliceData.imageSlice.image);
        releaseScenceObject(windowSliceData.imageSlice.labelMap);
        releaseWindow(windowSliceData.windowSlice);
      }

      releaseWindow(windowVolume);
      console.log("Released");
    }

  }, [imageData]);

  useEffect(() => {
    if (!context) return;

    if (activeLabel) {
      context.painter.setLabel(activeLabel.maskValue);
    } else {
      context.painter.setLabel(0);
    }

  }, [activeLabel, context]);

  const renderAllWindows = () => {
    if (!context) return;
    const {windowVolume, windowsSliceArray} = context;
    windowVolume.renderWindow.render();
    for (const windowSliceData of windowsSliceArray) {
      windowSliceData.windowSlice.renderWindow.render();
    }
  }
  
  const value: ThreeDEditorState = {
    editorContext: context,
    renderAllWindows,

    volume3dVisibility,
    setVolume3dVisibility,
    slices3dVisibility,
    setSlices3dVisibility,
    label3dVisibility,
    setLabel3dVisibility,

    activeTool,
    setActiveTool,
    activeLabel,
    setActiveLabel,
    labels,
    setLabels,
  };

  return (
    <ThreeDEditorContext.Provider value={value}>
      <div className="flex w-full h-full">
        <ThreeDEditorNav />
        <div className="flex-auto self-center p-1"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridTemplateRows: "50% 50%",
            height: `calc(100vh - 80px)`,
            gridGap: "2px",
          }}
        >
          <div className="">
            <WindowVolume />
          </div>
          <div className="">
            <WindowSlicer ref={sliceIRef} axis={SlicingMode.I} />
          </div>
          <div className="">
            <WindowSlicer ref={sliceJRef} axis={SlicingMode.J} />
          </div>
          <div className="">
            <WindowSlicer ref={sliceKRef} axis={SlicingMode.K} /> 
          </div>
        </div>
      </div>
    </ThreeDEditorContext.Provider>
  )
}