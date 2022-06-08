import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import { Fragment, useRef, useState } from "react";
import { classnames, fileToVTKImage } from "../utils/utils";
import { EditorLabel, EditorTool, EditorToolType } from "./editor.models";
import { useThreeDEditorContext } from "./threeD-editor.provider"

interface Props {

}
export const ThreeDEditorNav = ({

}: Props) => {
  const {
    editorContext,
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

    activeLabel,
    setActiveLabel,
    labels,
    setLabels,
    saveLabelMap,
    loadLabelMap,

    sliceWindowLevel,
    setSliceWindowLevel,
    sliceColorLevel,
    setSliceColorLevel,
  } = useThreeDEditorContext();

  const inputLoadLabelMapRef = useRef<HTMLInputElement>(null);
  const [isProcesing, setIsProcessing] = useState(false);

  const tools: EditorTool[] = [
    {
      id: 0, 
      name: "Cross",
      type: EditorToolType.NAVIGATION_CROSS_HAIR,
    },
    {
      id: 1,
      name: "Brush",
      type: EditorToolType.SEGMENT_BRUSH,
    },
    {
      id: 2,
      name: "Poly",
      type: EditorToolType.SEGMENT_POLY,
    },
  ];

  const handleToolClick = (tool: EditorTool) => {
    if (activeTool?.id === tool.id) {
      setActiveTool(undefined);
    } else {
      setActiveTool(tool);
    }
  }

  const handleLabelChanged = (label: EditorLabel) => {
    setActiveLabel(label);
  }

  const handleLabelOpacityChanged = (label: EditorLabel, v: number) => {
    setLabels(labels.map(l => {
      if (l.id === label.id) {
        return {
          ...l,
          opacity: v,
        }
      }
      return l;
    }));
  }

  const handleSaveLabelClick = async () => {
    if (isProcesing) return;
    setIsProcessing(true);
    await saveLabelMap()
    setIsProcessing(false);
  }

  const handleLoadLabelMapInputChanged = async (e: any) => {
    if (isProcesing) return;
    
    setIsProcessing(true);
    const file: File = e.target.files[0];
    const vtkImage: vtkImageData = await fileToVTKImage(file);
    e.target.value = null; // no need to keep this in the memory
    loadLabelMap(vtkImage);
    setIsProcessing(false);
  }

  const handleSliceColorChanged = (v: number, type: string) => {
    if (!editorContext) return;
    const {windowsSliceArray} = editorContext;
    if (type === "window") {
      setSliceWindowLevel(v);
    } else {
      setSliceColorLevel(v);
    }
    for (const sliceData of windowsSliceArray) {
      const property = sliceData.imageSlice.image.actor.getProperty();
      if (type === "window") {
        property.setColorWindow(v);
      } else {
        property.setColorLevel(v);
      }
      sliceData.windowSlice.renderWindow.render();
    }
  }

  return (
    <div className="flex flex-col gap-4 border-r-2 border-grey-200 p-4"
      style={{
        width: "280px"
      }}
    >
      <div>
        <p className="font-bold">3D Volume</p>
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={volume3dVisibility}
              onChange={e => setVolume3dVisibility(e.target.checked)}
            />
            <span>Show 3D volume</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={slices3dVisibility}
              onChange={e => setSlices3dVisibility(e.target.checked)}
            />
            <span>Show 3D slices</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={label3dVisibility}
              onChange={e => setLabel3dVisibility(e.target.checked)}
            />
            <span>Show 3D labels</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-bold">Tools</p>
        <div className="flex items-center gap-2 flex-wrap">
          {
            tools.map(tool => {
              return (
                <button 
                  key={tool.id}
                  className={classnames(
                    "border rounded px-4 py-1",
                    {"bg-blue-100": activeTool?.id === tool.id}
                  )}
                  onClick={() => handleToolClick(tool)}
                >
                  {tool.name}
                </button>
              )
            })
          }
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={crossHairVisibility}
            onChange={e => setCrossHairVisibility(e.target.checked)}
          />
          <span>Show crosshair</span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={autoFillBetweenSlices}
            onChange={e => setAutoFillBetweenSlices(e.target.checked)}
          />
          <span>Auto fill between</span>
        </div>
      </div>

      <div className="">
        <p className="font-bold">Labels</p>
        {
          labels.map(label => {
            return (
              <div key={label.id} className="flex items-center gap-2 my-2">
                <input 
                  type="radio" 
                  checked={activeLabel.id === label.id}
                  onChange={() => handleLabelChanged(label)}
                />
                {
                  label.id !== 0 && // 0 mean eraser
                  <Fragment>
                    <div style={{
                      width: "40px",
                      height: "20px",
                      background: label.color,
                      opacity: label.opacity,
                    }}></div>
                    <input 
                      type="range"
                      value={label.opacity}
                      min={0}
                      max={100}
                      onChange={e => handleLabelOpacityChanged(label, parseFloat(e.target.value))}
                    />
                  </Fragment>
                }
                <span>{label.name}</span>
              </div>
            )
          })
        }
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-bold">IO</p>
        <div className="flex items-center gap-1">
          <button
            className="border rounded px-4 py-1 disabled:opacity-50"
            onClick={handleSaveLabelClick}
            disabled={isProcesing}
          >
            Save labels
          </button>
          <button
            className="border rounded px-4 py-1 disabled:opacity-50"
            onClick={() => inputLoadLabelMapRef.current?.click()}
            disabled={isProcesing}
          >
            Load labels
          </button>
          <input
            ref={inputLoadLabelMapRef}
            className="hidden"
            type="file"
            onClick={(e: any) => e.target.value = null}
            onChange={handleLoadLabelMapInputChanged}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-bold">Lighting</p>
        <div className="flex items-center justify-between">
            <span>WL: {sliceWindowLevel.toFixed(1)}</span>
            <input
              type="range"
              value={sliceWindowLevel.toFixed(1)}
              min={0}
              max={1000}
              onChange={(e) => handleSliceColorChanged(parseFloat(e.target.value), "window")}
            />
        </div>
        <div className="flex items-center justify-between">
            <span>CL: {sliceColorLevel.toFixed(2)}</span>
            <input
              type="range"
              value={sliceColorLevel.toFixed(2)}
              min={0}
              max={100}
              step={0.01}
              onChange={(e) => handleSliceColorChanged(parseFloat(e.target.value), "level")}
            />
        </div>
      </div>
    </div>
  )
}