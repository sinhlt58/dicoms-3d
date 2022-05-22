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
                <span>{label.name}</span>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}