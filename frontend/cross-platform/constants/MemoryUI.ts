import { Ionicons } from '@expo/vector-icons';
import { Memory } from '@/context/MemoriesContext';
import { Feeling } from '@/components/FeelingSelector';

export const MemoryColors = {
  Feeling: {
    JOY: '#FFD93D',
    MELANCHOLY: '#667BC6',
    ENERGETIC: '#FF6B35',
    CALM: '#5CBDB9',
    INSPIRED: '#A855F7',
    DEFAULT: '#5856D6',
  },
  Type: {
    VOICE: '#FF6B6B',
    PHOTO: '#5856D6',
    TEXT_ONLY: '#A855F7',
    DEFAULT: '#5856D6',
  },
};

export function getFeelingColor(feeling?: Feeling | string): string {
  if (!feeling) return MemoryColors.Type.DEFAULT;
  return (MemoryColors.Feeling as Record<string, string>)[feeling] || MemoryColors.Feeling.DEFAULT;
}

export function getTypeColor(type: Memory['type']): string {
  switch (type) {
    case 'voice':
      return MemoryColors.Type.VOICE;
    case 'photo':
      return MemoryColors.Type.PHOTO;
    case 'text_only':
      return MemoryColors.Type.TEXT_ONLY;
    default:
      return MemoryColors.Type.DEFAULT;
  }
}

export function getMemoryColor(memory: Memory): string {
  if (memory.feeling) {
    return getFeelingColor(memory.feeling);
  }
  return getTypeColor(memory.type);
}

export function getTypeIcon(type: Memory['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'voice':
      return 'mic';
    case 'photo':
      return 'image';
    case 'text_only':
      return 'heart';
    default:
      return 'document'; // Fallback
  }
}

export function getMemoryIcon(memory: Memory): keyof typeof Ionicons.glyphMap {
  if (memory.type === 'text_only') return 'heart';
  if (memory.type === 'voice') return 'mic';
  return 'image';
}
