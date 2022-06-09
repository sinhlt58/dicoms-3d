import macro from '@kitware/vtk.js/macros.js';
import vtkCircleContextRepresentation from '@kitware/vtk.js/Widgets/Representations/CircleContextRepresentation';

// vtkCircleContextRepresentationCustom methods
// ----------------------------------------------------------------------------

function vtkCircleContextRepresentationCustom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkCircleContextRepresentationCustom'); // --------------------------------------------------------------------------

} // ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
  activeScaleFactor: 1.0,
  dragable: false,
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues);
  
  vtkCircleContextRepresentation.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ["activeScaleFactor"]);

  vtkCircleContextRepresentationCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, 'vtkCircleContextRepresentationCustom'); // ----------------------------------------------------------------------------

var vtkCircleContextRepresentationCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkCircleContextRepresentationCustom$1 as default, extend, newInstance };
