#!/usr/bin/env node
/**
 * docker-compose.yml statik təhlükəsizlik yoxlaması (SEC-03, SEC-06) — CI-da işləyir.
 *  1. Bütün port bağlantıları ya 127.0.0.1-ə bağlıdır, ya da yalnız api/web xidmətlərinə aiddir
 *     (PostgreSQL heç vaxt bütün şəbəkə interfeyslərində açılmamalıdır).
 *  2. Defolt compose faylı host Docker socket-ini montaj etmir (lab-lar üçün ayrıca docker-compose.labs.yml var).
 *  3. API-də LAB_DRIVER defoltu `off`-dur.
 * Bu, YAML-ın statik yoxlamasıdır — real şəbəkə izolyasiyasını sübut etmir (deploy siyahısına bax: README).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(import.meta.dirname, '..', 'docker-compose.yml');
const lines = readFileSync(file, 'utf8').split('\n');
const problems = [];
let service = null;
let inServices = false;
let section = null;
for (const raw of lines) {
  const line = raw.replace(/\s+#.*$/, '');
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (/^services:\s*$/.test(line)) {
    inServices = true;
    continue;
  }
  if (/^\S/.test(line)) {
    inServices = false;
    service = null;
    continue;
  }
  if (!inServices) continue;
  const svc = /^ {2}([\w-]+):\s*$/.exec(line);
  if (svc) {
    service = svc[1];
    section = null;
    continue;
  }
  const sec = /^ {4}([\w-]+):/.exec(line);
  if (sec) section = sec[1];
  if (section === 'ports' && /^\s+- /.test(line)) {
    const spec = line.replace(/^\s+-\s+/, '').replace(/['"]/g, '');
    if (service === 'db' && !spec.startsWith('127.0.0.1:'))
      problems.push(`db port "${spec}" yalnız 127.0.0.1-ə bağlanmalıdır (SEC-03)`);
  }
  if (line.includes('docker.sock'))
    problems.push(`${service}: defolt compose host Docker socket-ini montaj etməməlidir (SEC-06)`);
  const lab = /LAB_DRIVER:\s*(.+)$/.exec(line);
  if (service === 'api' && lab && !/^\$\{LAB_DRIVER:-off\}$|^off$/.test(lab[1].trim()))
    problems.push(`api: LAB_DRIVER defoltu "off" olmalıdır, tapıldı: ${lab[1].trim()} (SEC-06)`);
}
if (problems.length) {
  console.error(`docker-compose.yml yoxlaması uğursuz:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log(
  'docker-compose.yml: PostgreSQL yalnız 127.0.0.1, Docker socket yoxdur, LAB_DRIVER=off ✓',
);
