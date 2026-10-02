import type { IncomingMessage } from 'node:http';
import { Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import { LabsService } from './labs.service';
import type { LabTerminal } from './driver';

/**
 * Brauzer terminalı ↔ konteyner. Qoşulma: ws://api/labs/ws?ticket=…&cols=…&rows=…
 * Mesajlar (JSON): client → {t:'in', d} | {t:'resize', cols, rows};  server → {t:'ready'} | {t:'out', d} | {t:'exit'} | {t:'error', code, message}
 */
@WebSocketGateway({ path: '/labs/ws' })
export class LabsGateway implements OnGatewayConnection {
  private readonly log = new Logger('LabsWs');
  constructor(private readonly labs: LabsService) {}

  async handleConnection(client: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const ticket = url.searchParams.get('ticket') ?? '';
    const cols = clamp(Number(url.searchParams.get('cols')), 20, 400, 80);
    const rows = clamp(Number(url.searchParams.get('rows')), 5, 200, 24);
    let term: LabTerminal;
    try {
      term = await this.labs.attachByTicket(ticket, { cols, rows });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      send(client, { t: 'error', code: err.code ?? 'LAB_NOT_RUNNING', message: err.message ?? '' });
      client.close(4001, 'unauthorized');
      return;
    }
    send(client, { t: 'ready' });
    term.onData((d) => send(client, { t: 'out', d }));
    term.onClose(() => {
      send(client, { t: 'exit' });
      try {
        client.close(1000, 'exit');
      } catch {
        /* ignore */
      }
    });
    client.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString()) as {
          t: string;
          d?: string;
          cols?: number;
          rows?: number;
        };
        if (m.t === 'in' && typeof m.d === 'string') term.write(m.d.slice(0, 4096));
        else if (m.t === 'resize')
          term.resize(clamp(Number(m.cols), 20, 400, 80), clamp(Number(m.rows), 5, 200, 24));
      } catch {
        /* səhv mesaj — keç */
      }
    });
    client.on('close', () => term.close());
    client.on('error', (e) => this.log.warn(`ws: ${e.message}`));
  }
}

function clamp(n: number, min: number, max: number, dflt: number) {
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : dflt;
}

function send(client: WebSocket, msg: unknown) {
  if (client.readyState === client.OPEN) client.send(JSON.stringify(msg));
}
