
import '@kitware/vtk.js/Rendering/Profiles/All';
import { readImageDICOMFileSeries } from 'itk-wasm';
import { helper } from './helper';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import { vtkAngleWidget, vtkColorMaps, vtkLabelWidget, vtkPaintFilter, vtkPaintWidget, vtkWidgetManager } from './vtk_import';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import { useEffect, useRef, useState } from 'react';
import { VTKSliceExample } from './vtk-slice';

interface Props {
  image: vtkImageData,
}
export const VTKVolumeExample = ({
  image,
}: Props) => {

  const vtkContainer3DRef = useRef<HTMLDivElement>(null);
  const context3D = useRef<any>();

  const painterW = useRef<vtkPaintWidget>();

  useEffect(() => {
    if (!vtkContainer3DRef.current || !image) return;
    if (!painterW.current) {
      painterW.current = vtkPaintWidget.newInstance();
    }
    if (!context3D.current) {
      const genericRenderWindow = vtkGenericRenderWindow.newInstance();
      genericRenderWindow.setContainer(vtkContainer3DRef.current as HTMLDivElement);
      genericRenderWindow.resize();
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      // widgets
      const widgetManager = vtkWidgetManager.newInstance();
      widgetManager.setRenderer(renderer);
      const paintHandler = widgetManager.addWidget(painterW.current);
      const painter = vtkPaintFilter.newInstance();

      const mapper = vtkVolumeMapper.newInstance();
      const actor = vtkVolume.newInstance();
      mapper.setInputData(image);
      actor.setMapper(mapper);

      painter.setRadius(5);
      painterW.current.setRadius(5);
      mapper.setInputConnection(painter.getOutputPort(), 1);

      // color opacity
      const lookupTable = vtkColorTransferFunction.newInstance();
      const piecewiseFunc = vtkPiecewiseFunction.newInstance();

      lookupTable.applyColorMap(vtkColorMaps.getPresetByName("Cool to Warm"));
      // const range = vtkImage.getPointData().getScalars().getRange();
      lookupTable.setMappingRange(0, 256);
      // lookupTable.setMappingRange(0, 256);
      lookupTable.updateRange();

      for (let i=0; i<=8; i++) {
        piecewiseFunc.addPoint(i * 32, i / 8);
      }

      actor.getProperty().setRGBTransferFunction(0, lookupTable);
      actor.getProperty().setScalarOpacity(0, piecewiseFunc);

      renderer.addVolume(actor);

      renderer.resetCamera();

      const camera = renderer.getActiveCamera();
      console.log("actor pos: ", actor.getPosition())
      console.log("focal: ", camera.getFocalPoint())
      
    
      console.log("position: ", camera.getPosition())

      renderWindow.render();
      widgetManager.enablePicking();
      console.log("Done render")

      context3D.current = {
        genericRenderWindow,
        renderer,
        renderWindow,
        volumeActor: actor,
        volumeMapper: mapper,
        widgetManager,
      }
    } else {
      const {volumeMapper, renderer, renderWindow} = context3D.current;
      volumeMapper.setInputData(image);
      renderer.resetCamera();
      renderWindow.render();
    }
    
  }, [vtkContainer3DRef, image]);

  return (
    <div className="h-full w-full flex gap-1 flex-wrap">
      <div
        ref={vtkContainer3DRef}
        className="border rounded"
        style={{
          width: "46%",
          height: "46%",
        }}
      ></div>
      { image && <VTKSliceExample image={image} axis="X" />}
      { image && <VTKSliceExample image={image} axis="Y" />}
      { image && <VTKSliceExample image={image} axis="Z" />}
    </div>
  )
}