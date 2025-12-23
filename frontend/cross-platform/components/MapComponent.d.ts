/**
 * MapComponent type declarations
 * This provides type info for both .native.tsx and .web.tsx implementations
 */

import { Memory } from '@/context/MemoriesContext';
import { MapRegion } from '@/hooks/useMapViewport';

import { StyleProp, ViewStyle } from 'react-native';

export interface MapComponentProps {
  initialRegion: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
  memories: Memory[];
  onMemoryPress: (memory: Memory) => void;
  manualPinLocation: { latitude: number; longitude: number } | null;
  showTempPin: boolean;
  isLoading: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export declare function MapComponent(props: MapComponentProps): JSX.Element;
