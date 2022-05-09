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
        <div className="col-span-2"></div>
        <div className="col-span-10 border-l">
          <div className="p-1"
            style={{
              width: "100%",
              height: "100%"
            }}
          >
            {vtkImage && <ThreeDEditorProvider imageData={vtkImage} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
