export const linesToText = (xs: string[] | undefined) => (xs ?? []).join('\n');
export const textToLines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
