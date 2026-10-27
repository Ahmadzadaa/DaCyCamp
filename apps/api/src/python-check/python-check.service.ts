import { Injectable } from '@nestjs/common';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import type { PythonConfig } from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';
import { readFromStorage } from '../assets/storage';
import { executeJson } from '../common/execution-pool';
import { unprocessable } from '../common/errors';

export interface PythonVerdict {
  passed: boolean;
  stdout: string;
  error: string | null;
}
@Injectable()
export class PythonCheckService {
  constructor(private readonly prisma: PrismaService) {}
  async run(
    courseId: string,
    config: PythonConfig,
    code: string,
    stdin = '',
  ): Promise<PythonVerdict> {
    if (!existsSync(env.PYTHON_SANDBOX_BIN) || !existsSync(env.PYTHON_BIN))
      throw unprocessable(
        'PYTHON_CHECK_UNAVAILABLE',
        'Təhlükəsiz Python yoxlaması əlçatmazdır. Müəllimə bildirin.',
      );
    const dir = await mkdtemp(join(tmpdir(), 'dacy-python-'));
    try {
      const python = resolve(env.PYTHON_BIN);
      const prefixes = new Set([
        resolve(dirname(python), '..'),
        resolve(dirname(await realpath(python)), '..'),
      ]);
      const args = [
        '--unshare-all',
        '--die-with-parent',
        '--new-session',
        '--cap-drop',
        'ALL',
        '--ro-bind',
        '/usr',
        '/usr',
        '--ro-bind',
        '/lib',
        '/lib',
        '--ro-bind',
        '/lib64',
        '/lib64',
        '--dev',
        '/dev',
        '--size',
        '16777216',
        '--tmpfs',
        '/tmp',
        '--size',
        '16777216',
        '--tmpfs',
        '/work',
        '--chdir',
        '/work',
        '--ro-bind',
        resolve(__dirname, 'python-runner.py'),
        '/runner.py',
      ];
      for (const prefix of prefixes) if (prefix !== '/usr') args.push('--ro-bind', prefix, prefix);
      let bytes = 0;
      for (const path of config.dataset ?? []) {
        const asset = await this.prisma.asset.findUnique({
          where: { courseId_path: { courseId, path } },
        });
        if (!asset)
          throw unprocessable('PYTHON_DATASET_MISSING', 'Dataset tapılmadı. Müəllimə bildirin.');
        const buffer = await readFromStorage(asset.storageKey);
        bytes += buffer.byteLength;
        if (bytes > 20 * 1024 * 1024)
          throw unprocessable(
            'PYTHON_DATASET_LIMIT',
            'Datasetlərin ümumi ölçüsü 20 MB limitini keçir.',
          );
        const name = basename(asset.filename);
        await writeFile(join(dir, name), buffer, { mode: 0o600 });
        args.push('--ro-bind', join(dir, name), '/work/' + name);
      }
      args.push(
        '--',
        '/usr/bin/prlimit',
        '--as=1073741824',
        '--cpu=10',
        '--nofile=64',
        '--fsize=1048576',
        python,
        '-I',
        '-u',
        '/runner.py',
      );
      try {
        return await executeJson<PythonVerdict>({
          command: env.PYTHON_SANDBOX_BIN,
          args,
          input: { code, tests: config.tests, stdin },
          timeoutMs: 15_000,
          env: {
            OPENBLAS_NUM_THREADS: '1',
            OMP_NUM_THREADS: '1',
            NUMEXPR_NUM_THREADS: '1',
            MKL_NUM_THREADS: '1',
            MPLBACKEND: 'Agg',
            MPLCONFIGDIR: '/tmp/matplotlib',
            PYTHONDONTWRITEBYTECODE: '1',
          },
        });
      } catch (error) {
        return {
          passed: false,
          stdout: '',
          error: error instanceof Error ? error.message : 'İcra dayandırıldı.',
        };
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
