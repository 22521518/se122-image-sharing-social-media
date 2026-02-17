import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { NotificationService, Notification, NotificationListResponse } from '../services/notification.service';

const BE_PORT = process.env.EXPO_PUBLIC_API_PORT || 3000;
const WS_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:${BE_PORT}`;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  hasMore: boolean;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection with auth token
    const socket = io(`${WS_BASE_URL}/notifications`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Notifications WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Notifications WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Notifications WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for real-time notifications
    socket.on('notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      // Add to front of list (newest first)
      setNotifications((prev) => [notification, ...prev]);
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    });

    // Cleanup on unmount or auth change
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]);

  // Fetch initial notifications and unread count when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchNotifications(true);
      fetchUnreadCount();
    } else {
      // Clear state when logged out
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setHasMore(true);
    }
  }, [isAuthenticated, accessToken]);

  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      const count = await NotificationService.getUnreadCount(accessToken);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [accessToken]);

  const fetchNotifications = useCallback(async (reset: boolean = false) => {
    if (!accessToken) return;
    if (isLoading) return;
    if (!reset && !hasMore) return;

    setIsLoading(true);

    try {
      const currentPage = reset ? 1 : page;
      const response = await NotificationService.getNotifications(accessToken, currentPage);

      if (reset) {
        setNotifications(response.data);
        setPage(2);
      } else {
        setNotifications((prev) => [...prev, ...response.data]);
        setPage((prev) => prev + 1);
      }

      setHasMore(currentPage < response.meta.totalPages);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, hasMore, isLoading]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!accessToken) return;

    try {
      await NotificationService.markAsRead(accessToken, notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      // Decrement unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [accessToken]);

  const markAllAsRead = useCallback(async () => {
    if (!accessToken) return;

    try {
      await NotificationService.markAllAsRead(accessToken);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [accessToken]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isConnected,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * useNotifications hook
 * Provides access to notification state and actions
 * 
 * @see Story 9.1: Notification Infrastructure (Task 3.2)
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
