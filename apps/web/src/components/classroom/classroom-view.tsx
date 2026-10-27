'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
  Info,
  LockKeyhole,
  Megaphone,
  MessageSquare,
  Pin,
  Users,
  Video,
} from 'lucide-react';
import type {
  AcademyAssignmentListItemDto,
  AcademyMyAssignmentDto,
  AcademyMyGradeDto,
  AcademySessionDto,
  ClassroomAnnouncementDto,
  ClassroomDto,
} from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/app/markdown';
import { AssignmentRows } from '@/components/academy/assignment-rows';
import { GroupStatusBadge, AssignmentStatusBadge } from '@/components/academy/badges';
import { fmtScore, fmtZoned } from '@/components/academy/format';
import { Button } from '@/components/ui/button';
import { AnnouncementEditor, LessonEditor, TopicEditor } from './editors';
import { RevisionHistory } from './history';
import { ClassroomAction } from './actions';
import { ClassroomFiles } from './files';
import { Discussion, QuestionsList } from './discussions';

const TABS = [
  { key: '', label: 'classroom.stream', icon: Megaphone },
  { key: 'materials', label: 'classroom.materials', icon: BookOpen },
  { key: 'assignments', label: 'classroom.assignments', icon: ClipboardList },
  { key: 'calendar', label: 'classroom.calendar', icon: CalendarDays },
  { key: 'questions', label: 'classroom.questions', icon: MessageSquare },
  { key: 'grades', label: 'classroom.myGrades', icon: GraduationCap },
  { key: 'about', label: 'classroom.about', icon: Info },
] as const;

export function ClassroomHeader({
  data,
  compact = false,
}: {
  data: ClassroomDto;
  compact?: boolean;
}) {
  const g = data.group;
  const staff = g.myRole !== 'STUDENT';
  return (
    <header className={cn('cr-hero', compact && 'compact')}>
      <div className="cr-hero-body">
        <Link href={staff ? '/muellim' : '/akademiya'} className="cr-back">
          <ArrowLeft className="size-4" />
          {t(staff ? 'academy.teacherTitle' : 'academy.title')}
        </Link>
        <div className="cr-eyebrow">
          <span>{g.program.title}</span>
          <span aria-hidden>·</span>
          <span>{g.code}</span>
        </div>
        <h1>{g.name}</h1>
        <p>{g.description || t('classroom.subtitle')}</p>
        <div className="cr-hero-meta">
          <GroupStatusBadge status={g.status} />
          <span>
            <Users className="size-4" />
            {g.activeStudents} {t('classroom.students')}
          </span>
          {g.instructors.map((i) => (
            <span key={i.user.id}>
              <span className="cr-avatar small" aria-hidden>
                {i.user.name.slice(0, 1)}
              </span>
              {i.user.name}
            </span>
          ))}
        </div>
      </div>
      <div className="cr-hero-art" aria-hidden>
        <div className="cr-art-orbit" />
        <div className="cr-art-book">
          <BookOpen />
          <span>DaCy</span>
        </div>
        <span className="cr-art-tag one">{'{ }'}</span>
        <span className="cr-art-tag two">SQL</span>
        <span className="cr-art-dot" />
      </div>
    </header>
  );
}

