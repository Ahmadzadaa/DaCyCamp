/** Azərbaycan hərflərini nəzərə alan slug */
const MAP: Record<string, string> = {
  ə: 'e',
  Ə: 'e',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
  ç: 'c',
  Ç: 'c',
};

export function slugify(input: string, max = 80): string {
  const mapped = Array.from(input)
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return mapped.slice(0, max).replace(/-+$/g, '') || 'x';
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isSlug = (s: string) => SLUG_RE.test(s);

export interface ParsedFileName {
  order: number | null;
  key: string;
  ext: string;
}

/** "03-select.yaml" → { order: 3, key: "select", ext: "yaml" }; "giris" → { order: null, key: "giris", ext: "" } */
export function parseFileName(name: string): ParsedFileName {
  const base = name.split('/').pop() ?? name;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
  const m = /^(\d+)[-_ ]?(.*)$/.exec(stem);
  if (m && m[2]) return { order: parseInt(m[1], 10), key: slugify(m[2]), ext };
  if (m && !m[2]) return { order: parseInt(m[1], 10), key: `addim-${m[1]}`, ext };
  return { order: null, key: slugify(stem), ext };
}
