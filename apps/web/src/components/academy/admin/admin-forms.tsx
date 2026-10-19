'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Plus, X } from 'lucide-react';
import {
  ACADEMY_DEFAULTS,
  ACADEMY_GROUP_STATUSES,
  ACADEMY_LEARNING_FORMATS,
  ACADEMY_PROGRAM_STATUSES,
  type AcademyGroupDto,
  type AcademyProgramDto,
  type AdminUserDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { UserSearch } from './user-search';

/** Proqramlar: siyahı və yerində redaktə (ad, təsvir, vəziyyət; slug linklərdə istifadə olunduğu üçün dəyişmir) */
export function ProgramList({ programs }: { programs: AcademyProgramDto[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <ul className="mb-4 flex flex-col gap-2 text-sm" data-testid="program-list">
      {programs.map((p) =>
        editing === p.id ? (
          <li key={p.id}>
            <ProgramEditForm p={p} onDone={() => setEditing(null)} />
          </li>
        ) : (
          <li key={p.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <b>{p.title}</b> <span className="text-muted">· {p.slug}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-muted">
              {t(`academy.programStatus.${p.status}`)} · {p.groupCount}
              <button
                type="button"
                className="rounded-md p-1 hover:bg-soft hover:text-ink"
                onClick={() => setEditing(p.id)}
                aria-label={`${t('academy.admin.editProgram')} · ${p.title}`}
                data-testid={`program-edit-${p.slug}`}
              >
                <Pencil aria-hidden className="size-4" />
              </button>
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

function ProgramEditForm({ p, onDone }: { p: AcademyProgramDto; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description);
  const [status, setStatus] = useState(p.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    if (title.trim() !== p.title) body.title = title.trim();
    if (description !== p.description) body.description = description;
    if (status !== p.status) body.status = status;
    if (!Object.keys(body).length) return onDone();
    setBusy(true);
    setError(null);
    try {
      await api(`/academy/programs/${p.id}`, { method: 'PATCH', body });
      toast.success(t('academy.admin.saved'));
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-3 rounded-xl border border-line p-3"
      noValidate
      data-testid="program-edit-form"
    >
      <Field label={t('academy.f.title')}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </Field>
      <Field label={t('academy.f.description')}>
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
        />
      </Field>
      <Field label={t('academy.f.status')}>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          {ACADEMY_PROGRAM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`academy.programStatus.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      {error ? (
        <p className="text-sm text-error-ink" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy} disabled={!title.trim()}>
          {t('common.save')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

/** Yeni proqram (Data Engineering, Cyber Security …) */
export function ProgramForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<(typeof ACADEMY_PROGRAM_STATUSES)[number]>('ACTIVE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/academy/programs', { method: 'POST', body: { title, slug, status } });
      toast.success(t('academy.admin.created'));
      setTitle('');
      setSlug('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate data-testid="program-form">
      <Field label={t('academy.f.title')}>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(
              e.target.value
                .toLowerCase()
                .normalize('NFKD')
                .replace(/ə/g, 'e')
                .replace(/ı/g, 'i')
                .replace(/[^\w\s-]/g, '')
                .trim()
                .replace(/[\s_]+/g, '-'),
            );
          }}
          maxLength={200}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('academy.f.slug')}>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={80} />
        </Field>
        <Field label={t('academy.f.status')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {ACADEMY_PROGRAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`academy.programStatus.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {error ? (
        <p className="text-sm text-error-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        loading={busy}
        disabled={!title.trim() || !slug.trim()}
        className="self-start"
      >
        <Plus className="size-4" />
        {t('academy.admin.newProgram')}
      </Button>
    </form>
  );
}

/** Yeni qrup: proqram, kod, ad, tarixlər, tutum, vaxt zonası, aparıcı və köməkçi müəllimlər */
export function GroupForm({ programs }: { programs: AcademyProgramDto[] }) {
  const router = useRouter();
  const [programId, setProgramId] = useState(
    programs.find((p) => p.status === 'ACTIVE')?.id ?? programs[0]?.id ?? '',
  );
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<(typeof ACADEMY_GROUP_STATUSES)[number]>('PLANNED');
  const [format, setFormat] = useState<(typeof ACADEMY_LEARNING_FORMATS)[number]>('ONLINE');
  const [timezone, setTimezone] = useState<string>(ACADEMY_DEFAULTS.timezone);
  const [capacity, setCapacity] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [lead, setLead] = useState<AdminUserDto | null>(null);
  const [assistants, setAssistants] = useState<AdminUserDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const g = await api<AcademyGroupDto>('/academy/groups', {
        method: 'POST',
        body: {
          programId,
          code,
          name,
          status,
          format,
          timezone,
          ...(capacity ? { capacity: Number(capacity) } : {}),
          ...(startAt ? { startAt: new Date(`${startAt}T00:00:00Z`).toISOString() } : {}),
          ...(endAt ? { endAt: new Date(`${endAt}T00:00:00Z`).toISOString() } : {}),
          leadInstructorId: lead?.id ?? null,
          assistantInstructorIds: assistants.map((a) => a.id),
        },
      });
      toast.success(t('academy.admin.created'));
      router.push(`/admin/akademiya/qruplar/${g.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate data-testid="group-form">
      <Field label={t('academy.f.program')}>
        <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('academy.f.code')}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="DE-001"
            maxLength={30}
          />
        </Field>
        <Field label={t('academy.f.name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('academy.f.status')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {(['PLANNED', 'ACTIVE'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`academy.groupStatus.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('academy.f.format')}>
          <Select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
            {ACADEMY_LEARNING_FORMATS.map((s) => (
              <option key={s} value={s}>
                {t(`academy.format.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('academy.f.capacity')}>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('academy.f.startDate')}>
          <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </Field>
        <Field label={t('academy.f.endDate')}>
          <Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </Field>
        <Field label={t('academy.f.timezone')}>
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} maxLength={60} />
        </Field>
      </div>
      <Field label={t('academy.f.lead')}>
        {lead ? (
          <span className="ac-file self-start">
            <span>{lead.name}</span>
            <button
              type="button"
              className="iconbtn"
              onClick={() => setLead(null)}
              aria-label={t('academy.form.remove')}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ) : (
          <UserSearch
            onPick={setLead}
            exclude={assistants.map((a) => a.id)}
            label={t('academy.f.lead')}
          />
        )}
      </Field>
      <Field label={t('academy.f.assistants')}>
        <div className="flex flex-col gap-2">
          <div className="ac-files">
            {assistants.map((a) => (
              <span key={a.id} className="ac-file">
                <span>{a.name}</span>
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => setAssistants((xs) => xs.filter((x) => x.id !== a.id))}
                  aria-label={t('academy.form.remove')}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
          <UserSearch
            onPick={(u) => setAssistants((xs) => [...xs, u])}
            exclude={[...(lead ? [lead.id] : []), ...assistants.map((a) => a.id)]}
            label={t('academy.f.assistants')}
          />
        </div>
      </Field>
      {error ? (
        <p className="text-sm text-error-ink" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        loading={busy}
        disabled={!programId || !code.trim() || !name.trim()}
        className="self-start"
      >
        <Plus className="size-4" />
        {t('academy.admin.newGroup')}
      </Button>
    </form>
  );
}

/** Qrupun əsas sahələri və vəziyyəti (keçidlər serverdə yoxlanılır) */
export function GroupEditor({ g }: { g: AcademyGroupDto }) {
  const router = useRouter();
  const [name, setName] = useState(g.name);
  const [description, setDescription] = useState(g.description);
  const [status, setStatus] = useState(g.status);
  const [capacity, setCapacity] = useState(g.capacity ? String(g.capacity) : '');
  // tarixlər gün kimi saxlanılır (yaradılma formasındakı kimi UTC gecəyarısı)
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
  const [startAt, setStartAt] = useState(day(g.startAt));
  const [endAt, setEndAt] = useState(day(g.endAt));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      if (name !== g.name) body.name = name;
      if (description !== g.description) body.description = description;
      if (status !== g.status) body.status = status;
      const cap = capacity ? Number(capacity) : null;
      if (cap !== g.capacity) body.capacity = cap;
      const iso = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toISOString() : null);
      if (startAt !== day(g.startAt)) body.startAt = iso(startAt);
      if (endAt !== day(g.endAt)) body.endAt = iso(endAt);
      if (!Object.keys(body).length) return;
      await api(`/academy/groups/${g.id}`, { method: 'PATCH', body });
      toast.success(t('academy.admin.saved'));
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-3" data-testid="group-editor">
      <Field label={t('academy.f.name')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
      </Field>
      <Field label={t('academy.f.description')}>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('academy.f.status')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {ACADEMY_GROUP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`academy.groupStatus.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('academy.f.capacity')}>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </Field>
        <Field label={t('academy.f.startDate')}>
          <Input
            type="date"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            data-testid="group-start"
          />
        </Field>
        <Field label={t('academy.f.endDate')}>
          <Input
            type="date"
            value={endAt}
            min={startAt || undefined}
            onChange={(e) => setEndAt(e.target.value)}
            data-testid="group-end"
          />
        </Field>
      </div>
      <Button size="sm" onClick={save} loading={busy} className="self-start">
        {t('common.save')}
      </Button>
    </div>
  );
}
