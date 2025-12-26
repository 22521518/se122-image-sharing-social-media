import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Feeling, getFeelingGradient, getFeelingConfig } from './FeelingSelector';

// Gradient definitions matching backend GRADIENT_MAPPINGS
const GRADIENT_COLORS: Record<string, [string, string, string]> = {
  // Joy gradients
  SUNRISE_GOLD: ['#FFD700', '#FFA500', '#FF8C00'],
  SUNNY_YELLOW: ['#FFEB3B', '#FFC107', '#FF9800'],
  WARM_SUNSET: ['#FF6B6B', '#FF8E53', '#FFC371'],
  STARLIGHT_GOLD: ['#FFD93D', '#C9A227', '#8B6914'],
  
  // Melancholy gradients
  MISTY_BLUE: ['#B8C6DB', '#8CA6C3', '#6B8AAB'],
  RAINY_GRAY: ['#7F8C8D', '#95A5A6', '#BDC3C7'],
  TWILIGHT_PURPLE: ['#667BC6', '#8E7ABB', '#C4A7E7'],
  MIDNIGHT_BLUE: ['#2C3E50', '#34495E', '#1A252F'],
  
  // Energetic gradients  
  DAWN_ORANGE: ['#FF6B35', '#F7931E', '#FDB813'],
  VIBRANT_RED: ['#FF416C', '#FF4B2B', '#FF5722'],
  ELECTRIC_PINK: ['#EC4899', '#F472B6', '#FB7185'],
  NEON_PURPLE: ['#9333EA', '#A855F7', '#C084FC'],
  
  // Calm gradients
  SOFT_MINT: ['#A8E6CF', '#88D8B0', '#69C99B'],
  OCEAN_BLUE: ['#0077B6', '#00B4D8', '#48CAE4'],
  LAVENDER_SKY: ['#E8D5F2', '#D4A5F0', '#C084FC'],
  DEEP_TEAL: ['#0D9488', '#14B8A6', '#2DD4BF'],
  
  // Inspired gradients
  AURORA_GREEN: ['#22C55E', '#4ADE80', '#86EFAC'],
  COSMIC_PURPLE: ['#7C3AED', '#8B5CF6', '#A78BFA'],
  SUNSET_ORANGE: ['#F97316', '#FB923C', '#FDBA74'],
  GALAXY_VIOLET: ['#6366F1', '#818CF8', '#A5B4FC'],
};

interface PlaceholderMetadata {
  gradientId: string;
  feeling: Feeling;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  capturedAt?: string;
}

interface MemoryCardProps {
  id: string;
  type: 'voice' | 'photo' | 'mixed' | 'text_only';
  mediaUrl?: string | null;
  title?: string | null;
  feeling?: Feeling | null;
  placeholderMetadata?: PlaceholderMetadata | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  onPress?: () => void;
  compact?: boolean;
}

/**
 * MemoryCard - Renders memory pins with beautiful abstract art for feeling-first pins.
 * Uses gradientId from placeholderMetadata for metadata-driven visual generation.
 */
export function MemoryCard({
  id,
  type,
  mediaUrl,
  title,
  feeling,
  placeholderMetadata,
  latitude,
  longitude,
  createdAt,
  onPress,
  compact = false,
}: MemoryCardProps) {
  // Determine if this needs placeholder rendering
  // Only text_only memories should use placeholders (voice memories always have mediaUrl for audio)
  const needsPlaceholder = type === 'text_only' && !mediaUrl;
  
  // Get gradient colors
  const getGradientColors = (): [string, string, string] => {
    if (placeholderMetadata?.gradientId && GRADIENT_COLORS[placeholderMetadata.gradientId]) {
      return GRADIENT_COLORS[placeholderMetadata.gradientId];
    }
    if (feeling) {
      const colors = getFeelingGradient(feeling);
      return [colors[0], colors[1], colors[2] || colors[1]];
    }
    // Default gradient
    return ['#667BC6', '#8E7ABB', '#C4A7E7'];
  };
  
  const gradientColors = getGradientColors();
  const feelingConfig = feeling ? getFeelingConfig(feeling) : null;
  
  const cardContent = (
    <View style={StyleSheet.flatten([styles.card, compact && styles.cardCompact])}>
      {/* Visual area - either gradient placeholder or would be image */}
      <View style={StyleSheet.flatten([styles.visualContainer, compact && styles.visualContainerCompact])}>
        {needsPlaceholder ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            {/* Abstract decorative elements */}
            <View style={styles.abstractDecor}>
              <View style={StyleSheet.flatten([styles.circle, styles.circle1, { opacity: 0.3 }])} />
              <View style={StyleSheet.flatten([styles.circle, styles.circle2, { opacity: 0.2 }])} />
            </View>
            
            {/* Feeling icon */}
            {feelingConfig && (
              <View style={styles.feelingBadge}>
                <Ionicons 
                  name={feelingConfig.icon} 
                  size={compact ? 24 : 32} 
                  color="#FFFFFF" 
                />
              </View>
            )}
          </LinearGradient>
        ) : (
          // Placeholder for actual image content
          <View style={styles.imagePlaceholder}>
            <Ionicons 
              name={type === 'photo' ? 'image' : 'musical-notes'} 
              size={32} 
              color="#CCC" 
            />
          </View>
        )}
      </View>
      
      {/* Info section */}
      {!compact && (
        <View style={styles.infoSection}>
          {title && (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          )}
          
          <View style={styles.metaRow}>
            {feelingConfig && (
              <View style={StyleSheet.flatten([styles.feelingTag, { backgroundColor: `${gradientColors[0]}20` }])}>
                <Ionicons name={feelingConfig.icon} size={12} color={gradientColors[0]} />
                <Text style={StyleSheet.flatten([styles.feelingTagText, { color: gradientColors[0] }])}>
                  {feelingConfig.label}
                </Text>
              </View>
            )}
            
            <View style={styles.locationTag}>
              <Ionicons name="location" size={12} color="#888" />
              <Text style={styles.locationText}>
                {latitude.toFixed(3)}, {longitude.toFixed(3)}
              </Text>
            </View>
          </View>
          
          {placeholderMetadata?.timeOfDay && (
            <Text style={styles.timeOfDay}>
              Captured during {placeholderMetadata.timeOfDay}
            </Text>
          )}
        </View>
      )}
    </View>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {cardContent}
      </TouchableOpacity>
    );
  }
  
  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }),
    marginBottom: 16,
  },
  cardCompact: {
    marginBottom: 8,
  },
  visualContainer: {
    height: 180,
    overflow: 'hidden',
  },
  visualContainerCompact: {
    height: 100,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  abstractDecor: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  circle1: {
    width: 120,
    height: 120,
    top: '10%',
    right: '-10%',
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: '15%',
    left: '-5%',
  },
  feelingBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  voiceIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  feelingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  feelingTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#888',
  },
  timeOfDay: {
    marginTop: 8,
    fontSize: 11,
    color: '#AAA',
    fontStyle: 'italic',
  },
});

export default MemoryCard;
