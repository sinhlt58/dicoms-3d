import macro from '@kitware/vtk.js/macros';

import vtkInteractorStyleConstants from '@kitware/vtk.js/Rendering/Core/InteractorStyle/Constants.js';
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";

const States = vtkInteractorStyleConstants.States;

// vtkInteractorStyleImageCustom methods
// ----------------------------------------------------------------------------
function vtkInteractorStyleImageCustom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleImageCustom'); // Public API methods

  let sliceSumSpinY = 0;

  publicAPI.handleKeyPress = function (callData) {

  }

  publicAPI.handleKeyUp = function (callData) {
    console.log("handleKeyUp")
  }

  publicAPI.handleKeyDown = function (callData) {
    console.log("handleKeyDown")
  }

  publicAPI.handleStartMouseWheel = function (callData) {
    if (!model.enabled || !model.enabledSlice) return;
    publicAPI.startSlice();
    sliceSumSpinY = 0;
    publicAPI.handleMouseWheel(callData);
  }; //--------------------------------------------------------------------------


  publicAPI.handleEndMouseWheel = function (callData) {
    if (!model.enabled || !model.enabledSlice) return;
    publicAPI.endSlice();
  }; //--------------------------------------------------------------------------


  publicAPI.handleMouseWheel = function (callData) {
    if (!model.enabled || !model.enabledSlice || !model.image) return;
    const spinY = callData.spinY;

    switch (model.state) {
      case States.IS_SLICE:
        sliceSumSpinY += Math.abs(spinY);
        if (sliceSumSpinY < 1.2) return;
        let slice = model.image.mapper.getSlice();
        const delta = spinY >= 0 ? 1 : spinY < 0 ? -1 : 0;
        slice += delta;
        // clamp slice
        if (slice < model.minSlice) slice = model.minSlice;
        if (slice > model.maxSlice) slice = model.maxSlice;
        model.image.mapper.setSlice(slice);
        sliceSumSpinY = 0;
        break;
    }
  }; //----------------------------------------------------------------------------

} // ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
  image: null,
  widgetManager: null,
  isWindowActive: false,
  enabledSlice: true,
  minSlice: 0,
  maxSlice: 0,
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues); // Inheritance

  vtkInteractorStyleImage.extend(publicAPI, model, initialValues); // Create get-set macros

  macro.setGet(publicAPI, model, ["isWindowActive", "enabledSlice", "minSlice", "maxSlice"]);

  vtkInteractorStyleImageCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, 'vtkInteractorStyleImageCustom'); // ----------------------------------------------------------------------------

var vtkInteractorStyleImageCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkInteractorStyleImageCustom$1 as default, extend, newInstance };
