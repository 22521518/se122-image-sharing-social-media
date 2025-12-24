import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { socialService, PostDetail } from '../services/social.service';
import { useAuth } from './AuthContext';

export interface SocialPost extends PostDetail {
  localStatus?: 'pending' | 'published' | 'failed';
  _retryData?: {
    content: string;
    privacy: string;
    mediaIds?: string[];
  };
}

interface SocialContextType {
  posts: SocialPost[];
  createPost: (content: string, privacy: string, mediaIds?: string[]) => Promise<void>;
  retryPost: (postId: string) => Promise<void>;
  deleteFailedPost: (postId: string) => void;
  refreshPosts: () => Promise<void>;
  isLoading: boolean;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPosts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const fetched = await socialService.getRecentPosts(accessToken);
      setPosts(fetched);
    } catch (e) {
      console.error('Failed to fetch posts', e);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const createPost = async (content: string, privacy: string, mediaIds: string[] = []) => {
    if (!user || !accessToken) return;

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const newPost: SocialPost = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      author: {
        id: user.id,
        name: user.name || 'Me',
        avatarUrl: null,
      },
      liked: false,
      localStatus: 'pending',
      // Store original data for retry
      _retryData: { content, privacy, mediaIds },
    };

    setPosts(prev => [newPost, ...prev]);

    try {
      const created = await socialService.createPost({ content, privacy, mediaIds }, accessToken);
      // Replace temp with real
      setPosts(prev => prev.map(p => p.id === tempId ? { ...created, localStatus: 'published' } : p));
    } catch (e) {
      console.error('Create post failed', e);
      // Mark as failed with retry data
      setPosts(prev => prev.map(p => p.id === tempId ? { ...p, localStatus: 'failed', _retryData: { content, privacy, mediaIds } } : p));
      throw e;
    }
  };

  const retryPost = async (postId: string) => {
    if (!accessToken) return;

    const post = posts.find(p => p.id === postId);
    if (!post || post.localStatus !== 'failed' || !(post as any)._retryData) return;

    const { content, privacy, mediaIds } = (post as any)._retryData;

    // Mark as pending
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, localStatus: 'pending' } : p));

    try {
      const created = await socialService.createPost({ content, privacy, mediaIds }, accessToken);
      // Replace failed post with real
      setPosts(prev => prev.map(p => p.id === postId ? { ...created, localStatus: 'published' } : p));
    } catch (e) {
      console.error('Retry post failed', e);
      // Mark as failed again
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, localStatus: 'failed' } : p));
      throw e;
    }
  };

  const deleteFailedPost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <SocialContext.Provider value={{ posts, createPost, retryPost, deleteFailedPost, refreshPosts, isLoading }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
