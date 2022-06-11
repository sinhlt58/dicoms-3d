import macro from "@kitware/vtk.js/macros";

import vtkInteractorStyleConstants from "@kitware/vtk.js/Rendering/Core/InteractorStyle/Constants.js";
import vtkInteractorStyleImage from "@kitware/vtk.js/Interaction/Style/InteractorStyleImage";

import {fitImageBoundToCamera} from "../utils";

const States = vtkInteractorStyleConstants.States;

// vtkInteractorStyleImageCustom methods
// ----------------------------------------------------------------------------
function vtkInteractorStyleImageCustom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push("vtkInteractorStyleImageCustom"); // Public API methods

  let sliceSumSpinY = 0;
  let cameraFirstUp = undefined;

  publicAPI.handleMouseMove = function (callData) {
    var pos = callData.position;
    var renderer = callData.pokedRenderer;

    switch (model.state) {
      case States.IS_ROTATE:
        publicAPI.handleMouseRotate(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: "InteractionEvent"
        });
        break;

      case States.IS_PAN:
        publicAPI.handleMousePan(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: "InteractionEvent"
        });
        break;

      case States.IS_DOLLY:
        publicAPI.handleMouseDolly(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: "InteractionEvent"
        });
        break;

      case States.IS_SPIN:
        publicAPI.handleMouseSpin(renderer, pos);
        publicAPI.invokeInteractionEvent({
          type: "InteractionEvent"
        });
        break;

      case States.IS_WINDOW_LEVEL:
        publicAPI.windowLevel(renderer, pos);
        break;

      default:
    }

    model.previousPosition = pos;
  }; //----------------------------------------------------------------------------


  publicAPI.handleLeftButtonPress = function (callData) {
    var pos = callData.position;
    model.previousPosition = pos;

    if (callData.shiftKey) {
      if (callData.controlKey || callData.altKey) {
        publicAPI.startDolly();
      } else {
        publicAPI.startPan();
      }

      return macro.EVENT_ABORT;
    } else if (callData.controlKey || callData.altKey) {
      if (!cameraFirstUp) {
        cameraFirstUp = model.renderer.getActiveCamera().getViewUp();
      }
      publicAPI.startSpin();

      return macro.EVENT_ABORT;
    } else {
      if (!model.enabledWindowLevel) return;
      model.windowLevelStartPosition[0] = pos.x;
      model.windowLevelStartPosition[1] = pos.y; // Get the last (the topmost) image

      const property = model.image.actor.getProperty();
      model.windowLevelInitial[0] = property.getColorWindow();
      model.windowLevelInitial[1] = property.getColorLevel();
    
      publicAPI.startWindowLevel();
    }
  }; //--------------------------------------------------------------------------

  
  publicAPI.handleLeftButtonRelease = function () {
    switch (model.state) {
      case States.IS_DOLLY:
        publicAPI.endDolly();
        break;

      case States.IS_PAN:
        publicAPI.endPan();
        break;

      case States.IS_SPIN:
        publicAPI.endSpin();
        break;

      case States.IS_ROTATE:
        publicAPI.endRotate();
        break;

      case States.IS_WINDOW_LEVEL:
        publicAPI.endWindowLevel();
        break;

      default:
    }
  }; //----------------------------------------------------------------------------
  

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
        fitImageBoundToCamera(model.axis, model.renderer, bounds);
        rwi.render();
        break;
      default:
    }
  }

  publicAPI.handleKeyDown = function (callData) {
  }

  publicAPI.handleKeyUp = function (callData) {
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
    return macro.EVENT_ABORT;
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
      default:
    }
    return macro.EVENT_ABORT;
  }; //--------------------------------------------------------------------------


  publicAPI.handleMouseWheel = function (callData) {
    if (!model.enabled || !model.enabledSlice || !model.image) return;
    const spinY = callData.spinY;
    
    switch (model.state) {
      case States.IS_SLICE:
        sliceSumSpinY += Math.abs(spinY);
        const rate = 1.2;
        if (sliceSumSpinY < rate) break;
        let slice = model.image.mapper.getSlice();
        const direction = spinY > 0 ? 1 : spinY < 0 ? -1 : 0;
        slice += direction * Math.floor(sliceSumSpinY / rate);
        // clamp slice
        if (slice < model.minSlice) slice = model.minSlice;
        if (slice > model.maxSlice) slice = model.maxSlice;
        model.image.mapper.setSlice(slice);
        sliceSumSpinY = 0;
        publicAPI.invokeInteractionEvent({
          type: "Slice",
          slice,
        });
        break;
      case States.IS_DOLLY:
        var dyf = 1 - spinY / model.zoomFactor;
        publicAPI.dollyByFactor(model.renderer, dyf);
        break;
      default:
    }
    return macro.EVENT_ABORT;
  }; //----------------------------------------------------------------------------

  publicAPI.windowLevel = function (renderer, position) {
    if (!model.enabledWindowLevel) {
      publicAPI.endWindowLevel();
      return;
    }

    model.windowLevelCurrentPosition[0] = position.x;
    model.windowLevelCurrentPosition[1] = position.y;
    var rwi = model._interactor;

    const property = model.image.actor.getProperty();
    var size = rwi.getView().getViewportSize(renderer);
    var mWindow = model.windowLevelInitial[0];
    var level = model.windowLevelInitial[1]; // Compute normalized delta

    var dx = (model.windowLevelCurrentPosition[0] - model.windowLevelStartPosition[0]) * 4.0 / size[0];
    var dy = (model.windowLevelStartPosition[1] - model.windowLevelCurrentPosition[1]) * 4.0 / size[1]; // Scale by current values

    if (Math.abs(mWindow) > 0.01) {
      dx *= mWindow;
    } else {
      dx *= mWindow < 0 ? -0.01 : 0.01;
    }

    if (Math.abs(level) > 0.01) {
      dy *= level;
    } else {
      dy *= level < 0 ? -0.01 : 0.01;
    } // Abs so that direction does not flip


    if (mWindow < 0.0) {
      dx *= -1;
    }

    if (level < 0.0) {
      dy *= -1;
    } // Compute new mWindow level


    var newWindow = dx + mWindow;
    var newLevel = level - dy;

    if (newWindow < 0.01) {
      newWindow = 0.01;
    }

    property.setColorWindow(newWindow);
    property.setColorLevel(newLevel);

    publicAPI.invokeInteractionEvent({
      type: "WindowLevel",
      newWindow,
      newLevel,
    });
  }; //----------------------------------------------------------------------------

} // ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
  axis: null,
  image: null,
  renderer: null,
  widgetManager: null,
  isWindowActive: false,
  enabledWindowLevel: true,
  enabledSlice: true,
  minSlice: 0,
  maxSlice: 0,
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues); // Inheritance

  vtkInteractorStyleImage.extend(publicAPI, model, initialValues); // Create get-set macros

  macro.setGet(publicAPI, model, ["isWindowActive", "enabledWindowLevel", "enabledSlice", "minSlice", "maxSlice"]);

  vtkInteractorStyleImageCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, "vtkInteractorStyleImageCustom"); // ----------------------------------------------------------------------------

var vtkInteractorStyleImageCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkInteractorStyleImageCustom$1 as default, extend, newInstance };
