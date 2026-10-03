'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ExternalLink,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  roadmapInputSchema,
  type AdminRoadmapDto,
  type RoadmapInput,
  type RoadmapLevel,
  type RoadmapSkill,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from './page-header';

type Opt = { slug: string; title: string };

const toInput = (r: AdminRoadmapDto): RoadmapInput => ({
  slug: r.slug,
  title: r.title,
  tagline: r.tagline,
  description: r.description,
  track: r.track,
  isPublished: r.isPublished,
  content: r.content,
});

/** Yeni bacarıq üçün sabit, unikal id (tələbə işarələri buna bağlanır) */
const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toLowerCase();

function swap<T>(arr: T[], i: number, j: number) {
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j]!, arr[i]!];
}

/** zod xətasının yolunu oxunaqlı yazır: «Səviyyə 2 › Qrup 1 › Bacarıq 3 › title» */
function issuePath(path: PropertyKey[], v: RoadmapInput): string {
  const parts: string[] = [];
  const [, , li, , gi, , si, field] = path;
  if (path[0] !== 'content') return String(path.join('.'));
  if (typeof li === 'number')
    parts.push(v.content.levels[li]?.title ?? `${t('roadmap.fLevel')} ${li + 1}`);
  if (typeof gi === 'number')
    parts.push(v.content.levels[li as number]?.groups[gi]?.title ?? `#${gi + 1}`);
  if (typeof si === 'number') parts.push(`${t('roadmap.fSkill')} ${si + 1}`);
  if (field) parts.push(String(field));
  else if (path[3]) parts.push(String(path[3]));
  return parts.join(' › ');
}

/**
 * Admin: karyera xəritəsinin strukturlaşdırılmış redaktoru — əsas məlumat, səviyyə tabları,
 * hər səviyyədə xülasə / gözləntilər / alətlər / layihə / qruplar → bacarıqlar (kursa bağlama ilə).
 */
