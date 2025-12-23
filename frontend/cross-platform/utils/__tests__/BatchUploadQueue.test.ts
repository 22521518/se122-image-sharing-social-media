/**
 * BatchUploadQueue Tests
 * Story 3.2: Bulk-Drop Wall for Historical Import
 */

import BatchUploadQueue, { UploadItem } from '../BatchUploadQueue';

// Mock fetch
global.fetch = jest.fn();

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  public upload = { onprogress: null };
  public onload: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null;
  public onerror: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null;
  public status = 200;
  public responseText = '';
  private headers: Record<string, string> = {};

  open(_method: string, _url: string) { }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(_body: FormData) {
    // Simulate successful upload
    setTimeout(() => {
      if (this.onload) {
        this.onload.call(this as any, {} as ProgressEvent);
      }
    }, 10);
  }
}

(global as any).XMLHttpRequest = MockXMLHttpRequest;

describe('BatchUploadQueue', () => {
  let queue: BatchUploadQueue;
  const mockApiUrl = 'http://localhost:3000';
  const mockAuthToken = 'test-token-123';

  beforeEach(() => {
    queue = new BatchUploadQueue({
      apiBaseUrl: mockApiUrl,
      authToken: mockAuthToken,
      maxConcurrent: 3,
    });

    (fetch as jest.Mock).mockReset();
  });

  describe('addItems', () => {
    it('adds items to the upload queue', () => {
      const items = [
        {
          id: '1',
          uri: 'data:image/jpeg;base64,test1',
          exif: { latitude: 10.77, longitude: 106.70, timestamp: '2025:12:23 10:00:00' },
          hash: 'hash1',
        },
        {
          id: '2',
          uri: 'data:image/jpeg;base64,test2',
          exif: null,
          hash: 'hash2',
        },
      ];

      queue.addItems(items);

      const progress = queue.getProgress();
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(0);
    });
  });

  describe('checkDuplicates', () => {
    it('checks for duplicate hashes on the server', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ duplicates: ['hash1', 'hash3'] }),
      });

      const result = await queue.checkDuplicates(['hash1', 'hash2', 'hash3', 'hash4']);

      expect(result.size).toBe(2);
      expect(result.has('hash1')).toBe(true);
      expect(result.has('hash3')).toBe(true);
      expect(result.has('hash2')).toBe(false);
    });

    it('handles server errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await queue.checkDuplicates(['hash1', 'hash2']);

      expect(result.size).toBe(0);
    });
  });

  describe('markDuplicates', () => {
    it('marks known duplicates in the queue', () => {
      queue.addItems([
        { id: '1', uri: 'test1', exif: null, hash: 'hash1' },
        { id: '2', uri: 'test2', exif: null, hash: 'hash2' },
        { id: '3', uri: 'test3', exif: null, hash: 'hash3' },
      ]);

      const duplicates = new Set(['hash1', 'hash3']);
      queue.markDuplicates(duplicates);

      // Check via progress (duplicates are counted as completed)
      const progress = queue.getProgress();
      expect(progress.total).toBe(3);
    });
  });

  describe('getProgress', () => {
    it('returns current upload progress', () => {
      queue.addItems([
        { id: '1', uri: 'test1', exif: null, hash: 'hash1' },
        { id: '2', uri: 'test2', exif: null, hash: 'hash2' },
      ]);

      const progress = queue.getProgress();

      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(0);
      expect(progress.inProgress).toBe(0);
    });
  });

  describe('pause/resume', () => {
    it('pauses and resumes the upload queue', () => {
      queue.addItems([
        { id: '1', uri: 'data:image/jpeg;base64,test1', exif: null, hash: 'hash1' },
      ]);

      queue.pause();
      expect(() => queue.pause()).not.toThrow();

      queue.resume();
      expect(() => queue.resume()).not.toThrow();
    });
  });

  describe('cancel', () => {
    it('cancels all pending uploads', () => {
      queue.addItems([
        { id: '1', uri: 'test1', exif: null, hash: 'hash1' },
        { id: '2', uri: 'test2', exif: null, hash: 'hash2' },
      ]);

      queue.cancel();

      const progress = queue.getProgress();
      expect(progress.total).toBe(0);
    });
  });

  describe('concurrent upload limit', () => {
    it('respects maxConcurrent limit', async () => {
      const onProgress = jest.fn();
      const customQueue = new BatchUploadQueue({
        apiBaseUrl: mockApiUrl,
        authToken: mockAuthToken,
        maxConcurrent: 2,
        onProgress,
      });

      customQueue.addItems([
        { id: '1', uri: 'data:image/jpeg;base64,test1', exif: null, hash: 'hash1' },
        { id: '2', uri: 'data:image/jpeg;base64,test2', exif: null, hash: 'hash2' },
        { id: '3', uri: 'data:image/jpeg;base64,test3', exif: null, hash: 'hash3' },
      ]);

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ duplicates: [] }),
      });

      const resultPromise = customQueue.start();

      // Allow some async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      const progress = customQueue.getProgress();
      // At most 2 should be in progress at any time
      expect(progress.inProgress).toBeLessThanOrEqual(2);

      await resultPromise;
    });
  });
});
