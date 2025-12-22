/**
 * LeafletMap - Actual Leaflet implementation
 * This file is lazily loaded by MapComponent.web.tsx to avoid SSR issues
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, StyleProp, ViewStyle } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Memory } from '@/context/MemoriesContext';
// We need to import the types but NOT the component values if we want to stay safe?
// Actually this file is safe to have imports as long as it's only imported dynamically.

// Fix default marker icons (Leaflet issue with bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Load Leaflet CSS from CDN (can't use bundled CSS with Metro)
const LEAFLET_CSS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';

function loadLeafletCSS() {
  if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }
}

// We need to redefine/import types since we can't easily share them across lazy boundary without importing
// But for now let's just re-declare or assume props are passed correctly.
import { Feeling } from './FeelingSelector';
import { MapRegion } from '@/hooks/useMapViewport';

interface LeafletMapProps {
  initialRegion: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
  memories: Memory[];
  manualPinLocation: { latitude: number; longitude: number } | null;
  showTempPin: boolean;
  isLoading: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

// Custom hook to handle map events
function MapEventHandler({ 
  onRegionChangeComplete, 
  onLongPress 
}: { 
  onRegionChangeComplete: (region: MapRegion) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const latDelta = bounds.getNorth() - bounds.getSouth();
      const lngDelta = bounds.getEast() - bounds.getWest();
      
      onRegionChangeComplete({
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
    },
    contextmenu: (e) => {
      // Right-click or long-press on touch devices
      onLongPress({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });
  
  return null;
}

// Create custom colored markers
function createColoredIcon(color: string) {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#fff" stroke-width="1" d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 6.375 8.5 15.5 8.5 15.5s8.5-9.125 8.5-15.5C20.5 3.81 16.69 0 12 0z"/>
      <circle fill="#fff" cx="12" cy="8.5" r="3"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Get marker color based on memory type and feeling
function getMarkerColor(memory: Memory): string {
  if (memory.feeling) {
    const colors: Record<Feeling, string> = {
      JOY: '#FFD93D',
      MELANCHOLY: '#667BC6',
      ENERGETIC: '#FF6B35',
      CALM: '#5CBDB9',
      INSPIRED: '#A855F7',
    };
    return colors[memory.feeling] || '#5856D6';
  }
  switch (memory.type) {
    case 'voice': return '#FF6B6B';
    case 'photo': return '#5856D6';
    case 'text_only': return '#A855F7';
    default: return '#5856D6';
  }
}

export default function LeafletMap({
  initialRegion,
  onRegionChangeComplete,
  onLongPress,
  memories,
  manualPinLocation,
  showTempPin,
  isLoading,
  containerStyle,
}: LeafletMapProps) {
  // Load Leaflet CSS on mount
  useEffect(() => {
    loadLeafletCSS();
  }, []);

  // Calculate zoom level from lat/lng delta
  const getZoomFromDelta = (latDelta: number) => {
    return Math.round(Math.log2(180 / latDelta));
  };

  const initialZoom = getZoomFromDelta(initialRegion.latitudeDelta);

  return (
    <View style={[styles.mapContainer, containerStyle]}>
      <MapContainer
        center={[initialRegion.latitude, initialRegion.longitude]}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEventHandler 
          onRegionChangeComplete={onRegionChangeComplete}
          onLongPress={onLongPress}
        />
        
        {/* Render memory pins */}
        {memories.map((memory) => (
          <Marker
            key={memory.id}
            position={[memory.latitude, memory.longitude]}
            icon={createColoredIcon(getMarkerColor(memory))}
          >
            <Popup>
              <div style={{ minWidth: 120 }}>
                <strong>
                  {memory.type === 'voice' ? '🎤 Voice' : memory.type === 'photo' ? '📷 Photo' : '💜 Feeling'}
                </strong>
                {memory.title && <p style={{ margin: '4px 0 0' }}>{memory.title}</p>}
                {memory.feeling && (
                  <span style={{ 
                    display: 'inline-block',
                    padding: '2px 6px',
                    marginTop: 4,
                    borderRadius: 4,
                    backgroundColor: getMarkerColor(memory) + '20',
                    color: getMarkerColor(memory),
                    fontSize: 12,
                  }}>
                    {memory.feeling}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Show temporary pin for new feeling pin */}
        {manualPinLocation && showTempPin && (
          <Marker
            position={[manualPinLocation.latitude, manualPinLocation.longitude]}
            icon={createColoredIcon('#FF3B30')}
          >
            <Popup>
              <strong>📍 New Pin</strong>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
                Select a feeling to save this location
              </p>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {/* Loading indicator overlay */}
      {isLoading && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="small" color="#5856D6" />
          <Text style={styles.mapLoadingText}>{memories.length} pins</Text>
        </View>
      )}
      
      {/* Instruction overlay */}
      <View style={styles.helpOverlay}>
        <Text style={styles.helpText}>Right-click to drop a pin</Text>
      </View>
      
      {/* Custom marker styles */}
      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%', // Ensure it fills parent if flex doesn't work in specific contexts
    position: 'relative',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  mapLoadingText: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: '600',
  },
  helpOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1000,
  },
  helpText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
});
