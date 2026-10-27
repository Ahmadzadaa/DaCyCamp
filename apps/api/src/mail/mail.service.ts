import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

@Injectable()
export class MailService {
  get enabled() {
    return env.MAIL_TRANSPORT !== 'disabled';
  }
  async send(to: string, subject: string, text: string) {
    if (env.MAIL_TRANSPORT === 'disabled')
      throw new Error('E-poçt xidməti konfiqurasiya edilməyib.');
    if (env.MAIL_TRANSPORT === 'file') {
      const root = resolve(__dirname, '../../../..');
      const dir = resolve(root, env.MAIL_OUTBOX_DIR);
      await mkdir(dir, { recursive: true, mode: 0o700 });
      const body = `From: ${env.MAIL_FROM}\nTo: ${to}\nSubject: ${subject}\nContent-Type: text/plain; charset=UTF-8\n\n${text}\n`;
      await writeFile(join(dir, `${Date.now()}-${randomUUID()}.eml`), body, { mode: 0o600 });
      return;
    }
    if (!env.SMTP_HOST) throw new Error('SMTP_HOST təyin edilməyib.');
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { minVersion: 'TLSv1.2' },
    });
    try {
      await transport.sendMail({ from: env.MAIL_FROM, to, subject, text });
    } finally {
      transport.close();
    }
  }
}
