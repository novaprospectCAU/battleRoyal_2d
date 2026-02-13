import {
  createMessage,
  parseMessage,
  serializeMessage,
  type GamePhase,
  type InputPayload,
  type NetworkMessage,
  type RoomJoinedPayload,
  type SnapshotPayload,
} from '@battle-royal/shared';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

type NetworkHandlers = {
  onStateChange?: (state: ConnectionState) => void;
  onWelcome?: (playerId: string) => void;
  onRoomJoined?: (payload: RoomJoinedPayload) => void;
  onSnapshot?: (snapshot: SnapshotPayload) => void;
  onError?: (message: string) => void;
};

export type RoomJoinMode =
  | { kind: 'host' }
  | { kind: 'join'; inviteCode: string };

export class NetworkClient {
  private socket: WebSocket | null = null;
  private readonly url: string;
  private readonly handlers: NetworkHandlers;
  private seq = 0;
  private playerId: string | null = null;
  private closedByClient = false;

  constructor(url: string, handlers: NetworkHandlers = {}) {
    this.url = url;
    this.handlers = handlers;
  }

  connect(playerName: string, mode: RoomJoinMode): void {
    if (this.socket && this.socket.readyState <= 1) return;

    this.closedByClient = false;
    this.handlers.onStateChange?.('connecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.handlers.onStateChange?.('connected');
      this.send(createMessage('HELLO', { name: playerName, version: '0.1.0' }));
      if (mode.kind === 'host') {
        this.send(createMessage('CREATE_ROOM', {}));
      } else {
        this.send(createMessage('JOIN_ROOM', {
          inviteCode: mode.inviteCode.toUpperCase(),
          playerName,
        }));
      }
    });

    socket.addEventListener('message', (event) => {
      const parsed = parseMessage(String(event.data));
      if (!parsed) return;
      this.handleMessage(parsed);
    });

    socket.addEventListener('close', (event) => {
      this.handlers.onStateChange?.('closed');
      if (!this.closedByClient) {
        const reason = event.reason ? ` (${event.reason})` : '';
        this.handlers.onError?.(
          `WebSocket disconnected: code=${event.code}${reason}. 서버를 별도 터미널에서 실행해 주세요 (npm run dev:server).`
        );
      }
      this.socket = null;
    });

    socket.addEventListener('error', () => {
      this.handlers.onStateChange?.('error');
      this.handlers.onError?.(`WebSocket connection error (${this.url}). 서버 실행 명령: npm run dev:server`);
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.closedByClient = true;
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

  startGame(): void {
    this.send(createMessage('GAME_START', {}));
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
      case 'ROOM_JOINED': {
        if (isRoomJoinedPayload(message.payload)) {
          this.handlers.onRoomJoined?.(message.payload);
        }
        break;
      }
      case 'ERROR': {
        if (typeof message.payload === 'object' && message.payload) {
          const payload = message.payload as { message?: unknown };
          if (typeof payload.message === 'string') {
            this.handlers.onError?.(payload.message);
          }
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
    typeof value.roomCode === 'string' &&
    isGamePhase(value.phase) &&
    typeof value.humanCount === 'number' &&
    typeof value.botCount === 'number' &&
    Array.isArray(value.openDoors) &&
    Array.isArray(value.players)
  );
}

function isRoomJoinedPayload(payload: unknown): payload is RoomJoinedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const value = payload as Record<string, unknown>;
  return (
    typeof value.roomId === 'string' &&
    typeof value.inviteCode === 'string' &&
    typeof value.playerId === 'string' &&
    typeof value.isHost === 'boolean' &&
    isGamePhase(value.phase) &&
    typeof value.worldSeed === 'number' &&
    typeof value.targetPlayers === 'number' &&
    typeof value.humanCount === 'number' &&
    typeof value.botCount === 'number'
  );
}

function isGamePhase(value: unknown): value is GamePhase {
  return value === 'waiting' || value === 'countdown' || value === 'playing' || value === 'ended';
}
