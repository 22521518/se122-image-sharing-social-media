
/**
 * Web-specific worker factory.
 * Uses import.meta.url to resolve the worker file path correctly in bundlers (Vite/Webpack).
 */
export const createWorker = (): Worker | null => {
  try {
    return new Worker(new URL('./file-processor.worker.ts', import.meta.url));
  } catch (error) {
    console.error('Failed to create web worker:', error);
    return null;
  }
};
