/**
 * Photo Clustering Utility
 * Story 3.3: EXIF Clustering and Batch Annotation
 * 
 * Groups photos into "Memory Clusters" based on:
 * - Time: Sliding time window (gap > 2 hours = new cluster)
 * - Proximity: Within 100 meters using Haversine distance
 * 
 * Algorithm:
 * 1. Sort photos by timestamp
 * 2. Iterate with gap detection
 * 3. Group by time first, then split by location if needed
 */

export interface ClusterablePhoto {
  id: string;
  uri: string;
  exif: {
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  } | null;
  hasLocation: boolean;
  // Fallback for missing EXIF timestamp
  lastModified?: number;
}

export interface PhotoCluster {
  id: string;
  photos: ClusterablePhoto[];
  anchorPhotoId: string; // First chronologically
  label: string; // e.g., "Cluster 1 - 5 photos at Paris"
  startTime?: Date;
  endTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  voiceUri?: string; // Attached voice sticker
}

// Clustering configuration
const TIME_GAP_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const PROXIMITY_THRESHOLD_METERS = 100; // 100 meters

/**
 * Calculate Haversine distance between two coordinates in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parse EXIF timestamp to Date object
 * EXIF format: "YYYY:MM:DD HH:MM:SS"
 */
export function parseExifTimestamp(timestamp: string): Date | null {
  try {
    // Convert "YYYY:MM:DD HH:MM:SS" to ISO format
    const isoString = timestamp.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Get timestamp from photo (EXIF or fallback)
 */
export function getPhotoTimestamp(photo: ClusterablePhoto): Date {
  if (photo.exif?.timestamp) {
    const parsed = parseExifTimestamp(photo.exif.timestamp);
    if (parsed) return parsed;
  }

  // Fallback to lastModified or current time
  return new Date(photo.lastModified || Date.now());
}

/**
 * Check if two photos are within proximity threshold
 */
export function arePhotosNearby(
  photo1: ClusterablePhoto,
  photo2: ClusterablePhoto,
  thresholdMeters: number = PROXIMITY_THRESHOLD_METERS
): boolean {
  // If either photo has no location, they're considered "nearby" (cluster by time only)
  if (!photo1.hasLocation || !photo2.hasLocation) {
    return true;
  }

  const lat1 = photo1.exif?.latitude;
  const lon1 = photo1.exif?.longitude;
  const lat2 = photo2.exif?.latitude;
  const lon2 = photo2.exif?.longitude;

  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return true;
  }

  const distance = haversineDistance(lat1, lon1, lat2, lon2);
  return distance <= thresholdMeters;
}

/**
 * Main clustering function
 * Groups photos by time and location proximity
 */
export function clusterPhotos(
  photos: ClusterablePhoto[],
  options: {
    timeGapMs?: number;
    proximityMeters?: number;
  } = {}
): PhotoCluster[] {
  const timeGap = options.timeGapMs ?? TIME_GAP_THRESHOLD_MS;
  const proximityThreshold = options.proximityMeters ?? PROXIMITY_THRESHOLD_METERS;

  if (photos.length === 0) {
    return [];
  }

  // Sort by timestamp
  const sortedPhotos = [...photos].sort((a, b) => {
    const timeA = getPhotoTimestamp(a).getTime();
    const timeB = getPhotoTimestamp(b).getTime();
    return timeA - timeB;
  });

  const clusters: PhotoCluster[] = [];
  let currentCluster: ClusterablePhoto[] = [sortedPhotos[0]];
  let lastTimestamp = getPhotoTimestamp(sortedPhotos[0]);

  for (let i = 1; i < sortedPhotos.length; i++) {
    const photo = sortedPhotos[i];
    const photoTime = getPhotoTimestamp(photo);
    const timeDiff = photoTime.getTime() - lastTimestamp.getTime();

    // Check if photo belongs to current cluster
    const withinTimeWindow = timeDiff <= timeGap;
    const withinProximity = currentCluster.length === 0 ||
      arePhotosNearby(currentCluster[currentCluster.length - 1], photo, proximityThreshold);

    if (withinTimeWindow && withinProximity) {
      // Add to current cluster
      currentCluster.push(photo);
    } else {
      // Start new cluster
      clusters.push(createCluster(currentCluster, clusters.length + 1));
      currentCluster = [photo];
    }

    lastTimestamp = photoTime;
  }

  // Add final cluster
  if (currentCluster.length > 0) {
    clusters.push(createCluster(currentCluster, clusters.length + 1));
  }

  return clusters;
}

/**
 * Create a cluster object from photos
 */
function createCluster(photos: ClusterablePhoto[], index: number): PhotoCluster {
  const sortedPhotos = [...photos].sort((a, b) => {
    const timeA = getPhotoTimestamp(a).getTime();
    const timeB = getPhotoTimestamp(b).getTime();
    return timeA - timeB;
  });

  const anchor = sortedPhotos[0];
  const startTime = getPhotoTimestamp(anchor);
  const endTime = getPhotoTimestamp(sortedPhotos[sortedPhotos.length - 1]);

  // Find representative location (first photo with location)
  const locationPhoto = sortedPhotos.find(p => p.hasLocation && p.exif?.latitude && p.exif?.longitude);
  const location = locationPhoto ? {
    latitude: locationPhoto.exif!.latitude!,
    longitude: locationPhoto.exif!.longitude!,
  } : undefined;

  // Generate label
  const photoCount = photos.length;
  const locationLabel = location ? `(${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})` : 'Unknown';
  const label = `Cluster ${index} - ${photoCount} photo${photoCount > 1 ? 's' : ''} at ${locationLabel}`;

  return {
    id: `cluster-${index}-${Date.now()}`,
    photos: sortedPhotos,
    anchorPhotoId: anchor.id,
    label,
    startTime,
    endTime,
    location,
  };
}

/**
 * Merge two clusters into one
 */
export function mergeClusters(cluster1: PhotoCluster, cluster2: PhotoCluster): PhotoCluster {
  const allPhotos = [...cluster1.photos, ...cluster2.photos];
  return createCluster(allPhotos, 1); // Index will be reassigned
}

/**
 * Split a cluster at a specific photo index
 */
export function splitCluster(
  cluster: PhotoCluster,
  splitAtIndex: number
): [PhotoCluster, PhotoCluster] | null {
  if (splitAtIndex <= 0 || splitAtIndex >= cluster.photos.length) {
    return null;
  }

  const photos1 = cluster.photos.slice(0, splitAtIndex);
  const photos2 = cluster.photos.slice(splitAtIndex);

  return [
    createCluster(photos1, 1),
    createCluster(photos2, 2),
  ];
}

/**
 * Move a photo from one cluster to another
 */
export function movePhotoBetweenClusters(
  sourceCluster: PhotoCluster,
  targetCluster: PhotoCluster,
  photoId: string
): { source: PhotoCluster; target: PhotoCluster } | null {
  const photoIndex = sourceCluster.photos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) {
    return null;
  }

  const photo = sourceCluster.photos[photoIndex];
  const newSourcePhotos = sourceCluster.photos.filter(p => p.id !== photoId);
  const newTargetPhotos = [...targetCluster.photos, photo];

  return {
    source: createCluster(newSourcePhotos, 1),
    target: createCluster(newTargetPhotos, 2),
  };
}

/**
 * Reassign cluster indices after modifications
 */
export function reassignClusterIndices(clusters: PhotoCluster[]): PhotoCluster[] {
  return clusters.map((cluster, index) => ({
    ...cluster,
    id: `cluster-${index + 1}-${Date.now()}`,
    label: cluster.label.replace(/Cluster \d+/, `Cluster ${index + 1}`),
  }));
}

export default {
  clusterPhotos,
  mergeClusters,
  splitCluster,
  movePhotoBetweenClusters,
  reassignClusterIndices,
  haversineDistance,
  parseExifTimestamp,
  getPhotoTimestamp,
  arePhotosNearby,
};
