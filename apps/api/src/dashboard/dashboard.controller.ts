import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, type AuthUser } from '../common/decorators';

@Controller('me')
export class DashboardController {
  constructor(private readonly dash: DashboardService) {}
  @Get('dashboard')
  get(@CurrentUser() u: AuthUser) {
    return this.dash.get(u.id);
  }
}
