/** Split SQL outside strings, quoted identifiers, dollar strings and nested comments. */
export function splitSqlStatements(source: string): string[] {
  const out: string[] = [];
  let start = 0,
    quote = '',
    block = 0;
  let line = false,
    hasCode = false,
    escape = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!,
      next = source[i + 1];
    if (line) {
      if (ch === '\n') line = false;
      continue;
    }
    if (block) {
      if (ch === '/' && next === '*') {
        block++;
        i++;
      } else if (ch === '*' && next === '/') {
        block--;
        i++;
      }
      continue;
    }
    if (quote) {
      if (quote.startsWith('$')) {
        if (source.startsWith(quote, i)) {
          i += quote.length - 1;
          quote = '';
        }
      } else if (escape && ch === '\\') i++;
      else if (ch === quote) {
        if (next === quote) i++;
        else quote = '';
      }
      continue;
    }
    if (ch === '-' && next === '-') {
      line = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      block = 1;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      escape = ch === "'" && /e/i.test(source[i - 1] ?? '') && !/[\w]/.test(source[i - 2] ?? '');
      hasCode = true;
      continue;
    }
    if (ch === '$') {
      const tag = /^(?:\$[a-z_][a-z0-9_]*\$|\$\$)/i.exec(source.slice(i))?.[0];
      if (tag) {
        quote = tag;
        hasCode = true;
        i += tag.length - 1;
        continue;
      }
    }
    if (ch === ';') {
      if (hasCode) out.push(source.slice(start, i).trim());
      start = i + 1;
      hasCode = false;
    } else if (!/\s/.test(ch)) hasCode = true;
  }
  if (hasCode) out.push(source.slice(start).trim());
  return out;
}
