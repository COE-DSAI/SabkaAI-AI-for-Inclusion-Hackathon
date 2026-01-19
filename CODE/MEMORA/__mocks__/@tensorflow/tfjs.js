/**
 * Mock for @tensorflow/tfjs
 * Provides mock implementations for testing without actual TensorFlow.js
 */

const mockTensor = {
  dispose: jest.fn(),
  dataSync: jest.fn(() => new Float32Array(224 * 224 * 3).fill(0.5)),
  shape: [224, 224, 3],
  dtype: 'float32',
  expandDims: jest.fn(function() { return mockTensor4D; }),
  squeeze: jest.fn(function() { return mockTensor; }),
};

const mockTensor4D = {
  ...mockTensor,
  shape: [1, 224, 224, 3],
};

const tf = {
  ready: jest.fn(() => Promise.resolve()),
  getBackend: jest.fn(() => 'cpu'),
  setBackend: jest.fn(() => Promise.resolve(true)),
  
  tensor: jest.fn(() => mockTensor),
  tensor3d: jest.fn((data, shape) => ({
    ...mockTensor,
    shape,
  })),
  tensor4d: jest.fn((data, shape) => ({
    ...mockTensor4D,
    shape,
  })),
  
  tidy: jest.fn((fn) => fn()),
  dispose: jest.fn(),
  
  image: {
    resizeBilinear: jest.fn(() => mockTensor4D),
  },
  
  memory: jest.fn(() => ({
    numTensors: 0,
    numDataBuffers: 0,
    numBytes: 0,
    unreliable: false,
  })),
  
  env: jest.fn(() => ({
    set: jest.fn(),
    get: jest.fn(),
  })),
};

module.exports = tf;
module.exports.default = tf;
