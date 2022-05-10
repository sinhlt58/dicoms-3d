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
      windowsSliceData,
    } = editorContext;
    const {genericRenderWindow, renderer, renderWindow} = windowVolume;
    genericRenderWindow.setContainer(containerRef.current as HTMLDivElement);
    genericRenderWindow.resize();

    imageVolume.mapper.setInputData(imageData);
    imageVolume.actor.setMapper(imageVolume.mapper);

    imageVolume.cfunc.applyColorMap(vtkColorMaps.getPresetByName("Cool to Warm"));
    // const range = vtkImage.getPointData().getScalars().getRange();
    imageVolume.cfunc.setMappingRange(0, 256);
    // lookupTable.setMappingRange(0, 256);
    imageVolume.cfunc.updateRange();

    for (let i=0; i<=8; i++) {
      imageVolume.ofunc.addPoint(i * 32, i / 8);
    }

    imageVolume.actor.getProperty().setRGBTransferFunction(0, imageVolume.cfunc);
    imageVolume.actor.getProperty().setScalarOpacity(0, imageVolume.ofunc);

    renderer.addVolume(imageVolume.actor);

    // add actors from slice windows
    for (const k of Object.keys(windowsSliceData)){
      const imageSlice = windowsSliceData[k].imageSlice;
      renderer.addActor(imageSlice.image.actor);
    }

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