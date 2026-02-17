import { useIsMobileView } from '@/hooks/usePlatform';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export interface ActionMenuItem {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
  title?: string;
}

export function ActionMenu({ visible, onClose, items, title }: ActionMenuProps) {
  const isMobile = useIsMobileView();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, !isMobile && styles.overlayDesktop]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.container, !isMobile && styles.containerDesktop]}>
          {title && <Text style={styles.title}>{title}</Text>}

          <View style={styles.menuList}>
            {items.map((item, index) => (
              <Pressable
                key={index}
                style={[styles.menuItem, index === items.length - 1 && styles.lastMenuItem]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                {item.icon && (
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={item.destructive ? '#ef4444' : '#171717'}
                  />
                )}
                <Text style={[styles.menuItemText, item.destructive && styles.destructiveText]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {isMobile && (
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  containerDesktop: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 8,
  },
  menuList: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: '#171717',
  },
  destructiveText: {
    color: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
});
