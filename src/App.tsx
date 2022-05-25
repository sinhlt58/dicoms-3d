import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import { readImageDICOMFileSeries } from 'itk-wasm';
import { useState } from 'react';
import './App.css';
import { helper } from './helper';
import { ThreeDEditorProvider } from './components/threeD-editor.provider';

function App() {

  const [vtkImage, setVtkImage] = useState<vtkImageData>();

  const handleFileChanged = async (e: any) => {
    const files = e.target.files;
    console.log("Reading dicoms...");
    const res = await readImageDICOMFileSeries(files);
    console.log("Done reading dicoms!");
    const {image: itkImage} = res as any; 
    const vtkImage: vtkImageData = helper.convertItkToVtkImage(itkImage) as vtkImageData;
    setVtkImage(vtkImage);
    e.target.value = null; // no need to keep this in the memory
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="grid grid-cols-12">
        <div className="col-span-12 border-t border-b h-20 bg-red-50">
          <input
            type="file"
            onChange={handleFileChanged}
            multiple
            onClick={(e: any) => e.target.value = null}
          />
        </div>
      </div>
      <div className="grid grid-cols-12 h-full flex-auto ">
        <div className="col-span-12">
          {vtkImage && <ThreeDEditorProvider imageData={vtkImage} />}
        </div>
      </div>
    </div>
  );
}

export default App;
