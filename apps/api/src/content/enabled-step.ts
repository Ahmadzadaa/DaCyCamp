import { env } from '../config/env';
/** Keep legacy records intact while excluding Docker/CTF content from the data-learning flow. */
export function enabledStep(type: string): boolean {
  return env.LEGACY_LABS_ENABLED || (type !== 'TERMINAL' && type !== 'CTF');
}
