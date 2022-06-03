
export enum EditorToolType {
  SEGMENT_BRUSH,
  SEGMENT_POLY,
  NAVIGATION_CROSS_HAIR,
}

export interface EditorTool {
  id: number;
  type: EditorToolType;
  name: string;
}

export interface EditorLabel {
  id: number;
  name: string;
  color: string;
  opacity: number;
  maskValue: number;
}
