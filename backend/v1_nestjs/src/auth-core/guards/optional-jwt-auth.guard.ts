import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * OptionalJwtAuthGuard - Similar to JwtAuthGuard but allows unauthenticated requests.
 * 
 * For public routes (marked with @Public()):
 * - Always allows the request through
 * - If a valid JWT is present, populates req.user
 * - If no JWT or invalid JWT, req.user is undefined
 * 
 * For protected routes:
 * - Behaves like standard JwtAuthGuard (401 if unauthenticated)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, try to authenticate but don't require it
      return super.canActivate(context);
    }

    // For protected routes, require authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public routes, don't throw on authentication failure
    if (isPublic) {
      // If there's an error or no user, just return undefined (unauthenticated access allowed)
      if (err || !user) {
        return undefined;
      }
      return user;
    }

    // For protected routes, throw on authentication failure
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}
