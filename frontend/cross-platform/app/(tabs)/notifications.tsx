import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/context/NotificationContext';
import { Notification, NotificationType } from '@/services/notification.service';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      // Fetch latest notifications when tab becomes active
      fetchNotifications(true);
      
      // Mark all as read after a short delay to ensure user sees them
      // blocking this might be better if we want instant badge clear
      if (unreadCount > 0) {
        markAllAsRead();
      }
    }, [unreadCount]) // Depend on unreadCount so if it changes while focused (?) - actually we want to run on focus.
  );

  const handlePress = async (notification: Notification) => {
    // Mark as read when clicking
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.data) {
        // Safe access to data properties
        const data = notification.data as any;

        if (notification.type === NotificationType.POSTCARD_RECEIVED && data.postcardId) {
            router.push('/(tabs)/postcards');
        } else if (notification.type === NotificationType.POSTCARD_UNLOCKED && data.postcardId) {
            // TODO: Ideally navigate to specific postcard detail, but for now to list
             router.push('/(tabs)/postcards');
        } else if ((notification.type === NotificationType.LIKE || notification.type === NotificationType.COMMENT) && data.postId) {
             router.push(`/post/${data.postId}`)
        } else if ((notification.type === NotificationType.LIKE || notification.type === NotificationType.COMMENT) && data.memoryId) {
            router.push(`/memory/${data.memoryId}`);
        } else if (notification.type === NotificationType.FOLLOW && data.followerId) {
            router.push(`/user/${data.followerId}`);
        } else if (notification.type === NotificationType.FRIEND_REQUEST && data.requesterId) {
            router.push(`/user/${data.requesterId}`);
        } else if (notification.type === NotificationType.FRIEND_ACCEPTED && data.addresseeId) {
            router.push(`/user/${data.addresseeId}`);
        }
    }
  };


  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No notifications yet</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
            <Pressable onPress={() => markAllAsRead()}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </Pressable>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={handlePress} />
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => fetchNotifications(true)}
              tintColor={Colors.light.primary}
            />
          }
          onEndReached={() => fetchNotifications(false)}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
  },
  markAllRead: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#737373',
  },
});

