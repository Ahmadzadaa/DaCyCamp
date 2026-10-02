import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Daxil olmuş istifadəçi üçün limit istifadəçi id-sinə, anonim üçün IP-yə görə */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { id?: string } | undefined;
    return user?.id ?? (req.ip as string | undefined) ?? 'anon';
  }
}