export function RoadmapEditor({
  initial,
  tracks,
  courses,
}: {
  initial: AdminRoadmapDto;
  tracks: Opt[];
  courses: Opt[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(initial)));
  const [v, setV] = useState<RoadmapInput>(() => toInput(initial));
  const [li, setLi] = useState(0);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== saved;
  const lv = v.content.levels[li] ?? v.content.levels[0]!;

  // yadda saxlanmamış dəyişikliklə səhifədən çıxanda xəbərdarlıq
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const edit = (fn: (d: RoadmapInput) => void) =>
    setV((cur) => {
      const d = structuredClone(cur);
      fn(d);
      return d;
    });
  const editLevel = (fn: (l: RoadmapLevel) => void) =>
    edit((d) => {
      const l = d.content.levels[li];
      if (l) fn(l);
    });

  async function save() {
    // yazarkən saxlanan xam mətni təmizləyirik: boş sətirlər/alətlər, adsız layihə atılır
    const clean = structuredClone(v);
    for (const l of clean.content.levels) {
      l.expectations = l.expectations.map((x) => x.trim()).filter(Boolean);
      l.tools = l.tools.map((x) => x.trim()).filter(Boolean);
      if (!l.project?.title.trim()) delete l.project;
      else if (!l.project.desc?.trim()) delete l.project.desc;
    }
    const parsed = roadmapInputSchema.safeParse(clean);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      toast.error(`${issuePath(issue.path, clean)}: ${issue.message}`);
      return;
    }
    setBusy(true);
    try {
      const r = await api<AdminRoadmapDto>(`/admin/roadmaps/${initial.id}`, {
        method: 'PUT',
        body: parsed.data,
      });
      const next = toInput(r);
      setV(next);
      setSaved(JSON.stringify(next));
      toast.success(t('roadmap.adminSaved'));
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function addLevel() {
    edit((d) => {
      const n = d.content.levels.length + 1;
      d.content.levels.push({
        key: `seviyye-${n}`,
        title: `${t('roadmap.newLevel')} ${n}`,
        summary: '—',
        expectations: [],
        tools: [],
        groups: [
          {
            title: t('roadmap.newGroup'),
            skills: [{ id: newId(d.slug), title: t('roadmap.newSkill'), core: true }],
          },
        ],
      });
    });
    setLi(v.content.levels.length);
  }

  return (
    <div className="flex flex-col gap-6" data-testid="roadmap-editor">
      <Link href="/admin/karyera" className="crumb-back">
        <ChevronLeft aria-hidden />
        {t('roadmap.adminBack')}
      </Link>
      <PageHeader
        title={v.title || initial.title}
        subtitle={dirty ? t('roadmap.adminUnsaved') : t('roadmap.adminSubtitle')}
      >
        <Link href={`/yollar?karyera=${initial.slug}`} target="_blank" className="b b-ghost">
          <ExternalLink aria-hidden />
          {t('roadmap.adminView')}
        </Link>
        <Button
          type="button"
          onClick={save}
          disabled={!dirty}
          loading={busy}
          data-testid="roadmap-save"
        >
          <Save aria-hidden />
          {t('common.save')}
        </Button>
      </PageHeader>

      <section className="box grid gap-4 md:grid-cols-2">
        <Field label={t('roadmap.fTitle')}>
          <Input value={v.title} onChange={(e) => edit((d) => void (d.title = e.target.value))} />
        </Field>
        <Field label={t('roadmap.fSlug')}>
          <Input
            value={v.slug}
            className="font-mono"
            onChange={(e) => edit((d) => void (d.slug = e.target.value.trim().toLowerCase()))}
          />
        </Field>
        <Field label={t('roadmap.fTagline')} full>
          <Input
            value={v.tagline ?? ''}
            onChange={(e) => edit((d) => void (d.tagline = e.target.value || null))}
          />
        </Field>
        <Field label={t('roadmap.fDescription')} full>
          <Textarea
            rows={3}
            value={v.description ?? ''}
            onChange={(e) => edit((d) => void (d.description = e.target.value || null))}
          />
        </Field>
        <Field label={t('roadmap.fTrack')}>
          <Select
            value={v.track ?? ''}
            onChange={(e) => edit((d) => void (d.track = e.target.value || null))}
          >
            <option value="">{t('roadmap.fTrackNone')}</option>
            {tracks.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('roadmap.fPublished')} htmlFor="rm-pub">
          <div className="flex h-11 items-center gap-3">
            <Switch
              id="rm-pub"
              checked={v.isPublished}
              onCheckedChange={(c) => edit((d) => void (d.isPublished = c))}
            />
            <span className="text-sm text-muted">
              {v.isPublished ? t('topics.published') : t('topics.hidden')}
            </span>
          </div>
        </Field>
      </section>

      <nav className="tabs" aria-label={t('roadmap.levels')}>
        {v.content.levels.map((l, i) => (
          <button
            key={i}
            type="button"
            className={cn(i === li && 'on')}
            aria-current={i === li ? 'page' : undefined}
            onClick={() => setLi(i)}
            data-testid={`edit-level-${i}`}
          >
            {l.title || `${t('roadmap.fLevel')} ${i + 1}`}
          </button>
        ))}
        <button type="button" onClick={addLevel} data-testid="add-level">
          <Plus aria-hidden />
          {t('roadmap.addLevel')}
        </button>
      </nav>

      <section className="box flex flex-col gap-4" aria-label={lv.title}>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('roadmap.fLevelTitle')} className="min-w-[220px] flex-1">
            <Input
              value={lv.title}
              onChange={(e) => editLevel((l) => void (l.title = e.target.value))}
            />
          </Field>
          <Field label={t('roadmap.fLevelKey')} className="w-40">
            <Input
              value={lv.key}
              className="font-mono"
              onChange={(e) => editLevel((l) => void (l.key = e.target.value.trim().toLowerCase()))}
            />
          </Field>
          <Field label={t('roadmap.fDuration')} className="w-48">
            <Input
              value={lv.duration ?? ''}
              onChange={(e) => editLevel((l) => void (l.duration = e.target.value || undefined))}
            />
          </Field>
          <div className="flex gap-1 pb-1">
            <button
              type="button"
              className="ib"
              aria-label={t('roadmap.moveLeft')}
              title={t('roadmap.moveLeft')}
              disabled={li === 0}
              onClick={() => {
                edit((d) => swap(d.content.levels, li, li - 1));
                setLi(li - 1);
              }}
            >
              <ArrowLeft aria-hidden />
            </button>
            <button
              type="button"
              className="ib"
              aria-label={t('roadmap.moveRight')}
              title={t('roadmap.moveRight')}
              disabled={li === v.content.levels.length - 1}
              onClick={() => {
                edit((d) => swap(d.content.levels, li, li + 1));
                setLi(li + 1);
              }}
            >
              <ArrowRight aria-hidden />
            </button>
            <button
              type="button"
              className="ib"
              aria-label={t('roadmap.removeLevel')}
              title={t('roadmap.removeLevel')}
              disabled={v.content.levels.length <= 1}
              onClick={() => {
                if (!window.confirm(`${t('roadmap.removeLevel')}: ${lv.title}?`)) return;
                edit((d) => void d.content.levels.splice(li, 1));
                setLi(Math.max(0, li - 1));
              }}
            >
              <Trash2 aria-hidden />
            </button>
          </div>
        </div>
        <Field label={t('roadmap.fSummary')}>
          <Textarea
            rows={3}
            value={lv.summary}
            onChange={(e) => editLevel((l) => void (l.summary = e.target.value))}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('roadmap.fExpectations')}>
            <Textarea
              rows={5}
              value={lv.expectations.join('\n')}
              onChange={(e) => editLevel((l) => void (l.expectations = e.target.value.split('\n')))}
            />
          </Field>
          <div className="flex flex-col gap-4">
            <Field label={t('roadmap.fTools')}>
              <Input
                value={lv.tools.join(', ')}
                onChange={(e) => editLevel((l) => void (l.tools = e.target.value.split(/, ?/)))}
              />
            </Field>
            <Field label={t('roadmap.fProjectTitle')}>
              <Input
                value={lv.project?.title ?? ''}
                onChange={(e) =>
                  editLevel((l) => void (l.project = { ...l.project, title: e.target.value }))
                }
              />
            </Field>
          </div>
        </div>
        <Field label={t('roadmap.fProjectDesc')}>
          <Textarea
            rows={2}
            value={lv.project?.desc ?? ''}
            onChange={(e) =>
              editLevel(
                (l) => void (l.project = { title: l.project?.title ?? '', desc: e.target.value }),
              )
            }
          />
        </Field>
      </section>

      <div className="rme-groups">
        {lv.groups.map((g, gi) => (
          <section key={gi} className="box flex flex-col gap-3" data-testid={`edit-group-${gi}`}>
            <div className="flex items-end gap-2">
              <Field label={t('roadmap.fGroup')} className="flex-1">
                <Input
                  value={g.title}
                  onChange={(e) => editLevel((l) => void (l.groups[gi]!.title = e.target.value))}
                />
              </Field>
              <div className="flex gap-1 pb-1">
                <button
                  type="button"
                  className="ib"
                  aria-label={t('roadmap.moveUp')}
                  disabled={gi === 0}
                  onClick={() => editLevel((l) => swap(l.groups, gi, gi - 1))}
                >
                  <ArrowUp aria-hidden />
                </button>
                <button
                  type="button"
                  className="ib"
                  aria-label={t('roadmap.moveDown')}
                  disabled={gi === lv.groups.length - 1}
                  onClick={() => editLevel((l) => swap(l.groups, gi, gi + 1))}
                >
                  <ArrowDown aria-hidden />
                </button>
                <button
                  type="button"
                  className="ib"
                  aria-label={t('roadmap.removeGroup')}
                  disabled={lv.groups.length <= 1}
                  onClick={() => editLevel((l) => void l.groups.splice(gi, 1))}
                >
                  <Trash2 aria-hidden />
                </button>
              </div>
            </div>
            <ul className="rme-skills">
              {g.skills.map((s, si) => (
                <SkillEditor
                  key={s.id}
                  s={s}
                  courses={courses}
                  first={si === 0}
                  last={si === g.skills.length - 1}
                  only={g.skills.length <= 1}
                  onChange={(fn) => editLevel((l) => fn(l.groups[gi]!.skills[si]!))}
                  onMove={(dir) => editLevel((l) => swap(l.groups[gi]!.skills, si, si + dir))}
                  onRemove={() => editLevel((l) => void l.groups[gi]!.skills.splice(si, 1))}
                />
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() =>
                editLevel(
                  (l) =>
                    void l.groups[gi]!.skills.push({
                      id: newId(v.slug),
                      title: t('roadmap.newSkill'),
                      core: true,
                    }),
                )
              }
              data-testid={`add-skill-${gi}`}
            >
              <Plus aria-hidden />
              {t('roadmap.addSkill')}
            </Button>
          </section>
        ))}
        <button
          type="button"
          className="rme-add"
          onClick={() =>
            editLevel(
              (l) =>
                void l.groups.push({
                  title: t('roadmap.newGroup'),
                  skills: [{ id: newId(v.slug), title: t('roadmap.newSkill'), core: true }],
                }),
            )
          }
        >
          <Plus aria-hidden />
          {t('roadmap.addGroup')}
        </button>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={!dirty} loading={busy}>
          <Save aria-hidden />
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

function SkillEditor({
  s,
  courses,
  first,
  last,
  only,
  onChange,
  onMove,
  onRemove,
}: {
  s: RoadmapSkill;
  courses: Opt[];
  first: boolean;
  last: boolean;
  only: boolean;
  onChange: (fn: (s: RoadmapSkill) => void) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rme-skill">
      <div className="grid min-w-0 flex-1 gap-2">
        <Input
          value={s.title}
          aria-label={t('roadmap.fSkill')}
          placeholder={t('roadmap.fSkill')}
          onChange={(e) => onChange((x) => void (x.title = e.target.value))}
        />
        <Input
          value={s.desc ?? ''}
          aria-label={t('roadmap.fSkillDesc')}
          placeholder={t('roadmap.fSkillDesc')}
          className="text-sm"
          onChange={(e) => onChange((x) => void (x.desc = e.target.value || undefined))}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={s.core}
              onCheckedChange={(c) => onChange((x) => void (x.core = c))}
              aria-label={t('roadmap.fCore')}
            />
            {s.core ? t('roadmap.fCore') : t('roadmap.plus')}
          </label>
          <Select
            value={s.course ?? ''}
            className="!min-h-0 w-auto max-w-full !py-1.5 text-sm"
            aria-label={t('roadmap.fCourse')}
            onChange={(e) => onChange((x) => void (x.course = e.target.value || undefined))}
          >
            <option value="">{t('roadmap.fCourseNone')}</option>
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </Select>
          <code className="ml-auto font-mono text-xs text-muted" title="id">
            {s.id}
          </code>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="ib"
          aria-label={t('roadmap.moveUp')}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden />
        </button>
        <button
          type="button"
          className="ib"
          aria-label={t('roadmap.moveDown')}
          disabled={last}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden />
        </button>
        <button
          type="button"
          className="ib"
          aria-label={t('roadmap.removeSkill')}
          disabled={only}
          onClick={onRemove}
        >
          <Trash2 aria-hidden />
        </button>
      </div>
    </li>
  );
}
