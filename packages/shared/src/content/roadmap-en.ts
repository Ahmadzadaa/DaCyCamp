import { DEFAULT_ROADMAPS, type RoadmapContent } from './roadmap';

/**
 * İlkin karyera xəritələrinin İngiliscə tərcüməsi — stabil açarlarla: səviyyə `key`, bacarıq `id`,
 * qrup — həmin səviyyədəki sırası (AZ başlığı ilə tutuşdurulur). Bazaya yazılan i18n örtüyü
 * (`Roadmap.i18n.en`) buradan CARİ məzmuna görə qurulur: yalnız AZ mətni ilkin mətnlə eyni qalan
 * sahələr tərcümə olunur — admin dəyişdirdiyi və ya əlavə etdiyi mətn AZ qalır (köhnə tərcümə
 * yeni mənaya yapışmır).
 */
interface LevelTr {
  title: string;
  duration?: string;
  summary: string;
  expectations: string[];
  tools: string[];
  project?: { title: string; desc?: string };
  /** qrup başlıqları — ilkin məzmundakı sıra ilə */
  groups: string[];
}
interface RoadmapTr {
  title: string;
  tagline: string;
  description: string;
  levels: Record<string, LevelTr>;
  /** bacarıq id → [başlıq, izah?] */
  skills: Record<string, [string, string?]>;
}

