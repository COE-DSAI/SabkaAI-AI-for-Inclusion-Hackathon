/**
 * Mock for @tensorflow-models/mobilenet
 * Provides mock implementation of MobileNet image classification
 */

const mockPredictions = [
  { className: 'golden retriever, golden retriever dog', probability: 0.85 },
  { className: 'Labrador retriever, Labrador', probability: 0.08 },
  { className: 'cocker spaniel, English cocker spaniel', probability: 0.03 },
  { className: 'tennis ball', probability: 0.02 },
  { className: 'grass, lawn', probability: 0.01 },
];

const mockModel = {
  classify: jest.fn((tensor, topK = 5) => {
    return Promise.resolve(mockPredictions.slice(0, topK));
  }),
  infer: jest.fn(() => ({
    dispose: jest.fn(),
    dataSync: jest.fn(() => new Float32Array(1000).fill(0.001)),
  })),
};

const mobilenet = {
  load: jest.fn((options) => {
    return Promise.resolve(mockModel);
  }),
};

// Also export mock predictions for test assertions
mobilenet.__mockPredictions = mockPredictions;
mobilenet.__mockModel = mockModel;

module.exports = mobilenet;
