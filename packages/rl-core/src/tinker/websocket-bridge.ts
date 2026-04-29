import type { WorkspaceCommand, WorkspaceCommandResult, WorkspaceSnapshot } from '@maya/workspace-domain/workspace';
import { getWorkspaceController } from './controller';

type BridgeEventHandler = (data: unknown) => void;

type ThrottleSettings = {
  maxCommandsPerSecond: number;
  maxOutstandingRequests: number;
  burstMultiplier?: number;
};

type CommandRequestMessage = {
  type: 'command_request';
  command?: WorkspaceCommand;
  requestId?: string;
};

type SnapshotRequestMessage = {
  type: 'snapshot_request';
  requestId?: string;
};

type HelloMessage = {
  type: 'hello';
  bridge_version: string;
  workspace_contract_version: string;
  tdc_version: string;
  reward_version: string;
  capabilities: string[];
  auth: { scheme: 'api-key' | 'bearer' | 'none'; token?: string };
  throttle: ThrottleSettings;
  requestedThrottle?: ThrottleSettings;
};

type HelloAckMessage = {
  type: 'hello_ack';
  session_id: string;
  grantedThrottle?: ThrottleSettings;
  capabilities?: string[];
};

type ServerMessage =
  | CommandRequestMessage
  | SnapshotRequestMessage
  | HelloAckMessage
  | { type: 'metrics'; [key: string]: unknown }
  | { type: string; [key: string]: unknown };

interface CommandResponseMessage {
  type: 'command_response';
  ok: boolean;
  requestId?: string;
  result?: WorkspaceCommandResult;
  error?: string;
}

interface SnapshotResponseMessage {
  type: 'snapshot_response';
  ok: boolean;
  requestId?: string;
  snapshot?: WorkspaceSnapshot;
  error?: string;
}

interface BridgeOptions {
  url?: string;
}

const REQUESTED_THROTTLE: ThrottleSettings = {
  maxCommandsPerSecond: 120,
  maxOutstandingRequests: 256,
  burstMultiplier: 2,
};

export class TinkerWebSocketBridge {
  private ws: WebSocket | null = null;
  private readonly listeners = new Map<string, Set<BridgeEventHandler>>();
  private readonly url: string;
  private connectPromise: Promise<void> | null = null;
  private handshakeResolver: (() => void) | null = null;
  private handshakeComplete = false;
  private sessionId: string | null = null;
  private grantedThrottle: ThrottleSettings = REQUESTED_THROTTLE;

  constructor(options: BridgeOptions = {}) {
    this.url = options.url ?? 'ws://localhost:8765';
  }

