import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  createSupportTicketSchema,
  supportListQuery,
  supportMessageSchema,
  supportStatusSchema,
  type CreateSupportTicketInput,
} from '@dacy/shared';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { SupportService } from './support.service';

/** Dəstək: tələbə öz müraciətləri (giriş tələb olunur), heyət — hamısı */
@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('support/tickets')
  mine(@CurrentUser() u: AuthUser) {
    return this.support.mine(u.id);
  }

  @Post('support/tickets')
  create(
    @Body(new ZodPipe(createSupportTicketSchema)) dto: CreateSupportTicketInput,
    @CurrentUser() u: AuthUser,
  ) {
    return this.support.create(u.id, dto);
  }

  @Get('support/tickets/:id')
  getMine(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.support.getMine(u.id, id);
  }

  @Post('support/tickets/:id/messages')
  replyMine(
    @Param('id') id: string,
    @Body(new ZodPipe(supportMessageSchema)) dto: { body: string },
    @CurrentUser() u: AuthUser,
  ) {
    return this.support.replyAsStudent(u.id, id, dto.body);
  }

  @Staff()
  @Get('admin/support')
  adminList(@Query(new ZodPipe(supportListQuery)) q: z.infer<typeof supportListQuery>) {
    return this.support.adminList(q.status, q.q);
  }

  @Staff()
  @Get('admin/support/open-count')
  async openCount() {
    return { open: await this.support.openCount() };
  }

  @Staff()
  @Get('admin/support/:id')
  adminGet(@Param('id') id: string) {
    return this.support.adminGet(id);
  }

  @Staff()
  @Post('admin/support/:id/messages')
  reply(
    @Param('id') id: string,
    @Body(new ZodPipe(supportMessageSchema)) dto: { body: string },
    @CurrentUser() u: AuthUser,
  ) {
    return this.support.reply(u.id, id, dto.body);
  }

  @Staff()
  @Patch('admin/support/:id')
  setStatus(
    @Param('id') id: string,
    @Body(new ZodPipe(supportStatusSchema)) dto: { status: 'OPEN' | 'CLOSED' },
  ) {
    return this.support.setStatus(id, dto.status);
  }
}
