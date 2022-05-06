import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import { createContext, useContext } from "react";


interface ThreeDEditorState {

}

export const ThreeDEditorContext = createContext({} as ThreeDEditorState);
export const useThreeDEditorContext = () => {
  return useContext(ThreeDEditorContext);
}

interface ThreeDEditorProviderProps {
  imageData: vtkImageData,
}
export const ThreeDEditorProvider = ({
  imageData,
}: ThreeDEditorProviderProps) => {

  

  const value: ThreeDEditorState = {

  };

  return (
    <ThreeDEditorContext.Provider value={value}>

    </ThreeDEditorContext.Provider>
  )
}