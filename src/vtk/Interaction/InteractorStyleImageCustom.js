import macro from '@kitware/vtk.js/macros';

import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";
import vtkInteractorStyle from "@kitware/vtk.js/Rendering/Core/InteractorStyle";
// vtkInteractorStyleImageCustom methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleImageCustom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleImageCustom'); // Public API methods

  publicAPI.handleKeyPress = function (callData) {

  }

  publicAPI.handleKeyUp = function (callData) {
    console.log("handleKeyUp")
  }

  publicAPI.handleKeyDown = function (callData) {
    console.log("handleKeyDown")
  }

  publicAPI.handleStartMouseWheel = function (callData) {
    console.log("start");
  }; //--------------------------------------------------------------------------


  publicAPI.handleEndMouseWheel = function () {
    console.log("end");
  }; //--------------------------------------------------------------------------


  publicAPI.handleMouseWheel = function () {
    console.log("wheel");
  }; //----------------------------------------------------------------------------

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
