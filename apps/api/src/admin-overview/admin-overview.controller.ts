import { Controller, Get, Query } from '@nestjs/common';
import { Staff } from '../common/decorators';
import { AdminOverviewService } from './admin-overview.service';

@Controller('admin')
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}
  @Staff()
  @Get('overview')
  get() {
    return this.overview.get();
  }
  @Staff()
  @Get('search')
  search(@Query('q') q?: string) {
    return this.overview.search(typeof q === 'string' ? q : '');
  }
}
