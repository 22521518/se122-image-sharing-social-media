/**
 * Clustering Utility Tests
 * Story 3.3: EXIF Clustering and Batch Annotation
 */

import {
  clusterPhotos,
  haversineDistance,
  parseExifTimestamp,
  getPhotoTimestamp,
  arePhotosNearby,
  mergeClusters,
  splitCluster,
  ClusterablePhoto,
} from '../clustering';

describe('clustering.ts', () => {
  // Helper to create test photos
  const createPhoto = (
    id: string,
    timestamp: string | undefined,
    lat?: number,
    lng?: number
  ): ClusterablePhoto => ({
    id,
    uri: `file:///test/${id}.jpg`,
    exif: {
      timestamp,
      latitude: lat,
      longitude: lng,
    },
    hasLocation: lat !== undefined && lng !== undefined,
  });

  describe('parseExifTimestamp', () => {
    it('parses EXIF format correctly', () => {
      const result = parseExifTimestamp('2025:12:23 14:30:00');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11); // December is month 11
      expect(result?.getDate()).toBe(23);
    });

    it('returns null for invalid format', () => {
      expect(parseExifTimestamp('invalid')).toBeNull();
    });
  });

  describe('haversineDistance', () => {
    it('calculates distance between two points', () => {
      // Ho Chi Minh City to nearby point (~100m)
      const distance = haversineDistance(10.7769, 106.7009, 10.7779, 106.7009);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // Should be ~111m
    });

    it('returns 0 for same point', () => {
      const distance = haversineDistance(10.7769, 106.7009, 10.7769, 106.7009);
      expect(distance).toBe(0);
    });
  });

  describe('arePhotosNearby', () => {
    it('returns true for photos within 100m', () => {
      const photo1 = createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009);
      const photo2 = createPhoto('2', '2025:12:23 11:00:00', 10.7770, 106.7009);
      expect(arePhotosNearby(photo1, photo2)).toBe(true);
    });

    it('returns true when either photo has no location', () => {
      const photo1 = createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009);
      const photo2 = createPhoto('2', '2025:12:23 11:00:00');
      expect(arePhotosNearby(photo1, photo2)).toBe(true);
    });

    it('returns false for photos far apart', () => {
      const photo1 = createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009);
      const photo2 = createPhoto('2', '2025:12:23 11:00:00', 21.0278, 105.8342); // Hanoi
      expect(arePhotosNearby(photo1, photo2)).toBe(false);
    });
  });

  describe('clusterPhotos', () => {
    it('returns empty array for no photos', () => {
      const clusters = clusterPhotos([]);
      expect(clusters).toHaveLength(0);
    });

    it('groups single photo into one cluster', () => {
      const photos = [createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009)];
      const clusters = clusterPhotos(photos);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].photos).toHaveLength(1);
    });

    it('groups photos within 2-hour window into same cluster', () => {
      const photos = [
        createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009),
        createPhoto('2', '2025:12:23 11:00:00', 10.7769, 106.7009),
        createPhoto('3', '2025:12:23 11:30:00', 10.7769, 106.7009),
      ];
      const clusters = clusterPhotos(photos);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].photos).toHaveLength(3);
    });

    it('creates new cluster for >2 hour gap', () => {
      const photos = [
        createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009),
        createPhoto('2', '2025:12:23 13:00:00', 10.7769, 106.7009), // 3 hours later
      ];
      const clusters = clusterPhotos(photos);
      expect(clusters).toHaveLength(2);
    });

    it('handles midnight crossing correctly', () => {
      const photos = [
        createPhoto('1', '2025:12:23 23:00:00', 10.7769, 106.7009),
        createPhoto('2', '2025:12:24 00:30:00', 10.7769, 106.7009), // 1.5 hours later
      ];
      const clusters = clusterPhotos(photos);
      expect(clusters).toHaveLength(1); // Should be same cluster (within 2 hours)
    });

    it('clusters by time only when no location data', () => {
      const photos = [
        createPhoto('1', '2025:12:23 10:00:00'),
        createPhoto('2', '2025:12:23 11:00:00'),
      ];
      const clusters = clusterPhotos(photos);
      expect(clusters).toHaveLength(1);
    });

    it('splits cluster by location even within time window', () => {
      const photos = [
        createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009), // HCMC
        createPhoto('2', '2025:12:23 11:00:00', 21.0278, 105.8342), // Hanoi
      ];
      const clusters = clusterPhotos(photos);
      expect(clusters).toHaveLength(2);
    });

    it('identifies anchor photo as first chronologically', () => {
      const photos = [
        createPhoto('2', '2025:12:23 11:00:00', 10.7769, 106.7009),
        createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009),
        createPhoto('3', '2025:12:23 10:30:00', 10.7769, 106.7009),
      ];
      const clusters = clusterPhotos(photos);
      expect(clusters[0].anchorPhotoId).toBe('1');
    });
  });

  describe('mergeClusters', () => {
    it('combines photos from two clusters', () => {
      const photos1 = [createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009)];
      const photos2 = [createPhoto('2', '2025:12:23 11:00:00', 10.7769, 106.7009)];

      const cluster1 = clusterPhotos(photos1)[0];
      const cluster2 = clusterPhotos(photos2)[0];

      const merged = mergeClusters(cluster1, cluster2);
      expect(merged.photos).toHaveLength(2);
    });
  });

  describe('splitCluster', () => {
    it('splits cluster at specified index', () => {
      const photos = [
        createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009),
        createPhoto('2', '2025:12:23 10:30:00', 10.7769, 106.7009),
        createPhoto('3', '2025:12:23 11:00:00', 10.7769, 106.7009),
      ];

      const cluster = clusterPhotos(photos)[0];
      const result = splitCluster(cluster, 1);

      expect(result).not.toBeNull();
      expect(result![0].photos).toHaveLength(1);
      expect(result![1].photos).toHaveLength(2);
    });

    it('returns null for invalid split index', () => {
      const photos = [createPhoto('1', '2025:12:23 10:00:00', 10.7769, 106.7009)];
      const cluster = clusterPhotos(photos)[0];

      expect(splitCluster(cluster, 0)).toBeNull();
      expect(splitCluster(cluster, 1)).toBeNull();
    });
  });
});
