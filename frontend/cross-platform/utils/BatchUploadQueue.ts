/**
 * Batch Upload Queue
 * Story 3.2: Bulk-Drop Wall for Historical Import
 * 
 * Manages concurrent uploads with rate limiting and progress tracking.
 * Respects server rate limits by limiting concurrent uploads (default: 3-5).
 */

export interface UploadItem {
  id: string;
  uri: string;
  file?: File;
  exif: {
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  } | null;
  hash: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'duplicate';
  progress: number;
  error?: string;
}

export interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  duplicates: number;
  inProgress: number;
  currentItems: string[];
}

export interface BatchUploadConfig {
  maxConcurrent: number;
  onProgress?: (progress: UploadProgress) => void;
  onItemComplete?: (item: UploadItem) => void;
  onComplete?: (results: UploadItem[]) => void;
  onError?: (error: Error) => void;
  apiBaseUrl: string;
  authToken: string;
}

export class BatchUploadQueue {
  private queue: UploadItem[] = [];
  private inProgress: Map<string, UploadItem> = new Map();
  private completed: UploadItem[] = [];
  private config: BatchUploadConfig;
  private isProcessing = false;
  private isPaused = false;

  constructor(config: Partial<BatchUploadConfig> & Pick<BatchUploadConfig, 'apiBaseUrl' | 'authToken'>) {
    this.config = {
      maxConcurrent: 3,
      ...config,
    };
  }

  /**
   * Add items to the upload queue
   */
  addItems(items: Omit<UploadItem, 'status' | 'progress'>[]): void {
    const newItems: UploadItem[] = items.map(item => ({
      ...item,
      status: 'pending' as const,
      progress: 0,
    }));
    this.queue.push(...newItems);
  }

  /**
   * Check for duplicates on server before uploading
   */
  async checkDuplicates(hashes: string[]): Promise<Set<string>> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/memories/check-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
        },
        body: JSON.stringify({ hashes }),
      });

      if (!response.ok) {
        throw new Error(`Duplicate check failed: ${response.status}`);
      }

      const data = await response.json();
      return new Set(data.duplicates || []);
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return new Set();
    }
  }

  /**
   * Mark known duplicates in the queue
   */
  markDuplicates(duplicateHashes: Set<string>): void {
    for (const item of this.queue) {
      if (item.hash && duplicateHashes.has(item.hash)) {
        item.status = 'duplicate';
      }
    }
  }

  /**
   * Start processing the upload queue
   */
  async start(): Promise<UploadItem[]> {
    if (this.isProcessing) {
      return this.completed;
    }

    this.isProcessing = true;
    this.isPaused = false;

    // First, check for duplicates
    const hashes = this.queue
      .filter(item => item.hash)
      .map(item => item.hash as string);

    if (hashes.length > 0) {
      const duplicates = await this.checkDuplicates(hashes);
      this.markDuplicates(duplicates);
    }

    // Process queue
    await this.processQueue();

    this.isProcessing = false;
    this.config.onComplete?.(this.completed);

    return this.completed;
  }

  /**
   * Pause the upload queue
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the upload queue
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.processQueue();
    }
  }

  /**
   * Cancel all pending uploads
   */
  cancel(): void {
    this.isPaused = true;
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Get current progress
   */
  getProgress(): UploadProgress {
    return {
      total: this.queue.length + this.inProgress.size + this.completed.length,
      completed: this.completed.filter(i => i.status === 'success').length,
      failed: this.completed.filter(i => i.status === 'error').length,
      duplicates: this.completed.filter(i => i.status === 'duplicate').length,
      inProgress: this.inProgress.size,
      currentItems: Array.from(this.inProgress.keys()),
    };
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && !this.isPaused) {
      // Fill up to maxConcurrent slots
      while (
        this.inProgress.size < this.config.maxConcurrent &&
        this.queue.length > 0
      ) {
        const item = this.queue.shift();
        if (!item) break;

        // Skip duplicates
        if (item.status === 'duplicate') {
          this.completed.push(item);
          this.notifyProgress();
          continue;
        }

        // Start upload
        this.inProgress.set(item.id, item);
        item.status = 'uploading';
        this.uploadItem(item);
      }

      // Wait for at least one upload to complete
      if (this.inProgress.size >= this.config.maxConcurrent) {
        await this.waitForSlot();
      }
    }

    // Wait for remaining uploads to complete
    while (this.inProgress.size > 0) {
      await this.waitForSlot();
    }
  }

  private async waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      const checkSlot = () => {
        if (this.inProgress.size < this.config.maxConcurrent) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      setTimeout(checkSlot, 100);
    });
  }

  private async uploadItem(item: UploadItem): Promise<void> {
    try {
      // Create FormData for upload
      const formData = new FormData();

      // Handle different URI types
      if (item.file) {
        formData.append('photo', item.file);
      } else if (item.uri.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(item.uri);
        const blob = await response.blob();
        formData.append('photo', blob, `photo_${item.id}.jpg`);
      } else {
        // For native URIs, we need to use a different approach
        // This is a placeholder - actual implementation depends on platform
        formData.append('photoUri', item.uri);
      }

      // Add metadata
      if (item.exif) {
        if (item.exif.latitude !== undefined && item.exif.longitude !== undefined) {
          formData.append('latitude', item.exif.latitude.toString());
          formData.append('longitude', item.exif.longitude.toString());
        }
        if (item.exif.timestamp) {
          formData.append('capturedAt', item.exif.timestamp);
        }
      }
      if (item.hash) {
        formData.append('contentHash', item.hash);
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            item.progress = Math.round((event.loaded / event.total) * 100);
            this.notifyProgress();
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            item.status = 'success';
            item.progress = 100;
            resolve();
          } else {
            item.status = 'error';
            item.error = `Upload failed: ${xhr.status}`;
            reject(new Error(item.error));
          }
        };

        xhr.onerror = () => {
          item.status = 'error';
          item.error = 'Network error';
          reject(new Error(item.error));
        };

        xhr.open('POST', `${this.config.apiBaseUrl}/memories/photo`);
        xhr.setRequestHeader('Authorization', `Bearer ${this.config.authToken}`);
        xhr.send(formData);
      });

    } catch (error) {
      item.status = 'error';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Upload failed for ${item.id}:`, error);
    } finally {
      // Move from in-progress to completed
      this.inProgress.delete(item.id);
      this.completed.push(item);
      this.config.onItemComplete?.(item);
      this.notifyProgress();
    }
  }

  private notifyProgress(): void {
    this.config.onProgress?.(this.getProgress());
  }
}

export default BatchUploadQueue;
