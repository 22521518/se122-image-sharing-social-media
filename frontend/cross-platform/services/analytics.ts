/**
 * Analytics/Telemetry Service
 * Tracks user events and funnel metrics
 */

type TelemetryEvent =
  | 'ONBOARDING_STARTED'
  | 'ONBOARDING_SKIPPED'
  | 'ONBOARDING_COMPLETED'
  | 'MEMORY_CREATED'
  | 'USER_REGISTERED'
  | 'USER_LOGIN';

interface TelemetryProperties {
  [key: string]: string | number | boolean | undefined;
}

class AnalyticsService {
  private enabled: boolean = true;

  /**
   * Track an event with optional properties
   */
  track(event: TelemetryEvent, properties?: TelemetryProperties): void {
    if (!this.enabled) return;

    // Log to console in development
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties || {});
    }

    // TODO: Integrate with actual analytics provider (e.g., Firebase Analytics, Mixpanel, etc.)
    // Example:
    // firebase.analytics().logEvent(event, properties);
  }

  /**
   * Identify user (set user properties)
   */
  identify(userId: string, traits?: TelemetryProperties): void {
    if (!this.enabled) return;

    if (__DEV__) {
      console.log(`[Analytics] Identify User: ${userId}`, traits || {});
    }

    // TODO: Set user ID in analytics provider
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const analytics = new AnalyticsService();
export type { TelemetryEvent, TelemetryProperties };
