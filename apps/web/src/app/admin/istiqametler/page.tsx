import type { Metadata } from 'next';
import type { TrackDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TracksManager } from '@/components/admin/tracks-manager';

export const metadata: Metadata = { title: `${t('admin.tracks')} · ${t('app.admin')}` };

export default async function TracksPage() {
  const tracks = await apiFetch<TrackDto[]>('/admin/tracks');
  return <TracksManager initial={tracks} />;
}
