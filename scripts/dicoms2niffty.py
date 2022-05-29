from pydicom import dcmread

p = "./examples/PAT034/D0001.dcm"
p2 = "./examples/A_DICOM/A_DICOM.FIRST.dcm"
with open(p, 'rb') as f:
  ds = dcmread(f)

ds2 = dcmread(p)
# print(ds2.file_meta)
# print(ds2[0x0018, 0x5101].value)
# print(ds2[0x0020, 0x0060].value)
# print(len(ds2[0x7FE0, 0x0010].value))

# print("PixelSpacing: ", ds2[0x0028, 0x0030].value)
# print("SliceThickness: ", ds2[0x0018, 0x0050].value)
# print("SpacingBetweenSlices: ", ds2[0x0018, 0x0088].value)

# import dicom2nifti

# dicom2nifti.dicom_series_to_nifti(
#   "./examples/PAT034",
#   "./examples/PAT034.nii",
#   reorient_nifti=True,
# )

import nibabel as nib
img = nib.load("./examples/PAT034.nii")
print(img.shape)
print(img.get_data_dtype())
print(img.affine.shape)
print(img.get_fdata().shape)
print(img.get_fdata())