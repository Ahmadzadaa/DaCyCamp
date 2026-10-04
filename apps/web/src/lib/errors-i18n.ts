import { ApiError } from './api/errors';
import { az } from '@dacy/shared';
import { t, type TKey } from './i18n';

/** API kodunu cari dildə lüğətdəki mətnə çevirir (məlum olmayan kod — serverin mesajı) */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code in az.errors) return t(`errors.${e.code}` as TKey);
    return e.message || t('errors.generic');
  }
  if (e instanceof TypeError) return t('errors.network');
  return t('errors.generic');
}
