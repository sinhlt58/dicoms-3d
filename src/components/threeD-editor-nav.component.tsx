import { Fragment } from "react";
import { classnames } from "../utils/utils";
import { EditorLabel, EditorTool, EditorToolType } from "./editor.models";
import { useThreeDEditorContext } from "./threeD-editor.provider"

interface Props {

}
export const ThreeDEditorNav = ({

}: Props) => {
  const {
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
  } = useThreeDEditorContext();

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

  return (
    <div className="border-r-2 border-grey-200 p-4"
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

      <div className="mt-4 flex flex-col gap-2">
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

      <div className="mt-4">
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
    </div>
  )
}