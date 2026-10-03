import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { NotificationsService } from './notifications.service';
import { CurrentUser, type AuthUser } from '../common/decorators';

@Controller('me')
export class DashboardController {
  constructor(
    private readonly dash: DashboardService,
    private readonly notifications: NotificationsService,
  ) {}
  @Get('dashboard')
  get(@CurrentUser() u: AuthUser) {
    return this.dash.get(u.id);
  }
  /** qabıq üçün: XP, seriya, həftəlik hədəf, oxunmamış bildirişlər */
  @Get('summary')
  summary(@CurrentUser() u: AuthUser) {
    return this.dash.summary(u.id);
  }
  @Get('notifications')
  list(@CurrentUser() u: AuthUser) {
    return this.notifications.list(u.id);
  }
  @Post('notifications/seen')
  @HttpCode(200)
  seen(@CurrentUser() u: AuthUser) {
    return this.notifications.markSeen(u.id);
  }
}
