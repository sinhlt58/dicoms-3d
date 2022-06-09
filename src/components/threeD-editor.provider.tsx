import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { writeImageArrayBuffer } from "itk-wasm";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { itkHelper } from "../itk_import";
import { downloadBlob } from "../utils/utils";
import { SlicingMode, ViewTypes, vtkPaintFilterCustom, vtkPaintWidget, vtkResliceCursorWidget, vtkSplineWidget, vtkWidgetManager, xyzToViewType } from "../vtk_import";
import { EditorLabel, EditorTool } from "./editor.models";
import { ThreeDEditorNav } from "./threeD-editor-nav.component";
import { WindowSlicer } from "./window-slicer.component";
import { WindowVolume } from "./window-volume.component";

interface ThreeDEditorState {
  editorContext: any;
  renderAllWindows: () => void;

  activeWindow: number;
  setActiveWindow: (v: number) => void;

  volume3dVisibility: boolean;
  setVolume3dVisibility: (v: boolean) => void;
  slices3dVisibility: boolean;
  setSlices3dVisibility: (v: boolean) => void;
  label3dVisibility: boolean;
  setLabel3dVisibility: (v: boolean) => void;

  activeTool: EditorTool | undefined;
  setActiveTool: (v: EditorTool | undefined) => void;
  crossHairVisibility: boolean;
  setCrossHairVisibility: (v: boolean) => void;
  autoFillBetweenSlices: boolean;
  setAutoFillBetweenSlices: (v: boolean) => void;
  brushRadius: number;
  setBrushRadius: (v: number) => void;

  activeLabel: EditorLabel;
  setActiveLabel: (v: EditorLabel) => void;

  labels: EditorLabel[];
  setLabels: (v: EditorLabel[]) => void;
  saveLabelMap: () => void;
  loadLabelMap: (v: vtkImageData) => void;
  // Lighting
  sliceWindowLevel: number;
  setSliceWindowLevel: (v: number) => void;
  sliceColorLevel: number;
  setSliceColorLevel: (v: number) => void;
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
  const [activeWindow, setActiveWindow] = useState<number>(-1);
  const [volume3dVisibility, setVolume3dVisibility] = useState<boolean>(false);
  const [slices3dVisibility, setSlices3dVisibility] = useState<boolean>(false);
  const [label3dVisibility, setLabel3dVisibility] = useState<boolean>(false);
  const [activeTool ,setActiveTool] = useState<EditorTool>();
  const [crossHairVisibility, setCrossHairVisibility] = useState<boolean>(false);
  const [autoFillBetweenSlices, setAutoFillBetweenSlices] = useState<boolean>(false);
  const [brushRadius, setBrushRadius] = useState(10);
  // Lighting
  const [sliceWindowLevel, setSliceWindowLevel] = useState(255);
  const [sliceColorLevel, setSliceColorLevel] = useState(2);

  const labelsData: EditorLabel[] = [
    {
      id: 0,
      name: "Eraser",
      color: "#FFFFFF",
      opacity: 0,
      maskValue: 0,
    },
    {
      id: 1,
      name: "Dog",
      color: "#FF0000",
      opacity: 60,
      maskValue: 1,
    },
    {
      id: 2,
      name: "Cat",
      color: "#00FF00",
      opacity: 60,
      maskValue: 2,
    },
    {
      id: 3,
      name: "Bird",
      color: "#0000FF",
      opacity: 60,
      maskValue: 3,
    },
  ];
  const [labels, setLabels] = useState<EditorLabel[]>(labelsData);
  const [activeLabel, setActiveLabel] = useState<EditorLabel>(labelsData[1]);

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
 
    const painter = vtkPaintFilterCustom.newInstance();
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
    resliceCursorWidgetState.setOpacity(0.8);
    resliceCursorWidgetState.setSphereRadius(10 * window.devicePixelRatio);
    resliceCursorWidgetState.setLineThickness(3);
    resliceCursorWidgetState.setEnableRotation(false);
    widgets.resliceCursorWidget.setImage(imageData);

    painter.setBackgroundImage(imageData);
    const radius = 10;
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
      const container = sliceRef?.current as HTMLDivElement;
      windowSlice.genericRenderWindow.setContainer(container);
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
        axis,
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
    context.painter.setLabel(activeLabel.maskValue);
  }, [activeLabel, context]);

  useEffect(() => {
    if (!context) return;
    context.painter.setAutoFillBetweenSlices(autoFillBetweenSlices);
  }, [autoFillBetweenSlices, context]);

  const renderAllWindows = () => {
    if (!context) return;
    const {windowVolume, windowsSliceArray} = context;
    windowVolume.renderWindow.render();
    for (const windowSliceData of windowsSliceArray) {
      windowSliceData.windowSlice.renderWindow.render();
    }
  }

  useEffect(() => {
    if (!context) return;
    const {painter, widgets} = context;
    painter.setRadius(brushRadius);
    widgets.paintWidget.setRadius(brushRadius);
  }, [brushRadius, context]);

  const saveLabelMap = async () => {
    if (!context) return;
    const labelMap = context.painter.getLabelMap();
    const itkImage = itkHelper.convertVtkToItkImage(labelMap, {}); // we pass empty object in order to copy data so no dettach error.
    const {arrayBuffer: buffer} = await writeImageArrayBuffer(null, itkImage, "labelMap.nii");
    const blob = new Blob([buffer]);
    downloadBlob(blob, "labelMap.nii");
  }

  const loadLabelMap = (vtkImage: vtkImageData) => {
    if (!context) return;
    context.painter.setLabelMap(vtkImage);
  }
  
  const value: ThreeDEditorState = {
    editorContext: context,
    renderAllWindows,
    activeWindow,
    setActiveWindow,

    volume3dVisibility,
    setVolume3dVisibility,
    slices3dVisibility,
    setSlices3dVisibility,
    label3dVisibility,
    setLabel3dVisibility,

    activeTool,
    setActiveTool,
    crossHairVisibility,
    setCrossHairVisibility,
    autoFillBetweenSlices,
    setAutoFillBetweenSlices,
    brushRadius,
    setBrushRadius,

    activeLabel,
    setActiveLabel,
    labels,
    setLabels,
    saveLabelMap,
    loadLabelMap,

    sliceWindowLevel,
    setSliceColorLevel,
    sliceColorLevel,
    setSliceWindowLevel,
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
            gridGap: "1px",
          }}
        >
          <div className="">
            <WindowVolume windowId={3} />
          </div>
          <div className="">
            <WindowSlicer
              ref={sliceIRef}
              axis={SlicingMode.I}
              windowId={SlicingMode.I}
            />
          </div>
          <div className="">
            <WindowSlicer
              ref={sliceKRef}
              axis={SlicingMode.K}
              windowId={SlicingMode.K}
            /> 
          </div>
          <div className="">
            <WindowSlicer
              ref={sliceJRef}
              axis={SlicingMode.J}
              windowId={SlicingMode.J}
            />
          </div>    
        </div>
      </div>
    </ThreeDEditorContext.Provider>
  )
}