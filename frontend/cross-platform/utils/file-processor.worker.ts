/**
 * File Processor Web Worker
 * Story 3.2: Bulk-Drop Wall for Historical Import
 * 
 * Handles heavy file processing tasks off the main thread:
 * - EXIF data extraction (location, timestamp)
 * - Hash calculation for duplicate detection
 * - HEIC to JPEG conversion (via heic2any)
 */

// Types for worker communication
export interface FileProcessingRequest {
  type: 'process';
  files: ProcessableFile[];
}

export interface ProcessableFile {
  id: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ProcessedFileResult {
  id: string;
  success: boolean;
  exif: ExifResult | null;
  hash: string | null;
  convertedDataUrl?: string; // For HEIC conversion
  error?: string;
}

export interface ExifResult {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  hasLocation: boolean;
}

export interface WorkerProgressMessage {
  type: 'progress';
  processed: number;
  total: number;
  currentFile: string;
}

export interface WorkerCompleteMessage {
  type: 'complete';
  results: ProcessedFileResult[];
}

export interface WorkerErrorMessage {
  type: 'error';
  error: string;
}

export type WorkerMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerErrorMessage;

// EXIF extraction from ArrayBuffer
async function extractExifFromArrayBuffer(buffer: ArrayBuffer): Promise<ExifResult | null> {
  try {
    const view = new DataView(buffer);

    // Check for JPEG magic bytes
    if (view.getUint16(0) !== 0xFFD8) {
      return null;
    }

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);

      // Check for APP1 marker (EXIF)
      if (marker === 0xFFE1) {
        const length = view.getUint16(offset + 2);
        const exifData = new Uint8Array(buffer, offset + 4, length - 2);
        return parseExifData(exifData);
      }

      // Move to next marker
      if (marker === 0xFFD9) break; // End of image
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }

    return null;
  } catch (error) {
    console.error('EXIF extraction error:', error);
    return null;
  }
}

function parseExifData(data: Uint8Array): ExifResult | null {
  try {
    // Check for "Exif\0\0" header
    const header = String.fromCharCode(...data.slice(0, 4));
    if (header !== 'Exif') {
      return null;
    }

    const tiffOffset = 6;
    const view = new DataView(data.buffer, data.byteOffset + tiffOffset, data.byteLength - tiffOffset);

    // Check byte order
    const byteOrder = view.getUint16(0);
    const littleEndian = byteOrder === 0x4949;

    // Get IFD0 offset
    const ifdOffset = view.getUint32(4, littleEndian);

    let latitude: number | undefined;
    let longitude: number | undefined;
    let timestamp: string | undefined;
    let gpsIfdOffset: number | undefined;
    let exifIfdOffset: number | undefined;

    // Parse IFD0
    const ifd0Result = parseIFD(view, ifdOffset, littleEndian);

    // Look for GPS and EXIF IFD pointers
    for (const tag of ifd0Result.tags) {
      if (tag.id === 0x8825) { // GPS IFD pointer
        gpsIfdOffset = tag.value as number;
      } else if (tag.id === 0x8769) { // EXIF IFD pointer
        exifIfdOffset = tag.value as number;
      }
    }

    // Parse GPS IFD
    if (gpsIfdOffset !== undefined) {
      const gpsResult = parseGPSIFD(view, gpsIfdOffset, littleEndian);
      latitude = gpsResult.latitude;
      longitude = gpsResult.longitude;
    }

    // Parse EXIF IFD for timestamp
    if (exifIfdOffset !== undefined) {
      const exifResult = parseExifIFD(view, exifIfdOffset, littleEndian);
      timestamp = exifResult.timestamp;
    }

    return {
      latitude,
      longitude,
      timestamp,
      hasLocation: latitude !== undefined && longitude !== undefined,
    };
  } catch (error) {
    console.error('EXIF parse error:', error);
    return null;
  }
}

interface IFDTag {
  id: number;
  type: number;
  count: number;
  value: number | string;
}

interface IFDResult {
  tags: IFDTag[];
  nextIFD: number;
}

function parseIFD(view: DataView, offset: number, littleEndian: boolean): IFDResult {
  const tags: IFDTag[] = [];
  const count = view.getUint16(offset, littleEndian);

  for (let i = 0; i < count; i++) {
    const tagOffset = offset + 2 + i * 12;
    const id = view.getUint16(tagOffset, littleEndian);
    const type = view.getUint16(tagOffset + 2, littleEndian);
    const tagCount = view.getUint32(tagOffset + 4, littleEndian);
    let value: number | string;

    // Get value based on type
    if (type === 3) { // SHORT
      value = view.getUint16(tagOffset + 8, littleEndian);
    } else if (type === 4) { // LONG
      value = view.getUint32(tagOffset + 8, littleEndian);
    } else {
      value = view.getUint32(tagOffset + 8, littleEndian);
    }

    tags.push({ id, type, count: tagCount, value });
  }

  const nextIFD = view.getUint32(offset + 2 + count * 12, littleEndian);
  return { tags, nextIFD };
}

interface GPSResult {
  latitude?: number;
  longitude?: number;
}

