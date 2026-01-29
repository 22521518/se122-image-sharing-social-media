import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Map Lifed',
  slug: 'cross-platform',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/logo.png',
  scheme: 'crossplatform',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      // foregroundImage: './assets/images/android-icon-foreground.png',
      // backgroundImage: './assets/images/android-icon-background.png',
      // monochromeImage: './assets/images/android-icon-monochrome.png'
      foregroundImage: './assets/images/logo.png',
      backgroundImage: './assets/images/logo.png',
      monochromeImage: './assets/images/logo.png'
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS"
    ],
    package: 'com.anonymous.crossplatform',
  },
  web: {
    bundler: 'metro',
    favicon: './assets/images/logo.png'
  },
  plugins: [
    [
      'expo-router',
      {
        root: './app'
      }
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/logo.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000'
        }
      }
    ],
    'expo-audio'
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  }
});
