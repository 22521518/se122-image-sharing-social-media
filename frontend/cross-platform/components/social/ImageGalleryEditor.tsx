import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

export interface ImageWithMetadata {
  uri: string;
  caption?: string;
  sortOrder: number;
  mimeType?: string;
}

interface ImageGalleryEditorProps {
  images: ImageWithMetadata[];
  onImagesChange: (images: ImageWithMetadata[]) => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
}

export default function ImageGalleryEditor({ 
  images, 
  onImagesChange, 
  onRemoveImage,
  maxImages = 10 
}: ImageGalleryEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempCaption, setTempCaption] = useState('');

  const openCaptionEditor = (index: number) => {
    setEditingIndex(index);
    setTempCaption(images[index].caption || '');
  };

  const saveCaption = () => {
    if (editingIndex !== null) {
      const updatedImages = [...images];
      updatedImages[editingIndex] = {
        ...updatedImages[editingIndex],
        caption: tempCaption,
      };
      onImagesChange(updatedImages);
      setEditingIndex(null);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<ImageWithMetadata>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[styles.imageCard, isActive && styles.imageCardActive]}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.uri }} style={styles.image} />
            
            {/* Caption preview */}
            {item.caption && (
              <View style={styles.captionOverlay}>
                <Text style={styles.captionPreview} numberOfLines={2}>
                  {item.caption}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => openCaptionEditor(images.indexOf(item))}
              >
                <Ionicons name="create-outline" size={20} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => onRemoveImage(images.indexOf(item))}
              >
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Order indicator */}
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{images.indexOf(item) + 1}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  // Don't render anything if no images
  if (images.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {images.length}/{maxImages} images
        </Text>
        <Text style={styles.hintText}>Long press to reorder</Text>
      </View>

      <DraggableFlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item) => item.uri}
        onDragEnd={({ data }) => {
          // Update sortOrder based on new positions
          const reorderedImages = data.map((img, index) => ({
            ...img,
            sortOrder: index,
          }));
          onImagesChange(reorderedImages);
        }}
        horizontal
        contentContainerStyle={styles.listContent}
      />

      {/* Caption Edit Modal */}
      <Modal
        visible={editingIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingIndex(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Caption</Text>
            
            <TextInput
              style={styles.captionInput}
              multiline
              placeholder="Add a caption (max 200 characters)"
              value={tempCaption}
              onChangeText={setTempCaption}
              maxLength={200}
              autoFocus
            />
            
            <Text style={styles.charCounter}>
              {tempCaption.length}/200
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingIndex(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveCaption}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
  },
  listContent: {
    paddingVertical: 8,
  },
  imageCard: {
    marginRight: 12,
  },
  imageCardActive: {
    opacity: 0.8,
  },
  imageContainer: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
  },
  captionPreview: {
    color: 'white',
    fontSize: 11,
  },
  actionButtons: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'column',
    gap: 6,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
  removeButton: {
    backgroundColor: 'transparent',
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCounter: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
