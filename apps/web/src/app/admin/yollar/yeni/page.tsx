import type { Metadata } from 'next';
import type { TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { PathForm } from '@/components/admin/path-editor/path-form';

export const metadata: Metadata = { title: `${t('admin.newPath')} · ${t('app.admin')}` };

export default async function NewPathPage() {
  const tracks = await apiFetch<TrackDto[]>('/admin/tracks');
  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="mb-4 text-2xl">{t('admin.newPath')}</h1>
      <div className="box">
        <PathForm path={null} tracks={tracks} />
      </div>
    </div>
  );
}
