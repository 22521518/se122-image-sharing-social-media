import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useMemories, MemoryUploadState } from '../context/MemoriesContext';
import { clusterPhotos, PhotoCluster, ClusterablePhoto } from '../utils/clustering';

// Web-only imports (react-dropzone)
let useDropzone: any = null;
if (Platform.OS === 'web') {
  try {
    const dropzone = require('react-dropzone');
    useDropzone = dropzone.useDropzone;
  } catch (e) {
    console.warn('react-dropzone not available');
  }
}

interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

// Processing status for bulk import
type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'duplicate' | 'error';

interface SelectedPhoto {
  id: string;
  uri: string;
  exif: ExifData | null;
  hasLocation: boolean;
  // Bulk import fields (Story 3.2)
  hash?: string | null;
  status?: ProcessingStatus;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

interface PhotoPickerProps {
  /** Called when photos are selected (multi-select mode) */
  onPhotosSelected?: (photos: SelectedPhoto[]) => void;
  /** Called when a single photo is selected (legacy single-select mode) */
  onPhotoSelected?: (data: {
    uri: string;
    exif: ExifData | null;
    hasLocation: boolean;
  }) => void;
  /** Called when user confirms upload with location (Story 3.2 Subtask 3.4) */
  onConfirmUpload?: (data: {
    uri: string;
    latitude: number;
    longitude: number;
    locationSource: 'exif' | 'device';
  }) => Promise<void>;
  onError?: (error: string) => void;
  /** Enable multi-select mode */
  multiSelect?: boolean;
  /** Maximum number of photos to select (default: 9) */
  maxPhotos?: number;
  /** Show the integrated confirm panel (Story 3.2 Subtask 3.4) */
  showConfirmPanel?: boolean;
  /** Upload state from context (for button state) */
  uploadState?: MemoryUploadState;
}

const MAX_DEFAULT_PHOTOS = 9; // Updated for bulk import story 3.2 but i want to limit it to 9 for now
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function PhotoPicker({
  onPhotosSelected,
  onPhotoSelected,
  onConfirmUpload,
  onError,
  multiSelect = true,
  maxPhotos = MAX_DEFAULT_PHOTOS,
  showConfirmPanel = false,
  uploadState: externalUploadState,
}: PhotoPickerProps) {
  const { uploadState: contextUploadState } = useMemories();
  const uploadState = externalUploadState ?? contextUploadState;
  const { width: windowWidth } = useWindowDimensions();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  
  // Bulk import processing state (Story 3.2)
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  
  // Clustering state (Story 3.3)
  const [showClusters, setShowClusters] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  
  // Compute clusters from selected photos (Story 3.3)
  const photoClusters = useMemo(() => {
    if (!multiSelect || selectedPhotos.length === 0) {
      return [];
    }
    
    // Convert SelectedPhoto to ClusterablePhoto
    const clusterablePhotos: ClusterablePhoto[] = selectedPhotos.map(p => ({
      id: p.id,
      uri: p.uri,
      exif: p.exif,
      hasLocation: p.hasLocation,
    }));
    
    return clusterPhotos(clusterablePhotos);
  }, [selectedPhotos, multiSelect]);

  // Responsive: web uses grid, mobile uses carousel
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = windowWidth > 768;

  // Fixed 3x3 grid layout (Story 3.2 Subtask 1.4)
  const GRID_COLUMNS = 3;
  const GRID_GAP = 8;
  const CONTAINER_PADDING = 16; // padding on each side
  // Calculate item size: (containerWidth - gaps) / columns
  // Container width is approx windowWidth - 2*padding (capped at 400px for mobile)
  const maxContainerWidth = isLargeScreen ? Math.min(windowWidth * 0.26, 480) : Math.min(windowWidth - 64, 400);
  const gridItemSize = Math.floor((maxContainerWidth - (GRID_COLUMNS - 1) * GRID_GAP - CONTAINER_PADDING * 2) / GRID_COLUMNS);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Gallery access permission is required to upload photos');
        setHasPermission(false);
        return false;
      }
      setHasPermission(true);
      setPermissionError(null);
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionError('Failed to request permissions');
      setHasPermission(false);
      return false;
    }
  }, []);

  const extractExifData = useCallback((exifData: any): ExifData | null => {
    if (!exifData) return null;

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      let timestamp: string | undefined;

      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        latitude = Number(exifData.GPSLatitude);
        longitude = Number(exifData.GPSLongitude);

        if (exifData.GPSLatitudeRef === 'S' && latitude !== undefined && latitude > 0) {
          latitude = -latitude;
        }
        if (exifData.GPSLongitudeRef === 'W' && longitude !== undefined && longitude > 0) {
          longitude = -longitude;
        }
      }

      if (exifData.DateTimeOriginal) {
        timestamp = exifData.DateTimeOriginal;
      } else if (exifData.DateTime) {
        timestamp = exifData.DateTime;
      }

      if (latitude !== undefined && longitude !== undefined) {
        return { latitude, longitude, timestamp };
      }

      return timestamp ? { timestamp } : null;
    } catch (error) {
      console.error('Error extracting EXIF:', error);
      return null;
    }
  }, []);

  const pickImages = useCallback(async () => {
    if (uploadState === 'uploading') {
      onError?.('Please wait for the current upload to finish');
      return;
    }

    if (hasPermission === null || hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', permissionError || 'Gallery access is required');
        return;
      }
    }

    // Check if max limit reached
    if (multiSelect && selectedPhotos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        allowsMultipleSelection: multiSelect,
        quality: 1,
        exif: true,
        selectionLimit: multiSelect ? maxPhotos - selectedPhotos.length : 1,
      });

      if (result.canceled) {
        return;
      }

      if (multiSelect) {
        // Multi-select mode
        const newPhotos: SelectedPhoto[] = result.assets.map((asset) => {
          const exifData = extractExifData(asset.exif);
          const hasLocation = !!(exifData?.latitude && exifData?.longitude);
          return {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            uri: asset.uri,
            exif: exifData,
            hasLocation,
          };
        });

        const updatedPhotos = [...selectedPhotos, ...newPhotos].slice(0, maxPhotos);
        setSelectedPhotos(updatedPhotos);
        onPhotosSelected?.(updatedPhotos);

        // Alert if any photos don't have location
        const noLocationCount = newPhotos.filter(p => !p.hasLocation).length;
        if (noLocationCount > 0) {
          Alert.alert(
            'Location Info',
            `${noLocationCount} photo(s) don't have GPS data. You can manually place them on the map.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Single-select mode (legacy)
        const asset = result.assets[0];
        if (!asset || !asset.uri) {
          onError?.('Failed to get image');
          return;
        }

        const exifData = extractExifData(asset.exif);
        const hasLocation = !!(exifData?.latitude && exifData?.longitude);

        onPhotoSelected?.({
          uri: asset.uri,
          exif: exifData,
          hasLocation,
        });

        if (!hasLocation) {
          Alert.alert(
            'No Location Found',
            'This photo does not have GPS data. You can manually place it on the map.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      onError?.('Failed to pick image');
    }
  }, [
    uploadState,
    hasPermission,
    permissionError,
    requestPermission,
    extractExifData,
    onPhotoSelected,
    onPhotosSelected,
    onError,
    multiSelect,
    maxPhotos,
    selectedPhotos,
  ]);

  // Handle dropped files (web only)
  const handleDroppedFiles = useCallback(async (acceptedFiles: File[]) => {
    if (uploadState === 'uploading') {
      onError?.('Please wait for the current upload to finish');
      return;
    }

    // Check if max limit reached
    if (selectedPhotos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Validate file count
    const remainingSlots = maxPhotos - selectedPhotos.length;
    const filesToProcess = acceptedFiles.slice(0, remainingSlots);

    if (acceptedFiles.length > filesToProcess.length) {
      Alert.alert(
        'Limit Reached',
        `Only ${remainingSlots} more photo(s) can be added`
      );
    }

    // Validate file sizes and types
    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
    const MAX_FILE_SIZE_MB = 20;
    const validFiles = filesToProcess.filter((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        Alert.alert('File Too Large', `${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    try {
      // Convert Files to data URLs and extract EXIF
      const photoPromises = validFiles.map(async (file) => {
        return new Promise<SelectedPhoto | null>((resolve) => {
          const reader = new FileReader();
          
          reader.onload = (e) => {
            const uri = e.target?.result as string;
            if (!uri) {
              resolve(null);
              return;
            }

            // For web, we'll extract EXIF in a worker later (Task 2)
            // For now, use basic extraction with exif-js
            if (Platform.OS === 'web') {
              const img = new (window as any).Image();
              img.onload = () => {
                // We'll enhance this with worker-based EXIF extraction in Task 2
                // For now, create photo with basic info
                resolve({
                  id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                  uri,
                  exif: null, // Will be processed by worker in Task 2
                  hasLocation: false, // Will be updated by worker in Task 2
                });
              };
              img.onerror = () => resolve(null);
              img.src = uri;
            } else {
              // Non-web fallback (shouldn't happen for drag-drop)
              resolve({
                id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                uri,
                exif: null,
                hasLocation: false,
              });
            }
          };

          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      });

      const newPhotos = (await Promise.all(photoPromises)).filter(
        (p): p is SelectedPhoto => p !== null
      );

      if (newPhotos.length > 0) {
        const updatedPhotos = [...selectedPhotos, ...newPhotos].slice(0, maxPhotos);
        setSelectedPhotos(updatedPhotos);
        onPhotosSelected?.(updatedPhotos);
      }
    } catch (error) {
      console.error('Dropped file processing error:', error);
      onError?.('Failed to process dropped files');
    }
  }, [uploadState, selectedPhotos, maxPhotos, onPhotosSelected, onError]);

  const removePhoto = useCallback((photoId: string) => {
    const updatedPhotos = selectedPhotos.filter(p => p.id !== photoId);
    setSelectedPhotos(updatedPhotos);
    onPhotosSelected?.(updatedPhotos);
  }, [selectedPhotos, onPhotosSelected]);

  const clearAllPhotos = useCallback(() => {
    setSelectedPhotos([]);
    onPhotosSelected?.([]);
  }, [onPhotosSelected]);

  // Direct upload handler - gets location and calls onConfirmUpload directly (Story 3.2 Subtask 3.4)
  const [isUploading, setIsUploading] = useState(false);
  
  const handleDirectUpload = useCallback(async (photo: SelectedPhoto) => {
    if (!onConfirmUpload) return;
    
    setIsUploading(true);
    let latitude: number;
    let longitude: number;
    let locationSource: 'exif' | 'device';

    if (photo.hasLocation && photo.exif?.latitude && photo.exif?.longitude) {
      latitude = photo.exif.latitude;
      longitude = photo.exif.longitude;
      locationSource = 'exif';
    } else {
      // Get device location if no EXIF GPS data
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Required', 'Please enable location services to upload photos.');
          setIsUploading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        locationSource = 'device';
      } catch (err) {
        Alert.alert('Error', 'Failed to get location for this photo.');
        setIsUploading(false);
        return;
      }
    }

    try {
      await onConfirmUpload({ uri: photo.uri, latitude, longitude, locationSource });
      // Clear the selected photo after successful upload
      setSelectedPhotos([]);
    } catch (err) {
      console.error('Upload failed:', err);
      onError?.('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  }, [onConfirmUpload, onError]);

  // Setup drag-and-drop for web (multi-select mode only)
  const dropzoneConfig = isWeb && multiSelect && useDropzone
    ? useDropzone({
        onDrop: handleDroppedFiles,
        accept: {
          'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp']
        },
        maxFiles: maxPhotos,
        maxSize: 20 * 1024 * 1024, // 20MB
        disabled: selectedPhotos.length >= maxPhotos,
        noClick: false,  // Allow clicking drop zone to open file picker
        noKeyboard: false,
      })
    : null;

  const { getRootProps, getInputProps, isDragActive } = dropzoneConfig || {
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  };

  // Render photo thumbnail with remove button (3x3 grid - Subtask 1.4)
  const renderPhotoItem = (photo: SelectedPhoto, index: number) => {
    // Use calculated grid item size for consistent 3x3 layout
    const itemStyle = [styles.gridItem, { width: gridItemSize, height: gridItemSize }];

    return (
      <View key={photo.id} style={itemStyle}>
        <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
        
        {/* Location indicator */}
        <View style={[
          styles.locationBadge,
          { backgroundColor: photo.hasLocation ? '#34C759' : '#FF9500' }
        ]}>
          <Ionicons
            name={photo.hasLocation ? 'location' : 'location-outline'}
            size={10}
            color="#FFF"
          />
        </View>

        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removePhoto(photo.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={22} color="#FF3B30" />
        </TouchableOpacity>

        {/* Index badge */}
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
      </View>
    );
  };

  // Single select mode (legacy)
  if (!multiSelect) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={pickImages}
          activeOpacity={0.8}
        >
          <View style={styles.pickButtonInner}>
            <Ionicons name="image-outline" size={32} color="#FFFFFF" />
            <Text style={styles.pickButtonText}>Choose Photo</Text>
          </View>
        </TouchableOpacity>

        {permissionError && (
          <TouchableOpacity onPress={requestPermission} style={styles.errorContainer}>
            <Text style={styles.errorText}>{permissionError}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {!permissionError && (
          <Text style={styles.instructionText}>
            Photos with EXIF GPS data will be auto-placed on the map
          </Text>
        )}
      </View>
    );
  }

  // Multi-select mode with responsive layout
  return (
    <View style={styles.multiContainer}>
      {/* Header with count and actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Selected Photos ({selectedPhotos.length}/{maxPhotos})
        </Text>
        {selectedPhotos.length > 0 && (
          <TouchableOpacity onPress={clearAllPhotos} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photo display area */}
      {selectedPhotos.length === 0 ? (
        // Empty state with drag-and-drop (web only)
        <View 
          {...(isWeb && useDropzone ? getRootProps() : {})}
          style={[
            styles.emptyState,
            isDragActive && styles.emptyStateDragActive
          ]}
        >
          {isWeb && useDropzone && <input {...getInputProps()} />}
          <Ionicons 
            name={isDragActive ? 'cloud-upload' : 'images-outline'} 
            size={48} 
            color={isDragActive ? '#5856D6' : '#999'} 
          />
          <Text style={[
            styles.emptyText,
            isDragActive && styles.emptyTextDragActive
          ]}>
            {isDragActive ? 'Drop files here' : 'No photos selected'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isWeb 
              ? (isDragActive ? 'Release to add' : 'Drag & drop or click below to add photos')
              : 'Tap below to add photos'}
          </Text>
        </View>
      ) : (
        // 3x3 Grid Layout for both web and mobile (Story 3.2 Subtask 1.4)
        <View style={[
          styles.gridContainer,
          { 
            maxWidth: maxContainerWidth,
            gap: GRID_GAP,
          }
        ]}>
          {selectedPhotos.map((photo, index) => renderPhotoItem(photo, index))}
        </View>
      )}

      {/* Add More Button */}
      {selectedPhotos.length < 9 && (<TouchableOpacity
        style={[
          styles.addButton,
          selectedPhotos.length >= maxPhotos && styles.addButtonDisabled,
          isProcessing && styles.addButtonDisabled
        ]}
        onPress={pickImages}
        activeOpacity={0.8}
        disabled={selectedPhotos.length >= maxPhotos || isProcessing}
      >
        <Ionicons
          name={isProcessing ? 'hourglass' : 'add-circle-outline'}
          size={24}
          color={selectedPhotos.length >= maxPhotos || isProcessing ? '#999' : '#5856D6'}
        />
        <Text style={[
          styles.addButtonText,
          (selectedPhotos.length >= maxPhotos || isProcessing) && styles.addButtonTextDisabled
        ]}>
          {isProcessing 
            ? `Processing... (${processingProgress.current}/${processingProgress.total})`
            : selectedPhotos.length === 0 ? 'Add Photos' : 'Add More'}
        </Text>
      </TouchableOpacity>)}
      

      {/* Processing Progress Bar */}
      {isProcessing && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: processingProgress.total > 0 
                    ? `${(processingProgress.current / processingProgress.total) * 100}%` 
                    : '0%' 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Extracting EXIF data...
          </Text>
        </View>
      )}

      {/* Permission error */}
      {permissionError && (
        <TouchableOpacity onPress={requestPermission} style={styles.errorContainer}>
          <Text style={styles.errorText}>{permissionError}</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Stats Row */}
      {!permissionError && selectedPhotos.length > 0 && !isProcessing && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="location" size={14} color="#34C759" />
            <Text style={styles.statText}>
              {selectedPhotos.filter(p => p.hasLocation).length} with GPS
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color="#FF9500" />
            <Text style={styles.statText}>
              {selectedPhotos.filter(p => !p.hasLocation).length} need location
            </Text>
          </View>
          {/* Duplicate indicator */}
          {selectedPhotos.filter(p => p.status === 'duplicate').length > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="copy-outline" size={14} color="#FF3B30" />
              <Text style={[styles.statText, { color: '#FF3B30' }]}>
                {selectedPhotos.filter(p => p.status === 'duplicate').length} duplicates
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Confirm Upload Button - handles upload directly (Story 3.2 Subtask 3.4) */}
      {showConfirmPanel && selectedPhotos.length > 0 && !isProcessing && (
        <TouchableOpacity
          style={[
            styles.confirmUploadButton,
            (isUploading || uploadState === 'uploading') && styles.confirmButtonDisabled
          ]}
          onPress={() => handleDirectUpload(selectedPhotos[0])}
          activeOpacity={0.8}
          disabled={isUploading || uploadState === 'uploading'}
        >
          {isUploading || uploadState === 'uploading' ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#FFF" />
              <Text style={styles.confirmUploadButtonText}>
                {selectedPhotos.length === 1 ? 'Confirm Upload' : `Confirm Upload (${selectedPhotos.length} photos)`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Single select styles (legacy)
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  pickButton: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pickButtonInner: {
    alignItems: 'center',
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },

  // Multi-select styles
  multiContainer: {
    width: '100%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  emptyStateDragActive: {
    backgroundColor: '#F0EFFF',
    borderColor: '#5856D6',
    borderWidth: 3,
  },
  emptyTextDragActive: {
    color: '#5856D6',
    fontWeight: '600',
  },

  // 3x3 Grid layout (Story 3.2 Subtask 1.4)
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    justifyContent: 'flex-start',
  },
  gridItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F0F0F0',
    margin: 4, // half of gap since we use gap on container
  },

  // Shared photo item styles
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  locationBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFF',
    borderRadius: 11,
  },
  indexBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  indexText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
    backgroundColor: '#F0EFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5856D6',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
  },
  addButtonText: {
    fontSize: 16,
    color: '#5856D6',
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#999',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },

  // Error styles
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  instructionText: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    maxWidth: 200,
  },
  
  // Progress bar styles (Story 3.2)
  progressContainer: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5856D6',
    borderRadius: 3,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Confirm panel styles (Story 3.2 Subtask 3.4)
  confirmUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
    backgroundColor: '#5856D6',
    borderRadius: 12,
    gap: 8,
  },
  confirmUploadButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  confirmPanel: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmPhotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    marginBottom: 12,
  },
  confirmLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  confirmLocationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  confirmLocationSource: {
    fontSize: 12,
    color: '#999',
  },
  confirmButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  confirmCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#5856D6',
    borderRadius: 10,
    gap: 6,
  },
  confirmUploadBtnText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
});
