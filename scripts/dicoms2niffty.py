from pydicom import dcmread
import dicom2nifti
import nibabel as nib


# ds = dcmread("./examples/breast/1.dcm")
ds = dcmread("./examples/PAT033/D0001.dcm")
# print(ds.file_meta)
# print(ds[0x0018, 0x5101].value)
# print(ds[0x0020, 0x0060].value)

print("Pixel per row: ", ds[0x0028, 0x0010])
print("Pixel per column: ", ds[0x0028, 0x0011])
# print("Space bewteen slice: ", ds[0x0018, 0x0088])

# print("PixelSpacing: ", ds[0x0028, 0x0030].value)
# print("SliceThickness: ", ds[0x0018, 0x0050].value)
# print("SpacingBetweenSlices: ", ds[0x0018, 0x0088].value)

# dicom2nifti.dicom_series_to_nifti(
#   "./examples/PAT033",
#   "./examples/PAT033.nii",
#   reorient_nifti=True,
# )

img = nib.load("./examples/PAT033.nii")
print(img.shape)
print(img.get_data_dtype())
print(img.get_fdata().shape)