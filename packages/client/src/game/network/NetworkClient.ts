import {
  createMessage,
  parseMessage,
  serializeMessage,
  type InputPayload,
  type NetworkMessage,
  type SnapshotPayload,
} from '@battle-royal/shared';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

type NetworkHandlers = {
  onStateChange?: (state: ConnectionState) => void;
  onWelcome?: (playerId: string) => void;
  onSnapshot?: (snapshot: SnapshotPayload) => void;
  onError?: (message: string) => void;
};

export class NetworkClient {
  private socket: WebSocket | null = null;
  private readonly url: string;
  private readonly handlers: NetworkHandlers;
  private seq = 0;
  private playerId: string | null = null;

  constructor(url: string, handlers: NetworkHandlers = {}) {
    this.url = url;
    this.handlers = handlers;
  }

  connect(playerName: string): void {
    if (this.socket && this.socket.readyState <= 1) return;

    this.handlers.onStateChange?.('connecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.handlers.onStateChange?.('connected');
      this.send(createMessage('HELLO', { name: playerName, version: '0.1.0' }));
      this.send(createMessage('JOIN_ROOM', { roomId: 'default' }));
    });

    socket.addEventListener('message', (event) => {
      const parsed = parseMessage(String(event.data));
      if (!parsed) return;
      this.handleMessage(parsed);
    });

    socket.addEventListener('close', () => {
      this.handlers.onStateChange?.('closed');
      this.socket = null;
    });

    socket.addEventListener('error', () => {
      this.handlers.onStateChange?.('error');
      this.handlers.onError?.('WebSocket connection error');
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
  }

  sendInput(input: Omit<InputPayload, 'seq'>): void {
    this.seq += 1;
    this.send(createMessage('INPUT', { ...input, seq: this.seq }));
  }

  ping(): void {
    this.send(createMessage('PING', { clientTime: Date.now() }));
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'WELCOME': {
        if (typeof message.payload === 'object' && message.payload) {
          const payload = message.payload as { playerId?: unknown };
          if (typeof payload.playerId === 'string') {
            this.playerId = payload.playerId;
            this.handlers.onWelcome?.(payload.playerId);
          }
        }
        break;
      }
      case 'SNAPSHOT': {
        if (isSnapshotPayload(message.payload)) {
          this.handlers.onSnapshot?.(message.payload);
        }
        break;
      }
      default:
        break;
    }
  }

  private send(message: NetworkMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(serializeMessage(message));
  }
}

function isSnapshotPayload(payload: unknown): payload is SnapshotPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const value = payload as Record<string, unknown>;
  return (
    typeof value.serverTick === 'number' &&
    typeof value.lastProcessedSeq === 'number' &&
    Array.isArray(value.players)
  );
}
