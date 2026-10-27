import { z } from 'zod';
import { idSchema } from '../api/dto';
import { safeUrlSchema } from './schemas';
import type { AcademyFileDto, AcademyGroupDto, AcademySessionDto } from './types';

const title = z.string().trim().min(1).max(200);
const body = z.string().trim().max(50_000);
export const classroomLinkSchema = z.object({ label: title, url: safeUrlSchema });
const links = z.array(classroomLinkSchema).max(20).default([]);
const publishing = {
  isPublished: z.boolean().default(false),
  publishAt: z.iso.datetime({ offset: true }).optional(),
};
export const classroomTopicSchema = z.object({
  title,
  description: z.string().trim().max(2000).default(''),
  order: z.number().int().min(0).max(10000).default(0),
});
export const classroomLessonSchema = z.object({
  topicId: idSchema,
  title,
  content: body.default(''),
  videoUrl: safeUrlSchema.nullable().optional(),
  links,
  stepIds: z.array(idSchema).max(20).default([]),
  order: z.number().int().min(0).max(10000).default(0),
  ...publishing,
});
export const classroomLessonUpdateSchema = classroomLessonSchema.extend({
  expectedVersion: z.number().int().min(1),
});
export const classroomAnnouncementSchema = z.object({
  title,
  body: body.refine((v) => v.length > 0, 'Mətn boş ola bilməz'),
  links,
  pinned: z.boolean().default(false),
  commentsEnabled: z.boolean().default(true),
  ...publishing,
});
export const classroomAnnouncementUpdateSchema = classroomAnnouncementSchema.extend({
  expectedVersion: z.number().int().min(1),
});
export const classroomArchiveSchema = z.object({
  archived: z.boolean(),
  expectedVersion: z.number().int().min(1),
});
export const classroomQuestionSchema = z.object({
  title,
  body: body.refine((v) => v.length > 0),
  isPrivate: z.boolean().default(false),
  assignmentId: idSchema.optional(),
});
export const classroomReplySchema = z.object({ body: z.string().trim().min(1).max(5000) });
export const classroomPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type ClassroomTopicInput = z.infer<typeof classroomTopicSchema>;
export type ClassroomLessonInput = z.infer<typeof classroomLessonSchema>;
export type ClassroomLessonUpdateInput = z.infer<typeof classroomLessonUpdateSchema>;
export type ClassroomAnnouncementInput = z.infer<typeof classroomAnnouncementSchema>;
export type ClassroomAnnouncementUpdateInput = z.infer<typeof classroomAnnouncementUpdateSchema>;
export type ClassroomQuestionInput = z.infer<typeof classroomQuestionSchema>;
export type ClassroomLink = z.infer<typeof classroomLinkSchema>;

export type ClassroomPublication = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export interface ClassroomLessonSummary {
  publicationStatus: ClassroomPublication;
  id: string;
  topicId: string;
  title: string;
  order: number;
  isPublished: boolean;
  publishAt: string;
  archivedAt: string | null;
  version: number;
  fileCount: number;
  stepCount: number;
}
export interface ClassroomLessonDto extends ClassroomLessonSummary {
  groupId: string;
  content: string;
  videoUrl: string | null;
  links: ClassroomLink[];
  stepIds: string[];
  files: AcademyFileDto[];
  canManage: boolean;
  steps: Array<{ id: string; title: string; type: string; courseTitle: string }>;
}
export interface ClassroomTopicDto {
  id: string;
  title: string;
  description: string;
  order: number;
  archivedAt: string | null;
  lessons: ClassroomLessonSummary[];
}
export interface ClassroomAnnouncementDto {
  files: AcademyFileDto[];
  publicationStatus: ClassroomPublication;
  id: string;
  title: string;
  body: string;
  links: ClassroomLink[];
  pinned: boolean;
  commentsEnabled: boolean;
  isPublished: boolean;
  publishAt: string;
  archivedAt: string | null;
  version: number;
  authorName: string;
  read: boolean;
  replyCount: number;
}
export interface ClassroomReplyDto {
  id: string;
  body: string;
  authorName: string;
  isStaff: boolean;
  createdAt: string;
  canHide: boolean;
}
export interface ClassroomQuestionDto {
  id: string;
  groupId: string;
  assignmentId: string | null;
  title: string;
  body: string;
  isPrivate: boolean;
  resolvedAt: string | null;
  authorName: string;
  createdAt: string;
  replyCount: number;
  canResolve: boolean;
}
export interface ClassroomPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface ClassroomDto {
  viewerId: string;
  group: AcademyGroupDto;
  canManage: boolean;
  readOnly: boolean;
  topics: ClassroomTopicDto[];
  announcements: ClassroomPage<ClassroomAnnouncementDto>;
  nextSession: AcademySessionDto | null;
}

export interface ClassroomRevisionDto {
  id: string;
  version: number;
  actorName: string;
  createdAt: string;
  snapshot: Record<string, unknown>;
}
export interface ClassroomTeacherDeskDto {
  sessions: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    groupCode: string;
    timezone: string;
    meetingUrl: string | null;
  }>;
  reviews: Array<{
    submissionId: string;
    assignmentId: string;
    title: string;
    studentName: string;
    groupCode: string;
    submittedAt: string;
    attemptNumber: number;
  }>;
  questions: Array<ClassroomQuestionDto & { groupCode: string }>;
  reviewCount: number;
  questionCount: number;
}
