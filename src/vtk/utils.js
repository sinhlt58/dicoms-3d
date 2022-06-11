import { SlicingMode } from "../vtk_import";


function fitImageBoundToCamera(axis, renderer, bounds) {
  // scale camera to fit the image
  const wI = Math.abs(bounds[0] - bounds[1]);
  const wJ = Math.abs(bounds[2] - bounds[3]);
  const wK = Math.abs(bounds[4] - bounds[5]);

  let ps = renderer.getActiveCamera().getParallelScale();
  const view = renderer.getRenderWindow()?.getViews()[0];
  const dim = view.getViewportSize(renderer);
  const aspect = dim[0] / dim[1];
  let imageW = 0;
  
  switch (axis) {
    case SlicingMode.I:
      ps = wK; imageW = wJ;
      break;
    case SlicingMode.J:
      ps = wK; imageW = wI;
      break;
    case SlicingMode.K:
      ps = wJ; imageW = wI;
      break;
    default:
  }
  // check if camera width is less than image width
  // if so we scale the camera projection height to fit all the image
  const cw = ps * aspect;
  if (cw <= imageW) {
    ps *= imageW / cw;
  }
  ps /= 2;
  
  renderer.getActiveCamera().setParallelScale(ps);
}

export {
  fitImageBoundToCamera
}