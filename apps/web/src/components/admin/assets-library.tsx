'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import type { AdminCourseDto, AssetDto, AssetKind } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ConfirmDialog } from './confirm-dialog';
import { uploadAsset, upsertAsset } from './upload';
import { fmtDate } from './format';

const FOLDERS: Array<{ dir: string; kind: AssetKind; label: string }> = [
  { dir: 'datasets', kind: 'DATASET', label: 'datasets/ (csv, parquet, sql)' },
  { dir: 'images', kind: 'IMAGE', label: 'images/' },
  { dir: 'files', kind: 'ATTACHMENT', label: 'files/ (əlavə fayllar)' },
  { dir: 'videos', kind: 'VIDEO', label: 'videos/' },
  { dir: 'checks', kind: 'CHECK_SCRIPT', label: 'checks/ (yoxlama skriptləri, tələbəyə verilmir)' },
];

export function AssetsLibrary({
  courses,
  initialCourseId,
}: {
  courses: AdminCourseDto[];
  initialCourseId?: string;
}) {
  const [courseId, setCourseId] = useState(initialCourseId ?? courses[0]?.id ?? '');
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [folder, setFolder] = useState(FOLDERS[0]!);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<AssetDto | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseId) return;
    api<AssetDto[]>(`/admin/courses/${courseId}/assets`)
      .then(setAssets)
      .catch((e) => toast.error(errorMessage(e)));
  }, [courseId]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !courseId) return;
    setBusy(true);
    try {
      for (const f of files) {
        const a = await uploadAsset(courseId, f, folder.kind, {
          path: `${folder.dir}/${f.name}`,
          replace: true,
        });
        setAssets((as) => upsertAsset(as, a));
        toast.success(t('admin.assetUploaded', { path: a.path }));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!del) return;
    setDelError(null);
    try {
      await api(`/admin/assets/${del.id}`, { method: 'DELETE' });
      setAssets((as) => as.filter((x) => x.id !== del.id));
      setDel(null);
      toast.success(t('admin.assetDeleted'));
    } catch (e) {
      setDelError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">{t('admin.files')}</h1>
      <div className="box grid gap-4 md:grid-cols-3">
        <Field label={t('admin.chooseCourse')}>
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('admin.assetKind')}>
          <Select
            value={folder.dir}
            onChange={(e) =>
              setFolder(FOLDERS.find((f) => f.dir === e.target.value) ?? FOLDERS[0]!)
            }
          >
            {FOLDERS.map((f) => (
              <option key={f.dir} value={f.dir}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <input ref={input} type="file" multiple className="hidden" onChange={onFiles} />
          <Button
            type="button"
            loading={busy}
            disabled={!courseId}
            onClick={() => input.current?.click()}
          >
            <Upload className="size-4" />
            {t('admin.uploadTo', { dir: folder.dir })}
          </Button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="tbl-admin">
          <thead>
            <tr>
              <th>{t('admin.assetPath')}</th>
              <th>{t('admin.assetKind')}</th>
              <th>{t('admin.assetSize')}</th>
              <th>{t('common.date')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  {t('admin.noAssets')}
                </td>
              </tr>
            ) : null}
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="font-mono text-xs">
                  <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">
                    {a.path}
                  </a>
                </td>
                <td>
                  <span className="badge badge-muted">{a.kind}</span>
                </td>
                <td className="text-muted">{(a.sizeBytes / 1024).toFixed(1)} KB</td>
                <td className="text-muted">{fmtDate(a.createdAt)}</td>
                <td>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setDelError(null);
                      setDel(a);
                    }}
                    aria-label={t('admin.deleteAsset')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={t('admin.deleteAsset')}
        description={del?.path}
        onConfirm={remove}
        error={delError}
      />
    </div>
  );
}
