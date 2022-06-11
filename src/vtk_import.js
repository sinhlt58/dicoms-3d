import vtkColorMaps from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps";
import ImageConstants from "@kitware/vtk.js/Rendering/Core/ImageMapper/Constants";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkInteractorStyleImageCustom from "./vtk/Interaction/InteractorStyleImageCustom";

import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";
import vtkPaintWidget from "@kitware/vtk.js/Widgets/Widgets3D/PaintWidget";
import vtkPaintWidgetCustom from "./vtk/Widgets/Widgets3D/PaintWidgetCustom";
import vtkAngleWidget from "@kitware/vtk.js/Widgets/Widgets3D/AngleWidget";
import vtkLabelWidget from "@kitware/vtk.js/Widgets/Widgets3D/LabelWidget";
import vtkSplineWidget from "@kitware/vtk.js/Widgets/Widgets3D/SplineWidget";
import vtkResliceCursorWidget from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget";
import * as resliceCursorHelpers from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/helpers";
import {xyzToViewType} from "@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants";

import vtkPaintFilter from "@kitware/vtk.js/Filters/General/PaintFilter";
import vtkPaintFilterCustom from "./vtk/Filters/General/PaintFilterCustom";
import { ViewTypes, CaptureOn } from "@kitware/vtk.js/Widgets/Core/WidgetManager/Constants";

import {fitImageBoundToCamera} from "./vtk/utils";

const {SlicingMode} = ImageConstants;

export {
  vtkColorMaps,
  ImageConstants,
  vtkInteractorStyleImage,
  vtkInteractorStyleImageCustom,
  vtkWidgetManager,
  vtkPaintWidget,
  vtkPaintWidgetCustom,
  vtkAngleWidget,
  vtkLabelWidget,
  vtkPaintFilter,
  vtkPaintFilterCustom,
  vtkSplineWidget,
  vtkResliceCursorWidget,
  resliceCursorHelpers,
  xyzToViewType,
  ViewTypes,
  CaptureOn,
  SlicingMode,
  fitImageBoundToCamera,
}