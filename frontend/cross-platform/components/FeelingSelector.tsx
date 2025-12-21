import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Feeling enum matching backend
export type Feeling = 'JOY' | 'MELANCHOLY' | 'ENERGETIC' | 'CALM' | 'INSPIRED';

// Beautiful color schemes for each feeling
const FEELING_CONFIG: Record<Feeling, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: string[];
  description: string;
}> = {
  JOY: {
    label: 'Joy',
    icon: 'sunny',
    colors: ['#FFD93D', '#FF6B6B', '#F8B500'],
    description: 'Warm, golden happiness',
  },
  MELANCHOLY: {
    label: 'Melancholy',
    icon: 'rainy',
    colors: ['#667BC6', '#7C93C3', '#9EB8D9'],
    description: 'Gentle, reflective blue',
  },
  ENERGETIC: {
    label: 'Energetic',
    icon: 'flash',
    colors: ['#FF6B35', '#FF8F00', '#FFB700'],
    description: 'Vibrant, electric energy',
  },
  CALM: {
    label: 'Calm',
    icon: 'leaf',
    colors: ['#A8D5BA', '#7CB9A8', '#5CBDB9'],
    description: 'Peaceful, serene teal',
  },
  INSPIRED: {
    label: 'Inspired',
    icon: 'sparkles',
    colors: ['#A855F7', '#EC4899', '#8B5CF6'],
    description: 'Creative, cosmic purple',
  },
};

const FEELINGS: Feeling[] = ['JOY', 'MELANCHOLY', 'ENERGETIC', 'CALM', 'INSPIRED'];

interface FeelingSelectorProps {
  selectedFeeling: Feeling | null;
  onFeelingSelect: (feeling: Feeling) => void;
  compact?: boolean;
}

/**
 * FeelingSelector - A beautiful UI for selecting emotional states.
 * Responsive design for both mobile (compact) and desktop (full).
 */
export function FeelingSelector({ 
  selectedFeeling, 
  onFeelingSelect,
  compact = false,
}: FeelingSelectorProps) {
  if (compact) {
    // Compact horizontal scrollable layout for mobile
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTitle}>Select a feeling</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactScroll}
        >
          {FEELINGS.map((feeling) => {
            const config = FEELING_CONFIG[feeling];
            const isSelected = selectedFeeling === feeling;
            
            return (
              <TouchableOpacity
                key={feeling}
                style={[
                  styles.compactButton,
                  isSelected && { borderColor: config.colors[0], backgroundColor: config.colors[0] + '15' },
                ]}
                onPress={() => onFeelingSelect(feeling)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={config.icon} 
                  size={22}
                  color={isSelected ? config.colors[0] : '#888'} 
                />
                <Text style={[
                  styles.compactLabel,
                  isSelected && { color: config.colors[0], fontWeight: '700' },
                ]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // Full grid layout for desktop/tablet
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling?</Text>
      <View style={styles.grid}>
        {FEELINGS.map((feeling) => {
          const config = FEELING_CONFIG[feeling];
          const isSelected = selectedFeeling === feeling;
          
          return (
            <TouchableOpacity
              key={feeling}
              style={[
                styles.gridButton,
                isSelected && styles.gridButtonSelected,
                isSelected && { borderColor: config.colors[0] },
              ]}
              onPress={() => onFeelingSelect(feeling)}
              activeOpacity={0.7}
            >
              <View 
                style={[
                  styles.gradientBar,
                  { backgroundColor: config.colors[0], opacity: isSelected ? 1 : 0.4 },
                ]} 
              />
              
              <Ionicons 
                name={config.icon} 
                size={28}
                color={isSelected ? config.colors[0] : '#666'} 
              />
              
              <Text style={[
                styles.gridLabel,
                isSelected && { color: config.colors[0], fontWeight: '700' },
              ]}>
                {config.label}
              </Text>
              
              {isSelected && (
                <Text style={[styles.description, { color: config.colors[1] }]}>
                  {config.description}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Helper hooks and functions
export function useFeelingSelectorState(initialFeeling?: Feeling) {
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(initialFeeling || null);
  return { selectedFeeling, setSelectedFeeling };
}

export function getFeelingGradient(feeling: Feeling): string[] {
  return FEELING_CONFIG[feeling].colors;
}

export function getFeelingConfig(feeling: Feeling) {
  return FEELING_CONFIG[feeling];
}

const styles = StyleSheet.create({
  // Compact layout (mobile)
  compactContainer: {
    paddingVertical: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  compactScroll: {
    gap: 10,
    paddingRight: 16,
  },
  compactButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    minWidth: 70,
    gap: 4,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  
  // Full layout (desktop/tablet)
  container: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  gridButton: {
    width: '47%',
    maxWidth: 160,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridButtonSelected: {
    borderWidth: 2,
    backgroundColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  gradientBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  gridLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  description: {
    marginTop: 4,
    fontSize: 11,
    textAlign: 'center',
    color: '#888',
  },
});

export default FeelingSelector;
