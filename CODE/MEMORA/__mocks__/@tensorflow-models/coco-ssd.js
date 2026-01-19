/**
 * Mock for @tensorflow-models/coco-ssd
 * Provides mock implementation of COCO-SSD object detection
 */

const mockDetections = [
  {
    class: 'person',
    score: 0.92,
    bbox: [100, 50, 200, 400], // [x, y, width, height]
  },
  {
    class: 'dog',
    score: 0.87,
    bbox: [300, 200, 150, 180],
  },
  {
    class: 'chair',
    score: 0.65,
    bbox: [450, 100, 100, 200],
  },
];

const mockModel = {
  detect: jest.fn((tensor, maxNumBoxes = 20, minScore = 0.5) => {
    // Filter by minScore
    const filtered = mockDetections.filter(d => d.score >= minScore);
    return Promise.resolve(filtered.slice(0, maxNumBoxes));
  }),
};

const cocoSsd = {
  load: jest.fn((config) => {
    return Promise.resolve(mockModel);
  }),
};

// Also export mock detections for test assertions
cocoSsd.__mockDetections = mockDetections;
cocoSsd.__mockModel = mockModel;

module.exports = cocoSsd;
