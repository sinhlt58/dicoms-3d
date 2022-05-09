import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData"
import { useEffect, useRef } from "react";
import { vtkColorMaps } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider"

interface Props {
  imageData: vtkImageData,
}
export const WindowVolume = () => {

  const {editorContext} = useThreeDEditorContext();
  
  const contextRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorContext) return;

    const {
      imageData,
      painter,
      widgets,
      windowVolume,
      imageVolume,
    } = editorContext;
    const {genericRenderWindow, renderer, renderWindow} = windowVolume;
    genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
    genericRenderWindow.resize();

    imageVolume.mapper.setInputData(imageData);
    imageVolume.actor.setMapper(imageVolume.mapper);

    imageVolume.lookupTable.applyColorMap(vtkColorMaps.getPresetByName("Cool to Warm"));
    // const range = vtkImage.getPointData().getScalars().getRange();
    imageVolume.lookupTable.setMappingRange(0, 256);
    // lookupTable.setMappingRange(0, 256);
    imageVolume.lookupTable.updateRange();

    for (let i=0; i<=8; i++) {
      imageVolume.piecewiseFunc.addPoint(i * 32, i / 8);
    }

    imageVolume.actor.getProperty().setRGBTransferFunction(0, imageVolume.lookupTable);
    imageVolume.actor.getProperty().setScalarOpacity(0, imageVolume.piecewiseFunc);

    renderer.addVolume(imageVolume.actor);
    renderer.resetCamera();

    renderWindow.render();

    console.log("done init WindowVolume");

  }, [editorContext]);

  return (
    <div
      ref={containerRef}
      className="w-80 h-80 ">

    </div>
  )
}