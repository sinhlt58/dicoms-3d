import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import ImageConstants from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';
import vtkAngleWidget from '@kitware/vtk.js/Widgets/Widgets3D/AngleWidget';
import vtkLabelWidget from '@kitware/vtk.js/Widgets/Widgets3D/LabelWidget';
import vtkSplineWidget from '@kitware/vtk.js/Widgets/Widgets3D/SplineWidget';

import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

export {
  vtkColorMaps,
  ImageConstants,
  vtkInteractorStyleImage,
  vtkWidgetManager,
  vtkPaintWidget,
  vtkAngleWidget,
  vtkLabelWidget,
  vtkPaintFilter,
  vtkSplineWidget,
  ViewTypes,
}