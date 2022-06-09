import macro from '@kitware/vtk.js/macros.js';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants.js';
import vtkPaintWidget from "@kitware/vtk.js/Widgets/Widgets3D/PaintWidget";
import vtkSphereHandleRepresentation from '@kitware/vtk.js/Widgets/Representations/SphereHandleRepresentation.js';
import vtkCircleContextRepresentationCustom from "./Representations/CircleContextRepresentationCustom";

function vtkPaintWidgetCustom(publicAPI, model) {
  model.classHierarchy.push('vtkPaintWidgetCustom');

  publicAPI.getRepresentationsForViewType = function (viewType) {
    switch (viewType) {
      case ViewTypes.DEFAULT:
      case ViewTypes.GEOMETRY:
      case ViewTypes.SLICE:
        return [{
          builder: vtkCircleContextRepresentationCustom,
          labels: ['handle', 'trail']
        }];

      case ViewTypes.VOLUME:
      default:
        return [{
          builder: vtkSphereHandleRepresentation,
          labels: ['handle']
        }];
    }
  }; // --- Public methods -------------------------------------------------------

} // ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkPaintWidget.extend(publicAPI, model, initialValues);

  vtkPaintWidgetCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, 'vtkPaintWidgetCustom'); // ----------------------------------------------------------------------------

var vtkPaintWidgetCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkPaintWidgetCustom$1 as default, extend, newInstance };
