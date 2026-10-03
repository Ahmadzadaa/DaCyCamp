import { z } from 'zod';
import { SLUG_RE } from '../keys';

/**
 * Karyera xəritəsi (roadmap): peşə → səviyyələr (Intern → Junior → Middle → Senior) →
 * bacarıq qrupları → bacarıqlar. Məzmunu yalnız admin dəyişir; tələbə bacarıqları işarələyir
 * (özünüqiymətləndirmə), platformadakı kursa bağlı bacarıq kurs bitəndə avtomatik ✓ olur.
 */
const text = (max: number) => z.string().trim().min(1).max(max);

export const roadmapSkillSchema = z.object({
  /** sabit id — tələbə işarələri buna bağlıdır (dəyişdirməyin) */
  id: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'id: kiçik hərf, rəqəm və «-»'),
  title: text(120),
  desc: z.string().trim().max(400).optional(),
  /** əsas bacarıq (hazırlıq faizinə daxildir); false — «əlavə üstünlük» */
  core: z.boolean().default(true),
  /** platformadakı kursun slug-ı (bitirəndə avtomatik ✓) */
  course: z.string().trim().max(80).regex(SLUG_RE).optional(),
});

export const roadmapGroupSchema = z.object({
  title: text(80),
  skills: z.array(roadmapSkillSchema).min(1).max(30),
});

export const roadmapLevelSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(SLUG_RE),
  title: text(80),
  /** təxmini öyrənmə müddəti / təcrübə: «≈ 3–4 ay» */
  duration: z.string().trim().max(60).optional(),
  summary: text(600),
  /** «İşdə nə edəcəksən» */
  expectations: z.array(text(200)).max(12).default([]),
  tools: z.array(text(40)).max(20).default([]),
  project: z.object({ title: text(160), desc: z.string().trim().max(600).optional() }).optional(),
  groups: z.array(roadmapGroupSchema).min(1).max(12),
});

export const roadmapContentSchema = z
  .object({ levels: z.array(roadmapLevelSchema).min(1).max(8) })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    const keys = new Set<string>();
    c.levels.forEach((lv, li) => {
      if (keys.has(lv.key))
        ctx.addIssue({
          code: 'custom',
          path: ['levels', li, 'key'],
          message: `Təkrar səviyyə: ${lv.key}`,
        });
      keys.add(lv.key);
      lv.groups.forEach((g, gi) =>
        g.skills.forEach((s, si) => {
          if (ids.has(s.id))
            ctx.addIssue({
              code: 'custom',
              path: ['levels', li, 'groups', gi, 'skills', si, 'id'],
              message: `Təkrar bacarıq id-si: ${s.id}`,
            });
          ids.add(s.id);
        }),
      );
    });
  });

export const roadmapInputSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(SLUG_RE),
  title: text(80),
  tagline: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  /** istiqamət slug-ı (rəng, ikon və «praktiki yollar» bunun üzrə) */
  track: z.string().trim().max(60).optional().nullable(),
  isPublished: z.boolean().default(true),
  content: roadmapContentSchema,
});

export type RoadmapSkill = z.infer<typeof roadmapSkillSchema>;
export type RoadmapGroup = z.infer<typeof roadmapGroupSchema>;
export type RoadmapLevel = z.infer<typeof roadmapLevelSchema>;
export type RoadmapContent = z.infer<typeof roadmapContentSchema>;
export type RoadmapInput = z.infer<typeof roadmapInputSchema>;

type Seed = Omit<RoadmapInput, 'isPublished' | 'content'> & {
  content: { levels: Array<Omit<RoadmapLevel, 'groups'> & { groups: RoadmapGroup[] }> };
};

/** «b» — əsas bacarıq, «p» — əlavə üstünlük (plus) */
const b = (id: string, title: string, desc?: string): RoadmapSkill => ({
  id,
  title,
  ...(desc ? { desc } : {}),
  core: true,
});
const p = (id: string, title: string, desc?: string): RoadmapSkill => ({
  id,
  title,
  ...(desc ? { desc } : {}),
  core: false,
});

