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
  let cameraFirstUp = undefined;

  publicAPI.handleMouseMove = function (callData) {
    var pos = callData.position;
    var renderer = callData.pokedRenderer;

    switch (model.state) {
      case States.IS_ROTATE:
        publicAPI.handleMouseRotate(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: 'InteractionEvent'
        });
        break;

      case States.IS_PAN:
        publicAPI.handleMousePan(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: 'InteractionEvent'
        });
        break;

      case States.IS_DOLLY:
        publicAPI.handleMouseDolly(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: 'InteractionEvent'
        });
        break;

      case States.IS_SPIN:
        publicAPI.handleMouseSpin(renderer, pos);
        console.log("Spin")
        publicAPI.invokeInteractionEvent({
          type: 'InteractionEvent'
        });
        break;
    }

    model.previousPosition = pos;
  };

  publicAPI.handleLeftButtonPress = function (callData) {
    var pos = callData.position;
    model.previousPosition = pos;

    if (callData.shiftKey) {
      if (callData.controlKey || callData.altKey) {
        publicAPI.startDolly();
      } else {
        publicAPI.startPan();
      }
    } else {
      if (callData.controlKey || callData.altKey) {
        if (!cameraFirstUp) {
          cameraFirstUp = model.renderer.getActiveCamera().getViewUp();
        }
        publicAPI.startSpin();
      }
    }
  }; //--------------------------------------------------------------------------

  publicAPI.handleKeyPress = function (callData) {
    if (!model.isWindowActive) return;
    var rwi = model._interactor;
    switch(callData.key) {
      case "R":
      case "r":
        if (cameraFirstUp) {
          model.renderer.getActiveCamera().setViewUp(cameraFirstUp);
        }
        const bounds = model.image.actor.getBounds();
        model.renderer.resetCamera(bounds);
        rwi.render();
        break;
    }
  }

  publicAPI.handleKeyUp = function (callData) {
    console.log("handleKeyUp")
  }

  publicAPI.handleKeyDown = function (callData) {
    console.log("handleKeyDown")
  }

  publicAPI.handleStartMouseWheel = function (callData) {
    if (!model.enabled || !model.enabledSlice) return;

    if (callData.shiftKey) {
      publicAPI.startDolly();
      publicAPI.handleMouseWheel(callData);
    } else if (model.enabledSlice) {
      publicAPI.startSlice();
      sliceSumSpinY = 0;
      publicAPI.handleMouseWheel(callData);
    }
  }; //--------------------------------------------------------------------------


  publicAPI.handleEndMouseWheel = function (callData) {
    if (!model.enabled || !model.enabledSlice) return;

    switch (model.state) {
      case States.IS_SLICE:
        publicAPI.endSlice();
        break;
      case States.IS_DOLLY:
        publicAPI.endDolly();
        break;
    }
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
      case States.IS_DOLLY:
        var dyf = 1 - spinY / model.zoomFactor;
        publicAPI.dollyByFactor(model.renderer, dyf);
        break;
    }
  }; //----------------------------------------------------------------------------

} // ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
  image: null,
  renderer: null,
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
