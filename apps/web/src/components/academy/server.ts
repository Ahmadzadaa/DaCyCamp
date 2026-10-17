import type { AcademyEnrollmentDto, AcademyPage } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';

/** Qrupun bütün yazılışları (API səhifələyir — 100-lük səhifələrlə hamısı yığılır); icazə yoxdursa null */
export async function fetchRoster(groupId: string): Promise<AcademyEnrollmentDto[] | null> {
  const out: AcademyEnrollmentDto[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await apiTry<AcademyPage<AcademyEnrollmentDto>>(
      `/academy/groups/${groupId}/students?page=${page}&pageSize=100`,
    );
    if (!r) return page === 1 ? null : out;
    out.push(...r.items);
    if (out.length >= r.total || r.items.length === 0) break;
  }
  return out;
}
