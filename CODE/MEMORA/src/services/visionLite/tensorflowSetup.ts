/**
 * Memora Vision Lite v0.5
 * TensorFlow.js Setup and Initialization
 * 
 * Handles TensorFlow.js initialization for Expo/React Native.
 * Uses pure JavaScript backend (CPU) for Expo Go compatibility.
 */

import * as tf from '@tensorflow/tfjs';
// Note: We use pure JS TensorFlow.js for Expo Go compatibility
// The native bindings (@tensorflow/tfjs-react-native) require native modules
import * as FileSystem from 'expo-file-system';
import * as jpeg from 'jpeg-js';

// Initialization state
let tfReady = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Setup fetch for TensorFlow.js model loading in React Native
 * TensorFlow.js models need to download weights from TensorFlow Hub
 */
function setupFetchForTensorFlow(): void {
  // Ensure global fetch is available (should be in React Native)
  if (typeof global.fetch === 'undefined') {
    console.warn('[TensorFlow.js] global.fetch not available');
    return;
  }
  
  // TensorFlow.js sometimes uses fetch from different scope
  // Make sure it's available on window for compatibility
  if (typeof window !== 'undefined' && typeof window.fetch === 'undefined') {
    (window as any).fetch = global.fetch;
  }
  
  console.log('[TensorFlow.js] Fetch setup complete');
}

/**
 * Initialize TensorFlow.js with CPU backend
 * Compatible with Expo Go managed workflow
 */
export async function initializeTensorFlow(): Promise<boolean> {
  // Return existing promise if already initializing
  if (initPromise) {
    return initPromise;
  }

  // Return immediately if already ready
  if (tfReady) {
    return true;
  }

  initPromise = (async () => {
    try {
      // Setup fetch before TensorFlow initialization
      setupFetchForTensorFlow();
      
      // Set CPU backend explicitly for Expo Go compatibility
      await tf.setBackend('cpu');
      
      // Wait for TensorFlow.js to be ready
      await tf.ready();
      
      // Verify backend is set up
      const backend = tf.getBackend();
      console.log(`[TensorFlow.js] Initialized with backend: ${backend}`);
      
      tfReady = true;
      return true;
    } catch (error) {
      console.error('[TensorFlow.js] Initialization failed:', error);
      tfReady = false;
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Check if TensorFlow.js is ready
 */
export function isTensorFlowReady(): boolean {
  return tfReady;
}

/**
 * Convert image URI to tensor for model input
 * 
 * @param imageUri - File URI of the image
 * @returns 3D tensor [height, width, 3] normalized to [0, 1]
 */
export async function imageUriToTensor(imageUri: string): Promise<tf.Tensor3D> {
  try {
    // Read the image file as base64
    const base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Decode base64 to buffer
    const rawImageData = Buffer.from(base64Data, 'base64');
    
    // Decode JPEG
    const { width, height, data } = jpeg.decode(rawImageData, { useTArray: true });

    // Convert to tensor - data is RGBA, we need RGB
    const numPixels = width * height;
    const rgbValues = new Float32Array(numPixels * 3);

    for (let i = 0; i < numPixels; i++) {
      const rgbaOffset = i * 4;
      const rgbOffset = i * 3;
      
      // Normalize to [0, 1]
      rgbValues[rgbOffset] = data[rgbaOffset] / 255;       // R
      rgbValues[rgbOffset + 1] = data[rgbaOffset + 1] / 255; // G
      rgbValues[rgbOffset + 2] = data[rgbaOffset + 2] / 255; // B
    }

    // Create tensor
    const tensor = tf.tensor3d(rgbValues, [height, width, 3]);
    
    return tensor;
  } catch (error) {
    console.error('[TensorFlow.js] Error converting image to tensor:', error);
    throw error;
  }
}

/**
 * Convert base64 image data to tensor
 * 
 * @param base64Data - Base64 encoded image data
 * @returns 3D tensor [height, width, 3] normalized to [0, 1]
 */
export function base64ToTensor(base64Data: string): tf.Tensor3D {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // Decode base64 to buffer
    const rawImageData = Buffer.from(cleanBase64, 'base64');
    
    // Decode JPEG/PNG
    const { width, height, data } = jpeg.decode(rawImageData, { useTArray: true });

    // Convert to tensor
    const numPixels = width * height;
    const rgbValues = new Float32Array(numPixels * 3);

    for (let i = 0; i < numPixels; i++) {
      const rgbaOffset = i * 4;
      const rgbOffset = i * 3;
      
      rgbValues[rgbOffset] = data[rgbaOffset] / 255;
      rgbValues[rgbOffset + 1] = data[rgbaOffset + 1] / 255;
      rgbValues[rgbOffset + 2] = data[rgbaOffset + 2] / 255;
    }

    return tf.tensor3d(rgbValues, [height, width, 3]);
  } catch (error) {
    console.error('[TensorFlow.js] Error converting base64 to tensor:', error);
    throw error;
  }
}

/**
 * Resize tensor to target size for model input
 * 
 * @param tensor - Input tensor
 * @param targetSize - Target size (square)
 * @returns Resized tensor [targetSize, targetSize, 3]
 */
export function resizeTensor(tensor: tf.Tensor3D, targetSize: number): tf.Tensor3D {
  return tf.tidy(() => {
    // Add batch dimension, resize, then remove batch dimension
    const batched = tensor.expandDims(0) as tf.Tensor4D;
    const resized = tf.image.resizeBilinear(batched, [targetSize, targetSize]);
    return resized.squeeze([0]) as tf.Tensor3D;
  });
}

/**
 * Clean up tensors to prevent memory leaks
 */
export function disposeTensor(tensor: tf.Tensor | tf.Tensor[]): void {
  if (Array.isArray(tensor)) {
    tensor.forEach(t => t.dispose());
  } else {
    tensor.dispose();
  }
}

/**
 * Get memory info for debugging
 */
export function getMemoryInfo(): tf.MemoryInfo {
  return tf.memory();
}

// Export TensorFlow for direct use if needed
export { tf };
