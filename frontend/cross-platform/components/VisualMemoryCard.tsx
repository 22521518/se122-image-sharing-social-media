import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Memory } from '@/context/MemoriesContext';
import { Feeling } from './FeelingSelector';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

interface VisualMemoryCardProps {
  memory: Memory;
  onPress: (memory: Memory) => void;
}

// Get feeling color (reused logic)
function getFeelingColor(feeling?: Feeling): string {
  const colors: Record<string, string> = {
    JOY: '#FFD93D',
    MELANCHOLY: '#667BC6',
    ENERGETIC: '#FF6B35',
    CALM: '#5CBDB9',
    INSPIRED: '#A855F7',
  };
  return (feeling && colors[feeling]) || '#5856D6';
}

export function VisualMemoryCard({ memory, onPress }: VisualMemoryCardProps) {
  const color = getFeelingColor(memory.feeling);
  
  const formattedDate = new Date(memory.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onPress(memory)}
      activeOpacity={0.9}
    >
      {/* Media Content */}
      <View style={StyleSheet.flatten([styles.mediaContainer, { backgroundColor: color + '20' }])}>
        {memory.mediaUrl && memory.type === 'photo' ? (
          <Image
            source={{ uri: memory.mediaUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderMedia}>
            <Ionicons 
              name={memory.type === 'voice' ? 'mic' : memory.type === 'text_only' ? 'text' : 'heart'} 
              size={48} 
              color={color} 
            />
          </View>
        )}
        
        {/* Feeling tag overlay */}
        {memory.feeling && (
          <View style={StyleSheet.flatten([styles.feelingTag, { backgroundColor: color }])}>
            <Ionicons name="heart" size={12} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.feelingText}>{memory.feeling}</Text>
          </View>
        )}
      </View>

      {/* Info Content */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {memory.title || 'Untitled Memory'}
        </Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formattedDate}</Text>
          {/* We could add distance here if we had user location */}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginRight: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }),
    overflow: 'hidden',
  },
  mediaContainer: {
    flex: 1, // Takes up remaining space - info container
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderMedia: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feelingTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
        }),
  },
  feelingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
});
