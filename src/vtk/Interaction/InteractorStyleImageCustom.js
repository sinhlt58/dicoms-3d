import macro from '@kitware/vtk.js/macros';

import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
// vtkInteractorStyleImageCustom methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleImageCustom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleImageCustom'); // Public API methods

} // ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues); // Inheritance

  vtkInteractorStyleImage.extend(publicAPI, model, initialValues); // Create get-set macros

  vtkInteractorStyleImageCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, 'vtkInteractorStyleImageCustom'); // ----------------------------------------------------------------------------

var vtkInteractorStyleImageCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkInteractorStyleImageCustom$1 as default, extend, newInstance };