/** İlkin məzmun (seed): roadmap.sh və sənaye təcrübəsi əsasında, səviyyələrə bölünmüş öz versiyamız */
export const DEFAULT_ROADMAPS: Seed[] = [
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    tagline: 'Datadan biznes qərarlarına: Excel, SQL, BI və statistika',
    description:
      'Data analitik şirkətin suallarına data ilə cavab verir: nə baş verir, niyə baş verir və nə etməliyik. Bu xəritə Excel-dən başlayıb analitika strategiyasına qədər hər səviyyədə nəyi bilməli olduğunu göstərir.',
    track: 'data-analytics',
    content: {
      levels: [
        {
          key: 'intern',
          title: 'Intern Data Analyst',
          duration: '≈ 2–3 ay öyrənmə',
          summary:
            'Datanı oxumağı, təmizləməyi və sadə hesabatlar qurmağı öyrənirsən. Hədəf: Excel və SQL ilə gündəlik sualları müstəqil cavablandırmaq.',
          expectations: [
            'Hazır hesabatları yeniləmək və rəqəmləri yoxlamaq',
            'Excel cədvəllərini təmizləmək, pivot və qrafiklər qurmaq',
            'Sadə SQL sorğuları ilə lazım olan datanı çıxarmaq',
            'Komandanın suallarına aydın, qısa cavab hazırlamaq',
          ],
          tools: ['Excel', 'Google Sheets', 'SQL', 'PostgreSQL'],
          project: {
            title: 'Aylıq satış hesabatı',
            desc: 'Xam satış faylını təmizlə, pivot cədvəllərlə regionlar və məhsullar üzrə nəticə çıxar, 3 qrafiklə bir səhifəlik hesabat hazırla.',
          },
          groups: [
            {
              title: 'Excel',
              skills: [
                b(
                  'da-i-excel-formulas',
                  'Əsas formullar',
                  'SUM, AVERAGE, IF, COUNTIF, mətn və tarix funksiyaları',
                ),
                b('da-i-excel-lookup', 'XLOOKUP / VLOOKUP', 'cədvəlləri açar üzrə birləşdirmək'),
                b('da-i-excel-pivot', 'Pivot cədvəllər', 'qruplaşdırma, filtr, yekunlar'),
                b('da-i-excel-charts', 'Qrafiklər', 'sütun, xətt, pasta — hansını nə vaxt seçmək'),
                p(
                  'da-i-excel-pq',
                  'Power Query',
                  'təkrarlanan təmizləmə addımlarını avtomatlaşdırmaq',
                ),
              ],
            },
            {
              title: 'SQL əsasları',
              skills: [
                b('da-i-sql-select', 'SELECT, WHERE, ORDER BY'),
                b('da-i-sql-groupby', 'GROUP BY və aqreqatlar', 'COUNT, SUM, AVG, HAVING'),
                b('da-i-sql-join', 'JOIN-lər', 'INNER, LEFT — cədvəlləri birləşdirmək'),
                p('da-i-sql-case', 'CASE WHEN', 'şərtli sütunlar və kateqoriyalar'),
              ],
            },
            {
              title: 'Data və statistika',
              skills: [
                b('da-i-stat-desc', 'Təsviri statistika', 'orta, median, moda, dispersiya, faiz'),
                b('da-i-clean', 'Data təmizləmə', 'boşluqlar, dublikatlar, format səhvləri'),
                b(
                  'da-i-types',
                  'Data tipləri və strukturu',
                  'sətir, sütun, açar, kateqoriya vs rəqəm',
                ),
                p(
                  'da-i-viz',
                  'Vizualizasiya prinsipləri',
                  'aydın başlıq, ox, rəng — qrafikdə yalan danışmamaq',
                ),
              ],
            },
          ],
        },
        {
          key: 'junior',
          title: 'Junior Data Analyst',
          duration: '≈ 4–6 ay öyrənmə',
          summary:
            'Biznes metrikalarını izləyən dashboard-lar qurursan və suallara SQL + Python ilə dərin cavab tapırsan. Rəqəmin arxasındakı hekayəni danışmağı öyrənirsən.',
          expectations: [
            'BI alətində dashboard qurmaq və saxlamaq',
            'KPI-ları (satış, konversiya, retention) izləmək və dəyişiklikləri izah etmək',
            'Ad-hoc sorğulara SQL və Python ilə cavab vermək',
            'Nəticələri qısa təqdimatla komandaya çatdırmaq',
          ],
          tools: ['Power BI', 'Tableau', 'Python', 'pandas', 'SQL'],
          project: {
            title: 'E-ticarət KPI dashboard-u',
            desc: 'Sifariş datası üzərində gəlir, orta səbət, konversiya və təkrar alış metrikaları ilə interaktiv dashboard + 5 slaydlıq tapıntılar təqdimatı.',
          },
          groups: [
            {
              title: 'İrəli SQL',
              skills: [
                b('da-j-sql-cte', 'CTE və subquery'),
                b(
                  'da-j-sql-window',
                  'Window funksiyaları',
                  'ROW_NUMBER, LAG, hərəkətli orta, kumulyativ cəm',
                ),
                b('da-j-sql-dates', 'Tarixlərlə iş', 'həftə/ay üzrə qruplaşdırma, dövr müqayisəsi'),
              ],
            },
            {
              title: 'BI və vizualizasiya',
              skills: [
                b(
                  'da-j-bi-dashboard',
                  'Dashboard dizaynı',
                  'əsas sual → KPI → detallar ierarxiyası',
                ),
                b('da-j-bi-model', 'BI data modeli', 'cədvəllər arası əlaqələr, ölçülər'),
                p('da-j-bi-dax', 'DAX / hesablanmış sahələr'),
                b(
                  'da-j-story',
                  'Data storytelling',
                  'tapıntını kontekst, nəticə və tövsiyə ilə danışmaq',
                ),
              ],
            },
            {
              title: 'Python ilə analiz',
              skills: [
                b('da-j-py-pandas', 'pandas', 'oxumaq, filtr, groupby, merge, pivot'),
                b(
                  'da-j-py-eda',
                  'Kəşfiyyat analizi (EDA)',
                  'paylanmalar, korrelyasiya, anomaliyalar',
                ),
                p('da-j-py-viz', 'matplotlib / seaborn'),
              ],
            },
            {
              title: 'Biznes metrikaları',
              skills: [
                b('da-j-kpi', 'KPI-lar', 'gəlir, konversiya, retention, churn, ARPU'),
                b('da-j-funnel', 'Huni (funnel) analizi'),
                p('da-j-ab-basics', 'A/B test anlayışı', 'nəzarət və test qrupu, nəticəni oxumaq'),
              ],
            },
          ],
        },
        {
          key: 'middle',
          title: 'Middle Data Analyst',
          duration: '≈ 1–2 il təcrübə',
          summary:
            'Sualı özün formalaşdırırsan: təcrübə dizayn edirsən, statistik əminliklə nəticə çıxarırsan və analitika modelini komandalar üçün etibarlı edirsən.',
          expectations: [
            'A/B testləri dizayn etmək və nəticələrini statistik əsaslandırmaq',
            'Kohort, retention və proqnoz təhlilləri aparmaq',
            'Komandalar üçün vahid metrik tərifləri və data modeli qurmaq',
            'Stakeholder-lərlə tələbləri dəqiqləşdirmək, junior-lara kömək etmək',
          ],
          tools: ['SQL', 'Python', 'dbt', 'Power BI / Looker', 'statsmodels'],
          project: {
            title: 'A/B test hesabatı',
            desc: 'Yeni ödəniş səhifəsi üçün test dizaynı (hipotez, nümunə ölçüsü), nəticələrin təhlili və qərar memo-su.',
          },
          groups: [
            {
              title: 'Statistika',
              skills: [
                b(
                  'da-m-hyp',
                  'Hipotez testləri',
                  'p-dəyər, t-test, chi-square, güvən intervalları',
                ),
                b('da-m-ab', 'A/B test dizaynı', 'nümunə ölçüsü, power, eyni anda çox test riski'),
                b('da-m-reg', 'Reqressiya', 'xətti və logistik reqressiya, nəticəni şərh etmək'),
                p(
                  'da-m-ts',
                  'Zaman sıraları və proqnoz',
                  'trend, mövsümilik, sadə proqnoz modelləri',
                ),
              ],
            },
            {
              title: 'Analitika mühəndisliyi',
              skills: [
                b('da-m-model', 'Data modelləşdirmə', 'ulduz sxem: fact və dimension cədvəllər'),
                b('da-m-metrics', 'Metrik tərifləri', 'vahid, sənədləşdirilmiş KPI-lar'),
                p('da-m-dbt', 'dbt əsasları', 'SQL modelləri, testlər, sənədləşmə'),
              ],
            },
            {
              title: 'Dərin təhlil',
              skills: [
                b('da-m-cohort', 'Kohort və retention təhlili'),
                b('da-m-segment', 'Seqmentasiya', 'RFM, davranış qrupları'),
                p('da-m-root', 'Səbəb təhlili', 'metrik düşəndə «niyə?» sualına sistemli cavab'),
              ],
            },
          ],
        },
        {
          key: 'senior',
          title: 'Senior Data Analyst',
          duration: '3+ il təcrübə',
          summary:
            'Analitikanın istiqamətini müəyyən edirsən: hansı sualların vacib olduğunu seçirsən, metrik sistemi qurursan və rəhbərliyin qərarlarına birbaşa təsir edirsən.',
          expectations: [
            'Şirkət üçün metrik çərçivəsi (North Star və alt metrikalar) qurmaq',
            'Self-service analitika və data mədəniyyətini yaymaq',
            'Rəhbərliklə strateji suallar üzərində işləmək',
            'Komandaya mentorluq və keyfiyyət standartları',
          ],
          tools: ['Metrik çərçivələri', 'BI platforması', 'Data governance'],
          project: {
            title: 'Analitika yol xəritəsi',
            desc: 'Bir məhsul üçün North Star metrik, metrik ağacı, dashboard ierarxiyası və 6 aylıq analitika planı.',
          },
          groups: [
            {
              title: 'Strategiya',
              skills: [
                b(
                  'da-s-northstar',
                  'Metrik çərçivəsi',
                  'North Star, metrik ağacı, input vs output metrikalar',
                ),
                b('da-s-roadmap', 'Analitika yol xəritəsi', 'prioritetlər, təsir vs səy'),
                p(
                  'da-s-ml',
                  'Prediktiv analitika',
                  'ML komandası ilə əməkdaşlıq: churn, LTV proqnozu',
                ),
              ],
            },
            {
              title: 'Liderlik',
              skills: [
                b('da-s-mentor', 'Mentorluq və review', 'analiz və SQL code review'),
                b('da-s-influence', 'Təsir və təqdimat', 'rəhbərliyə qısa, qərar yönümlü təqdimat'),
                b(
                  'da-s-governance',
                  'Data keyfiyyəti və idarəetmə',
                  'sahiblik, sənədləşmə, giriş qaydaları',
                ),
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'data-engineer',
    title: 'Data Engineer',
    tagline: 'Datanı toplayan, emal edən və etibarlı saxlayan sistemlər qurmaq',
    description:
      'Data mühəndisi datanın mənbədən analitik və ML komandalarına qədər yolunu qurur: pipeline-lar, warehouse, axın sistemləri. Xəritə Python və SQL əsaslarından data platforma arxitekturasına qədər gedir.',
    track: 'data-engineering',
    content: {
      levels: [
        {
          key: 'intern',
          title: 'Intern Data Engineer',
          duration: '≈ 3–4 ay öyrənmə',
          summary:
            'Proqramlaşdırma və verilənlər bazası təməlini qurursan: Python ilə skript, SQL ilə sorğu, Linux və Git ilə gündəlik iş. Data mühəndisliyinin nə olduğunu və datanın həyat dövrünü anlayırsan.',
          expectations: [
            'Kiçik ETL tapşırıqları: faylı oxumaq, təmizləmək, bazaya yazmaq',
            'Mövcud pipeline-ların işini izləmək və xətaları bildirmək',
            'Sadə data keyfiyyəti yoxlamaları yazmaq',
            'Gördüyün işi sənədləşdirmək',
          ],
          tools: ['Python', 'SQL', 'PostgreSQL', 'Git', 'Linux'],
          project: {
            title: 'CSV → PostgreSQL',
            desc: 'CSV faylını oxuyan, təmizləyən, tipləri düzəldən və PostgreSQL cədvəlinə yazan Python skripti; GitHub-da README ilə.',
          },
          groups: [
            {
              title: 'Anlayışlar',
              skills: [
                b('de-i-what', 'Data Engineering nədir', 'DE, Data Science və Data Analyst fərqi'),
                b(
                  'de-i-lifecycle',
                  'Data həyat dövrü',
                  'generasiya → saxlama → ingestion → serving',
                ),
                p('de-i-batch-stream', 'Batch vs streaming', 'nə vaxt hansı yanaşma'),
              ],
            },
            {
              title: 'Python',
              skills: [
                b(
                  'de-i-py-basics',
                  'Python əsasları',
                  'dəyişənlər, şərt, dövr, funksiya, kolleksiyalar',
                ),
                b('de-i-py-files', 'Fayllarla iş', 'CSV, JSON oxumaq və yazmaq'),
                b('de-i-py-errors', 'Xəta idarəsi', 'try/except, aydın xəta mesajları'),
                p('de-i-py-venv', 'Virtual mühit və pip'),
              ],
            },
            {
              title: 'SQL və verilənlər bazası',
              skills: [
                b('de-i-sql-basics', 'SELECT, WHERE, ORDER BY'),
                b('de-i-sql-join', 'JOIN və GROUP BY'),
                b(
                  'de-i-relational',
                  'Relyasiya modeli',
                  'cədvəl, birincil/xarici açar, normalizasiya',
                ),
                p('de-i-sql-ddl', 'DDL', 'CREATE TABLE, tiplər, məhdudiyyətlər'),
              ],
            },
            {
              title: 'Alətlər',
              skills: [
                b('de-i-git', 'Git və GitHub', 'commit, branch, pull request'),
                b('de-i-linux', 'Linux terminalı', 'fayl sistemi, icazələr, pipe, grep'),
                p('de-i-network', 'Şəbəkə əsasları', 'IP, port, HTTP, SSH'),
              ],
            },
          ],
        },
        {
          key: 'junior',
          title: 'Junior Data Engineer',
          duration: '≈ 6–9 ay öyrənmə',
          summary:
            'Real pipeline-lar yazırsan: datanı API və bazalardan çəkir, warehouse-a yükləyir, orkestrasiya edirsən. Data modelləşdirmə, Docker və buludla tanış olursan.',
          expectations: [
            'ETL/ELT pipeline-larını yazmaq və dəstəkləmək',
            'Warehouse-da analitik modellər (fact/dimension) qurmaq',
            'Pipeline xətalarını tapmaq və təkrar işə salmaq',
            'Code review-da iştirak etmək',
          ],
          tools: ['Airflow', 'dbt', 'Docker', 'pandas', 'Parquet', 'BigQuery / Snowflake'],
          project: {
            title: 'API → Warehouse pipeline-ı',
            desc: 'İctimai API-dən gündəlik data çəkən, Parquet-də saxlayan və warehouse-a yükləyən Airflow DAG-ı; hamısı Docker Compose ilə qalxır.',
          },
          groups: [
            {
              title: 'İrəli SQL',
              skills: [
                b('de-j-sql-window', 'Window funksiyaları və CTE'),
                b(
                  'de-j-sql-perf',
                  'İndekslər və sorğu planı',
                  'EXPLAIN, yavaş sorğunu sürətləndirmək',
                ),
                p('de-j-sql-tx', 'Tranzaksiyalar və izolyasiya'),
              ],
            },
            {
              title: 'Data modelləşdirmə',
              skills: [
                b('de-j-oltp-olap', 'OLTP vs OLAP'),
                b('de-j-star', 'Ulduz sxem', 'fact və dimension cədvəllər'),
                p('de-j-scd', 'Yavaş dəyişən ölçülər (SCD)'),
              ],
            },
            {
              title: 'Pipeline-lar',
              skills: [
                b('de-j-etl-elt', 'ETL vs ELT'),
                b('de-j-airflow', 'Orkestrasiya (Airflow)', 'DAG, task, schedule, retry'),
                b('de-j-idempotent', 'İdempotentlik', 'təkrar işə salanda dublikat yaratmamaq'),
                b(
                  'de-j-quality',
                  'Data keyfiyyəti testləri',
                  'boşluq, unikallıq, aralıq yoxlamaları',
                ),
                p('de-j-dbt', 'dbt', 'SQL modelləri, testlər, lineage'),
              ],
            },
            {
              title: 'Saxlama',
              skills: [
                b('de-j-warehouse', 'Data warehouse', 'BigQuery, Snowflake, Redshift anlayışı'),
                b('de-j-formats', 'Fayl formatları', 'CSV, JSON, Parquet, Avro — fərqləri'),
                p('de-j-lake', 'Data lake və lakehouse'),
              ],
            },
            {
              title: 'Mühit',
              skills: [
                b('de-j-docker', 'Docker', 'image, container, volume, docker compose'),
                b('de-j-cloud', 'Bulud əsasları', 'obyekt saxlama (S3/Blob), IAM, regionlar'),
                b('de-j-py-api', 'Python ilə API-dən data', 'requests, pagination, rate limit'),
                p('de-j-cicd', 'CI/CD əsasları'),
              ],
            },
          ],
        },
        {
          key: 'middle',
          title: 'Middle Data Engineer',
          duration: '≈ 1–2 il təcrübə',
          summary:
            'Böyük həcmli və real vaxt datası ilə işləyirsən: Spark, Kafka, bulud data servisləri. Pipeline arxitekturasını dizayn edir, performans və xərci optimallaşdırırsan.',
          expectations: [
            'Pipeline arxitekturasını dizayn etmək və texnologiya seçmək',
            'Spark işlərini optimallaşdırmaq, bulud xərcini izləmək',
            'Axın (streaming) sistemləri qurmaq',
            'Junior-lara mentorluq, stakeholder-lərlə tələbləri dəqiqləşdirmək',
          ],
          tools: ['Apache Spark', 'Kafka', 'Databricks', 'Terraform', 'AWS / Azure'],
          project: {
            title: 'Real vaxt analitika sistemi',
            desc: 'Kafka-dan hadisə axınını oxuyan, Spark ilə emal edib lakehouse-a yazan və dashboard üçün dəqiqəlik aqreqatlar hazırlayan sistem.',
          },
          groups: [
            {
              title: 'Böyük data',
              skills: [
                b(
                  'de-m-spark',
                  'Apache Spark (PySpark)',
                  'DataFrame, partitioning, shuffle, caching',
                ),
                b('de-m-distributed', 'Paylanmış sistemlər', 'sharding, replikasiya, CAP teoremi'),
                p('de-m-databricks', 'Databricks / lakehouse platformaları'),
              ],
            },
            {
              title: 'Streaming',
              skills: [
                b('de-m-kafka', 'Apache Kafka', 'topic, partition, consumer group, offset'),
                p('de-m-stream-proc', 'Axın emalı', 'Spark Structured Streaming, Flink'),
                p('de-m-cdc', 'CDC (Change Data Capture)'),
              ],
            },
            {
              title: 'Bulud və infrastruktur',
              skills: [
                b('de-m-cloud-data', 'Bulud data servisləri', 'Glue, Data Factory, Dataflow'),
                b('de-m-cost', 'Xərc və performans', 'partition, sıxılma, resurs ölçüsü'),
                p('de-m-iac', 'Infrastructure as Code (Terraform)'),
              ],
            },
            {
              title: 'Etibarlılıq və təhlükəsizlik',
              skills: [
                b('de-m-monitoring', 'Monitorinq və alerting', 'SLA, gecikmə, uğursuz işlər'),
                b('de-m-access', 'Giriş idarəsi və PII', 'RBAC, maskalama, şifrələmə'),
                p('de-m-lineage', 'Lineage və data kataloqu'),
              ],
            },
          ],
        },
        {
          key: 'senior',
          title: 'Senior Data Engineer',
          duration: '3+ il təcrübə',
          summary:
            'Data platformasını bütövlükdə düşünürsən: arxitektura, standartlar, data idarəetməsi və komandanın texniki istiqaməti sənin məsuliyyətindədir.',
          expectations: [
            'Platforma səviyyəsində arxitektura və texnologiya qərarları',
            'Data governance, sahiblik və keyfiyyət standartları',
            'Xərc və performans strategiyası',
            'Texniki liderlik, mentorluq və code review mədəniyyəti',
          ],
          tools: ['System design', 'Data mesh', 'FinOps', 'MLOps'],
          project: {
            title: 'Data platforma dizaynı',
            desc: 'Orta ölçülü şirkət üçün data platforma RFC-si: arxitektura diaqramı, texnologiya seçimi əsaslandırması, xərc hesablaması, miqrasiya planı.',
          },
          groups: [
            {
              title: 'Arxitektura',
              skills: [
                b('de-s-design', 'Data platforma system design-ı'),
                b('de-s-patterns', 'Arxitektura nümunələri', 'Lambda, Kappa, medallion, data mesh'),
                b('de-s-dr', 'Etibarlılıq', 'disaster recovery, backfill strategiyası'),
              ],
            },
            {
              title: 'Liderlik',
              skills: [
                b('de-s-review', 'Code review və standartlar'),
                b('de-s-docs', 'Texniki sənədləşmə', 'RFC, ADR'),
                b('de-s-mentor', 'Mentorluq'),
              ],
            },
            {
              title: 'İdarəetmə',
              skills: [
                b('de-s-governance', 'Data governance', 'sahiblik, data contracts, uyğunluq'),
                b('de-s-finops', 'Xərc optimallaşdırması (FinOps)'),
                p('de-s-ml', 'ML pipeline-ları', 'feature store, MLOps, vector bazalar'),
              ],
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'cyber-security',
    title: 'Kiber təhlükəsizlik',
    tagline: 'Sistemləri və datanı hücumlardan qorumaq',
    description:
      'Kiber təhlükəsizlik mütəxəssisi təhdidləri aşkarlayır, zəiflikləri tapır və insidentlərə cavab verir. Xəritə IT və şəbəkə təməlindən təhlükəsizlik arxitekturasına qədər gedir.',
    track: 'cyber-security',
    content: {
      levels: [
        {
          key: 'intern',
          title: 'Intern Security Analyst',
          duration: '≈ 3–4 ay öyrənmə',
          summary:
            'IT və şəbəkə təməlini qurursan: əməliyyat sistemləri, şəbəkə protokolları, Linux. Əsas təhdidləri və təhlükəsizlik prinsiplərini anlayırsan.',
          expectations: [
            'Təhlükəsizlik alətlərinin xəbərdarlıqlarını izləmək və qeyd etmək',
            'Sadə log yoxlamaları aparmaq',
            'İstifadəçilərə təhlükəsizlik qaydalarını izah etmək',
            'Komandaya insident sənədləşməsində kömək etmək',
          ],
          tools: ['Linux', 'Wireshark', 'VirtualBox', 'Nmap'],
          project: {
            title: 'Ev laboratoriyası',
            desc: 'VirtualBox-da Kali Linux və hədəf maşın qur, Nmap ilə skan et, Wireshark ilə trafiki təhlil et və tapıntıları yaz.',
          },
          groups: [
            {
              title: 'IT təməli',
              skills: [
                b(
                  'cy-i-os',
                  'Əməliyyat sistemləri',
                  'Windows və Linux: proseslər, istifadəçilər, icazələr',
                ),
                b('cy-i-linux', 'Linux komanda sətri'),
                p('cy-i-vm', 'Virtualizasiya', 'VirtualBox, VMware, snapshot'),
              ],
            },
            {
              title: 'Şəbəkə',
              skills: [
                b('cy-i-osi', 'OSI və TCP/IP modelləri'),
                b('cy-i-protocols', 'Protokollar', 'IP, DNS, DHCP, HTTP/HTTPS, SSH, portlar'),
                b('cy-i-wireshark', 'Trafik təhlili (Wireshark)'),
              ],
            },
            {
              title: 'Təhlükəsizlik əsasları',
              skills: [
                b('cy-i-cia', 'CIA triadası', 'məxfilik, bütövlük, əlçatanlıq'),
                b('cy-i-threats', 'Əsas təhdidlər', 'phishing, malware, sosial mühəndislik'),
                b('cy-i-auth', 'Autentifikasiya', 'güclü parol, MFA, ən az səlahiyyət prinsipi'),
                p('cy-i-ctf', 'İlk CTF tapşırıqları'),
              ],
            },
          ],
        },
        {
          key: 'junior',
          title: 'Junior SOC Analyst',
          duration: '≈ 6–9 ay öyrənmə',
          summary:
            'Təhlükəsizlik əməliyyatları mərkəzində (SOC) işləyirsən: logları təhlil edir, xəbərdarlıqları araşdırır, insidentlərə ilk cavabı verirsən.',
          expectations: [
            'SIEM-də xəbərdarlıqları araşdırmaq və prioritetləşdirmək (L1)',
            'İnsident cavab prosesinə uyğun ilk addımları atmaq',
            'Zəiflik skanlarını işə salmaq və nəticələri təhlil etmək',
            'Sadə avtomatlaşdırma skriptləri yazmaq',
          ],
          tools: ['Splunk / ELK', 'Nmap', 'OpenVAS', 'Python', 'Bash'],
          project: {
            title: 'Brute-force aşkarlama',
            desc: 'SIEM-də uğursuz giriş cəhdləri üçün aşkarlama qaydası yaz, test et və insident hesabatı hazırla.',
          },
          groups: [
            {
              title: 'Monitorinq və cavab',
              skills: [
                b('cy-j-siem', 'SIEM ilə log təhlili', 'Splunk / ELK sorğuları, korrelyasiya'),
                b(
                  'cy-j-ir',
                  'İnsident cavab prosesi',
                  'NIST: hazırlıq, aşkarlama, məhdudlaşdırma, bərpa',
                ),
                b('cy-j-ids', 'Firewall, IDS/IPS'),
              ],
            },
            {
              title: 'Zəifliklər',
              skills: [
                b('cy-j-scan', 'Zəiflik skanlama', 'Nmap, OpenVAS / Nessus'),
                b('cy-j-owasp', 'OWASP Top 10'),
                b(
                  'cy-j-crypto',
                  'Kriptoqrafiya əsasları',
                  'hash, simmetrik/asimmetrik, sertifikatlar, TLS',
                ),
              ],
            },
            {
              title: 'Avtomatlaşdırma',
              skills: [
                b('cy-j-script', 'Python və Bash skriptləri'),
                p('cy-j-ctf', 'Müntəzəm CTF təcrübəsi'),
                p('cy-j-cert', 'Sertifikat: Security+ / eJPT'),
              ],
            },
          ],
        },
        {
          key: 'middle',
          title: 'Middle Security Engineer',
          duration: '≈ 1–2 il təcrübə',
          summary:
            'Hücumçu kimi düşünürsən: penetration test, təhdid ovu, forensika. Bulud və Active Directory mühitlərinin təhlükəsizliyini qurursan.',
          expectations: [
            'Veb tətbiq və şəbəkə pentestləri aparmaq',
            'MITRE ATT&CK əsasında təhdid ovu',
            'İnsidentlərdə forensik təhlil',
            'Bulud konfiqurasiyalarını yoxlamaq və sərtləşdirmək',
          ],
          tools: ['Burp Suite', 'Metasploit', 'MITRE ATT&CK', 'Volatility', 'AWS IAM'],
          project: {
            title: 'Veb tətbiq pentest hesabatı',
            desc: 'Zəif test tətbiqinə (DVWA / Juice Shop) tam pentest: metodologiya, tapıntılar, risk dərəcəsi və düzəliş tövsiyələri.',
          },
          groups: [
            {
              title: 'Hücum təhlükəsizliyi',
              skills: [
                b('cy-m-pentest', 'Pentest metodologiyası', 'kəşfiyyat → istismar → hesabat'),
                b(
                  'cy-m-web',
                  'Veb tətbiq təhlükəsizliyi',
                  'Burp Suite, SQLi, XSS, auth zəiflikləri',
                ),
                p('cy-m-ad', 'Active Directory hücumları və müdafiəsi'),
              ],
            },
            {
              title: 'Müdafiə',
              skills: [
                b('cy-m-hunt', 'Təhdid ovu (MITRE ATT&CK)'),
                b('cy-m-forensics', 'Rəqəmsal forensika', 'disk və yaddaş təhlili'),
                p('cy-m-malware', 'Malware təhlilinin əsasları'),
              ],
            },
            {
              title: 'Bulud',
              skills: [
                b('cy-m-cloud', 'Bulud təhlükəsizliyi', 'IAM, səhv konfiqurasiyalar, loglar'),
                p('cy-m-cert', 'Sertifikat: OSCP / CySA+'),
              ],
            },
          ],
        },
        {
          key: 'senior',
          title: 'Senior Security Engineer',
          duration: '3+ il təcrübə',
          summary:
            'Təhlükəsizliyi sistem kimi qurursan: arxitektura, risk idarəsi, uyğunluq və komandaların rəhbərliyi.',
          expectations: [
            'Zero Trust və çoxqatlı müdafiə arxitekturası qurmaq',
            'Risk qiymətləndirməsi və uyğunluq (ISO 27001, NIST CSF)',
            'İnsident cavab planı və tabletop məşqləri',
            'Red/Blue team işinə rəhbərlik və mentorluq',
          ],
          tools: ['Zero Trust', 'ISO 27001', 'NIST CSF', 'Threat modeling'],
          project: {
            title: 'Təhlükəsizlik proqramı',
            desc: 'Şirkət üçün risk reyestri, Zero Trust keçid planı və insident cavab planı; prioritetlər və büdcə ilə.',
          },
          groups: [
            {
              title: 'Arxitektura',
              skills: [
                b('cy-s-zero-trust', 'Zero Trust və defense in depth'),
                b('cy-s-threat-model', 'Threat modeling', 'STRIDE, hücum səthi təhlili'),
              ],
            },
            {
              title: 'Risk və uyğunluq',
              skills: [
                b('cy-s-risk', 'Risk idarəsi'),
                b('cy-s-compliance', 'Standartlar', 'ISO 27001, NIST CSF, GDPR'),
                b('cy-s-irplan', 'İnsident cavab planı və məşqlər'),
              ],
            },
            {
              title: 'Liderlik',
              skills: [
                b('cy-s-lead', 'Komanda rəhbərliyi və mentorluq'),
                p('cy-s-cert', 'Sertifikat: CISSP / CISM'),
              ],
            },
          ],
        },
      ],
    },
  },
];
