import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import yaml from 'js-yaml';
import { Prisma } from '@prisma/client';
import {
  courseYamlSchema,
  definitionToYamlStep,
  levelFromYaml,
  levelToYaml,
  mergeStep,
  moduleYamlSchema,
  parseFileName,
  splitFrontMatter,
  splitStep,
  stepYamlSchema,
  validateForPublish,
  yamlStepToDefinition,
  yamlToPathInput,
  pathYamlSchema,
  pathItemFileSchema,
  zodIssues,
  type PathInput,
  type PathItemInput,
  type ImportIssue,
  type ImportReport,
  type StepDefinition,
  type StepType,
  type StepYaml,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { SqlCheckService } from '../sql-check/sql-check.service';
import { PathsAdminService } from '../paths/paths-admin.service';
import { hashAnswer } from '../content/ctf-hash';
import {
  loadTranslations,
  moduleTranslation,
  translateStep,
  type StepTranslation,
} from './package-i18n';
import {
  detectKind,
  readFromStorage,
  removeFromStorage,
  saveToStorage,
  sha256,
} from '../assets/storage';
import { reorderInTx } from '../common/utils/reorder';
import { badRequest, notFound } from '../common/errors';

/* ───────────── paket oxuma ───────────── */

interface PlannedStep {
  key: string;
  order: number;
  file: string;
  type: StepType;
  def: StepDefinition;
  published: boolean;
  /** i18n/en tərcüməsi (yoxdursa null) */
  tr: StepTranslation | null;
}
interface PlannedModule {
  key: string;
  order: number;
  dir: string;
  title: string;
  description?: string;
  published: boolean;
  steps: PlannedStep[];
  i18n: { en: { title?: string; description?: string } } | null;
}
interface PlannedAsset {
  path: string;
  filename: string;
  buffer: Buffer;
}
interface PlannedPath {
  input: PathInput;
  items: PathItemInput[];
  published: boolean | undefined;
  exists: boolean;
}
interface ImportPlan {
  /** yalnız path.yaml olan paketdə null */
  course: ReturnType<typeof courseYamlSchema.parse> | null;
  coursePublishedExplicit: boolean;
  trackId: string | null;
  existingCourseId: string | null;
  /** course.yaml-da `topics` verilibsə — bazada tapılan mövzular (verilməyibsə null: dəyişmir) */
  topicIds: string[] | null;
  courseI18n: { en: { title?: string; description?: string } } | null;
  modules: PlannedModule[];
  assets: PlannedAsset[];
  path: PlannedPath | null;
}

const ASSET_DIRS = new Set([
  'datasets',
  'images',
  'files',
  'videos',
  'checks',
  'logs',
  'attachments',
  'data',
]);
const yamlLoad = (text: string): unknown => yaml.load(text, { schema: yaml.JSON_SCHEMA });
const stepTypeOf = (def: StepDefinition): StepType => def.type.toUpperCase() as StepType;

/** ZIP → fayl xəritəsi; bütün yollar ortaq kök qovluqdadırsa o qovluq atılır */
export function readZip(buffer: Buffer): Map<string, Buffer> {
  const zip = new AdmZip(buffer);
  const entries = zip
    .getEntries()
    .filter(
      (e) =>
        !e.isDirectory &&
        !e.entryName.startsWith('__MACOSX/') &&
        !e.entryName.split('/').pop()?.startsWith('.'),
    );
  const files = new Map<string, Buffer>();
  for (const e of entries)
    files.set(e.entryName.replace(/\\/g, '/').replace(/^\.\//, ''), e.getData());
  const names = [...files.keys()];
  if (!names.some((n) => n === 'course.yaml' || n === 'course.yml')) {
    const roots = new Set(names.map((n) => n.split('/')[0]));
    if (roots.size === 1 && names.every((n) => n.includes('/'))) {
      const root = [...roots][0]!;
      const stripped = new Map<string, Buffer>();
      for (const [k, v] of files) stripped.set(k.slice(root.length + 1), v);
      return stripped;
    }
  }
  return files;
}

@Injectable()
export class PackageService {
  private readonly log = new Logger('Package');
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly sqlCheck: SqlCheckService,
    private readonly pathsAdmin: PathsAdminService,
  ) {}

  /* ───────────── validasiya ───────────── */

  async validate(buffer: Buffer): Promise<{ report: ImportReport; plan: ImportPlan | null }> {
    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];
    const empty = (): ImportReport => ({
      ok: false,
      course: null,
      errors,
      warnings,
      summary: { modules: 0, steps: 0, assets: 0, byType: {}, willUnpublish: [] },
    });
    let files: Map<string, Buffer>;
    try {
      files = readZip(buffer);
    } catch {
      errors.push({ file: '(zip)', message: 'ZIP faylı oxunmadı' });
      return { report: empty(), plan: null };
    }
    const courseFile = files.has('course.yaml')
      ? 'course.yaml'
      : files.has('course.yml')
        ? 'course.yml'
        : null;
    if (!courseFile) {
      if (files.has('path.yaml')) {
        // yalnız yol paketi (course.yaml yoxdur)
        const path = await this.parsePath(files, errors, warnings, new Set());
        const report: ImportReport = {
          ...empty(),
          ok: errors.length === 0,
          path: path
            ? {
                slug: path.input.slug,
                title: path.input.title,
                track: path.input.track,
                exists: path.exists,
                items: path.items.length,
              }
            : null,
        };
        const plan: ImportPlan | null =
          errors.length === 0 && path
            ? {
                course: null,
                coursePublishedExplicit: false,
                trackId: null,
                existingCourseId: null,
                topicIds: null,
                courseI18n: null,
                modules: [],
                assets: [],
                path,
              }
            : null;
        return { report, plan };
      }
      errors.push({
        file: 'course.yaml',
        message: 'course.yaml tapılmadı (paketin kökündə olmalıdır)',
      });
      return { report: empty(), plan: null };
    }
    let courseRaw: unknown;
    try {
      courseRaw = yamlLoad(files.get(courseFile)!.toString('utf8'));
    } catch (e) {
      errors.push({
        file: courseFile,
        message: `YAML xətası: ${(e as Error).message.split('\n')[0]}`,
      });
      return { report: empty(), plan: null };
    }
    const courseParsed = courseYamlSchema.safeParse(courseRaw);
    if (!courseParsed.success) {
      for (const i of zodIssues(courseParsed.error))
        errors.push({ file: courseFile, message: `${i.path || 'course'}: ${i.message}` });
      return { report: empty(), plan: null };
    }
    const course = courseParsed.data;
    const translations = loadTranslations(files, errors);
    const courseI18n = translations.course ? { en: translations.course } : null;
    const coursePublishedExplicit =
      typeof courseRaw === 'object' &&
      courseRaw !== null &&
      'published' in (courseRaw as Record<string, unknown>);
    const track = await this.prisma.track.findUnique({ where: { slug: course.track } });
    if (!track)
      errors.push({
        file: courseFile,
        message: `İstiqamət tapılmadı: ${course.track} (əvvəlcə admin-də yaradın)`,
      });
    const existing = await this.prisma.course.findUnique({
      where: { slug: course.slug },
      include: { modules: { include: { steps: true } } },
    });
    if (existing?.deletedAt)
      errors.push({
        file: courseFile,
        message: `«${course.slug}» kursu «Silinənlər» bölməsindədir — əvvəlcə bərpa edin və ya həmişəlik silin`,
      });

    // fayllar (assets)
    const assets: PlannedAsset[] = [];
    for (const [path, buf] of files) {
      const top = path.split('/')[0]!;
      if (
        path.startsWith('modules/') ||
        path.startsWith('path-items/') ||
        path.startsWith('i18n/') ||
        path === courseFile ||
        path === 'path.yaml'
      )
        continue;
      if (!path.includes('/')) {
        if (path === course.cover) assets.push({ path, filename: path, buffer: buf });
        else
          warnings.push({
            file: path,
            message:
              'Kökdəki fayl nəzərə alınmadı (fayllar alt qovluqda olmalıdır: datasets/, images/, files/…)',
          });
        continue;
      }
      if (!ASSET_DIRS.has(top))
        warnings.push({ file: path, message: `"${top}/" qovluğu fayl kimi idxal olunur` });
      assets.push({ path, filename: path.split('/').pop()!, buffer: buf });
    }
    const plannedPath = files.has('path.yaml')
      ? await this.parsePath(files, errors, warnings, new Set([course.slug]))
      : null;
    if (course.cover && !assets.some((a) => a.path === course.cover))
      errors.push({ file: courseFile, message: `cover faylı tapılmadı: ${course.cover}` });
    const assetPaths = new Set(assets.map((a) => a.path));

    // fəsillər
    const moduleDirs = new Map<string, string[]>();
    for (const path of files.keys()) {
      if (!path.startsWith('modules/')) continue;
      const parts = path.split('/');
      if (parts.length < 3) {
        warnings.push({
          file: path,
          message: 'modules/ altında fayl birbaşa fəsil qovluğunda olmalıdır',
        });
        continue;
      }
      const dir = parts[1]!;
      if (!moduleDirs.has(dir)) moduleDirs.set(dir, []);
      moduleDirs.get(dir)!.push(path);
    }
    if (moduleDirs.size === 0)
      errors.push({
        file: 'modules/',
        message: 'Heç bir fəsil qovluğu tapılmadı (modules/01-ad/)',
      });
    const modules: PlannedModule[] = [];
    const seenModuleKeys = new Set<string>();
    const byType: Partial<Record<StepType, number>> = {};
    let stepCount = 0;
    const sortedDirs = [...moduleDirs.keys()].sort(
      (a, b) =>
        (parseFileName(a).order ?? 9999) - (parseFileName(b).order ?? 9999) || a.localeCompare(b),
    );
    for (const [mi, dir] of sortedDirs.entries()) {
      const parsedDir = parseFileName(dir);
      const key = parsedDir.key;
      if (seenModuleKeys.has(key))
        errors.push({ file: `modules/${dir}`, message: `Fəsil açarı təkrarlanır: ${key}` });
      seenModuleKeys.add(key);
      const paths = moduleDirs.get(dir)!;
      const modFile = paths.find((p) => /\/module\.ya?ml$/.test(p));
      let title = key;
      let description: string | undefined;
      let published = true;
      if (modFile) {
        try {
          const r = moduleYamlSchema.safeParse(yamlLoad(files.get(modFile)!.toString('utf8')));
          if (r.success) ({ title, description, published } = r.data);
          else
            for (const i of zodIssues(r.error))
              errors.push({ file: modFile, message: `${i.path}: ${i.message}` });
        } catch (e) {
          errors.push({
            file: modFile,
            message: `YAML xətası: ${(e as Error).message.split('\n')[0]}`,
          });
        }
      } else
        warnings.push({
          file: `modules/${dir}/module.yaml`,
          message: 'module.yaml yoxdur — başlıq qovluq adından götürüldü',
        });
      const steps: PlannedStep[] = [];
      const seenStepKeys = new Set<string>();
      const mt = moduleTranslation(translations, dir, key);
      const usedTr = new Set<string>();
      const stepFiles = paths
        .filter((p) => !/\/module\.ya?ml$/.test(p) && p.split('/').length === 3)
        .sort(
          (a, b) =>
            (parseFileName(a).order ?? 9999) - (parseFileName(b).order ?? 9999) ||
            a.localeCompare(b),
        );
      for (const [si, file] of stepFiles.entries()) {
        const pf = parseFileName(file);
        if (!['yaml', 'yml', 'md'].includes(pf.ext)) {
          warnings.push({
            file,
            message: 'Addım faylı deyil (yalnız .yaml / .md), nəzərə alınmadı',
          });
          continue;
        }
        if (seenStepKeys.has(pf.key))
          errors.push({ file, message: `Addım açarı təkrarlanır: ${pf.key}` });
        seenStepKeys.add(pf.key);
        const text = files.get(file)!.toString('utf8');
        let raw: Record<string, unknown>;
        try {
          if (pf.ext === 'md') {
            const { front, body } = splitFrontMatter(text);
            const fm = (front ? (yamlLoad(front) as Record<string, unknown>) : {}) ?? {};
            const h1 = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
            raw = { type: 'theory', title: fm.title ?? h1 ?? pf.key, ...fm, content: body };
          } else {
            raw = (yamlLoad(text) as Record<string, unknown>) ?? {};
            if (raw.type === 'theory' && typeof raw.content_file === 'string') {
              const rel = raw.content_file.replace(/^\.\//, '');
              const candidates = [`modules/${dir}/${rel}`, rel];
              const found = candidates.find((c) => files.has(c));
              if (!found)
                errors.push({ file, message: `content_file tapılmadı: ${raw.content_file}` });
              else {
                const { front, body } = splitFrontMatter(files.get(found)!.toString('utf8'));
                void front;
                raw.content = body;
              }
            }
          }
        } catch (e) {
          errors.push({ file, message: `YAML xətası: ${(e as Error).message.split('\n')[0]}` });
          continue;
        }
        const parsed = stepYamlSchema.safeParse(raw);
        if (!parsed.success) {
          for (const i of zodIssues(parsed.error))
            errors.push({ file, message: `${i.path || 'addım'}: ${i.message}` });
          continue;
        }
        const yamlStep = parsed.data as StepYaml;
        const def = yamlStepToDefinition(yamlStep);
        const enPartial = mt?.steps[pf.key];
        if (enPartial) usedTr.add(pf.key);
        const tr = enPartial
          ? translateStep(raw, enPartial, splitStep(def), `${mt!.file} → ${pf.key}`, errors)
          : null;
        const published = (raw.published as boolean | undefined) ?? true;
        const issues = validateForPublish(def, assetPaths);
        for (const i of issues) errors.push({ file, message: `${i.path}: ${i.message}` });
        const type = stepTypeOf(def);
        byType[type] = (byType[type] ?? 0) + 1;
        stepCount++;
        steps.push({ key: pf.key, order: si + 1, file, type, def, published, tr });
      }
      for (const k of Object.keys(mt?.steps ?? {}))
        if (!usedTr.has(k))
          warnings.push({ file: mt!.file, message: `Tərcümədə naməlum addım: ${k}` });
      const i18n =
        mt && (mt.title || mt.description)
          ? { en: { title: mt.title, description: mt.description } }
          : null;
      modules.push({ key, order: mi + 1, dir, title, description, published, steps, i18n });
    }

    const willUnpublish: string[] = [];
    if (existing) {
      const newKeys = new Map(modules.map((m) => [m.key, new Set(m.steps.map((s) => s.key))]));
      for (const m of existing.modules) {
        const ks = newKeys.get(m.key);
        if (!ks) willUnpublish.push(`${m.key} (fəsil)`);
        else for (const s of m.steps) if (!ks.has(s.key)) willUnpublish.push(`${m.key}/${s.key}`);
      }
    }
    let topicIds: string[] | null = null;
    if (course.topics) {
      const found = await this.prisma.topic.findMany({
        where: { slug: { in: course.topics } },
        select: { id: true, slug: true },
      });
      topicIds = found.map((x) => x.id);
      const known = new Set(found.map((x) => x.slug));
      for (const tslug of course.topics)
        if (!known.has(tslug))
          warnings.push({
            file: 'course.yaml',
            message: `Mövzu tapılmadı: «${tslug}» — əvvəlcə admin paneldə yaradın (idxalda nəzərə alınmır)`,
          });
    }
    const report: ImportReport = {
      ok: errors.length === 0,
      course: { slug: course.slug, title: course.title, track: course.track, exists: !!existing },
      errors,
      warnings,
      summary: {
        modules: modules.length,
        steps: stepCount,
        assets: assets.length,
        byType,
        willUnpublish,
      },
      path: plannedPath
        ? {
            slug: plannedPath.input.slug,
            title: plannedPath.input.title,
            track: plannedPath.input.track,
            exists: plannedPath.exists,
            items: plannedPath.items.length,
          }
        : null,
    };
    const plan: ImportPlan | null =
      errors.length === 0 && track
        ? {
            course,
            coursePublishedExplicit,
            trackId: track.id,
            existingCourseId: existing?.id ?? null,
            topicIds,
            courseI18n,
            modules,
            assets,
            path: plannedPath,
          }
        : null;
    return { report, plan };
  }

  /** path.yaml (+ path-items/<key>.yaml): sxem, istiqamət, kursların mövcudluğu (paketdəki kurs da sayılır) */
  private async parsePath(
    files: Map<string, Buffer>,
    errors: ImportIssue[],
    warnings: ImportIssue[],
    packageCourseSlugs: Set<string>,
  ): Promise<PlannedPath | null> {
    let raw: unknown;
    try {
      raw = yaml.load(files.get('path.yaml')!.toString('utf8'));
    } catch (e) {
      errors.push({
        file: 'path.yaml',
        message: `YAML xətası: ${(e as Error).message.split('\n')[0]}`,
      });
      return null;
    }
    const parsed = pathYamlSchema.safeParse(raw);
    if (!parsed.success) {
      for (const i of zodIssues(parsed.error))
        errors.push({ file: 'path.yaml', message: `${i.path || 'path'}: ${i.message}` });
      return null;
    }
    const extra = (key: string) => {
      for (const ext of ['yaml', 'yml']) {
        const f = files.get(`path-items/${key}.${ext}`);
        if (!f) continue;
        try {
          const r = pathItemFileSchema.safeParse(yaml.load(f.toString('utf8')));
          if (r.success) return r.data;
          errors.push({
            file: `path-items/${key}.${ext}`,
            message: zodIssues(r.error)
              .map((i) => `${i.path}: ${i.message}`)
              .join('; '),
          });
        } catch (e) {
          errors.push({
            file: `path-items/${key}.${ext}`,
            message: `YAML xətası: ${(e as Error).message.split('\n')[0]}`,
          });
        }
      }
      return null;
    };
    const { path, items } = yamlToPathInput(parsed.data, extra);
    const track = await this.prisma.track.findUnique({ where: { slug: path.track } });
    if (!track) errors.push({ file: 'path.yaml', message: `İstiqamət tapılmadı: ${path.track}` });
    const slugs = items
      .filter((i) => i.type === 'course')
      .map((i) => (i as { course_slug: string }).course_slug);
    const existingCourses = slugs.length
      ? await this.prisma.course.findMany({
          where: { slug: { in: slugs } },
          select: { slug: true, isPublished: true },
        })
      : [];
    for (const slug of slugs) {
      const c = existingCourses.find((x) => x.slug === slug);
      if (!c && !packageCourseSlugs.has(slug))
        errors.push({
          file: 'path.yaml',
          message: `Kurs tapılmadı: ${slug} (əvvəlcə kursu idxal edin və ya eyni paketə qoyun)`,
        });
      else if (c && !c.isPublished && parsed.data.published)
        warnings.push({
          file: 'path.yaml',
          message: `Kurs dərc olunmayıb: ${slug} — yol dərc edilə bilməyəcək`,
        });
    }
    const keys = items.map((i) => i.key ?? '');
    if (new Set(keys).size !== keys.length)
      errors.push({ file: 'path.yaml', message: 'Addım açarları təkrarlanır' });
    const existing = await this.prisma.learningPath.findUnique({ where: { slug: path.slug } });
    return { input: path, items, published: parsed.data.published, exists: !!existing };
  }

  /* ───────────── tətbiq ───────────── */

  /** userId: null — sistem idxalı (repo-dakı content/courses, ContentSyncService) */
  async apply(buffer: Buffer, filename: string, userId: string | null): Promise<ImportReport> {
    const { report, plan } = await this.validate(buffer);
    if (!plan) {
      await this.prisma.courseImport.create({
        data: {
          slug: report.course?.slug ?? '?',
          filename,
          status: 'FAILED',
          report: report as unknown as Prisma.InputJsonValue,
          uploadedById: userId,
        },
      });
      return report;
    }
    if (!plan.course) {
      // yalnız yol paketi
      const r = await this.applyPath(plan.path!, report);
      const imp = await this.prisma.courseImport.create({
        data: {
          slug: plan.path!.input.slug,
          filename,
          status: r ? 'APPLIED' : 'FAILED',
          report: report as unknown as Prisma.InputJsonValue,
          uploadedById: userId,
        },
      });
      report.applied = {
        courseId: null,
        courseSlug: null,
        importId: imp.id,
        pathId: r?.id ?? null,
        pathSlug: r?.slug ?? null,
      };
      report.ok = !!r;
      return report;
    }
    const c = plan.course;
    const trackId = plan.trackId!;
    // 1) fayllar əvvəlcə yaddaşa (idempotent: eyni path → əvəz)
    const courseId = await this.prisma.$transaction(
      async (tx) => {
        const course = plan.existingCourseId
          ? await tx.course.update({
              where: { id: plan.existingCourseId },
              data: {
                title: c.title,
                trackId,
                level: levelFromYaml(c.level),
                description: c.description,
                sequential: c.sequential,
                estimatedHours: c.estimated_hours ?? null,
                importedAt: new Date(),
                i18n: jsonOrNull(plan.courseI18n),
                ...(plan.topicIds ? { topics: { set: plan.topicIds.map((id) => ({ id })) } } : {}),
                ...(plan.coursePublishedExplicit
                  ? {
                      isPublished: c.published,
                      ...(c.published ? { publishedAt: new Date() } : {}),
                    }
                  : {}),
              },
            })
          : await tx.course.create({
              data: {
                slug: c.slug,
                title: c.title,
                trackId,
                level: levelFromYaml(c.level),
                description: c.description,
                sequential: c.sequential,
                estimatedHours: c.estimated_hours ?? null,
                order:
                  ((
                    await tx.course.aggregate({
                      where: { trackId: trackId },
                      _max: { order: true },
                    })
                  )._max.order ?? 0) + 1,
                isPublished: c.published,
                publishedAt: c.published ? new Date() : null,
                importedAt: new Date(),
                i18n: jsonOrNull(plan.courseI18n),
                createdById: userId,
                ...(plan.topicIds?.length
                  ? { topics: { connect: plan.topicIds.map((id) => ({ id })) } }
                  : {}),
              },
            });
        // fayllar
        for (const a of plan.assets) {
          const existing = await tx.asset.findUnique({
            where: { courseId_path: { courseId: course.id, path: a.path } },
          });
          const unchanged = existing && existing.sha256 === sha256(a.buffer);
          if (unchanged) continue;
          const storageKey = await saveToStorage(course.id, a.filename, a.buffer);
          const data = {
            courseId: course.id,
            path: a.path,
            kind: detectKind(a.path),
            filename: a.filename,
            mime: mimeOf(a.filename),
            sizeBytes: a.buffer.length,
            sha256: sha256(a.buffer),
            storageKey,
            uploadedById: userId,
          };
          if (existing) {
            await tx.asset.update({ where: { id: existing.id }, data });
            await removeFromStorage(existing.storageKey);
          } else await tx.asset.create({ data });
        }
        if (c.cover) {
          const cover = await tx.asset.findUnique({
            where: { courseId_path: { courseId: course.id, path: c.cover } },
          });
          if (cover)
            await tx.course.update({ where: { id: course.id }, data: { coverAssetId: cover.id } });
        }
        // fəsillər — iki fazalı sıra: əvvəl mənfi
        const existingModules = await tx.module.findMany({
          where: { courseId: course.id },
          include: { steps: { include: { ctfTasks: true } } },
        });
        const keepModuleKeys = new Set(plan.modules.map((m) => m.key));
        let tmp = -1000;
        for (const m of existingModules)
          await tx.module.update({ where: { id: m.id }, data: { order: tmp-- } });
        const moduleIds = new Map<string, string>();
        for (const m of plan.modules) {
          const row = await tx.module.upsert({
            where: { courseId_key: { courseId: course.id, key: m.key } },
            create: {
              courseId: course.id,
              key: m.key,
              title: m.title,
              description: m.description,
              order: m.order,
              isPublished: m.published,
              i18n: jsonOrNull(m.i18n),
            },
            update: {
              title: m.title,
              description: m.description,
              order: m.order,
              isPublished: m.published,
              i18n: jsonOrNull(m.i18n),
            },
          });
          moduleIds.set(m.key, row.id);
          // addımlar
          const existingSteps = existingModules.find((x) => x.key === m.key)?.steps ?? [];
          let stmp = -1000;
          for (const s of existingSteps)
            await tx.step.update({ where: { id: s.id }, data: { order: stmp-- } });
          const keepStepKeys = new Set(m.steps.map((s) => s.key));
          for (const s of m.steps) {
            const split = splitStep(s.def);
            const prev = existingSteps.find((x) => x.key === s.key);
            if (prev && prev.type !== split.type) {
              const progress = await tx.stepProgress.count({ where: { stepId: prev.id } });
              if (progress > 0)
                throw badRequest(
                  'STEP_TYPE_LOCKED',
                  `${m.key}/${s.key}: irəliləyişi olan addımın tipi dəyişdirilə bilməz (${prev.type} → ${split.type})`,
                );
            }
            const secret = split.secret
              ? (split.secret as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull;
            const row = await tx.step.upsert({
              where: { moduleId_key: { moduleId: row_id(moduleIds, m.key), key: s.key } },
              create: {
                moduleId: row_id(moduleIds, m.key),
                key: s.key,
                type: split.type,
                title: split.title,
                xp: split.xp,
                estimatedMinutes: split.estimatedMinutes,
                order: s.order,
                isPublished: s.published,
                config: split.config as unknown as Prisma.InputJsonValue,
                secret,
                i18n: jsonOrNull(s.tr?.i18n),
                secretI18n: jsonOrNull(s.tr?.secretI18n),
              },
              update: {
                type: split.type,
                title: split.title,
                xp: split.xp,
                estimatedMinutes: split.estimatedMinutes,
                order: s.order,
                isPublished: s.published,
                config: split.config as unknown as Prisma.InputJsonValue,
                secret,
                i18n: jsonOrNull(s.tr?.i18n),
                secretI18n: jsonOrNull(s.tr?.secretI18n),
              },
            });
            // ctf tapşırıqları
            const prevTasks = new Map((prev?.ctfTasks ?? []).map((t) => [t.key, t]));
            const keepTaskKeys = new Set(split.ctfTasks.map((t) => t.key));
            await tx.ctfTask.deleteMany({
              where: { stepId: row.id, key: { notIn: [...keepTaskKeys] } },
            });
            for (const t of split.ctfTasks) {
              const answerHash = t.answer
                ? hashAnswer(t.answer, t.caseSensitive)
                : (t.answerHash ?? prevTasks.get(t.key)?.answerHash ?? '');
              const data = {
                key: t.key,
                question: t.question,
                hint: t.hint ?? null,
                points: t.points,
                caseSensitive: t.caseSensitive,
                answerHash,
                i18n: jsonOrNull(s.tr?.ctf.get(t.key)),
              };
              await tx.ctfTask.upsert({
                where: { stepId_key: { stepId: row.id, key: t.key } },
                create: { stepId: row.id, ...data, order: -t.order },
                update: { ...data, order: -t.order },
              });
            }
            for (const t of split.ctfTasks)
              await tx.ctfTask.update({
                where: { stepId_key: { stepId: row.id, key: t.key } },
                data: { order: t.order },
              });
          }
          // paketdə olmayan addımlar → qaralama, sona
          let next = m.steps.length + 1;
          for (const s of existingSteps
            .filter((x) => !keepStepKeys.has(x.key))
            .sort((a, b) => a.key.localeCompare(b.key))) {
            await tx.step.update({
              where: { id: s.id },
              data: { order: next++, isPublished: false },
            });
          }
        }
        // paketdə olmayan fəsillər → qaralama, sona
        let nextM = plan.modules.length + 1;
        for (const m of existingModules
          .filter((x) => !keepModuleKeys.has(x.key))
          .sort((a, b) => a.key.localeCompare(b.key))) {
          await tx.module.update({
            where: { id: m.id },
            data: { order: nextM++, isPublished: false },
          });
        }
        void reorderInTx;
        return course.id;
      },
      { timeout: 120_000 },
    );
    // 2) SQL addımları üçün gözlənilən nəticə (uğursuz olsa addım qaralamaya düşür)
    const sqlSteps = await this.prisma.step.findMany({
      where: { type: 'SQL', isPublished: true, module: { courseId } },
    });
    for (const s of sqlSteps) {
      try {
        await this.sqlCheck.computeAndStore(s.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        report.warnings.push({
          file: `${s.key}`,
          message: `SQL həlli hesablanmadı, addım qaralamaya keçirildi: ${msg}`,
        });
        await this.prisma.step.update({ where: { id: s.id }, data: { isPublished: false } });
      }
    }
    await this.progress.recomputeCourse(courseId);
    // 3) path.yaml (kurs artıq bazadadır)
    const pathResult = plan.path ? await this.applyPath(plan.path, report) : null;
    const imp = await this.prisma.courseImport.create({
      data: {
        courseId,
        slug: c.slug,
        filename,
        status: 'APPLIED',
        report: report as unknown as Prisma.InputJsonValue,
        uploadedById: userId,
      },
    });
    report.applied = {
      courseId,
      courseSlug: c.slug,
      importId: imp.id,
      pathId: pathResult?.id ?? null,
      pathSlug: pathResult?.slug ?? null,
    };
    return report;
  }

  /**
   * Bazada artıq olan kurs üçün YALNIZ tərcümələri yenilə (məzmun, sıra, irəliləyiş toxunulmaz).
   * API açılanda ContentSync çağırır — paketə yeni tərcümə əlavə olunanda yenidən idxal lazım olmur.
   * Qaytarır: yenilənən sətirlərin sayı (paket keçərsizdirsə və ya kurs yoxdursa null).
   */
  async applyTranslations(buffer: Buffer): Promise<number | null> {
    const { report, plan } = await this.validate(buffer);
    if (!plan?.existingCourseId || !report.ok) return null;
    const courseId = plan.existingCourseId;
    // jsonb açarları sıralayır — müqayisə açar sırasından asılı olmasın
    const canon = (v: unknown): unknown =>
      Array.isArray(v)
        ? v.map(canon)
        : v && typeof v === 'object'
          ? Object.fromEntries(
              Object.entries(v as Record<string, unknown>)
                .filter(([, x]) => x !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, x]) => [k, canon(x)]),
            )
          : v;
    const same = (a: unknown, b: unknown) =>
      JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));
    let n = 0;
    const course = await this.prisma.course.findUniqueOrThrow({
      where: { id: courseId },
      select: {
        i18n: true,
        modules: {
          select: {
            id: true,
            key: true,
            i18n: true,
            steps: {
              select: {
                id: true,
                key: true,
                i18n: true,
                secretI18n: true,
                ctfTasks: { select: { id: true, key: true, i18n: true } },
              },
            },
          },
        },
      },
    });
    if (!same(course.i18n, plan.courseI18n)) {
      await this.prisma.course.update({
        where: { id: courseId },
        data: { i18n: jsonOrNull(plan.courseI18n) },
      });
      n++;
    }
    for (const m of plan.modules) {
      const row = course.modules.find((x) => x.key === m.key);
      if (!row) continue;
      if (!same(row.i18n, m.i18n)) {
        await this.prisma.module.update({
          where: { id: row.id },
          data: { i18n: jsonOrNull(m.i18n) },
        });
        n++;
      }
      for (const s of m.steps) {
        const st = row.steps.find((x) => x.key === s.key);
        if (!st) continue;
        if (!same(st.i18n, s.tr?.i18n) || !same(st.secretI18n, s.tr?.secretI18n)) {
          await this.prisma.step.update({
            where: { id: st.id },
            data: { i18n: jsonOrNull(s.tr?.i18n), secretI18n: jsonOrNull(s.tr?.secretI18n) },
          });
          n++;
        }
        for (const t of st.ctfTasks) {
          const want = s.tr?.ctf.get(t.key);
          if (same(t.i18n, want)) continue;
          await this.prisma.ctfTask.update({
            where: { id: t.id },
            data: { i18n: jsonOrNull(want) },
          });
          n++;
        }
      }
    }
    return n;
  }

  /** Yolun tətbiqi — uğursuz olsa hesabat xətası (kurs idxalı ləğv olunmur) */
  private async applyPath(
    planned: PlannedPath,
    report: ImportReport,
  ): Promise<{ id: string; slug: string } | null> {
    try {
      return await this.prisma.$transaction((tx) =>
        this.pathsAdmin.upsertFromInput(tx, planned.input, planned.items, planned.published),
      );
    } catch (e) {
      const err = e as { code?: string; message?: string; details?: unknown };
      const details = Array.isArray(err.details)
        ? (err.details as Array<{ path: string; message: string }>)
            .map((d) => `${d.path}: ${d.message}`)
            .join('; ')
        : '';
      report.errors.push({
        file: 'path.yaml',
        message: `Yol tətbiq olunmadı: ${err.message ?? String(e)}${details ? ` (${details})` : ''}`,
      });
      report.ok = false;
      return null;
    }
  }

  async list(courseId?: string) {
    const rows = await this.prisma.courseImport.findMany({
      where: courseId ? { courseId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      filename: r.filename,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      courseId: r.courseId,
    }));
  }

  /* ───────────── ixrac ───────────── */

  async exportZip(courseId: string): Promise<{ buffer: Buffer; filename: string }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        track: true,
        cover: true,
        topics: { orderBy: { order: 'asc' }, select: { slug: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: { ctfTasks: { orderBy: { order: 'asc' } } },
            },
          },
        },
        assets: true,
      },
    });
    if (!course) throw notFound();
    const zip = new AdmZip();
    const add = (path: string, content: string | Buffer) =>
      zip.addFile(path, typeof content === 'string' ? Buffer.from(content, 'utf8') : content);
    const courseYaml: Record<string, unknown> = {
      track: course.track.slug,
      title: course.title,
      slug: course.slug,
      level: levelToYaml(course.level),
      description: course.description,
      ...(course.cover ? { cover: course.cover.path } : {}),
      sequential: course.sequential,
      ...(course.estimatedHours != null ? { estimated_hours: course.estimatedHours } : {}),
      published: course.isPublished,
      ...(course.topics.length ? { topics: course.topics.map((x) => x.slug) } : {}),
    };
    add('course.yaml', yaml.dump(courseYaml, { lineWidth: 120, noRefs: true }));
    const pad = (n: number) => String(n).padStart(2, '0');
    for (const m of course.modules) {
      const dir = `modules/${pad(m.order)}-${m.key}`;
      add(
        `${dir}/module.yaml`,
        yaml.dump(
          {
            title: m.title,
            ...(m.description ? { description: m.description } : {}),
            published: m.isPublished,
          },
          { lineWidth: 120 },
        ),
      );
      for (const s of m.steps) {
        const def = mergeStep(
          s.type as StepType,
          s.title,
          s.xp,
          s.estimatedMinutes,
          s.config,
          s.secret,
          s.ctfTasks.map((t) => ({ ...t, answerHash: t.answerHash || '' })),
        );
        if (def.type === 'theory') {
          const fm: Record<string, unknown> = {
            title: def.title,
            xp: def.xp,
            ...(def.video_url ? { video_url: def.video_url } : {}),
            ...(def.estimated_minutes != null ? { estimated_minutes: def.estimated_minutes } : {}),
            ...(s.isPublished ? {} : { published: false }),
          };
          add(
            `${dir}/${pad(s.order)}-${s.key}.md`,
            `---\n${yaml.dump(fm, { lineWidth: 120 })}---\n${def.content ?? ''}`,
          );
        } else {
          const y = definitionToYamlStep(def as StepDefinition, s.isPublished);
          // gözlənilən nəticə keşi ixraca düşmür
          add(
            `${dir}/${pad(s.order)}-${s.key}.yaml`,
            yaml.dump(y, { lineWidth: 120, noRefs: true }),
          );
        }
      }
    }
    for (const a of course.assets) {
      try {
        add(a.path, await readFromStorage(a.storageKey));
      } catch {
        this.log.warn(`Fayl yaddaşda tapılmadı: ${a.path}`);
      }
    }
    return { buffer: zip.toBuffer(), filename: `${course.slug}.zip` };
  }
}

/** Json? sütun üçün: dəyər yoxdursa SQL NULL */
function jsonOrNull(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return v ? (v as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function row_id(map: Map<string, string>, key: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`module id missing for ${key}`);
  return id;
}

function mimeOf(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const map: Record<string, string> = {
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    json: 'application/json',
    txt: 'text/plain',
    md: 'text/markdown',
    sql: 'application/sql',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    pdf: 'application/pdf',
    sh: 'text/x-shellscript',
    py: 'text/x-python',
    log: 'text/plain',
    parquet: 'application/vnd.apache.parquet',
    sqlite: 'application/vnd.sqlite3',
    zip: 'application/zip',
  };
  return map[ext] ?? 'application/octet-stream';
}
