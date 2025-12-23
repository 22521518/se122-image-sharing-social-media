/**
 * Web-specific worker factory.
 * Metro bundler doesn't support import.meta.url, so we use a blob-based approach
 * or fall back to main thread processing.
 */
export const createWorker = (): Worker | null => {
  // Metro bundler doesn't support Web Workers well
  // Return null to fall back to main thread processing
  // This is safer for Expo web compatibility
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  try {
    // For Expo/Metro, we fall back to main thread processing
    // since Metro doesn't support worker bundling properly
    console.log('Web Workers not fully supported in Expo web, using main thread');
    return null;
  } catch (error) {
    console.error('Failed to create web worker:', error);
    return null;
  }
};
