/**
 * HEIC to JPEG Converter (Web Only)
 * Story 3.2: Bulk-Drop Wall for Historical Import
 * 
 * Uses heic2any library to convert HEIC/HEIF images to JPEG format.
 * This is essential for Apple device users.
 * 
 * NOTE: This module should only be dynamically imported on web platforms.
 */

// Dynamic import of heic2any (web-only)
let heic2any: any = null;

async function loadHeic2Any(): Promise<typeof heic2any> {
  if (heic2any) return heic2any;

  try {
    const module = await import('heic2any');
    heic2any = module.default || module;
    return heic2any;
  } catch (error) {
    console.error('Failed to load heic2any:', error);
    throw new Error('HEIC conversion library not available');
  }
}

export interface HeicConversionResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  error?: string;
}

/**
 * Check if a file is a HEIC/HEIF image
 */
export function isHeicFile(file: File | { name?: string; type?: string }): boolean {
  const name = file.name?.toLowerCase() || '';
  const type = (file.type || '').toLowerCase();

  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    type === 'image/heic' ||
    type === 'image/heif'
  );
}

/**
 * Convert a HEIC file to JPEG
 */
export async function convertHeicToJpeg(
  file: File | Blob,
  quality: number = 0.85
): Promise<HeicConversionResult> {
  try {
    const converter = await loadHeic2Any();

    const convertedBlob = await converter({
      blob: file,
      toType: 'image/jpeg',
      quality,
    });

    // heic2any can return a single blob or an array
    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Convert to data URL for preview
    const dataUrl = await blobToDataUrl(resultBlob);

    return {
      success: true,
      blob: resultBlob,
      dataUrl,
    };
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HEIC conversion failed',
    };
  }
}

/**
 * Convert a HEIC data URL to JPEG data URL
 */
export async function convertHeicDataUrlToJpeg(
  dataUrl: string,
  quality: number = 0.85
): Promise<HeicConversionResult> {
  try {
    // Convert data URL to blob
    const blob = await dataUrlToBlob(dataUrl);

    return await convertHeicToJpeg(blob, quality);
  } catch (error) {
    console.error('HEIC data URL conversion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HEIC conversion failed',
    };
  }
}

/**
 * Batch convert multiple HEIC files to JPEG
 */
export async function batchConvertHeic(
  files: Array<{ id: string; file: File | Blob }>,
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, HeicConversionResult>> {
  const results = new Map<string, HeicConversionResult>();

  for (let i = 0; i < files.length; i++) {
    const { id, file } = files[i];

    onProgress?.(i, files.length);

    const result = await convertHeicToJpeg(file);
    results.set(id, result);
  }

  onProgress?.(files.length, files.length);

  return results;
}

// Helper functions

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then(res => res.blob());
}

export default {
  isHeicFile,
  convertHeicToJpeg,
  convertHeicDataUrlToJpeg,
  batchConvertHeic,
};
