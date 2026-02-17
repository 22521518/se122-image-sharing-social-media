/**
 * JWT Utility Functions
 * 
 * Handles JWT token decoding and validation
 */

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token JWT token string
 * @returns true if expired, false if valid
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return true; // Invalid token or no expiry - treat as expired
  }

  const currentTime = Math.floor(Date.now() / 1000);
  // Add a 30-second buffer to expire tokens slightly early
  return payload.exp - 30 < currentTime;
}

/**
 * Get time remaining until token expires (in seconds)
 * @param token JWT token string
 * @returns Seconds until expiry, or 0 if expired/invalid
 */
export function getTokenTimeRemaining(token: string): number {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - currentTime;
  return Math.max(0, remaining);
}

/**
 * Extract user info from JWT token
 * @param token JWT token string
 * @returns User info object or null if invalid
 */
export function extractUserFromToken(token: string): { id: string; email: string } | null {
  const payload = decodeJwt(token);
  if (!payload || !payload.sub || !payload.email) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
  };
}
