import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { usersService } from '@/services/users.service';

interface User {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

type ListType = 'followers' | 'following' | 'friends';

interface UserListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  type: ListType;
  title: string;
}

export function UserListModal({ visible, onClose, userId, type, title }: UserListModalProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && userId) {
      fetchUsers();
    }
  }, [visible, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let data: User[] = [];
      if (type === 'followers') {
        data = await usersService.getFollowers(userId, accessToken);
      } else if (type === 'following') {
        data = await usersService.getFollowing(userId, accessToken);
      } else if (type === 'friends') {
        data = await usersService.getFriends(userId, accessToken);
      }
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    onClose();
    router.push(`/user/${userId}`);
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => handleUserPress(item.id)}
    >
      <Image
        source={{ 
          uri: item.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.name || 'User') 
        }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || 'Unnamed User'}</Text>
        {item.bio && (
          <Text style={styles.userBio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const { height, width } = Dimensions.get('window');
const isWeb = width > 768; // Simple breakpoint for desktop/web

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: isWeb ? 'center' : 'flex-end',
    alignItems: isWeb ? 'center' : undefined,
  },
  modalContainer: {
    backgroundColor: 'white',
    height: height * 0.7,
    maxHeight: 600,
    width: isWeb ? 500 : '100%',
    borderRadius: 20,
    borderBottomLeftRadius: isWeb ? 20 : 0,
    borderBottomRightRadius: isWeb ? 20 : 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userBio: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
