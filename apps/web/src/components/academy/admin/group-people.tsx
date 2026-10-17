'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  ACADEMY_ENROLLMENT_STATUSES,
  type AcademyEnrollmentDto,
  type AcademyEnrollmentStatus,
  type AcademyGroupDto,
  type AdminCourseDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { fmtZoned } from '../format';
import { UserSearch } from './user-search';

async function call(fn: () => Promise<unknown>, ok: string, refresh: () => void) {
  try {
    await fn();
    toast.success(ok);
    refresh();
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

/** Müəllimlər: aparıcı (bir nəfər) və köməkçilər; çıxarılan müəllimin hüququ dərhal itir */
export function InstructorsManager({ g }: { g: AcademyGroupDto }) {
  const router = useRouter();
  const [role, setRole] = useState<'LEAD' | 'ASSISTANT'>(
    g.instructors.some((i) => i.role === 'LEAD') ? 'ASSISTANT' : 'LEAD',
  );
  return (
    <div className="flex flex-col gap-3" data-testid="instructors-manager">
      {g.instructors.length === 0 ? (
        <p className="text-sm text-muted">{t('academy.admin.noLead')}</p>
      ) : null}
      <ul className="sup-list">
        {g.instructors.map((i) => (
          <li key={i.user.id} className="ac-row py-2">
            <span className="flex min-w-0 flex-col">
              <b>{i.user.name}</b>
              <span className="ac-meta">
                <span>{t(`academy.role.${i.role}`)}</span>
                {i.user.email ? <span>{i.user.email}</span> : null}
              </span>
            </span>
            <button
              type="button"
              className="iconbtn"
              aria-label={t('academy.admin.removeInstructor')}
              onClick={() =>
                call(
                  () =>
                    api(`/academy/groups/${g.id}/instructors/${i.user.id}`, { method: 'DELETE' }),
                  t('academy.admin.saved'),
                  router.refresh,
                )
              }
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          aria-label={t('academy.f.instructor')}
        >
          <option value="LEAD">{t('academy.role.LEAD')}</option>
          <option value="ASSISTANT">{t('academy.role.ASSISTANT')}</option>
        </Select>
        <UserSearch
          exclude={g.instructors.map((i) => i.user.id)}
          label={t('academy.admin.addInstructor')}
          onPick={(u) =>
            call(
              () =>
                api(`/academy/groups/${g.id}/instructors`, {
                  method: 'POST',
                  body: { userId: u.id, role },
                }),
              t('academy.admin.saved'),
              router.refresh,
            )
          }
        />
      </div>
    </div>
  );
}

/** Yazılışlar: tələbə əlavə et (tutum serverdə kilid altında yoxlanılır), vəziyyəti dəyiş */
export function EnrollmentsManager({
  groupId,
  rows,
}: {
  groupId: string;
  rows: AcademyEnrollmentDto[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function change(e: AcademyEnrollmentDto, status: AcademyEnrollmentStatus) {
    setBusy(e.id);
    await call(
      () => api(`/academy/enrollments/${e.id}`, { method: 'PATCH', body: { status } }),
      t('academy.admin.saved'),
      router.refresh,
    );
    setBusy(null);
  }
  return (
    <div className="flex flex-col gap-3" data-testid="enrollments-manager">
      <UserSearch
        exclude={rows.filter((r) => r.status !== 'WITHDRAWN').map((r) => r.student.id)}
        label={t('academy.admin.addStudent')}
        onPick={(u) =>
          call(
            () =>
              api(`/academy/groups/${groupId}/enrollments`, {
                method: 'POST',
                body: { userId: u.id },
              }),
            t('academy.admin.saved'),
            router.refresh,
          )
        }
      />
      {rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl-admin">
            <thead>
              <tr>
                <th>{t('academy.f.student')}</th>
                <th>{t('academy.f.enrolled')}</th>
                <th>{t('academy.f.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="ttl">{e.student.name}</span>
                    {e.student.email ? <div className="slug">{e.student.email}</div> : null}
                  </td>
                  <td>{fmtZoned(e.enrolledAt, { time: false })}</td>
                  <td>
                    <Select
                      value={e.status}
                      disabled={busy === e.id}
                      onChange={(ev) => change(e, ev.target.value as AcademyEnrollmentStatus)}
                      aria-label={`${t('academy.admin.changeStatus')} · ${e.student.name}`}
                    >
                      {ACADEMY_ENROLLMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`academy.enrollmentStatus.${s}`)}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/** Qrupa aid platforma kursları (istəyə bağlı əlaqə) */
export function CourseLinks({
  groupId,
  linked,
  courses,
}: {
  groupId: string;
  linked: string[];
  courses: AdminCourseDto[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(linked);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    await call(
      () => api(`/academy/groups/${groupId}/courses`, { method: 'PUT', body: { courseIds: sel } }),
      t('academy.admin.saved'),
      router.refresh,
    );
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{t('academy.admin.coursesHint')}</p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {courses.map((c) => (
          <li key={c.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sel.includes(c.id)}
                onChange={(e) =>
                  setSel((xs) => (e.target.checked ? [...xs, c.id] : xs.filter((x) => x !== c.id)))
                }
              />
              {c.title}
            </label>
          </li>
        ))}
      </ul>
      <Button size="sm" onClick={save} loading={busy} className="self-start">
        {t('common.save')}
      </Button>
    </div>
  );
}
