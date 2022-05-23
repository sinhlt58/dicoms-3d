import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData"
import { useEffect, useRef } from "react";
import { vtkColorMaps } from "../vtk_import";
import { useThreeDEditorContext } from "./threeD-editor.provider"
import { hexToRgb } from '../utils/utils';

interface Props {
  imageData: vtkImageData,
}
export const WindowVolume = () => {

  const {
    editorContext,
    renderAllWindows,
    labels,
  } = useThreeDEditorContext();
  
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
      labelFilterVolume,
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

    // set up filter label map
    labelFilterVolume.mapper.setInputConnection(painter.getOutputPort());
    labelFilterVolume.actor.setMapper(labelFilterVolume.mapper);
    labelFilterVolume.actor.getProperty().setRGBTransferFunction(0, labelFilterVolume.cfunc);
    labelFilterVolume.actor.getProperty().setScalarOpacity(0, labelFilterVolume.ofunc);
    
    renderer.addVolume(labelFilterVolume.actor);

    // renderer.addVolume(imageVolume.actor);

    // add actors from slice windows
    for (const k of Object.keys(windowsSliceData)){
      const imageSlice = windowsSliceData[k].imageSlice;
      // renderer.addActor(imageSlice.image.actor);
      // renderer.addActor(imageSlice.labelMap.actor);
    }

    renderer.resetCamera();

    renderWindow.render();

    console.log("done init WindowVolume");

  }, [editorContext]);

  useEffect(() => {
    if (!editorContext) return;
    const {
      windowVolume,
      labelFilterVolume,
    } = editorContext;

    labelFilterVolume.ofunc.addPoint(0, 0);
    for (const label of labels) {
      const rgb = hexToRgb(label.color);
      labelFilterVolume.cfunc.addRGBPoint(label.maskValue, rgb[0], rgb[1], rgb[2]);
      labelFilterVolume.ofunc.addPoint(label.maskValue, label.opacity / 100);
    }
    windowVolume.renderWindow.render();
  }, [labels, editorContext]);

  return (
    <div
      ref={containerRef}
      className="w-80 h-80 ">

    </div>
  )
}