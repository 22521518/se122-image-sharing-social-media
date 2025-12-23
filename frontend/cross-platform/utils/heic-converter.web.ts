
import { Platform } from 'react-native';

const heicConverter = {
  isHeicFile: (file: File): boolean => {
    return file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
  },

  convertHeicToJpeg: async (file: File): Promise<{ success: boolean; blob?: Blob; error?: string }> => {
    try {
      if (Platform.OS !== 'web') {
        return { success: false, error: 'HEIC conversion only needed/support on web' };
      }

      // Dynamic import to avoid bundling issues
      const heic2any = (await import('heic2any')).default;

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });

      const jpegBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      return { success: true, blob: jpegBlob };

    } catch (error) {
      console.error('HEIC conversion failed:', error);
      return { success: false, error: String(error) };
    }
  },

  convertHeicDataUrlToJpeg: async (dataUrl: string): Promise<{ success: boolean; dataUrl?: string; error?: string }> => {
    try {
      if (Platform.OS !== 'web') {
        return { success: false, error: 'HEIC conversion only needed/support on web' };
      }

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (!blob.type.includes('heic') && !dataUrl.includes('image/heic')) {
        // Might be mislabeled, but if browser can read it, maybe okay?
      }

      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: blob,
        toType: 'image/jpeg',
        quality: 0.8
      });

      const jpegBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ success: true, dataUrl: reader.result as string });
        };
        reader.onerror = () => resolve({ success: false, error: 'Failed to read converted blob' });
        reader.readAsDataURL(jpegBlob);
      });

    } catch (error) {
      console.error('HEIC conversion error:', error);
      return { success: false, error: String(error) };
    }
  }
};

export default heicConverter;
