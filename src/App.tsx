import React, { Fragment } from 'react';
import './App.css';
import { VTKExample } from './vtk-example';
import { readImageDICOMFileSeries } from 'itk-wasm';
import { helper } from './helper';

function App() {

  const handleFileChanged = async (e: any) => {
    const files = e.target.files;
    console.log("files: ", files);
    const res = await readImageDICOMFileSeries(files);
    const {image: itkImage} = res as any; 
    console.log(itkImage)
    const vtkImage = helper.convertItkToVtkImage(itkImage);
    console.log(vtkImage);
    console.log(vtkImage.toJSON());
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="grid grid-cols-12">
        <div className="col-span-12 border-t border-b h-20 bg-red-50">
        </div>
      </div>
      <div className="grid grid-cols-12 h-full flex-auto ">
        <div className="col-span-1"></div>
        <div className="col-span-8 border-l">
          <div className="p-4 bg-slate-200"
            style={{
              width: "100%",
              height: "100%"
            }}
          >
            <VTKExample />
            {/* <div className='w-full h-full bg-slate-200'></div> */}
          </div>
        </div>
        <div className="col-span-2 border-l border-r p-4">
          <input type="file" onChange={handleFileChanged} multiple />
        </div>
        <div className="col-span-1"></div>
      </div>
    </div>
  );
}

export default App;
