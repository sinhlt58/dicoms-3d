import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import { readImageArrayBuffer } from 'itk-wasm';
import { useState } from 'react';
import './App.css';
import { ThreeDEditorProvider } from './components/threeD-editor.provider';
import vtkITKImageReader from '@kitware/vtk.js/IO/Misc/ITKImageReader';
import { dicomFilesToVTKImage, fileToVTKImage } from './utils/utils';

vtkITKImageReader.setReadImageArrayBufferFromITK(readImageArrayBuffer);

function App() {

  const [vtkImage, setVtkImage] = useState<vtkImageData>();

  const handleFileChanged = async (e: any) => {
    const files = e.target.files;
    const vtkImage: vtkImageData = await dicomFilesToVTKImage(files);
    setVtkImage(vtkImage);
    e.target.value = null; // no need to keep this in the memory
  }

  const handleFileNifti = async (e: any) => {
    const file: File = e.target.files[0];
    const vtkImage: vtkImageData = await fileToVTKImage(file);
    setVtkImage(vtkImage);
    e.target.value = null; // no need to keep this in the memory
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-4 border-b-2 border-gray-200 bg-gray-100">
        <input
          type="file"
          onChange={handleFileChanged}
          multiple
          onClick={(e: any) => e.target.value = null}
        />
        <input
          type="file"
          onChange={handleFileNifti}
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
