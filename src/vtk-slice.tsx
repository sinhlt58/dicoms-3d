import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData"
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import { useEffect, useRef } from "react";
import { ImageConstants, vtkInteractorStyleImage } from './vtk_import';

const {SlicingMode} = ImageConstants;

interface Props {
  image: vtkImageData,
  axis: "X" | "Y" | "Z",
}
export const VTKSliceExample = ({
  image,
  axis,
}: Props) => {

  const context = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!image || !containerRef.current) return;

    if (!context.current) {
      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
      genericRenderWindow.resize();
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      // set camera projection to parallel
      renderer.getActiveCamera().setParallelProjection(true);

      // set interactive style
      const istyle = vtkInteractorStyleImage.newInstance();
      istyle.setInteractionMode('IMAGE_SLICING');
      renderWindow.getInteractor().setInteractorStyle(istyle);

      // actor, mapper
      const mapper = vtkImageMapper.newInstance() as any;
      const actor = vtkImageSlice.newInstance() as any;

      mapper.setSliceAtFocalPoint(true);
      if (axis === "X") {
        mapper.setSlicingMode(SlicingMode.X);
      } else if (axis === "Y") {
        mapper.setSlicingMode(SlicingMode.Y);
      } else {
        mapper.setSlicingMode(SlicingMode.Z);
      }
      mapper.setInputData(image);

      actor.setMapper(mapper);
      actor.getProperty().setColorWindow(255);
      actor.getProperty().setColorLevel(127);

      renderer.addActor(actor);
      renderer.resetCamera();

      const camera = renderer.getActiveCamera();
      if (axis === "Y") {
        camera.elevation(90);
      } else if (axis === "X") {
        camera.azimuth(90);
        camera.roll(-90);
      }
      camera.zoom(1.5)

      renderWindow.render();

      context.current = {
        genericRenderWindow,
        renderer,
        renderWindow,
        actor,
        mapper,
      }
    } else {
      const {mapper, renderer, renderWindow} = context.current;
      mapper.setInputData(image);
      renderer.resetCamera();
      renderWindow.render();
    }

  }, [image, axis]);

  return (
    <div ref={containerRef} className="relative"
      style={{
        width: "46%",
        height: "46%",
      }}
    >
      <span className="absolute top-1 left-1 text-lg font-bold text-white">{axis}</span>
    </div>
  )
}