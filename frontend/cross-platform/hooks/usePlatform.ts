/**
 * Platform detection hook for responsive layouts
 * Works on both React Native and Web
 */

import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

type PlatformType = 'mobile' | 'tablet' | 'desktop';

interface PlatformInfo {
  platform: PlatformType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  isNative: boolean;
  screenWidth: number;
}

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;

function getPlatformInfo(width: number): PlatformInfo {
  // On native platforms, always treat as mobile
  if (Platform.OS !== 'web') {
    return {
      platform: 'mobile',
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isWeb: false,
      isNative: true,
      screenWidth: width,
    };
  }

  // On web, use breakpoints
  const isMobile = width < MOBILE_BREAKPOINT;
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isDesktop = width >= TABLET_BREAKPOINT;

  let platform: PlatformType = 'desktop';
  if (isMobile) platform = 'mobile';
  else if (isTablet) platform = 'tablet';

  return {
    platform,
    isMobile,
    isTablet,
    isDesktop,
    isWeb: true,
    isNative: false,
    screenWidth: width,
  };
}

export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    const initialWidth = Dimensions.get('window').width;
    return getPlatformInfo(initialWidth);
  });

  useEffect(() => {
    // Only listen for resize on web
    if (Platform.OS !== 'web') return;

    const handleResize = () => {
      const width = Dimensions.get('window').width;
      setPlatformInfo(getPlatformInfo(width));
    };

    // Subscribe to dimension changes
    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => {
      subscription?.remove();
    };
  }, []);

  return platformInfo;
}

/**
 * Simplified hook for checking if current view should be treated as mobile
 * Returns true for mobile, tablet, and all native platforms
 */
export function useIsMobileView(): boolean {
  const { isMobile, isTablet, isNative } = usePlatform();
  return isNative || isMobile || isTablet;
}

/**
 * Hook for checking if sidebar should be shown
 * Returns true only on desktop web
 */
export function useShouldShowSidebar(): boolean {
  const { isDesktop, isWeb } = usePlatform();
  return isWeb && isDesktop;
}
