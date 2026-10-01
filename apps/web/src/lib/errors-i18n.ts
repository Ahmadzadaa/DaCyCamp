import { ApiError } from './api/errors';
import { az } from '@dacy/shared';
import { t } from './i18n';

/** API kodunu lüğətdəki mətnə çevirir */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const key = e.code as keyof typeof az.errors;
    if (key in az.errors) return az.errors[key];
    return e.message || t('errors.generic');
  }
  if (e instanceof TypeError) return t('errors.network');
  return t('errors.generic');
}
