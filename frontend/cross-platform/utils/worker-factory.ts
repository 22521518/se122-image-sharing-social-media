
/**
 * Native worker factory (Stub).
 * React Native (Hermes) does not support import.meta, and we're currently 
 * not using a native worker implementation (threading logic is handled differently or unnecessary).
 */
export const createWorker = (): Worker | null => {
  return null;
};