export const ROADMAPS_EN: Record<string, RoadmapTr> = {
  'data-analyst': {
    title: 'Data Analyst',
    tagline: 'From data to business decisions: Excel, SQL, BI and statistics',
    description:
      "A data analyst answers the company's questions with data: what is happening, why it is happening and what we should do about it. This roadmap shows what you need to know at each level, from Excel all the way to analytics strategy.",
    levels: {
      intern: {
        title: 'Intern Data Analyst',
        duration: '≈ 2–3 months of learning',
        summary:
          'You learn to read data, clean it and build simple reports. Goal: answer everyday questions on your own with Excel and SQL.',
        expectations: [
          'Updating existing reports and checking the numbers',
          'Cleaning Excel spreadsheets and building pivot tables and charts',
          'Pulling the data you need with simple SQL queries',
          "Preparing clear, short answers to the team's questions",
        ],
        tools: ['Excel', 'Google Sheets', 'SQL', 'PostgreSQL'],
        project: {
          title: 'Monthly sales report',
          desc: 'Clean a raw sales file, use pivot tables to draw conclusions by region and product, and prepare a one-page report with 3 charts.',
        },
        groups: ['Excel', 'SQL basics', 'Data and statistics'],
      },
      junior: {
        title: 'Junior Data Analyst',
        duration: '≈ 4–6 months of learning',
        summary:
          'You build dashboards that track business metrics and find in-depth answers with SQL + Python. You learn to tell the story behind the numbers.',
        expectations: [
          'Building and maintaining dashboards in a BI tool',
          'Tracking KPIs (sales, conversion, retention) and explaining changes',
          'Answering ad hoc requests with SQL and Python',
          'Presenting results to the team in short presentations',
        ],
        tools: ['Power BI', 'Tableau', 'Python', 'pandas', 'SQL'],
        project: {
          title: 'E-commerce KPI dashboard',
          desc: 'An interactive dashboard on order data with revenue, average basket, conversion and repeat-purchase metrics, plus a 5-slide presentation of the findings.',
        },
        groups: [
          'Advanced SQL',
          'BI and visualization',
          'Analysis with Python',
          'Business metrics',
        ],
      },
      middle: {
        title: 'Middle Data Analyst',
        duration: '≈ 1–2 years of experience',
        summary:
          'You frame the questions yourself: you design experiments, draw conclusions with statistical confidence and make the analytics model reliable for every team.',
        expectations: [
          'Designing A/B tests and backing their results with statistics',
          'Running cohort, retention and forecasting analyses',
          'Building shared metric definitions and a data model for teams',
          'Clarifying requirements with stakeholders and helping juniors',
        ],
        tools: ['SQL', 'Python', 'dbt', 'Power BI / Looker', 'statsmodels'],
        project: {
          title: 'A/B test report',
          desc: 'A test design for a new payment page (hypothesis, sample size), an analysis of the results and a decision memo.',
        },
        groups: ['Statistics', 'Analytics engineering', 'In-depth analysis'],
      },
      senior: {
        title: 'Senior Data Analyst',
        duration: '3+ years of experience',
        summary:
          "You set the direction of analytics: you choose which questions matter, build the metric system and directly influence management's decisions.",
        expectations: [
          'Building a metric framework for the company (a North Star and supporting metrics)',
          'Spreading self-service analytics and a data culture',
          'Working on strategic questions with management',
          'Mentoring the team and setting quality standards',
        ],
        tools: ['Metric frameworks', 'BI platform', 'Data governance'],
        project: {
          title: 'Analytics roadmap',
          desc: 'A North Star metric, a metric tree, a dashboard hierarchy and a 6-month analytics plan for a product.',
        },
        groups: ['Strategy', 'Leadership'],
      },
    },
    skills: {
      'da-i-excel-formulas': [
        'Core formulas',
        'SUM, AVERAGE, IF, COUNTIF, text and date functions',
      ],
      'da-i-excel-lookup': ['XLOOKUP / VLOOKUP', 'joining tables on a key'],
      'da-i-excel-pivot': ['Pivot tables', 'grouping, filters, totals'],
      'da-i-excel-charts': ['Charts', 'column, line, pie — which to choose and when'],
      'da-i-excel-pq': ['Power Query', 'automating repetitive cleaning steps'],
      'da-i-sql-select': ['SELECT, WHERE, ORDER BY'],
      'da-i-sql-groupby': ['GROUP BY and aggregates', 'COUNT, SUM, AVG, HAVING'],
      'da-i-sql-join': ['JOINs', 'INNER, LEFT — combining tables'],
      'da-i-sql-case': ['CASE WHEN', 'conditional columns and categories'],
      'da-i-stat-desc': ['Descriptive statistics', 'mean, median, mode, variance, percentages'],
      'da-i-clean': ['Data cleaning', 'blanks, duplicates, format errors'],
      'da-i-types': ['Data types and structure', 'rows, columns, keys, categorical vs. numeric'],
      'da-i-viz': [
        'Visualization principles',
        "clear titles, axes and color — charts that don't lie",
      ],
      'da-j-sql-cte': ['CTEs and subqueries'],
      'da-j-sql-window': ['Window functions', 'ROW_NUMBER, LAG, moving averages, running totals'],
      'da-j-sql-dates': ['Working with dates', 'grouping by week/month, period comparisons'],
      'da-j-bi-dashboard': ['Dashboard design', 'a key question → KPIs → details hierarchy'],
      'da-j-bi-model': ['BI data model', 'relationships between tables, measures'],
      'da-j-bi-dax': ['DAX / calculated fields'],
      'da-j-story': [
        'Data storytelling',
        'presenting a finding with context, a conclusion and a recommendation',
      ],
      'da-j-py-pandas': ['pandas', 'reading, filtering, groupby, merge, pivot'],
      'da-j-py-eda': ['Exploratory data analysis (EDA)', 'distributions, correlation, anomalies'],
      'da-j-py-viz': ['matplotlib / seaborn'],
      'da-j-kpi': ['KPIs', 'revenue, conversion, retention, churn, ARPU'],
      'da-j-funnel': ['Funnel analysis'],
      'da-j-ab-basics': ['A/B testing concepts', 'control and test groups, reading the result'],
      'da-m-hyp': ['Hypothesis testing', 'p-values, t-tests, chi-square, confidence intervals'],
      'da-m-ab': ['A/B test design', 'sample size, power, the risk of running many tests at once'],
      'da-m-reg': ['Regression', 'linear and logistic regression, interpreting the results'],
      'da-m-ts': ['Time series and forecasting', 'trend, seasonality, simple forecasting models'],
      'da-m-model': ['Data modeling', 'star schema: fact and dimension tables'],
      'da-m-metrics': ['Metric definitions', 'shared, documented KPIs'],
      'da-m-dbt': ['dbt basics', 'SQL models, tests, documentation'],
      'da-m-cohort': ['Cohort and retention analysis'],
      'da-m-segment': ['Segmentation', 'RFM, behavioral groups'],
      'da-m-root': ['Root cause analysis', 'a systematic answer to "why?" when a metric drops'],
      'da-s-northstar': ['Metric framework', 'North Star, metric trees, input vs. output metrics'],
      'da-s-roadmap': ['Analytics roadmap', 'priorities, impact vs. effort'],
      'da-s-ml': ['Predictive analytics', 'working with the ML team: churn and LTV forecasting'],
      'da-s-mentor': ['Mentoring and reviews', 'analysis and SQL code reviews'],
      'da-s-influence': [
        'Influence and presenting',
        'short, decision-focused presentations for management',
      ],
      'da-s-governance': ['Data quality and governance', 'ownership, documentation, access rules'],
    },
  },
  'data-engineer': {
    title: 'Data Engineer',
    tagline: 'Building systems that collect, process and reliably store data',
    description:
      'A data engineer builds the path data takes from its source to the analytics and ML teams: pipelines, warehouses and streaming systems. This roadmap runs from the basics of Python and SQL to data platform architecture.',
    levels: {
      intern: {
        title: 'Intern Data Engineer',
        duration: '≈ 3–4 months of learning',
        summary:
          'You build your programming and database foundations: scripts in Python, queries in SQL and day-to-day work with Linux and Git. You understand what data engineering is and how the data lifecycle works.',
        expectations: [
          'Small ETL tasks: reading a file, cleaning it and writing it to a database',
          'Monitoring existing pipelines and reporting errors',
          'Writing simple data quality checks',
          'Documenting your work',
        ],
        tools: ['Python', 'SQL', 'PostgreSQL', 'Git', 'Linux'],
        project: {
          title: 'CSV → PostgreSQL',
          desc: 'A Python script that reads a CSV file, cleans it, fixes the types and writes it to a PostgreSQL table; on GitHub with a README.',
        },
        groups: ['Concepts', 'Python', 'SQL and databases', 'Tools'],
      },
      junior: {
        title: 'Junior Data Engineer',
        duration: '≈ 6–9 months of learning',
        summary:
          'You write real pipelines: you pull data from APIs and databases, load it into a warehouse and orchestrate the whole flow. You get to know data modeling, Docker and the cloud.',
        expectations: [
          'Writing and maintaining ETL/ELT pipelines',
          'Building analytical models (fact/dimension) in the warehouse',
          'Finding pipeline errors and rerunning jobs',
          'Taking part in code reviews',
        ],
        tools: ['Airflow', 'dbt', 'Docker', 'pandas', 'Parquet', 'BigQuery / Snowflake'],
        project: {
          title: 'API → warehouse pipeline',
          desc: 'An Airflow DAG that pulls daily data from a public API, stores it in Parquet and loads it into a warehouse; the whole setup starts with Docker Compose.',
        },
        groups: ['Advanced SQL', 'Data modeling', 'Pipelines', 'Storage', 'Environment'],
      },
      middle: {
        title: 'Middle Data Engineer',
        duration: '≈ 1–2 years of experience',
        summary:
          'You work with large-scale and real-time data: Spark, Kafka and cloud data services. You design pipeline architecture and optimize performance and cost.',
        expectations: [
          'Designing pipeline architecture and choosing technologies',
          'Optimizing Spark jobs and monitoring cloud costs',
          'Building streaming systems',
          'Mentoring juniors and clarifying requirements with stakeholders',
        ],
        tools: ['Apache Spark', 'Kafka', 'Databricks', 'Terraform', 'AWS / Azure'],
        project: {
          title: 'Real-time analytics system',
          desc: 'A system that reads an event stream from Kafka, processes it with Spark, writes it to a lakehouse and prepares per-minute aggregates for a dashboard.',
        },
        groups: ['Big data', 'Streaming', 'Cloud and infrastructure', 'Reliability and security'],
      },
      senior: {
        title: 'Senior Data Engineer',
        duration: '3+ years of experience',
        summary:
          "You think about the data platform as a whole: architecture, standards, data governance and the team's technical direction are your responsibility.",
        expectations: [
          'Platform-level architecture and technology decisions',
          'Data governance, ownership and quality standards',
          'Cost and performance strategy',
          'Technical leadership, mentoring and a code review culture',
        ],
        tools: ['System design', 'Data mesh', 'FinOps', 'MLOps'],
        project: {
          title: 'Data platform design',
          desc: 'A data platform RFC for a mid-sized company: an architecture diagram, the rationale for the technology choices, a cost estimate and a migration plan.',
        },
        groups: ['Architecture', 'Leadership', 'Governance'],
      },
    },
    skills: {
      'de-i-what': [
        'What data engineering is',
        'how it differs from data science and data analysis',
      ],
      'de-i-lifecycle': ['The data lifecycle', 'generation → storage → ingestion → serving'],
      'de-i-batch-stream': ['Batch vs. streaming', 'when to use which approach'],
      'de-i-py-basics': ['Python basics', 'variables, conditions, loops, functions, collections'],
      'de-i-py-files': ['Working with files', 'reading and writing CSV and JSON'],
      'de-i-py-errors': ['Error handling', 'try/except, clear error messages'],
      'de-i-py-venv': ['Virtual environments and pip'],
      'de-i-sql-basics': ['SELECT, WHERE, ORDER BY'],
      'de-i-sql-join': ['JOIN and GROUP BY'],
      'de-i-relational': ['The relational model', 'tables, primary/foreign keys, normalization'],
      'de-i-sql-ddl': ['DDL', 'CREATE TABLE, types, constraints'],
      'de-i-git': ['Git and GitHub', 'commits, branches, pull requests'],
      'de-i-linux': ['The Linux terminal', 'the file system, permissions, pipes, grep'],
      'de-i-network': ['Networking basics', 'IP, ports, HTTP, SSH'],
      'de-j-sql-window': ['Window functions and CTEs'],
      'de-j-sql-perf': ['Indexes and query plans', 'EXPLAIN, speeding up slow queries'],
      'de-j-sql-tx': ['Transactions and isolation'],
      'de-j-oltp-olap': ['OLTP vs. OLAP'],
      'de-j-star': ['Star schema', 'fact and dimension tables'],
      'de-j-scd': ['Slowly changing dimensions (SCD)'],
      'de-j-etl-elt': ['ETL vs. ELT'],
      'de-j-airflow': ['Orchestration (Airflow)', 'DAGs, tasks, schedules, retries'],
      'de-j-idempotent': ['Idempotency', 'no duplicates when a job is rerun'],
      'de-j-quality': ['Data quality tests', 'null, uniqueness and range checks'],
      'de-j-dbt': ['dbt', 'SQL models, tests, lineage'],
      'de-j-warehouse': ['Data warehouses', 'the concepts behind BigQuery, Snowflake and Redshift'],
      'de-j-formats': ['File formats', 'CSV, JSON, Parquet, Avro — how they differ'],
      'de-j-lake': ['Data lakes and lakehouses'],
      'de-j-docker': ['Docker', 'images, containers, volumes, docker compose'],
      'de-j-cloud': ['Cloud basics', 'object storage (S3/Blob), IAM, regions'],
      'de-j-py-api': ['Pulling data from APIs with Python', 'requests, pagination, rate limits'],
      'de-j-cicd': ['CI/CD basics'],
      'de-m-spark': ['Apache Spark (PySpark)', 'DataFrames, partitioning, shuffles, caching'],
      'de-m-distributed': ['Distributed systems', 'sharding, replication, the CAP theorem'],
      'de-m-databricks': ['Databricks / lakehouse platforms'],
      'de-m-kafka': ['Apache Kafka', 'topics, partitions, consumer groups, offsets'],
      'de-m-stream-proc': ['Stream processing', 'Spark Structured Streaming, Flink'],
      'de-m-cdc': ['CDC (Change Data Capture)'],
      'de-m-cloud-data': ['Cloud data services', 'Glue, Data Factory, Dataflow'],
      'de-m-cost': ['Cost and performance', 'partitioning, compression, resource sizing'],
      'de-m-iac': ['Infrastructure as Code (Terraform)'],
      'de-m-monitoring': ['Monitoring and alerting', 'SLAs, latency, failed jobs'],
      'de-m-access': ['Access management and PII', 'RBAC, masking, encryption'],
      'de-m-lineage': ['Lineage and data catalogs'],
      'de-s-design': ['Data platform system design'],
      'de-s-patterns': ['Architecture patterns', 'Lambda, Kappa, medallion, data mesh'],
      'de-s-dr': ['Reliability', 'disaster recovery, backfill strategy'],
      'de-s-review': ['Code reviews and standards'],
      'de-s-docs': ['Technical documentation', 'RFCs, ADRs'],
      'de-s-mentor': ['Mentoring'],
      'de-s-governance': ['Data governance', 'ownership, data contracts, compliance'],
      'de-s-finops': ['Cost optimization (FinOps)'],
      'de-s-ml': ['ML pipelines', 'feature stores, MLOps, vector databases'],
    },
  },
  'cyber-security': {
    title: 'Cyber Security',
    tagline: 'Protecting systems and data from attacks',
    description:
      'A cyber security specialist detects threats, finds vulnerabilities and responds to incidents. This roadmap runs from IT and networking foundations to security architecture.',
    levels: {
      intern: {
        title: 'Intern Security Analyst',
        duration: '≈ 3–4 months of learning',
        summary:
          'You build your IT and networking foundations: operating systems, network protocols and Linux. You understand the main threats and the core security principles.',
        expectations: [
          'Monitoring and logging alerts from security tools',
          'Running simple log checks',
          'Explaining security rules to users',
          'Helping the team document incidents',
        ],
        tools: ['Linux', 'Wireshark', 'VirtualBox', 'Nmap'],
        project: {
          title: 'Home lab',
          desc: 'Set up Kali Linux and a target machine in VirtualBox, scan with Nmap, analyze the traffic with Wireshark and write up your findings.',
        },
        groups: ['IT foundations', 'Networking', 'Security fundamentals'],
      },
      junior: {
        title: 'Junior SOC Analyst',
        duration: '≈ 6–9 months of learning',
        summary:
          'You work in a security operations center (SOC): you analyze logs, investigate alerts and provide the first response to incidents.',
        expectations: [
          'Investigating and prioritizing alerts in the SIEM (L1)',
          'Taking the first steps defined by the incident response process',
          'Running vulnerability scans and analyzing the results',
          'Writing simple automation scripts',
        ],
        tools: ['Splunk / ELK', 'Nmap', 'OpenVAS', 'Python', 'Bash'],
        project: {
          title: 'Brute-force detection',
          desc: 'Write a SIEM detection rule for failed login attempts, test it and prepare an incident report.',
        },
        groups: ['Monitoring and response', 'Vulnerabilities', 'Automation'],
      },
      middle: {
        title: 'Middle Security Engineer',
        duration: '≈ 1–2 years of experience',
        summary:
          'You think like an attacker: penetration testing, threat hunting and forensics. You secure cloud and Active Directory environments.',
        expectations: [
          'Conducting web application and network penetration tests',
          'Threat hunting based on MITRE ATT&CK',
          'Forensic analysis during incidents',
          'Reviewing and hardening cloud configurations',
        ],
        tools: ['Burp Suite', 'Metasploit', 'MITRE ATT&CK', 'Volatility', 'AWS IAM'],
        project: {
          title: 'Web application pentest report',
          desc: 'A full pentest of a deliberately vulnerable application (DVWA / Juice Shop): methodology, findings, risk ratings and remediation recommendations.',
        },
        groups: ['Offensive security', 'Defense', 'Cloud'],
      },
      senior: {
        title: 'Senior Security Engineer',
        duration: '3+ years of experience',
        summary:
          'You build security as a system: architecture, risk management, compliance and leading teams.',
        expectations: [
          'Building a Zero Trust, defense-in-depth architecture',
          'Risk assessment and compliance (ISO 27001, NIST CSF)',
          'An incident response plan and tabletop exercises',
          'Leading and mentoring red and blue team work',
        ],
        tools: ['Zero Trust', 'ISO 27001', 'NIST CSF', 'Threat modeling'],
        project: {
          title: 'Security program',
          desc: 'A risk register, a Zero Trust transition plan and an incident response plan for a company, with priorities and a budget.',
        },
        groups: ['Architecture', 'Risk and compliance', 'Leadership'],
      },
    },
    skills: {
      'cy-i-os': ['Operating systems', 'Windows and Linux: processes, users, permissions'],
      'cy-i-linux': ['The Linux command line'],
      'cy-i-vm': ['Virtualization', 'VirtualBox, VMware, snapshots'],
      'cy-i-osi': ['The OSI and TCP/IP models'],
      'cy-i-protocols': ['Protocols', 'IP, DNS, DHCP, HTTP/HTTPS, SSH, ports'],
      'cy-i-wireshark': ['Traffic analysis (Wireshark)'],
      'cy-i-cia': ['The CIA triad', 'confidentiality, integrity, availability'],
      'cy-i-threats': ['The main threats', 'phishing, malware, social engineering'],
      'cy-i-auth': ['Authentication', 'strong passwords, MFA, the principle of least privilege'],
      'cy-i-ctf': ['Your first CTF challenges'],
      'cy-j-siem': ['Log analysis with a SIEM', 'Splunk / ELK queries, correlation'],
      'cy-j-ir': [
        'The incident response process',
        'NIST: preparation, detection, containment, recovery',
      ],
      'cy-j-ids': ['Firewalls, IDS/IPS'],
      'cy-j-scan': ['Vulnerability scanning', 'Nmap, OpenVAS / Nessus'],
      'cy-j-owasp': ['The OWASP Top 10'],
      'cy-j-crypto': [
        'Cryptography basics',
        'hashing, symmetric/asymmetric encryption, certificates, TLS',
      ],
      'cy-j-script': ['Python and Bash scripting'],
      'cy-j-ctf': ['Regular CTF practice'],
      'cy-j-cert': ['Certification: Security+ / eJPT'],
      'cy-m-pentest': ['Pentest methodology', 'reconnaissance → exploitation → reporting'],
      'cy-m-web': ['Web application security', 'Burp Suite, SQLi, XSS, authentication flaws'],
      'cy-m-ad': ['Active Directory attacks and defense'],
      'cy-m-hunt': ['Threat hunting (MITRE ATT&CK)'],
      'cy-m-forensics': ['Digital forensics', 'disk and memory analysis'],
      'cy-m-malware': ['Malware analysis basics'],
      'cy-m-cloud': ['Cloud security', 'IAM, misconfigurations, logs'],
      'cy-m-cert': ['Certification: OSCP / CySA+'],
      'cy-s-zero-trust': ['Zero Trust and defense in depth'],
      'cy-s-threat-model': ['Threat modeling', 'STRIDE, attack surface analysis'],
      'cy-s-risk': ['Risk management'],
      'cy-s-compliance': ['Standards', 'ISO 27001, NIST CSF, GDPR'],
      'cy-s-irplan': ['Incident response plans and exercises'],
      'cy-s-lead': ['Team leadership and mentoring'],
      'cy-s-cert': ['Certification: CISSP / CISM'],
    },
  },
};

