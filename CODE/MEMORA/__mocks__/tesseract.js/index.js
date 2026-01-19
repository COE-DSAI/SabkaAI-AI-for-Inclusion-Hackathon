/**
 * Mock for tesseract.js
 * Provides realistic OCR responses for testing
 */

const mockWorker = {
  recognize: jest.fn().mockImplementation(async (imageData) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Return realistic OCR result
    return {
      data: {
        text: 'Sample Document Title\nChapter 1: Introduction\nThis is sample body text content.',
        confidence: 85,
        language: 'eng',
        blocks: [
          {
            text: 'Sample Document Title',
            confidence: 92,
            bbox: { x0: 50, y0: 30, x1: 300, y1: 60 },
          },
          {
            text: 'Chapter 1: Introduction',
            confidence: 88,
            bbox: { x0: 50, y0: 100, x1: 280, y1: 130 },
          },
          {
            text: 'This is sample body text content.',
            confidence: 78,
            bbox: { x0: 50, y0: 160, x1: 350, y1: 220 },
          },
        ],
        lines: [
          {
            text: 'Sample Document Title',
            confidence: 92,
            bbox: { x0: 50, y0: 30, x1: 300, y1: 60 },
          },
          {
            text: 'Chapter 1: Introduction',
            confidence: 88,
            bbox: { x0: 50, y0: 100, x1: 280, y1: 130 },
          },
          {
            text: 'This is sample body text content.',
            confidence: 78,
            bbox: { x0: 50, y0: 160, x1: 350, y1: 220 },
          },
        ],
        words: [],
        symbols: [],
      },
    };
  }),
  terminate: jest.fn().mockResolvedValue(undefined),
  load: jest.fn().mockResolvedValue(undefined),
  loadLanguage: jest.fn().mockResolvedValue(undefined),
  initialize: jest.fn().mockResolvedValue(undefined),
  setParameters: jest.fn().mockResolvedValue(undefined),
};

const createWorker = jest.fn().mockImplementation(async (lang, oem, options) => {
  // Simulate worker initialization
  await new Promise(resolve => setTimeout(resolve, 5));
  return mockWorker;
});

module.exports = {
  createWorker,
  Worker: jest.fn(),
  default: {
    createWorker,
  },
};
