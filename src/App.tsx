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
    <div className="flex flex-col h-full">
      <div className="flex p-4 border-b-2 border-gray-200 bg-gray-100">
        <input
          type="file"
          onChange={handleFileChanged}
          multiple
          onClick={(e: any) => e.target.value = null}
        />
      </div>
      <div className='w-full flex-auto'>
        {vtkImage && <ThreeDEditorProvider imageData={vtkImage} />}
      </div>
    </div>
  );
}

export default App;