function parseGPSIFD(view: DataView, offset: number, littleEndian: boolean): GPSResult {
  const result: GPSResult = {};
  const count = view.getUint16(offset, littleEndian);

  let latRef = 'N';
  let lonRef = 'E';
  let latValues: number[] | undefined;
  let lonValues: number[] | undefined;

  for (let i = 0; i < count; i++) {
    const tagOffset = offset + 2 + i * 12;
    const id = view.getUint16(tagOffset, littleEndian);
    const type = view.getUint16(tagOffset + 2, littleEndian);
    const tagCount = view.getUint32(tagOffset + 4, littleEndian);
    const valueOffset = view.getUint32(tagOffset + 8, littleEndian);

    if (id === 1) { // GPSLatitudeRef
      latRef = String.fromCharCode(view.getUint8(tagOffset + 8));
    } else if (id === 2 && type === 5) { // GPSLatitude (RATIONAL)
      latValues = readRationalArray(view, valueOffset, 3, littleEndian);
    } else if (id === 3) { // GPSLongitudeRef
      lonRef = String.fromCharCode(view.getUint8(tagOffset + 8));
    } else if (id === 4 && type === 5) { // GPSLongitude (RATIONAL)
      lonValues = readRationalArray(view, valueOffset, 3, littleEndian);
    }
  }

  if (latValues && latValues.length === 3) {
    result.latitude = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
    if (latRef === 'S') result.latitude = -result.latitude;
  }

  if (lonValues && lonValues.length === 3) {
    result.longitude = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;
    if (lonRef === 'W') result.longitude = -result.longitude;
  }

  return result;
}

function readRationalArray(view: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const numerator = view.getUint32(offset + i * 8, littleEndian);
    const denominator = view.getUint32(offset + i * 8 + 4, littleEndian);
    values.push(denominator !== 0 ? numerator / denominator : 0);
  }
  return values;
}

interface ExifIFDResult {
  timestamp?: string;
}

function parseExifIFD(view: DataView, offset: number, littleEndian: boolean): ExifIFDResult {
  const result: ExifIFDResult = {};
  const count = view.getUint16(offset, littleEndian);

  for (let i = 0; i < count; i++) {
    const tagOffset = offset + 2 + i * 12;
    const id = view.getUint16(tagOffset, littleEndian);
    const type = view.getUint16(tagOffset + 2, littleEndian);
    const tagCount = view.getUint32(tagOffset + 4, littleEndian);

    // DateTimeOriginal (0x9003) or DateTimeDigitized (0x9004)
    if ((id === 0x9003 || id === 0x9004) && type === 2 && !result.timestamp) {
      const valueOffset = view.getUint32(tagOffset + 8, littleEndian);
      const chars: string[] = [];
      for (let j = 0; j < tagCount - 1; j++) {
        chars.push(String.fromCharCode(view.getUint8(valueOffset + j)));
      }
      result.timestamp = chars.join('');
    }
  }

  return result;
}

// Calculate SHA-256 hash of first 4KB + file size for lightweight duplicate detection
async function calculateFileHash(buffer: ArrayBuffer, fileSize: number): Promise<string> {
  try {
    // Use first 4KB for hash (lightweight approach)
    const hashBytes = Math.min(4096, buffer.byteLength);
    const dataToHash = new Uint8Array(buffer, 0, hashBytes);

    // Combine with file size for uniqueness
    const sizeStr = fileSize.toString();
    const combined = new Uint8Array(dataToHash.length + sizeStr.length);
    combined.set(dataToHash);
    combined.set(new TextEncoder().encode(sizeStr), dataToHash.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Hash calculation error:', error);
    return '';
  }
}

// Convert data URL to ArrayBuffer
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Process a single file
async function processFile(file: ProcessableFile): Promise<ProcessedFileResult> {
  try {
    const buffer = dataUrlToArrayBuffer(file.dataUrl);

    // Calculate hash
    const hash = await calculateFileHash(buffer, file.fileSize);

    // Extract EXIF
    let exif: ExifResult | null = null;

    if (file.mimeType.includes('jpeg') || file.mimeType.includes('jpg')) {
      exif = await extractExifFromArrayBuffer(buffer);
    }

    // For HEIC files, we'll need to handle conversion separately
    // as heic2any requires DOM APIs not available in workers
    if (file.mimeType.includes('heic') || file.fileName.toLowerCase().endsWith('.heic')) {
      // Mark for main thread conversion
      return {
        id: file.id,
        success: true,
        exif: null, // Will be extracted after HEIC conversion
        hash,
        error: 'heic_needs_conversion',
      };
    }

    return {
      id: file.id,
      success: true,
      exif,
      hash,
    };
  } catch (error) {
    return {
      id: file.id,
      success: false,
      exif: null,
      hash: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<FileProcessingRequest>) => {
  const { type, files } = event.data;

  if (type !== 'process') {
    return;
  }

  const results: ProcessedFileResult[] = [];

  for (let i = 0; i < files.length; i++) {
    // Send progress update
    const progressMessage: WorkerProgressMessage = {
      type: 'progress',
      processed: i,
      total: files.length,
      currentFile: files[i].fileName,
    };
    self.postMessage(progressMessage);

    // Process file
    const result = await processFile(files[i]);
    results.push(result);
  }

  // Send completion message
  const completeMessage: WorkerCompleteMessage = {
    type: 'complete',
    results,
  };
  self.postMessage(completeMessage);
};

export { };
