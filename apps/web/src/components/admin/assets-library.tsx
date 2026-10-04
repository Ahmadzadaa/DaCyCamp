'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Upload } from 'lucide-react';
import type { AdminCourseDto, AssetDto, AssetKind } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t, type TKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ConfirmDialog } from './confirm-dialog';
import { uploadAsset, upsertAsset } from './upload';
import { fmtDate } from './format';
import { PageHeader } from '@/components/admin/page-header';

// label — lüğət açarı (dil dəyişəndə render zamanı oxunur) və ya sabit qovluq adı
const FOLDERS: Array<{ dir: string; kind: AssetKind; label: TKey | `${string}/` }> = [
  { dir: 'datasets', kind: 'DATASET', label: 'admin.folderDatasets' },
  { dir: 'images', kind: 'IMAGE', label: 'images/' },
  { dir: 'files', kind: 'ATTACHMENT', label: 'admin.folderFiles' },
  { dir: 'videos', kind: 'VIDEO', label: 'videos/' },
  { dir: 'checks', kind: 'CHECK_SCRIPT', label: 'admin.folderChecks' },
];
const folderLabel = (l: TKey | `${string}/`) => (l.endsWith('/') ? l : t(l as TKey));

export function AssetsLibrary({
  courses,
  initialCourseId,
  fixedCourseId,
  onAssetsChange,
}: {
  courses: AdminCourseDto[];
  initialCourseId?: string;
  /** kurs redaktorunun "Fayllar" tabı: kurs seçimi gizlənir */
  fixedCourseId?: string;
  onAssetsChange?: (assets: AssetDto[]) => void;
}) {
  const [courseId, setCourseId] = useState(
    fixedCourseId ?? initialCourseId ?? courses[0]?.id ?? '',
  );
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<AssetDto | null>(null);
  const loaded = useRef(false);
  // redaktorun fayl siyahısını (addım formalarındakı seçicilər) sinxron saxla — yalnız ilk yükləmədən sonra
  useEffect(() => {
    if (loaded.current) onAssetsChange?.(assets);
  }, [assets, onAssetsChange]);
  const [folder, setFolder] = useState(FOLDERS[0]!);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<AssetDto | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!courseId) return;
    api<AssetDto[]>(`/admin/courses/${courseId}/assets`)
      .then((as) => {
        loaded.current = true;
        setAssets(as);
      })
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

  /** Eyni yolda yeni fayl — addımlardakı istinadlar pozulmur */
  async function onReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = replacing;
    setReplacing(null);
    if (!file || !target || !courseId) return;
    setBusy(true);
    try {
      const a = await uploadAsset(courseId, file, target.kind, {
        path: target.path,
        replace: true,
      });
      setAssets((as) => upsertAsset(as, a));
      toast.success(t('courseAdmin.replaced', { path: a.path }));
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
      {fixedCourseId ? null : (
        <PageHeader title={t('admin.files')} subtitle={t('admin.filesDesc')} />
      )}
      <div className="box grid gap-4 md:grid-cols-3">
        {fixedCourseId ? null : (
          <Field label={t('admin.chooseCourse')}>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t('admin.assetKind')}>
          <Select
            value={folder.dir}
            onChange={(e) =>
              setFolder(FOLDERS.find((f) => f.dir === e.target.value) ?? FOLDERS[0]!)
            }
          >
            {FOLDERS.map((f) => (
              <option key={f.dir} value={f.dir}>
                {folderLabel(f.label)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <input ref={input} type="file" multiple className="hidden" onChange={onFiles} />
          <input
            ref={replaceInput}
            type="file"
            className="hidden"
            onChange={onReplace}
            data-testid="replace-input"
          />
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
      <div className="tbl-wrap">
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
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      title={t('courseAdmin.replaceHint')}
                      onClick={() => {
                        setReplacing(a);
                        replaceInput.current?.click();
                      }}
                      data-testid={`replace-${a.path}`}
                    >
                      <RefreshCw className="size-4" />
                      {t('courseAdmin.replace')}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDelError(null);
                        setDel(a);
                      }}
                      aria-label={`${t('admin.deleteAsset')}: ${a.path}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
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
