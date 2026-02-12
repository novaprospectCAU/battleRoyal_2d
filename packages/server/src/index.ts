import { WebSocketServer, type WebSocket } from 'ws';
import {
  DEFAULT_GAME_CONFIG,
  PLAYER_CONFIG,
  TICK_INTERVAL,
  createMessage,
  parseMessage,
  serializeMessage,
  type InputPayload,
  type NetworkMessage,
  type SnapshotPayload,
} from '@battle-royal/shared';

const PORT = 3000;
const ROOM_ID = 'default';

type Session = {
  id: string;
  socket: WebSocket;
  name: string;
  x: number;
  y: number;
  rotation: number;
  hp: number;
  isAlive: boolean;
  lastInputSeq: number;
  input: InputPayload;
};

const sessions = new Map<string, Session>();
let serverTick = 0;

console.log('🎮 Battle Royal 2D Server');
console.log('========================');
console.log(`Max Players: ${DEFAULT_GAME_CONFIG.maxPlayers}`);
console.log(`Map Size: ${DEFAULT_GAME_CONFIG.mapWidth}x${DEFAULT_GAME_CONFIG.mapHeight}`);
console.log(`Tick Rate: ${DEFAULT_GAME_CONFIG.tickRate} Hz`);
console.log('');

const wss = new WebSocketServer({ port: PORT });
console.log(`✅ Server listening on ws://localhost:${PORT}`);

wss.on('connection', (socket, req) => {
  if (sessions.size >= DEFAULT_GAME_CONFIG.maxPlayers) {
    socket.close(1013, 'Server full');
    return;
  }

  const playerId = generateId();
  const spawn = randomSpawn();
  const session: Session = {
    id: playerId,
    socket,
    name: `Player-${playerId.slice(0, 4)}`,
    x: spawn.x,
    y: spawn.y,
    rotation: 0,
    hp: PLAYER_CONFIG.maxHp,
    isAlive: true,
    lastInputSeq: 0,
    input: emptyInput(),
  };

  sessions.set(playerId, session);
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 Client connected from ${clientIp} as ${playerId}`);

  send(socket, createMessage('WELCOME', {
    playerId,
    serverTime: Date.now(),
    tickRate: DEFAULT_GAME_CONFIG.tickRate,
  }));

  send(socket, createMessage('ROOM_JOINED', {
    roomId: ROOM_ID,
    playerId,
  }));

  socket.on('message', (raw) => {
    const parsed = parseMessage(raw.toString());
    if (!parsed) {
      return;
    }
    handleMessage(session, parsed);
  });

  socket.on('close', () => {
    sessions.delete(playerId);
    console.log(`🔌 Client disconnected: ${playerId}`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const tickTimer = setInterval(() => {
  stepSimulation(TICK_INTERVAL);
  broadcastSnapshot();
}, TICK_INTERVAL);

function handleMessage(session: Session, message: NetworkMessage): void {
  switch (message.type) {
    case 'HELLO': {
      if (typeof message.payload === 'object' && message.payload) {
        const payload = message.payload as { name?: unknown };
        if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
          session.name = payload.name.slice(0, 24);
        }
      }
      break;
    }
    case 'INPUT': {
      if (isInputPayload(message.payload)) {
        session.input = message.payload;
        session.lastInputSeq = message.payload.seq;
      }
      break;
    }
    case 'PING': {
      if (typeof message.payload === 'object' && message.payload) {
        const payload = message.payload as { clientTime?: unknown };
        if (typeof payload.clientTime === 'number') {
          send(session.socket, createMessage('PONG', {
            clientTime: payload.clientTime,
            serverTime: Date.now(),
          }));
        }
      }
      break;
    }
    default:
      break;
  }
}

function stepSimulation(dtMs: number): void {
  const dtSec = dtMs / 1000;
  for (const session of sessions.values()) {
    const input = session.input;
    const length = Math.hypot(input.moveX, input.moveY);
    const moveX = length > 0 ? input.moveX / length : 0;
    const moveY = length > 0 ? input.moveY / length : 0;

    session.x += moveX * PLAYER_CONFIG.moveSpeed * dtSec;
    session.y += moveY * PLAYER_CONFIG.moveSpeed * dtSec;
    session.rotation = input.rotation;

    session.x = clamp(session.x, 0, DEFAULT_GAME_CONFIG.mapWidth);
    session.y = clamp(session.y, 0, DEFAULT_GAME_CONFIG.mapHeight);
  }
}

function broadcastSnapshot(): void {
  serverTick += 1;
  const players = Array.from(sessions.values(), (session) => ({
    id: session.id,
    name: session.name,
    x: session.x,
    y: session.y,
    rotation: session.rotation,
    hp: session.hp,
    isAlive: session.isAlive,
  }));

  const payload: SnapshotPayload = {
    serverTick,
    lastProcessedSeq: Math.max(0, ...Array.from(sessions.values(), (s) => s.lastInputSeq)),
    players,
  };

  const message = serializeMessage(createMessage('SNAPSHOT', payload));
  for (const session of sessions.values()) {
    if (session.socket.readyState === 1) {
      session.socket.send(message);
    }
  }
}

function send(socket: WebSocket, message: NetworkMessage): void {
  if (socket.readyState !== 1) return;
  socket.send(serializeMessage(message));
}

function emptyInput(): InputPayload {
  return { seq: 0, moveX: 0, moveY: 0, rotation: 0, fire: false, reload: false };
}

function randomSpawn(): { x: number; y: number } {
  return {
    x: Math.random() * DEFAULT_GAME_CONFIG.mapWidth,
    y: Math.random() * DEFAULT_GAME_CONFIG.mapHeight,
  };
}

function isInputPayload(payload: unknown): payload is InputPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const value = payload as Record<string, unknown>;
  return (
    typeof value.seq === 'number' &&
    typeof value.moveX === 'number' &&
    typeof value.moveY === 'number' &&
    typeof value.rotation === 'number' &&
    typeof value.fire === 'boolean' &&
    typeof value.reload === 'boolean'
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  clearInterval(tickTimer);
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