  async connect(): Promise<void> {
    if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') {
      console.warn('[TinkerBridge] WebSocket API is not available in this environment.');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.ws = socket;
      let settled = false;

      const resolveHandshake = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      this.handshakeResolver = resolveHandshake;

      socket.onopen = () => {
        console.info('[TinkerBridge] Connected to Python bridge.');
        this.emit('open', undefined);
        this.handshakeComplete = false;
        this.sendHello(socket);
      };

      socket.onmessage = (event) => {
        void this.onSocketMessage(event.data);
      };

      socket.onerror = (event) => {
        console.error('[TinkerBridge] WebSocket error', event);
        this.emit('error', event);
        if (!settled && socket.readyState !== WebSocket.OPEN) {
          settled = true;
          reject(new Error('Failed to connect to Python bridge'));
        }
      };

      socket.onclose = (event) => {
        if (this.ws === socket) {
          this.ws = null;
        }
        this.emit('close', { code: event.code, reason: event.reason });
        this.handshakeComplete = false;
        this.sessionId = null;
        if (!settled) {
          settled = true;
          reject(new Error(`Connection closed (${event.code})`));
        }
      };
    }).finally(() => {
      this.connectPromise = null;
      this.handshakeResolver = null;
    });

    return this.connectPromise;
  }

  disconnect(): void {
        if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
    this.connectPromise = null;
    this.handshakeComplete = false;
    this.sessionId = null;
    }

  on(event: string, handler: BridgeEventHandler): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

  off(event: string, handler: BridgeEventHandler): void {
        this.listeners.get(event)?.delete(handler);
    }

  private async onSocketMessage(data: string | Blob | ArrayBuffer): Promise<void> {
    const message = await this.parseMessage(data);
    if (!message) return;
    await this.handleMessage(message);
  }

  private async parseMessage(data: string | Blob | ArrayBuffer): Promise<ServerMessage | null> {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      if (data instanceof Blob) {
        return JSON.parse(await data.text());
      }
      if (data instanceof ArrayBuffer) {
        const decoded = new TextDecoder().decode(data);
        return JSON.parse(decoded);
      }
      console.warn('[TinkerBridge] Unsupported payload type from server.', data);
      return null;
    } catch (error) {
      console.error('[TinkerBridge] Failed to parse server message', error);
      return null;
    }
  }

  private async handleMessage(message: ServerMessage): Promise<void> {
    switch (message.type) {
      case 'command_request':
        await this.handleCommandRequest(message as CommandRequestMessage);
        break;
      case 'snapshot_request':
        this.handleSnapshotRequest(message as SnapshotRequestMessage);
        break;
      case 'hello_ack':
        this.handleHelloAck(message as HelloAckMessage);
        break;
      case 'metrics':
        this.emit('metrics', message);
        break;
      default:
        this.emit('message', message);
    }
  }

  private async handleCommandRequest(message: CommandRequestMessage) {
    const controller = getWorkspaceController();
    if (!controller) {
      this.sendCommandResponse({
        type: 'command_response',
        ok: false,
        requestId: message.requestId,
        error: 'Workspace controller is not available.',
      });
      return;
    }

    if (!message.command) {
      this.sendCommandResponse({
        type: 'command_response',
        ok: false,
        requestId: message.requestId,
        error: 'Missing command payload.',
      });
      return;
    }

    try {
      const result = await Promise.resolve(controller.execute(message.command));
      this.sendCommandResponse({
        type: 'command_response',
        ok: true,
        requestId: message.requestId,
        result,
      });
    } catch (error) {
      this.sendCommandResponse({
        type: 'command_response',
        ok: false,
        requestId: message.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private handleSnapshotRequest(message: SnapshotRequestMessage) {
    const controller = getWorkspaceController();
    if (!controller) {
      this.sendSnapshotResponse({
        type: 'snapshot_response',
        ok: false,
        requestId: message.requestId,
        error: 'Workspace controller is not available.',
      });
      return;
    }

    this.sendSnapshotResponse({
      type: 'snapshot_response',
      ok: true,
      requestId: message.requestId,
      snapshot: controller.snapshot,
    });
  }

  private sendCommandResponse(response: CommandResponseMessage) {
    this.safeSend(response);
  }

  private sendSnapshotResponse(response: SnapshotResponseMessage) {
    this.safeSend(response);
  }

  private safeSend(payload: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[TinkerBridge] Attempted to send while socket is not open.');
      return;
    }
    if (!this.handshakeComplete && (payload as { type?: string }).type !== 'hello') {
      console.warn('[TinkerBridge] Attempted to send before handshake completion.');
      return;
    }
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error('[TinkerBridge] Failed to send payload', error);
    }
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error('[TinkerBridge] Listener error', error);
      }
    });
  }

  private sendHello(socket: WebSocket) {
    const hello: HelloMessage = {
      type: 'hello',
      bridge_version: '1.0',
      workspace_contract_version: '1.0.0',
      tdc_version: '1.0.0',
      reward_version: '1.0',
      capabilities: ['command', 'snapshot', 'metrics'],
      auth: { scheme: 'none' },
      throttle: REQUESTED_THROTTLE,
      requestedThrottle: REQUESTED_THROTTLE,
    };
    socket.send(JSON.stringify(hello));
  }

  private handleHelloAck(message: HelloAckMessage) {
    this.handshakeComplete = true;
    this.sessionId = message.session_id;
    if (message.grantedThrottle) {
      this.grantedThrottle = message.grantedThrottle;
    }
    this.emit('ready', message);
    this.handshakeResolver?.();
    this.handshakeResolver = null;
  }
}
