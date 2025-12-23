/**
 * Worker factory for cross-platform Web Worker support.
 * Web: Uses new Worker() with proper URL
 * Native: Returns null (workers not supported in React Native/Hermes)
 */
export const createWorker = (): Worker | null => {
  // Only create worker on web platform
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      // Use require() instead of import.meta to avoid bundler issues
      // The worker file will be bundled by Vite/Metro
      const workerUrl = new URL('../utils/file-processor.worker.ts', window.location.href);
      return new Worker(workerUrl, { type: 'module' });
    } catch (error) {
      console.error('Failed to create web worker:', error);
      return null;
    }
  }

  // Return null for React Native (workers not supported)
  return null;
};
