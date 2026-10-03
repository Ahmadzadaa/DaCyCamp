import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { env } from '../config/env';
import { PackageService } from './package.service';

/**
 * Repo-dakı kurs paketləri (content/courses/<slug>/, format: docs/content-package.md) API açılanda
 * avtomatik idxal olunur — yalnız bazada OLMAYAN kurslar (admin paneldəki düzəlişlərin üzərinə yazılmır).
 * Giriş/şifrə tələb etmir. Söndürmək: CONTENT_SYNC=false. Qovluq: CONTENT_DIR (defolt — monorepo kökü).
 * Mövcud kursu paketdən yeniləmək: pnpm content:sync --update <slug>.
 */
@Injectable()
export class ContentSyncService implements OnApplicationBootstrap {
  private readonly log = new Logger('ContentSync');

  constructor(private readonly pkg: PackageService) {}

  onApplicationBootstrap() {
    if (!env.CONTENT_SYNC || env.NODE_ENV === 'test') return;
    // açılışı ləngitməsin — fonda
    void this.syncNew().catch((e) => this.log.warn(`idxal alınmadı: ${(e as Error).message}`));
  }

  /** content/courses qovluğu: CONTENT_DIR və ya cari qovluqdan yuxarı axtarış (apps/api → monorepo kökü) */
  static findDir(): string | null {
    if (env.CONTENT_DIR) return existsSync(env.CONTENT_DIR) ? resolve(env.CONTENT_DIR) : null;
    for (const start of [process.cwd(), __dirname]) {
      let d = resolve(start);
      for (let i = 0; i < 6; i++) {
        const c = join(d, 'content', 'courses');
        if (existsSync(c)) return c;
        const up = dirname(d);
        if (up === d) break;
        d = up;
      }
    }
    return null;
  }

  async syncNew(dir = ContentSyncService.findDir()): Promise<string[]> {
    if (!dir) return [];
    const added: string[] = [];
    const names = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'course.yaml')))
      .map((d) => d.name)
      .sort();
    for (const name of names) {
      const zip = new AdmZip();
      zip.addLocalFolder(join(dir, name), name, (p) => !/(^|\/)\./.test(p));
      const buf = zip.toBuffer();
      const { report } = await this.pkg.validate(buf);
      if (report.course?.exists) continue;
      if (!report.ok) {
        const why = report.errors.map((e) => `${e.file}: ${e.message}`).join('; ');
        this.log.warn(`${name}: paket idxal olunmadı — ${why}`);
        continue;
      }
      const applied = await this.pkg.apply(buf, `${name}.zip`, null);
      if (applied.ok) {
        added.push(name);
        this.log.log(
          `✓ ${name}: kurs əlavə olundu (${applied.summary.modules} fəsil, ${applied.summary.steps} addım)`,
        );
      } else {
        this.log.warn(`${name}: ${applied.errors.map((e) => e.message).join('; ')}`);
      }
    }
    return added;
  }
}