export function ClassroomView({
  data,
  assignments,
  staffAssignments,
  sessions,
  grades,
  tab,
}: {
  data: ClassroomDto;
  assignments: AcademyMyAssignmentDto[];
  staffAssignments: AcademyAssignmentListItemDto[];
  sessions: AcademySessionDto[];
  grades: AcademyMyGradeDto[];
  tab: string;
}) {
  const base = `/akademiya/sinif/${data.group.id}`;
  const staff = data.group.myRole !== 'STUDENT';
  const [archive, setArchive] = useState(false);
  const visibleTopics = data.topics.filter((t) => archive || !t.archivedAt);
  const todo = assignments
    .filter((a) => ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED', 'MISSED'].includes(a.status))
    .slice(0, 4);
  const next = data.nextSession;
  return (
    <div className="cr-classroom" data-testid="classroom">
      <ClassroomHeader data={data} />
      <nav className="cr-tabs" aria-label={t('classroom.title')}>
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`${base}${item.key ? `?tab=${item.key}` : ''}`}
            aria-current={tab === item.key ? 'page' : undefined}
          >
            <item.icon aria-hidden />
            {t(item.key === 'grades' && staff ? 'classroom.groupGrades' : item.label)}
          </Link>
        ))}
      </nav>
      {data.readOnly ? (
        <p className="cr-notice">
          <LockKeyhole className="size-4" />
          {t('classroom.readOnly')}
        </p>
      ) : null}
      <div className="cr-grid">
        <div className="cr-main">
          {tab === '' ? (
            <>
              <div className="cr-section-head">
                <div>
                  <h2>{t('classroom.stream')}</h2>
                  <p>{t('classroom.announcementHint')}</p>
                </div>
                {data.canManage ? (
                  <AnnouncementEditor viewerId={data.viewerId} groupId={data.group.id} />
                ) : null}
              </div>
              {data.announcements.items.length ? (
                data.announcements.items.map((post) => (
                  <Announcement key={`${post.id}-${post.version}`} post={post} data={data} />
                ))
              ) : (
                <div className="cr-card cr-empty">
                  <Megaphone aria-hidden />
                  <h3>{t('classroom.emptyAnnouncements')}</h3>
                  <p>{t('classroom.emptyAnnouncementsHint')}</p>
                </div>
              )}
              {data.announcements.total > data.announcements.pageSize ? (
                <div className="cr-pagination">
                  {data.announcements.page > 1 ? (
                    <Link
                      className="b b-ghost b-sm"
                      href={`${base}?page=${data.announcements.page - 1}`}
                    >
                      {t('classroom.previous')}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span>{t('classroom.page', { n: data.announcements.page })}</span>
                  {data.announcements.page * data.announcements.pageSize <
                  data.announcements.total ? (
                    <Link
                      className="b b-ghost b-sm"
                      href={`${base}?page=${data.announcements.page + 1}`}
                    >
                      {t('classroom.next')}
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              ) : null}
            </>
          ) : null}
          {tab === 'materials' ? (
            <>
              <div className="cr-section-head">
                <div>
                  <h2>{t('classroom.materials')}</h2>
                  <p>{t('classroom.emptyTopicsHint')}</p>
                </div>
                {data.canManage ? (
                  <TopicEditor
                    viewerId={data.viewerId}
                    groupId={data.group.id}
                    count={data.topics.length}
                  />
                ) : null}
              </div>
              {data.canManage &&
              data.topics.some((x) => x.archivedAt || x.lessons.some((l) => l.archivedAt)) ? (
                <label className="cr-check text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={archive}
                    onChange={(e) => setArchive(e.target.checked)}
                  />
                  {t('classroom.viewArchive')}
                </label>
              ) : null}
              {visibleTopics.length === 0 ? (
                <div className="cr-card cr-empty">
                  <BookOpen aria-hidden />
                  <h3>{t('classroom.emptyTopics')}</h3>
                  <p>{t('classroom.emptyTopicsHint')}</p>
                </div>
              ) : null}
              {visibleTopics.map((topic, index) => (
                <section className="cr-card cr-topic" key={topic.id}>
                  <div className="cr-topic-head">
                    <span className="cr-topic-number">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <h3>
                        {topic.title}
                        {topic.archivedAt ? (
                          <span className="cr-tag ml-2">{t('classroom.archived')}</span>
                        ) : null}
                      </h3>
                      {topic.description ? <p>{topic.description}</p> : null}
                    </div>
                  </div>
                  <ul className="cr-lessons">
                    {topic.lessons
                      .filter((l) => archive || !l.archivedAt)
                      .map((lesson) => (
                        <li key={lesson.id}>
                          <Link href={`${base}/ders/${lesson.id}`}>
                            <span className="cr-list-icon">
                              <BookOpen aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <b>{lesson.title}</b>
                              <span className="cr-row-meta">
                                <span>
                                  {t('classroom.files')}: {lesson.fileCount}
                                </span>
                                {lesson.stepCount > 0 ? (
                                  <span>
                                    {t('classroom.practices')}: {lesson.stepCount}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            {staff ? <Publication item={lesson} /> : null}
                            <ChevronRight className="size-4 shrink-0 text-muted" />
                          </Link>
                        </li>
                      ))}
                  </ul>
                  {topic.lessons.filter((l) => archive || !l.archivedAt).length === 0 ? (
                    <p className="cr-topic-empty">{t('classroom.emptyLessons')}</p>
                  ) : null}
                  {data.canManage ? (
                    <div className="cr-topic-actions">
                      {!topic.archivedAt ? (
                        <>
                          <LessonEditor
                            viewerId={data.viewerId}
                            groupId={data.group.id}
                            topics={data.topics}
                            topicId={topic.id}
                          />
                          <TopicEditor
                            viewerId={data.viewerId}
                            groupId={data.group.id}
                            initial={topic}
                          />
                        </>
                      ) : null}
                      <ClassroomAction
                        path={`/academy/classroom/topics/${topic.id}/archive`}
                        body={{ archived: !topic.archivedAt }}
                        confirm={topic.archivedAt ? undefined : 'archive'}
                      >
                        {t(topic.archivedAt ? 'classroom.restore' : 'classroom.archive')}
                      </ClassroomAction>
                    </div>
                  ) : null}
                </section>
              ))}
            </>
          ) : null}
          {tab === 'assignments' ? (
            <section className="cr-card">
              <div className="cr-section-head">
                <h2>{t('classroom.assignments')}</h2>
                {data.group.permissions.includes('assignment.createDraft') && !data.readOnly ? (
                  <Link
                    href={`/muellim/qruplar/${data.group.id}/yeni-tapsiriq`}
                    className="b b-brand b-sm"
                  >
                    {t('academy.teacher.newAssignment')}
                  </Link>
                ) : null}
              </div>
              {staff ? (
                <ul className="cr-task-list">
                  {staffAssignments.map((a) => (
                    <li key={a.id}>
                      <Link href={`/muellim/tapsiriqlar/${a.id}`}>
                        <span className="cr-list-icon">
                          <ClipboardList aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b>{a.title}</b>
                          <span className="cr-row-meta">
                            <span>
                              {t('classroom.due')}: {fmtZoned(a.dueAt, { tz: data.group.timezone })}
                            </span>
                            <span>
                              {a.submittedCount} / {a.expectedCount}
                            </span>
                          </span>
                        </span>
                        <AssignmentStatusBadge status={a.status} />
                        <ChevronRight className="size-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <AssignmentRows rows={assignments} />
              )}
              {(staff ? staffAssignments : assignments).length === 0 ? (
                <p className="cr-empty-small">{t('classroom.noAssignments')}</p>
              ) : null}
            </section>
          ) : null}
          {tab === 'calendar' ? (
            <Calendar
              sessions={sessions}
              assignments={
                staff ? staffAssignments.filter((a) => a.status === 'PUBLISHED') : assignments
              }
              groupId={data.group.id}
              staff={staff}
              timezone={data.group.timezone}
            />
          ) : null}
          {tab === 'questions' ? (
            <QuestionsList
              groupId={data.group.id}
              readOnly={
                data.readOnly || (!staff && !data.group.permissions.includes('student.submit'))
              }
            />
          ) : null}
          {tab === 'grades' ? (
            <section className="cr-card">
              <div className="cr-section-head">
                <h2>{t(staff ? 'classroom.groupGrades' : 'classroom.myGrades')}</h2>
              </div>
              {staff ? (
                <Link
                  href={`/muellim/qruplar/${data.group.id}?tab=gradebook`}
                  className="b b-brand b-sm"
                >
                  {t('classroom.groupGrades')}
                  <ArrowRight className="size-4" />
                </Link>
              ) : grades.length ? (
                <ul className="cr-task-list">
                  {grades.map((g) => (
                    <li key={g.assignmentId}>
                      <Link href={`/akademiya/tapsiriqlar/${g.assignmentId}`}>
                        <span className="cr-list-icon done">
                          <GraduationCap aria-hidden />
                        </span>
                        <span className="flex-1 min-w-0">
                          <b>{g.assignmentTitle}</b>
                          {g.feedback ? <span className="cr-row-meta">{g.feedback}</span> : null}
                        </span>
                        <strong className="cr-grade">
                          {fmtScore(g.finalScore)}
                          <small> / {fmtScore(g.maxScore)}</small>
                        </strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cr-empty-small">{t('academy.empty.grades')}</p>
              )}
            </section>
          ) : null}
          {tab === 'about' ? (
            <section className="cr-card">
              <div className="cr-section-head">
                <h2>{t('classroom.about')}</h2>
              </div>
              <Markdown content={data.group.description || data.group.program.title} />
              <dl className="cr-about">
                <div>
                  <dt>{t('classroom.instructor')}</dt>
                  <dd>{data.group.instructors.map((i) => i.user.name).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>{t('classroom.students')}</dt>
                  <dd>{data.group.activeStudents}</dd>
                </div>
                <div>
                  <dt>{t('classroom.format')}</dt>
                  <dd>{t(`academy.format.${data.group.format}`)}</dd>
                </div>
                <div>
                  <dt>{t('classroom.timezone')}</dt>
                  <dd>{data.group.timezone}</dd>
                </div>
                <div>
                  <dt>{t('classroom.dates')}</dt>
                  <dd>
                    {fmtZoned(data.group.startAt, { time: false })} —{' '}
                    {fmtZoned(data.group.endAt, { time: false })}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>
        <aside className="cr-side">
          <section className="cr-card cr-next">
            <span className="cr-side-kicker">
              <Video className="size-4" />
              {t('classroom.nextClass')}
            </span>
            {next ? (
              <>
                <h3>{next.title}</h3>
                <p>
                  <CalendarDays className="size-4" />
                  {fmtZoned(next.startsAt, { tz: data.group.timezone })}
                </p>
                <p>
                  <Clock3 className="size-4" />
                  {data.group.timezone}
                </p>
                {next.meetingUrl ? (
                  <a
                    href={next.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="b b-brand b-sm"
                  >
                    {t('classroom.joinClass')}
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </>
            ) : (
              <p>{t('academy.overview.noNext')}</p>
            )}
          </section>
          {!staff ? (
            <section className="cr-card">
              <h3 className="cr-side-kicker">
                <ClipboardList className="size-4" />
                {t('classroom.todo')}
              </h3>
              {todo.length ? (
                <ul className="cr-todo">
                  {todo.map((a) => (
                    <li key={a.id}>
                      <Link href={`/akademiya/tapsiriqlar/${a.id}`}>
                        <span className={cn('cr-todo-dot', a.overdue && 'late')} />
                        <span>
                          <b>{a.title}</b>
                          <small>{fmtZoned(a.effectiveDueAt, { tz: data.group.timezone })}</small>
                        </span>
                        <ChevronRight className="size-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cr-all-done">
                  <Check className="size-4" />
                  {t('classroom.allDone')}
                </p>
              )}
            </section>
          ) : (
            <section className="cr-card cr-side-links">
              <h3 className="cr-side-kicker">
                <GraduationCap className="size-4" />
                {t('classroom.staffWorkspace')}
              </h3>
              <Link href={`/muellim/qruplar/${data.group.id}`}>
                {t('classroom.staffWorkspace')}
                <ArrowRight className="size-4" />
              </Link>
              <Link href={`/muellim/qruplar/${data.group.id}?tab=gradebook`}>
                {t('classroom.groupGrades')}
                <ArrowRight className="size-4" />
              </Link>
              <Link href={`/muellim/qruplar/${data.group.id}?tab=sessions`}>
                {t('classroom.calendar')}
                <ArrowRight className="size-4" />
              </Link>
            </section>
          )}
          <div className="cr-side-foot">
            <span className="cr-avatar small">D</span>
            <span>
              DaCy Academy
              <br />
              <small>{data.group.code}</small>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Publication({
  item,
}: {
  item: {
    archivedAt: string | null;
    isPublished: boolean;
    publishAt: string;
    publicationStatus: string;
  };
}) {
  return (
    <span className={cn('cr-tag', item.isPublished && !item.archivedAt && 'published')}>
      {item.publicationStatus === 'ARCHIVED'
        ? t('classroom.archived')
        : item.publicationStatus === 'DRAFT'
          ? t('classroom.draft')
          : item.publicationStatus === 'SCHEDULED'
            ? t('classroom.scheduled')
            : t('classroom.published')}
    </span>
  );
}

function Announcement({ post, data }: { post: ClassroomAnnouncementDto; data: ClassroomDto }) {
  const [comments, setComments] = useState(false);
  const [read, setRead] = useState(post.read);
  const staff = data.group.myRole !== 'STUDENT';
  const canReply = !data.readOnly && (staff || data.group.permissions.includes('student.submit'));
  return (
    <article
      className={cn('cr-card cr-announcement', post.pinned && 'pinned')}
      data-testid="classroom-announcement"
    >
      <div className="cr-announcement-head">
        <span className="cr-avatar staff" aria-hidden>
          {post.authorName.slice(0, 1)}
        </span>
        <div className="flex-1 min-w-0">
          <b>{post.authorName}</b>
          <time dateTime={post.publishAt}>
            {fmtZoned(post.publishAt, { tz: data.group.timezone })}
          </time>
        </div>
        {post.pinned ? (
          <span className="cr-tag">
            <Pin className="size-3" />
            {t('classroom.pinned')}
          </span>
        ) : null}
        {!read && !staff ? <span className="cr-tag published">{t('classroom.unread')}</span> : null}
        {staff ? <Publication item={post} /> : null}
      </div>
      <h3>{post.title}</h3>
      <Markdown content={post.body} />
      {post.links.length ? (
        <div className="cr-attachments">
          {post.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              <span>{l.label}</span>
              <ArrowRight className="size-4" />
            </a>
          ))}
        </div>
      ) : null}
      <ClassroomFiles
        id={post.id}
        kind="announcement"
        files={post.files}
        canManage={data.canManage}
        compact
      />
      <div className="cr-announcement-footer">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setComments(!comments)}
          aria-expanded={comments}
        >
          <MessageSquare className="size-4" />
          {t('classroom.comments')} <span className="cr-count">{post.replyCount}</span>
        </Button>
        {!read ? (
          <ClassroomAction
            path={`/academy/classroom/announcements/${post.id}/read`}
            onDone={() => setRead(true)}
          >
            <Check className="size-4" />
            {t('classroom.markRead')}
          </ClassroomAction>
        ) : null}
        {data.canManage ? (
          <div className="ml-auto flex flex-wrap">
            <RevisionHistory kind="announcement" id={post.id} version={post.version} />
            <AnnouncementEditor viewerId={data.viewerId} groupId={data.group.id} initial={post} />
            <ClassroomAction
              path={`/academy/classroom/announcements/${post.id}/archive`}
              body={{ archived: !post.archivedAt, expectedVersion: post.version }}
              confirm={post.archivedAt ? undefined : 'archive'}
            >
              <Archive className="size-4" />
              {t(post.archivedAt ? 'classroom.restore' : 'classroom.archive')}
            </ClassroomAction>
          </div>
        ) : null}
      </div>
      {comments ? (
        <Discussion
          kind="announcement"
          id={post.id}
          readOnly={!canReply || !post.commentsEnabled || !!post.archivedAt}
        />
      ) : null}
    </article>
  );
}

function Calendar({
  sessions,
  assignments,
  groupId,
  staff,
  timezone,
}: {
  sessions: AcademySessionDto[];
  assignments: Array<{ id: string; title: string; dueAt: string }>;
  groupId: string;
  staff: boolean;
  timezone: string;
}) {
  const events = [
    ...sessions
      .filter((s) => s.status !== 'CANCELLED')
      .map((s) => ({
        id: s.id,
        title: s.title,
        at: s.startsAt,
        type: 'session' as const,
        href: staff
          ? `/muellim/dersler/${s.id}`
          : (s.meetingUrl ?? `/akademiya/sinif/${groupId}?tab=calendar`),
      })),
    ...assignments.map((a) => ({
      id: a.id,
      title: a.title,
      at: a.dueAt,
      type: 'assignment' as const,
      href: staff ? `/muellim/tapsiriqlar/${a.id}` : `/akademiya/tapsiriqlar/${a.id}`,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section className="cr-card">
      <div className="cr-section-head">
        <h2>{t('classroom.calendar')}</h2>
        <span className="cr-tag">{timezone}</span>
      </div>
      {events.length ? (
        <ul className="cr-calendar">
          {events.map((e) => (
            <li key={`${e.type}-${e.id}`}>
              <span className={`cr-list-icon ${e.type === 'session' ? 'blue' : ''}`}>
                {e.type === 'session' ? <Video aria-hidden /> : <ClipboardList aria-hidden />}
              </span>
              <div>
                <span className="cr-row-meta">
                  {fmtZoned(e.at, { tz: timezone })} ·{' '}
                  {t(e.type === 'session' ? 'classroom.session' : 'classroom.due')}
                </span>
                <Link
                  href={e.href}
                  target={e.href.startsWith('https://') ? '_blank' : undefined}
                  rel={e.href.startsWith('https://') ? 'noopener noreferrer' : undefined}
                >
                  {e.title}
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="cr-empty">
          <CalendarDays aria-hidden />
          <p>{t('classroom.noEvents')}</p>
        </div>
      )}
    </section>
  );
}
