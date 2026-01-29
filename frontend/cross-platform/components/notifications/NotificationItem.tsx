import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { friendshipService } from '@/services/friendship.service';
import { Notification, NotificationType } from '@/services/notification.service';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [isActioning, setIsActioning] = useState(false);
  const [actionTaken, setActionTaken] = useState<'accepted' | 'rejected' | 'unavailable' | null>(null);

  // Check initial status
  useEffect(() => {
    const checkStatus = async () => {
      const data = notification.data as any;
      if (notification.type === NotificationType.FRIEND_REQUEST && data?.requesterId && accessToken) {
        try {
          const result = await friendshipService.getFriendshipStatus(data.requesterId, accessToken);
          
          // STRICT CHECK: The current friendship ID must match the notification's friendship ID
          if (result.friendshipId === data.friendshipId) {
            if (result.status === 'friends') {
              setActionTaken('accepted');
            } else if (result.status === 'pending_received') {
              // Valid pending request - reset action to allow response
              setActionTaken(null);
            } else {
              // Other statuses (blocked etc) treat as unavailable
              setActionTaken('unavailable');
            }
          } else {
             // ID mismatch means this notification refers to an old/deleted request
             // e.g. requester cancelled and sent new one, or we unfriended them later
             setActionTaken('unavailable');
          }
        } catch (error) {
          console.log('Failed to check friendship status', error);
        }
      }
    };
    
    checkStatus();
  }, [notification, accessToken]);

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.LIKE:
        return <Ionicons name="heart" size={20} color="#E91E63" />;
      case NotificationType.COMMENT:
        return <Ionicons name="chatbubble" size={20} color="#2196F3" />;
      case NotificationType.FOLLOW:
        return <Ionicons name="person-add" size={20} color="#4CAF50" />;
      case NotificationType.FRIEND_REQUEST:
        return <Ionicons name="people" size={20} color="#10b981" />;
      case NotificationType.FRIEND_ACCEPTED:
        return <Ionicons name="people" size={20} color="#22c55e" />;
      case NotificationType.POSTCARD_RECEIVED:
        return <Ionicons name="mail" size={20} color="#FF9800" />;
      case NotificationType.POSTCARD_UNLOCKED:
        return <Ionicons name="mail-open" size={20} color="#FFC107" />;
      case NotificationType.SYSTEM_WARN:
        return <Ionicons name="warning" size={20} color="#F44336" />;
      case NotificationType.ADMIN_INFO:
        return <Ionicons name="information-circle" size={20} color="#607D8B" />;
      default:
        return <Ionicons name="notifications" size={20} color="#737373" />;
    }
  };

  const handleAcceptFriend = async () => {
    const data = notification.data as any;
    if (!data?.friendshipId || !accessToken) {
      Alert.alert('Error', 'Friend request data is missing');
      return;
    }

    setIsActioning(true);
    try {
      await friendshipService.acceptFriendRequest(data.friendshipId, accessToken);
      setActionTaken('accepted');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    } finally {
      setIsActioning(false);
    }
  };

  const handleRejectFriend = async () => {
    const data = notification.data as any;
    if (!data?.friendshipId || !accessToken) {
      Alert.alert('Error', 'Friend request data is missing');
      return;
    }

    setIsActioning(true);
    try {
      await friendshipService.rejectFriendRequest(data.friendshipId, accessToken);
      setActionTaken('rejected');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject friend request');
    } finally {
      setIsActioning(false);
    }
  };

  const handleViewProfile = () => {
    const data = notification.data as any;
    if (data?.requesterId) {
      router.push(`/user/${data.requesterId}` as any);
    }
  };

  const isFriendRequest = notification.type === NotificationType.FRIEND_REQUEST;
  const data = notification.data as any;
  const senderName = data?.requesterName || 'Someone';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: notification.isRead ? '#fff' : '#eff6ff' },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message}>
          {isFriendRequest ? `${senderName} sent you a friend request` : notification.message}
        </Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </Text>

        {/* Friend Request Actions */}
        {isFriendRequest && !actionTaken && (
          <View style={styles.actionButtons}>
            {isActioning ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <>
                <Pressable style={styles.acceptButton} onPress={handleAcceptFriend}>
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.rejectButton} onPress={handleRejectFriend}>
                  <Text style={styles.rejectButtonText}>Decline</Text>
                </Pressable>
                <Pressable style={styles.viewProfileButton} onPress={handleViewProfile}>
                  <Ionicons name="person-outline" size={16} color={Colors.light.primary} />
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Action Complete Message */}
        {actionTaken && (
          <Text style={styles.actionTakenText}>
            {actionTaken === 'accepted' ? '✓ Friend request accepted' : 
             actionTaken === 'rejected' ? '✗ Friend request declined' :
             '✗ Request no longer available'}
          </Text>
        )}
      </View>

      {!notification.isRead && (
        <View style={styles.dot} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
    color: '#171717',
  },
  message: {
    fontSize: 14,
    marginBottom: 4,
    color: '#525252',
  },
  time: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  rejectButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  rejectButtonText: {
    color: '#525252',
    fontWeight: '500',
    fontSize: 13,
  },
  viewProfileButton: {
    padding: 6,
    marginLeft: 4,
  },
  actionTakenText: {
    marginTop: 8,
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
});

