
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkConeSource      from '@kitware/vtk.js/Filters/Sources/ConeSource';
import { useEffect, useRef, useState } from 'react';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkOutlineFilter from '@kitware/vtk.js/Filters/General/OutlineFilter';

export const VTKExample = () => {
  const vtkContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<any>(null);
  const [coneResolution] = useState(5);
  const [representation] = useState(2);

  useEffect(() => {
    if (!context.current && vtkContainerRef.current) {
      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      genericRenderWindow.setContainer(vtkContainerRef.current as HTMLDivElement);
      genericRenderWindow.resize();

      const coneSource = vtkConeSource.newInstance({height: 1.0});

      const filter = vtkOutlineFilter.newInstance();
      filter.setInputConnection(coneSource.getOutputPort());

      const outlineActor = vtkActor.newInstance();
      const outlineMapper = vtkMapper.newInstance();
      outlineActor.setMapper(outlineMapper);

      outlineMapper.setInputConnection(filter.getOutputPort());

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(coneSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      renderer.addActor(actor);
      renderer.addActor(outlineActor);

      renderer.resetCamera();
      renderWindow.render();

      context.current = {
        genericRenderWindow,
        renderWindow,
        renderer,
        coneSource,
        actor,
        mapper,
      }

      return () => {
        const {genericRenderWindow, coneSource, actor, mapper} = context.current;
        actor.delete();
        mapper.delete();
        coneSource.delete();
        genericRenderWindow.delete();
        context.current = null;
      }
    }
  }, [vtkContainerRef]);

  useEffect(() => {
    if (context.current) {
      const {coneSource, renderWindow} = context.current;
      coneSource.setResolution(coneResolution);
      renderWindow.render();
    }
  }, [coneResolution]);

  useEffect(() => {
    if (context.current) {
      const { actor, renderWindow } = context.current;
      actor.getProperty().setRepresentation(representation);
      renderWindow.render();
    }
  }, [representation]);

  return (
    <div className="w-1/2 h-1/2 bg-red-50" ref={vtkContainerRef}>

    </div>
  )
}