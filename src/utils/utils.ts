import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import { readImageArrayBuffer, readImageDICOMFileSeries } from "itk-wasm";
import { itkHelper } from "../itk_import";

export type CSSClass = string | { [key: string]: boolean };
export function classnames(...cssClasses: CSSClass[]): string {
  let classes = [];
  for (let cssClass of cssClasses) {
    if (typeof cssClass === "string") {
      classes.push(cssClass);
    } else {
      for (let key of Object.keys(cssClass)) {
        if (cssClass[key]) {
          classes.push(key);
        }
      }
    }
  }
  return classes.join(" ");
}

export function hexToRgb(hex: string, normalize = true) {
  hex = hex.replace("#", "");
  const bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  if (normalize) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
  }
  return [r, g, b];
}

export function downloadBlob(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a"); // Or maybe get it from the current document
  link.href = blobUrl;
  link.download = fileName;
  link.click();
}

export async function dicomFilesToVTKImage(files: File[]) {
  const res = await readImageDICOMFileSeries(files);
  const {image: itkImage} = res as any; 
  const vtkImage: vtkImageData = itkHelper.convertItkToVtkImage(itkImage) as vtkImageData;
  return vtkImage;
}

export async function fileToVTKImage(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const {image: itkImage} = await readImageArrayBuffer(null, arrayBuffer, file.name, "");
  const vtkImage: vtkImageData = itkHelper.convertItkToVtkImage(itkImage) as vtkImageData;
  return vtkImage;
}
