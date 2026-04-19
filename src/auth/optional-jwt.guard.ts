import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Allows both authenticated and unauthenticated requests.
 * Populates req.user if a valid JWT is present, otherwise null.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // ignore — allow unauthenticated
    }
    return true;
  }

  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return user || null;
  }
}
