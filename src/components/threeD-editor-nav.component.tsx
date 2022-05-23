import { classnames } from "../utils/utils";
import { EditorLabel, EditorTool, EditorToolType } from "./editor.models";
import { useThreeDEditorContext } from "./threeD-editor.provider"

interface Props {

}
export const ThreeDEditorNav = ({

}: Props) => {
  const {
    activeTool,
    setActiveTool,
    activeLabel,
    setActiveLabel,
    labels,
    setLabels,
  } = useThreeDEditorContext();

  const tools: EditorTool[] = [
    {
      id: 0,
      name: "Brush",
      type: EditorToolType.SEGMENT_BRUSH,
    },
    {
      id: 1,
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
    if (activeLabel?.id === label.id) {
      setActiveLabel(undefined);
    } else {
      setActiveLabel(label);
    }
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
    <div className="w-80 h-full border-r border-blue-200 p-2">
      <div>
        <p className="font-bold">Segment tools</p>
        <div className="flex items-center gap-2 flex-wrap mt-2">
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
      </div>

      <div className="mt-4">
        <p className="font-bold">Labels</p>
        {
          labels.map(label => {
            return (
              <div key={label.id} className="flex items-center gap-2 my-4">
                <input 
                  type="checkbox" 
                  checked={activeLabel?.id === label.id}
                  onChange={() => handleLabelChanged(label)}
                />
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
                <span>{label.name}</span>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}