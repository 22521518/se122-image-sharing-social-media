/**
 * Geo utilities for map viewport and bounding box calculations.
 * Story 2.4a: Map Viewport Logic
 */

/**
 * Represents a map region with center coordinates and deltas.
 * Compatible with react-native-maps Region type.
 */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Represents a bounding box with min/max coordinates.
 * Used for querying memories within a map viewport.
 */
export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/**
 * Converts a map region (center + deltas) to a bounding box (min/max coords).
 * 
 * @param region - The map region with center and deltas
 * @returns BoundingBox with min/max latitude and longitude
 * 
 * @example
 * const region = { latitude: 10.5, longitude: 106.5, latitudeDelta: 0.5, longitudeDelta: 0.5 };
 * const bbox = regionToBoundingBox(region);
 * // { minLat: 10.25, minLng: 106.25, maxLat: 10.75, maxLng: 106.75 }
 */
export function regionToBoundingBox(region: MapRegion): BoundingBox {
  const minLat = Math.max(-90, region.latitude - region.latitudeDelta / 2);
  const maxLat = Math.min(90, region.latitude + region.latitudeDelta / 2);

  let rawMinLng = region.longitude - region.longitudeDelta / 2;
  let rawMaxLng = region.longitude + region.longitudeDelta / 2;

  // If view spans more than 360, return full world
  if (region.longitudeDelta >= 360) {
    return { minLat, maxLat, minLng: -180, maxLng: 180 };
  }

  // Normalize to -180...180 range
  // This naturally produces minLng > maxLng if we cross the date line (e.g. 170 to -170)
  const minLng = normalizeLng(rawMinLng);
  const maxLng = normalizeLng(rawMaxLng);

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
  };
}

function normalizeLng(lng: number): number {
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}



/**
 * Checks if two bounding boxes are significantly different.
 * Used to avoid unnecessary API calls for small map movements.
 * 
 * @param bbox1 - First bounding box
 * @param bbox2 - Second bounding box
 * @param threshold - Minimum difference threshold in degrees (default: 0.01 ≈ 1.1km)
 * @returns true if boxes differ by more than threshold
 */
export function boundingBoxesDiffer(
  bbox1: BoundingBox | null,
  bbox2: BoundingBox,
  threshold: number = 0.01
): boolean {
  if (!bbox1) return true;

  return (
    Math.abs(bbox1.minLat - bbox2.minLat) > threshold ||
    Math.abs(bbox1.maxLat - bbox2.maxLat) > threshold ||
    Math.abs(bbox1.minLng - bbox2.minLng) > threshold ||
    Math.abs(bbox1.maxLng - bbox2.maxLng) > threshold
  );
}

/**
 * Serializes a bounding box to query string parameters.
 * 
 * @param bbox - The bounding box to serialize
 * @returns URLSearchParams string for API call
 */
export function boundingBoxToQueryParams(bbox: BoundingBox): string {
  const params = new URLSearchParams({
    minLat: bbox.minLat.toString(),
    minLng: bbox.minLng.toString(),
    maxLat: bbox.maxLat.toString(),
    maxLng: bbox.maxLng.toString(),
  });
  return params.toString();
}

/**
 * Creates a default map region centered on a specific location.
 * 
 * @param latitude - Center latitude
 * @param longitude - Center longitude
 * @param zoomLevel - Approximate zoom level (1-20, higher = more zoomed in)
 * @returns MapRegion object
 */
export function createInitialRegion(
  latitude: number = 10.762622, // Default: Ho Chi Minh City
  longitude: number = 106.660172,
  zoomLevel: number = 12
): MapRegion {
  // Calculate deltas based on zoom level (rough approximation)
  // At zoom 1, latDelta ≈ 180; at zoom 20, latDelta ≈ 0.0005
  const latDelta = 180 / Math.pow(2, zoomLevel);
  const lngDelta = 360 / Math.pow(2, zoomLevel);

  return {
    latitude,
    longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}
