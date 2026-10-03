import { Controller, Get, Param, Query } from '@nestjs/common';
import type { LeaderboardPeriod } from '@dacy/shared';
import { CurrentUser, OptionalAuth, type AuthUser } from '../common/decorators';
import { HubService } from './hub.service';

const PERIODS: LeaderboardPeriod[] = ['week', 'month', 'all'];

@Controller()
export class HubController {
  constructor(private readonly hub: HubService) {}

  @Get('me/activity')
  activity(@CurrentUser() u: AuthUser) {
    return this.hub.activity(u.id);
  }

  @OptionalAuth()
  @Get('leaderboard')
  leaderboard(@CurrentUser() u: AuthUser | undefined, @Query('period') period?: string) {
    const p = PERIODS.find((x) => x === period) ?? 'week';
    return this.hub.leaderboard(p, u?.id ?? null);
  }

  @Get('me/practice')
  practice(@CurrentUser() u: AuthUser) {
    return this.hub.practice(u.id);
  }

  @Get('me/exams')
  exams(@CurrentUser() u: AuthUser) {
    return this.hub.exams(u.id);
  }

  @Get('me/projects')
  projects(@CurrentUser() u: AuthUser) {
    return this.hub.projects(u.id);
  }

  @OptionalAuth()
  @Get('contests')
  contests(@CurrentUser() u: AuthUser | undefined) {
    return this.hub.contests(u?.id ?? null);
  }

  @OptionalAuth()
  @Get('contests/:stepId')
  board(@CurrentUser() u: AuthUser | undefined, @Param('stepId') stepId: string) {
    return this.hub.contestBoard(stepId, u?.id ?? null);
  }
}
