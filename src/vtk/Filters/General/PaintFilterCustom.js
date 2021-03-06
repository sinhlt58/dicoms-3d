import _slicedToArray from '@babel/runtime/helpers/slicedToArray';
import { vec3 } from 'gl-matrix';
import WebworkerPromise from 'webworker-promise';
import macro from '@kitware/vtk.js/macros';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData.js';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray.js';
import vtkPolygon from '@kitware/vtk.js/Common/DataModel/Polygon.js';
import { W as WorkerFactory } from '@kitware/vtk.js/_virtual/rollup-plugin-worker-loader__module_Sources/Filters/General/PaintFilter/PaintFilter.worker.js';

var vtkErrorMacro = macro.vtkErrorMacro; // ----------------------------------------------------------------------------
// vtkPaintFilter methods
// ----------------------------------------------------------------------------

function vtkPaintFilterCustom(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkPaintFilterCustom');
  var worker = null;
  var workerPromise = null;
  var history = {}; // --------------------------------------------------------------------------

  function resetHistory() {
    history.index = -1;
    history.snapshots = [];
    history.labels = [];
  }

  function pushToHistory(snapshot, label) {
    // Clear any "redo" info
    var spliceIndex = history.index + 1;
    var spliceLength = history.snapshots.length - history.index;
    history.snapshots.splice(spliceIndex, spliceLength);
    history.labels.splice(spliceIndex, spliceLength); // Push new snapshot

    history.snapshots.push(snapshot);
    history.labels.push(label);
    history.index++;
  } // --------------------------------------------------------------------------

  // sinhlt added
  publicAPI.clearHistory = function() {
    resetHistory();
  }

  publicAPI.startStroke = function () {
    if (model.labelMap) {
      if (!workerPromise) {
        worker = new WorkerFactory();
        workerPromise = new WebworkerPromise(worker);
      }

      workerPromise.exec('start', {
        bufferType: 'Uint8Array',
        dimensions: model.labelMap.getDimensions(),
        slicingMode: model.slicingMode
      });
    }
  }; // --------------------------------------------------------------------------


  publicAPI.endStroke = function () {
    var endStrokePromise;

    if (workerPromise) {
      endStrokePromise = workerPromise.exec('end');
      endStrokePromise.then(function (strokeBuffer) {
        publicAPI.applyBinaryMask(strokeBuffer);
        worker.terminate();
        worker = null;
        workerPromise = null;
      });
    }

    return endStrokePromise;
  };

  publicAPI.applyBinaryMask = function (maskBuffer) {
    var scalars = model.labelMap.getPointData().getScalars();
    var data = scalars.getData();
    var maskLabelMap = new Uint8Array(maskBuffer);
    var diffCount = 0;

    for (var i = 0; i < maskLabelMap.length; i++) {
      // maskLabelMap is a binary mask
      diffCount += maskLabelMap[i];
    }
    
    // Format: [ [index, oldLabel], ...]
    // I could use an ArrayBuffer, which would place limits
    // on the values of index/old, but will be more efficient.
    var snapshot = new Array(diffCount);
    var label = model.label;
    var diffIdx = 0;

    if (model.voxelFunc) {
      var bgScalars = model.backgroundImage.getPointData().getScalars();

      for (var _i = 0; _i < maskLabelMap.length; _i++) {
        if (maskLabelMap[_i]) {
          var voxel = bgScalars.getTuple(_i); // might not fill up snapshot

          if (model.voxelFunc(voxel, _i, label)) {
            snapshot[diffIdx++] = [_i, data[_i]];
            data[_i] = label;
          }
        }
      }
    } else {
      for (var _i2 = 0; _i2 < maskLabelMap.length; _i2++) {
        if (maskLabelMap[_i2]) {
          if (data[_i2] !== label) {
            snapshot[diffIdx++] = [_i2, data[_i2]];
            data[_i2] = label;
          }
        }
      }
    }

    pushToHistory(snapshot, label);
    if (model.autoFillBetweenSlices) {
      fillBetweenSnapshots(data);
    }
    scalars.setData(data);
    scalars.modified();
    model.labelMap.modified();
    publicAPI.modified();
  }; // --------------------------------------------------------------------------

  // sinhlt added
  function fillBetweenSnapshots(data) {
    if (model.slicingMode === null) return; // not support for 3D
    if (history.index < 1) return;
    const firstLabel = history.labels[history.index - 1];
    const secondLabel = history.labels[history.index];

    if (firstLabel !== secondLabel || !firstLabel || !secondLabel) return;

    const firstSnapshot = history.snapshots[history.index - 1]
    const secondSnapshot = history.snapshots[history.index];

    if (firstSnapshot.length <= 0 || secondSnapshot.length <= 0) return;

    const firstFirstPoint = firstSnapshot[0];
    const secondFirstPoint = secondSnapshot[0];

    if (!firstFirstPoint || !secondFirstPoint) return;
    const axis = model.slicingMode;

    const toIjk = (index) => {
      return model.labelMap.worldToIndex(model.labelMap.getPoint(index));
    }
    const ijkFirstFirstPoint = toIjk(firstFirstPoint[0]);
    const ijkSecondFirstPoint = toIjk(secondFirstPoint[0]);

    const firstSlice = Math.floor(ijkFirstFirstPoint[axis]);
    const secondSlice = Math.floor(ijkSecondFirstPoint[axis]);

    if (firstSlice === secondSlice) return;

    const minSLice = Math.min(firstSlice, secondSlice);
    const maxSlice = Math.max(firstSlice, secondSlice);

    for (let i=0; i<secondSnapshot.length; i++){
      if (!secondSnapshot[i] || !secondSnapshot[i][0]) continue;
      const ijkPos = toIjk(secondSnapshot[i][0]);
      // check label at pos of the first slice
      ijkPos[axis] = firstSlice; 
      const worldPos = model.labelMap.indexToWorld(ijkPos);
      const labelValue = model.labelMap.getScalarValueFromWorld(worldPos);
      // we use intersection
      if (labelValue === model.label) {
        for (let slice = minSLice + 1; slice < maxSlice; slice++) {
          ijkPos[axis] = slice;
          const index = model.labelMap.computeOffsetIndex(ijkPos);
          if (! isNaN(index)) {
            data[index] = model.label;
          }
        }
      }
    }
  }

  publicAPI.addPoint = function (point) {
    if (workerPromise) {
      var worldPt = [point[0], point[1], point[2]];
      var indexPt = [0, 0, 0];
      vec3.transformMat4(indexPt, worldPt, model.maskWorldToIndex);
      indexPt[0] = Math.round(indexPt[0]);
      indexPt[1] = Math.round(indexPt[1]);
      indexPt[2] = Math.round(indexPt[2]);
      var spacing = model.labelMap.getSpacing();
      var radius = spacing.map(function (s) {
        return model.radius / s;
      });
      workerPromise.exec('paint', {
        point: indexPt,
        radius: radius
      });
    }
  }; // --------------------------------------------------------------------------


  publicAPI.paintRectangle = function (point1, point2) {
    if (workerPromise) {
      var index1 = [0, 0, 0];
      var index2 = [0, 0, 0];
      vec3.transformMat4(index1, point1, model.maskWorldToIndex);
      vec3.transformMat4(index2, point2, model.maskWorldToIndex);
      index1[0] = Math.round(index1[0]);
      index1[1] = Math.round(index1[1]);
      index1[2] = Math.round(index1[2]);
      index2[0] = Math.round(index2[0]);
      index2[1] = Math.round(index2[1]);
      index2[2] = Math.round(index2[2]);
      workerPromise.exec('paintRectangle', {
        point1: index1,
        point2: index2
      });
    }
  }; // --------------------------------------------------------------------------


  publicAPI.paintEllipse = function (center, scale3) {
    if (workerPromise) {
      var realCenter = [0, 0, 0];
      var origin = [0, 0, 0];
      var realScale3 = [0, 0, 0];
      vec3.transformMat4(realCenter, center, model.maskWorldToIndex);
      vec3.transformMat4(origin, origin, model.maskWorldToIndex);
      vec3.transformMat4(realScale3, scale3, model.maskWorldToIndex);
      vec3.subtract(realScale3, realScale3, origin);
      realScale3 = realScale3.map(function (s) {
        return s === 0 ? 0.25 : Math.abs(s);
      });
      workerPromise.exec('paintEllipse', {
        center: realCenter,
        scale3: realScale3
      });
    }
  }; // --------------------------------------------------------------------------


  publicAPI.canUndo = function () {
    return history.index > -1;
  }; // --------------------------------------------------------------------------


  publicAPI.paintPolygon = function (pointList) {
    if (workerPromise && pointList.length > 0) {
      var polygon = vtkPolygon.newInstance();
      var poly = [];

      for (var i = 0; i < pointList.length / 3; i++) {
        poly.push([pointList[3 * i + 0], pointList[3 * i + 1], pointList[3 * i + 2]]);
      }

      polygon.setPoints(poly);

      if (!polygon.triangulate()) {
        console.log('triangulation failed!');
      }

      var points = polygon.getPointArray();
      var triangleList = new Float32Array(points.length);
      var numPoints = Math.floor(triangleList.length / 3);

      for (var _i3 = 0; _i3 < numPoints; _i3++) {
        var point = points.slice(3 * _i3, 3 * _i3 + 3);
        var voxel = triangleList.subarray(3 * _i3, 3 * _i3 + 3);
        vec3.transformMat4(voxel, point, model.maskWorldToIndex);
      }

      workerPromise.exec('paintTriangles', {
        triangleList: triangleList
      });
    }
  }; // --------------------------------------------------------------------------


  publicAPI.applyLabelMap = function (labelMap) {
    var currentMapData = model.labelMap.getPointData().getScalars().getData();
    var newMapData = labelMap.getPointData().getScalars().getData(); // Compute snapshot

    var snapshot = [];

    for (var i = 0; i < newMapData.length; ++i) {
      if (currentMapData[i] !== newMapData[i]) {
        snapshot.push([i, currentMapData[i]]);
      }
    }

    pushToHistory(snapshot, model.label);
    model.labelMap = labelMap;
    publicAPI.modified();
  }; // --------------------------------------------------------------------------


  publicAPI.undo = function () {
    if (history.index > -1) {
      var scalars = model.labelMap.getPointData().getScalars();
      var data = scalars.getData();
      var snapshot = history.snapshots[history.index];

      for (var i = 0; i < snapshot.length; i++) {
        if (!snapshot[i]) {
          break;
        }

        var _snapshot$i = _slicedToArray(snapshot[i], 2),
            index = _snapshot$i[0],
            oldLabel = _snapshot$i[1];

        data[index] = oldLabel;
      }

      history.index--;
      scalars.setData(data);
      scalars.modified();
      model.labelMap.modified();
      publicAPI.modified();
    }
  }; // --------------------------------------------------------------------------


  publicAPI.canRedo = function () {
    return history.index < history.labels.length - 1;
  }; // --------------------------------------------------------------------------


  publicAPI.redo = function () {
    if (history.index < history.labels.length - 1) {
      var scalars = model.labelMap.getPointData().getScalars();
      var data = scalars.getData();
      var redoLabel = history.labels[history.index + 1];
      var snapshot = history.snapshots[history.index + 1];

      for (var i = 0; i < snapshot.length; i++) {
        if (!snapshot[i]) {
          break;
        }

        var _snapshot$i2 = _slicedToArray(snapshot[i], 1),
            index = _snapshot$i2[0];

        data[index] = redoLabel;
      }

      history.index++;
      scalars.setData(data);
      scalars.modified();
      model.labelMap.modified();
      publicAPI.modified();
    }
  }; // --------------------------------------------------------------------------


  var superSetLabelMap = publicAPI.setLabelMap;

  publicAPI.setLabelMap = function (lm) {
    if (superSetLabelMap(lm)) {
      model.maskWorldToIndex = model.labelMap.getWorldToIndex();
      resetHistory();
      return true;
    }

    return false;
  }; // --------------------------------------------------------------------------


  publicAPI.requestData = function (inData, outData) {
    if (!model.backgroundImage) {
      vtkErrorMacro('No background image');
      return;
    }

    if (!model.backgroundImage.getPointData().getScalars()) {
      vtkErrorMacro('Background image has no scalars');
      return;
    }

    if (!model.labelMap) {
      // clone background image properties
      var labelMap = vtkImageData.newInstance(model.backgroundImage.get('spacing', 'origin', 'direction'));
      labelMap.setDimensions(model.backgroundImage.getDimensions());
      labelMap.computeTransforms(); // right now only support 256 labels

      var values = new Uint8Array(model.backgroundImage.getNumberOfPoints());
      var dataArray = vtkDataArray.newInstance({
        numberOfComponents: 1,
        // labelmap with single component
        values: values
      });
      labelMap.getPointData().setScalars(dataArray);
      publicAPI.setLabelMap(labelMap);
    }

    if (!model.maskWorldToIndex) {
      model.maskWorldToIndex = model.labelMap.getWorldToIndex();
    }

    var scalars = model.labelMap.getPointData().getScalars();

    if (!scalars) {
      vtkErrorMacro('Mask image has no scalars');
      return;
    }

    model.labelMap.modified();
    outData[0] = model.labelMap;
  }; // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------


  resetHistory();
} // ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------


var DEFAULT_VALUES = {
  backgroundImage: null,
  labelMap: null,
  maskWorldToIndex: null,
  voxelFunc: null,
  radius: 1,
  label: 0,
  slicingMode: null,
  // sinhlt added
  autoFillBetweenSlices: false 
}; // ----------------------------------------------------------------------------

function extend(publicAPI, model) {
  var initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues); // Make this a VTK object

  macro.obj(publicAPI, model); // Also make it an algorithm with no input and one output

  macro.algo(publicAPI, model, 0, 1);
  macro.setGet(publicAPI, model, ['backgroundImage', 'labelMap', 'maskWorldToIndex', 'voxelFunc', 'label', 'radius', 'slicingMode', 'autoFillBetweenSlices']); // Object specific methods

  vtkPaintFilterCustom(publicAPI, model);
} // ----------------------------------------------------------------------------

var newInstance = macro.newInstance(extend, 'vtkPaintFilterCustom'); // ----------------------------------------------------------------------------

var vtkPaintFilterCustom$1 = {
  newInstance: newInstance,
  extend: extend
};

export { vtkPaintFilterCustom$1 as default, extend, newInstance };
