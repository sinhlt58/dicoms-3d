export interface EditorLabel {
  id: number;
  name: string;
  color: string;
  opacity: number;
  maskValue: number;
  keyBind: string;
}

export enum EditorToolType {
  SEGMENT_BRUSH,
  SEGMENT_POLY,
  NAVIGATION_CROSS_HAIR,
}

export interface EditorTool {
  id: number;
  type: EditorToolType;
  name: string;
  keyBind: string;
}

export const TOOL_NAVIGATION_CROSS_HAIR = {
  id: 0, 
  name: "Cross",
  type: EditorToolType.NAVIGATION_CROSS_HAIR,
  keyBind: "c",
};
export const TOOL_SEGMENT_BRUSH= {
  id: 1, 
  name: "Brush",
  type: EditorToolType.SEGMENT_BRUSH,
  keyBind: "b",
};
export const TOOL_SEGMENT_POLY = {
  id: 2, 
  name: "Poly",
  type: EditorToolType.SEGMENT_POLY,
  keyBind: "p",
};

export const EDITOR_TOOLS: EditorTool[] = [
  TOOL_NAVIGATION_CROSS_HAIR,
  TOOL_SEGMENT_BRUSH,
  TOOL_SEGMENT_POLY,
];