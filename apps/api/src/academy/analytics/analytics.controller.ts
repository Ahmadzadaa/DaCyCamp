import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyNotificationsService } from '../notifications/academy-notifications.service';
import { AcademyAnalyticsService } from './analytics.service';

/** Analitika, müəllim / admin ümumi baxışı və akademiya bildirişləri */
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class AcademyAnalyticsController {
  constructor(
    private readonly svc: AcademyAnalyticsService,
    private readonly notifications: AcademyNotificationsService,
  ) {}

  @Get('groups/:id/analytics')
  group(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.group(u, id);
  }

  @Get('instructor/overview')
  instructor(@CurrentUser() u: AuthUser) {
    return this.svc.instructorOverview(u);
  }

  @Get('admin/overview')
  admin(@CurrentUser() u: AuthUser) {
    return this.svc.adminOverview(u);
  }

  @Get('me/notifications')
  myNotifications(@CurrentUser() u: AuthUser) {
    return this.notifications.list(u);
  }

  @Post('me/notifications/read-all')
  @HttpCode(200)
  readAll(@CurrentUser() u: AuthUser) {
    return this.notifications.markAllRead(u.id);
  }

  @Post('me/notifications/:id/read')
  @HttpCode(200)
  read(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(u, id);
  }
}
