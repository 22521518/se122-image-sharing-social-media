import { ApiService as api } from './api.service';

export interface Media {
  id: string;
  url: string;
  type: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export const mediaService = {
  async uploadMedia(fileUri: string, mimeType: string): Promise<Media> {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'upload.jpg';

    // Append file
    // @ts-ignore: FormData expects Blob/File, but React Native expects object with uri/name/type
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    });

    return api.uploadFormData<Media>('/api/media/upload', formData);
  }
};
