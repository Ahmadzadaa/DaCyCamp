import type { DeepPartial } from './t';
import type { Dictionary } from './az';
/** English — filled in later; every missing key falls back to az */
export const en: DeepPartial<Dictionary> = {
  app: { name: 'DaCy Academy', short: 'DaCy', admin: 'DaCy Admin' },
  nav: {
    courses: 'Courses',
    paths: 'Paths',
    dashboard: 'Dashboard',
    certificates: 'Certificates',
    login: 'Log in',
    register: 'Sign up',
    logout: 'Log out',
  },
};
