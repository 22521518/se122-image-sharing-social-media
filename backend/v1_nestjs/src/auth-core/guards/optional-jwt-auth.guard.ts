import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard - Allows both authenticated and unauthenticated requests.
 * 
 * Behavior:
 * - ALWAYS allows the request through (never returns 401)
 * - If a valid JWT is present, populates req.user
 * - If no JWT or invalid JWT, req.user is undefined
 * 
 * Use this guard for public endpoints where you want optional user context.
 * For endpoints requiring authentication, use JwtAuthGuard instead.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Always try to authenticate, but we'll handle failures gracefully in handleRequest
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any, _context: ExecutionContext) {
    // ALWAYS allow the request through - this is the key difference from JwtAuthGuard
    // If authentication fails (no token, invalid token, etc.), just return undefined
    // The controller can check req.user to see if the user is authenticated
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}

