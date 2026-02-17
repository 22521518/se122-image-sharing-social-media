import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { Memory, useMemories } from '@/context/MemoriesContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ActionMenu } from '../shared/ActionMenu';
import { ReportModal } from '../shared/ReportModal';
import { EditMemoryModal } from './EditMemoryModal';
import { MemoryAudioPlayer } from './MemoryAudioPlayer';

interface MemoryDetailModalProps {
  visible: boolean;
  memory: Memory | null;
  onClose: () => void;
  onLoginRequired?: () => void;
  /** Auto-play audio when modal opens (for voice memories) */
  autoPlay?: boolean;
}

const { width, height } = Dimensions.get('window');

export function MemoryDetailModal({
  visible,
  memory,
  onClose,
  autoPlay = false,
}: MemoryDetailModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { deleteMemory } = useMemories();

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!memory) return null;

  const isOwner = user?.id === memory.userId;

  const handleDelete = async () => {
    Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteMemory(memory.id);
          if (success) onClose();
        },
      },
    ]);
  };

  const menuItems = [
    ...(isOwner
      ? [
          {
            label: 'Edit Memory',
            icon: 'create-outline',
            onPress: () => setShowEditModal(true),
          },
          {
            label: 'Delete Memory',
            icon: 'trash-outline',
            destructive: true,
            onPress: handleDelete,
          },
        ]
      : [
          {
            label: 'Report Memory',
            icon: 'flag-outline',
            destructive: true,
            onPress: () => setShowReportModal(true),
          },
        ]),
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText style={styles.title} type="title">
              {memory.title || 'Memory'}
            </ThemedText>
          </View>
          <Pressable onPress={() => setShowMenu(true)} style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Photo/Mixed type - show image */}
          {memory.mediaUrl && (memory.type === 'photo' || memory.type === 'mixed') && (
            <Image source={{ uri: memory.mediaUrl }} style={styles.media} resizeMode="contain" />
          )}

          {/* Voice type - show audio player */}
          {memory.mediaUrl && (memory.type === 'voice' || memory.type === 'mixed') && (
            <View style={styles.audioPlayerContainer}>
              <View style={styles.voiceMemoryHeader}>
                <Ionicons name="mic" size={32} color="#5856D6" />
                <ThemedText style={styles.voiceMemoryTitle}>Voice Memory</ThemedText>
              </View>
              <MemoryAudioPlayer
                audioUrl={memory.mediaUrl}
                duration={memory.duration}
                autoPlay={autoPlay}
              />
            </View>
          )}

          {/* Text only or no media - show placeholder */}
          {(!memory.mediaUrl || memory.type === 'text_only') && (
            <View style={styles.placeholder}>
              <Ionicons name="text" size={64} color="#fff" />
            </View>
          )}

          <View style={styles.infoContainer}>
            <ThemedText style={styles.infoText}>Type: {memory.type}</ThemedText>
            {memory.feeling && (
              <ThemedText style={styles.infoText}>Feeling: {memory.feeling}</ThemedText>
            )}
            <ThemedText style={styles.infoText}>Privacy: {memory.privacy}</ThemedText>
          </View>
        </View>

        <ActionMenu visible={showMenu} onClose={() => setShowMenu(false)} items={menuItems} />

        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="MEMORY"
          targetId={memory.id}
        />

        <EditMemoryModal
          visible={showEditModal}
          memoryId={memory.id}
          onClose={() => setShowEditModal(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height * 0.6,
  },
  placeholder: {
    width: width,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  audioPlayerContainer: {
    width: width - 32,
    padding: 16,
    marginVertical: 16,
  },
  voiceMemoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  voiceMemoryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
    width: '100%',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
});