type Obj = Record<string, unknown>;
const sameList = (a: readonly string[] | undefined, b: readonly string[] | undefined) =>
  (a ?? []).length === (b ?? []).length && (a ?? []).every((x, i) => x === (b ?? [])[i]);

export interface RoadmapTextFields {
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  content: RoadmapContent;
}

/**
 * Cari xəritə üçün `i18n` dəyəri ({en: {...}}) — örtük indekslə (mergeTranslation qaydası), amma
 * tutuşdurma stabil açarlarladır. İlkin tərcüməsi olmayan xəritə üçün null.
 */
export function buildRoadmapI18n(r: RoadmapTextFields): { en: Obj } | null {
  const tr = ROADMAPS_EN[r.slug];
  const src = DEFAULT_ROADMAPS.find((d) => d.slug === r.slug);
  if (!tr || !src) return null;
  const en: Obj = {};
  if (r.title === src.title) en.title = tr.title;
  if ((r.tagline ?? null) === (src.tagline ?? null)) en.tagline = tr.tagline;
  if ((r.description ?? null) === (src.description ?? null)) en.description = tr.description;

  const srcLevels = new Map(src.content.levels.map((l) => [l.key, l]));
  const srcSkills = new Map(
    src.content.levels.flatMap((l) => l.groups.flatMap((g) => g.skills.map((s) => [s.id, s]))),
  );
  en.content = {
    levels: r.content.levels.map((lv) => {
      const s = srcLevels.get(lv.key);
      const t = tr.levels[lv.key];
      const o: Obj = {};
      if (s && t) {
        if (lv.title === s.title) o.title = t.title;
        if (t.duration && lv.duration === s.duration) o.duration = t.duration;
        if (lv.summary === s.summary) o.summary = t.summary;
        if (sameList(lv.expectations, s.expectations)) o.expectations = t.expectations;
        if (sameList(lv.tools, s.tools)) o.tools = t.tools;
        if (lv.project && s.project && t.project) {
          const p: Obj = {};
          if (lv.project.title === s.project.title) p.title = t.project.title;
          if (t.project.desc && lv.project.desc === s.project.desc) p.desc = t.project.desc;
          o.project = p;
        }
      }
      o.groups = lv.groups.map((g) => {
        const go: Obj = {};
        const gi = s ? s.groups.findIndex((sg) => sg.title === g.title) : -1;
        if (gi >= 0 && t?.groups[gi]) go.title = t.groups[gi];
        go.skills = g.skills.map((sk) => {
          const ss = srcSkills.get(sk.id);
          const ts = tr.skills[sk.id];
          const so: Obj = {};
          if (ss && ts) {
            if (sk.title === ss.title) so.title = ts[0];
            if (ts[1] && sk.desc === ss.desc) so.desc = ts[1];
          }
          return so;
        });
        return go;
      });
      return o;
    }),
  };
  return { en };
}
