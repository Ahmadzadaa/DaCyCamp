/**
 * Lab sürücüsü — hər tələbəyə bir izolə konteyner.
 * `docker` (dockerode) real mühitdir; `mock` yalnız test/dev üçün virtual qabıqdır (heç bir real proses işlətmir).
 */
export type LabDriverKind = 'docker' | 'mock';

export interface LabTerminal {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  onData(cb: (chunk: string) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

export interface CreateLabOpts {
  image: string;
  sessionId: string;
  userId: string;
  /** konteynerdə internet (defolt: bağlı) */
  network: boolean;
  memoryMb: number;
  cpus: number;
  pidsLimit: number;
}

export interface LabCheckRun {
  exitCode: number;
  output: string;
  timedOut: boolean;
}

export interface LabDriver {
  readonly kind: LabDriverKind;
  /** sürücü işə yarayırmı (Docker daemon əlçatandırmı) */
  available(): Promise<boolean>;
  /** konteyner yaradıb işə salır → konteyner id */
  create(opts: CreateLabOpts): Promise<string>;
  /** yoxlama skriptini konteynerə yazır (/dacy/check.sh) */
  prepare(containerId: string, opts: { checkScript: string | null }): Promise<void>;
  /** interaktiv qabıq (TTY) */
  attach(containerId: string, size: { cols: number; rows: number }): Promise<LabTerminal>;
  /** /dacy/check.sh-i işlədir; exit 0 = keçdi */
  runCheck(containerId: string, timeoutMs: number): Promise<LabCheckRun>;
  destroy(containerId: string): Promise<void>;
  /** sürücünün idarə etdiyi konteynerlər — yetim təmizliyi üçün */
  listManaged(): Promise<Array<{ id: string; sessionId: string | null }>>;
}

export class LabDriverError extends Error {
  constructor(
    public readonly code: 'LAB_UNAVAILABLE' | 'LAB_IMAGE_MISSING' | 'LAB_FAILED',
    message: string,
  ) {
    super(message);
  }
}
