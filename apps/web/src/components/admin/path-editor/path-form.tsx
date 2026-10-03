'use client';
import { useState } from 'react';
import { useLevelLabels } from '@/components/level-labels';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LEVELS,
  pathInputSchema,
  slugify,
  type AdminPathDto,
  type PathInput,
  type TrackDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type Draft = {
  title: string;
  slug: string;
  track: string;
  level: (typeof LEVELS)[number];
  description: string;
  target_audience: string;
  skills: string;
  estimated_hours: string;
  sequential: boolean;
};

function toDraft(p: AdminPathDto | null, tracks: TrackDto[]): Draft {
  return {
    title: p?.title ?? '',
    slug: p?.slug ?? '',
    track: p?.track.slug ?? tracks[0]?.slug ?? '',
    level: p?.level ?? 'BEGINNER',
    description: p?.description ?? '',
    target_audience: p?.targetAudience ?? '',
    skills: p?.skills.join(', ') ?? '',
    estimated_hours: p?.estimatedHours != null ? String(p.estimatedHours) : '',
    sequential: p?.sequential ?? true,
  };
}

/** Yolun əsas sahələri — yeni yol və ayarlar üçün eyni forma */
export function PathForm({
  path,
  tracks,
  onSaved,
}: {
  path: AdminPathDto | null;
  tracks: TrackDto[];
  onSaved?: (p: AdminPathDto) => void;
}) {
  const levels = useLevelLabels();
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => toDraft(path, tracks));
  const [slugTouched, setSlugTouched] = useState(!!path);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: PathInput = {
      title: d.title,
      slug: d.slug,
      track: d.track,
      level: d.level,
      description: d.description,
      target_audience: d.target_audience || null,
      skills: d.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      estimated_hours: d.estimated_hours ? Number(d.estimated_hours) : null,
      sequential: d.sequential,
    };
    const r = pathInputSchema.safeParse(input);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = path
        ? await api<AdminPathDto>(`/admin/paths/${path.id}`, { method: 'PUT', body: r.data })
        : await api<AdminPathDto>('/admin/paths', { method: 'POST', body: r.data });
      toast.success(t('admin.pathSaved'));
      if (path) {
        onSaved?.(saved);
        if (saved.slug !== path.slug) router.replace(`/admin/yollar/${saved.slug}`);
        router.refresh();
      } else router.push(`/admin/yollar/${saved.slug}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SLUG_TAKEN')
        setErrors({ slug: errorMessage(err) });
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 md:grid-cols-2"
      noValidate
      data-testid="path-form"
    >
      <Field label={t('common.title')} error={errors.title}>
        <Input
          value={d.title}
          onChange={(e) => {
            set('title', e.target.value);
            if (!slugTouched) set('slug', slugify(e.target.value));
          }}
          invalid={!!errors.title}
        />
      </Field>
      <Field label={t('common.slug')} error={errors.slug}>
        <Input
          value={d.slug}
          className="font-mono"
          onChange={(e) => {
            setSlugTouched(true);
            set('slug', e.target.value);
          }}
          invalid={!!errors.slug}
        />
      </Field>
      <Field label={t('common.track')} error={errors.track}>
        <Select value={d.track} onChange={(e) => set('track', e.target.value)}>
          {tracks.map((tr) => (
            <option key={tr.slug} value={tr.slug}>
              {tr.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('common.level')}>
        <Select value={d.level} onChange={(e) => set('level', e.target.value as Draft['level'])}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {levels[l]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('common.description')} full>
        <Textarea
          value={d.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
        />
      </Field>
      <Field label={t('admin.targetAudience')} full>
        <Textarea
          value={d.target_audience}
          onChange={(e) => set('target_audience', e.target.value)}
          rows={2}
        />
      </Field>
      <Field label={t('admin.skills')} full>
        <Input
          value={d.skills}
          onChange={(e) => set('skills', e.target.value)}
          placeholder="SQL, Python, pandas"
        />
      </Field>
      <Field label={t('admin.hours')}>
        <Input
          type="number"
          min={0}
          step="0.5"
          value={d.estimated_hours}
          onChange={(e) => set('estimated_hours', e.target.value)}
        />
      </Field>
      <Field label={t('admin.pathSequential')}>
        <Switch
          checked={d.sequential}
          onCheckedChange={(v) => set('sequential', v)}
          aria-label={t('admin.pathSequential')}
        />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" loading={busy} data-testid="path-save">
          {path ? t('common.save') : t('admin.newPath')}
        </Button>
      </div>
    </form>
  );
}
