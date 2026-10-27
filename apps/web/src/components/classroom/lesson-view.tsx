'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpRight, Archive, BookOpen, ExternalLink } from 'lucide-react';
import type { ClassroomDto, ClassroomLessonDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Markdown } from '@/components/app/markdown';
import { VideoEmbed } from '@/components/app/video-embed';
import { LessonEditor } from './editors';
import { ClassroomAction } from './actions';
import { ClassroomFiles } from './files';
import { Publication } from './classroom-view';
import { RevisionHistory } from './history';

export function LessonView({
  lesson: serverLesson,
  classroom,
}: {
  lesson: ClassroomLessonDto;
  classroom: ClassroomDto;
}) {
  const router = useRouter();
  const [restoredLesson, setRestoredLesson] = useState<ClassroomLessonDto | null>(null);
  // Show the acknowledged server revision immediately. An older in-flight RSC
  // response cannot overwrite it while the rest of the classroom is refreshed.
  const lesson =
    restoredLesson?.id === serverLesson.id && restoredLesson.version > serverLesson.version
      ? restoredLesson
      : serverLesson;
  const [opening, setOpening] = useState<string | null>(null);
  const topic = classroom.topics.find((t) => t.id === lesson.topicId);
  async function openStep(id: string) {
    if (opening) return;
    setOpening(id);
    try {
      const res = await api<{ url: string }>(
        `/academy/classroom/lessons/${lesson.id}/steps/${id}/open`,
        { method: 'POST' },
      );
      router.push(res.url);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setOpening(null);
    }
  }
  return (
    <div className="cr-classroom cr-lesson-page">
      <Link href={`/akademiya/sinif/${lesson.groupId}?tab=materials`} className="cr-back">
        <ArrowLeft className="size-4" />
        {classroom.group.code} · {t('classroom.back')}
      </Link>
      <div className="cr-lesson-heading">
        <div>
          <span className="cr-eyebrow">{topic?.title}</span>
          <h1>{lesson.title}</h1>
          <Publication item={lesson} />
        </div>
        {lesson.canManage ? (
          <div className="flex flex-wrap gap-2">
            <RevisionHistory
              kind="lesson"
              id={lesson.id}
              version={lesson.version}
              onLessonRestored={setRestoredLesson}
            />
            <LessonEditor
              viewerId={classroom.viewerId}
              groupId={lesson.groupId}
              topics={classroom.topics}
              initial={lesson}
            />
            <ClassroomAction
              path={`/academy/classroom/lessons/${lesson.id}/archive`}
              body={{ archived: !lesson.archivedAt, expectedVersion: lesson.version }}
              confirm={lesson.archivedAt ? undefined : 'archive'}
            >
              <Archive className="size-4" />
              {t(lesson.archivedAt ? 'classroom.restore' : 'classroom.archive')}
            </ClassroomAction>
          </div>
        ) : null}
      </div>
      <div className="cr-grid">
        <div className="cr-main">
          {lesson.videoUrl ? (
            <section className="cr-card cr-video">
              <VideoEmbed url={lesson.videoUrl} />
              <a
                className="cr-external-link"
                href={lesson.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('classroom.video')}
                <ExternalLink className="size-4" />
              </a>
            </section>
          ) : null}
          {lesson.content ? (
            <article className="cr-card cr-lesson-content">
              <Markdown content={lesson.content} />
            </article>
          ) : null}
          <ClassroomFiles
            id={lesson.id}
            kind="lesson"
            files={lesson.files}
            canManage={lesson.canManage}
          />
        </div>
        <aside className="cr-side">
          {lesson.steps.length ? (
            <section className="cr-card">
              <h2 className="cr-side-kicker">
                <BookOpen className="size-4" />
                {t('classroom.practices')}
              </h2>
              <ul className="cr-step-links">
                {lesson.steps.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => void openStep(s.id)}
                      disabled={
                        opening !== null ||
                        classroom.readOnly ||
                        (classroom.group.myRole === 'STUDENT' &&
                          !classroom.group.permissions.includes('student.submit'))
                      }
                    >
                      <span className="cr-tag">{s.type}</span>
                      <b>{s.title}</b>
                      <small>{s.courseTitle}</small>
                      <span className="cr-open-step">
                        {opening === s.id ? t('common.loading') : t('classroom.openPractice')}
                        <ArrowUpRight className="size-4" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {lesson.links.length ? (
            <section className="cr-card">
              <h2 className="cr-side-kicker">
                <ExternalLink className="size-4" />
                {t('classroom.links')}
              </h2>
              <div className="cr-side-links">
                {lesson.links.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <ArrowUpRight className="size-4" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
