import { Platform } from 'react-native';
import { ApiService as api } from './api.service';

export interface Media {
  id: string;
  url: string;
  type: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// File size limits in bytes (must match backend)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_OTHER_SIZE = 25 * 1024 * 1024; // 25MB for audio/video/files

export const mediaService = {
  async uploadMedia(fileUri: string, mimeType: string, token?: string | null): Promise<Media> {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'upload.jpg';

    let fileSize = 0;
    let blob: Blob | null = null;

    if (Platform.OS === 'web') {
      const response = await fetch(fileUri);
      blob = await response.blob();
      fileSize = blob.size;
      formData.append('file', blob, filename);
    } else {
      // For native, we'll let the backend validate since we can't easily get file size
      // @ts-ignore: FormData expects Blob/File, but React Native expects object with uri/name/type
      formData.append('file', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      });
    }

    // Validate file size on web
    if (Platform.OS === 'web' && fileSize > 0) {
      const isImage = mimeType.startsWith('image/');
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_OTHER_SIZE;
      const maxSizeMB = maxSize / (1024 * 1024);

      if (fileSize > maxSize) {
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        throw new Error(
          `File quá lớn. Giới hạn cho ${isImage ? 'ảnh' : 'audio/video/file'} là ${maxSizeMB}MB. File của bạn: ${fileSizeMB}MB`
        );
      }
    }

    return api.uploadFormData<Media>('/api/media/upload', formData, token);
  },

  /**
   * Upload an image file
   */
  async uploadImage(fileUri: string, token?: string | null, mimeType?: string): Promise<Media> {
    if (!mimeType) {
      const extension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      mimeType = mimeTypes[extension] || 'image/jpeg';
    }
    return this.uploadMedia(fileUri, mimeType, token);
  },

  /**
   * Upload an audio file
   */
  async uploadAudio(fileUri: string, token?: string | null, mimeType?: string): Promise<Media> {
    if (!mimeType) {
      const extension = fileUri.split('.').pop()?.toLowerCase() || 'm4a';
      const mimeTypes: Record<string, string> = {
        m4a: 'audio/mp4',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        aac: 'audio/aac',
        webm: 'audio/webm',
      };
      mimeType = mimeTypes[extension] || 'audio/mp4';
    }
    return this.uploadMedia(fileUri, mimeType, token);
  },

  /**
   * Upload a generic file (document, pdf, etc.)
   */
  async uploadFile(fileUri: string, token?: string | null, mimeType?: string): Promise<Media> {
    if (!mimeType) {
      mimeType = 'application/octet-stream';
    }
    return this.uploadMedia(fileUri, mimeType, token);
  },
};
