import macro from "@kitware/vtk.js/macros";
import { vtkPaintFilter } from "../../../vtk_import";

function vtkPaintFilterCustom(publicAPI, model) {
  model.classHierarchy.push('vtkPaintFilterCustom');

  const superClass = Object.assign({}, publicAPI);

  // @Override
  publicAPI.applyBinaryMask = function (maskBuffer) {
    superClass.applyBinaryMask(maskBuffer);
  }
}

var DEFAULT_VALUES = {
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues); // Make this a VTK object

  vtkPaintFilter.extend(publicAPI, model);

  vtkPaintFilterCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, 'vtkPaintFilterCustom'); // ----------------------------------------------------------------------------

var vtkPaintFilterCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkPaintFilterCustom$1 as default, extend, newInstance };


