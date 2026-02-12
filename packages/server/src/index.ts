import { WebSocketServer, type WebSocket } from 'ws';
import {
  DEFAULT_GAME_CONFIG,
  PLAYER_CONFIG,
  TICK_INTERVAL,
  createMessage,
  parseMessage,
  serializeMessage,
  type GamePhase,
  type InputPayload,
  type NetworkMessage,
  type SnapshotPayload,
} from '@battle-royal/shared';

const PORT = Number(process.env.PORT ?? 3000);
const ROOM_TARGET_PLAYERS = 20;
const ROOM_CODE_LENGTH = 6;
const BOT_CHASE_RANGE = 360;
const BOT_ATTACK_RANGE = 220;
const BOT_ATTACK_DAMAGE = 8;
const BOT_ATTACK_COOLDOWN_MS = 450;

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
  roomCode: string | null;
};

type BotState = {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  hp: number;
  isAlive: boolean;
  moveX: number;
  moveY: number;
  nextTurnAt: number;
  lastAttackAt: number;
};

type Room = {
  code: string;
  hostId: string;
  phase: GamePhase;
  humans: Set<string>;
  bots: BotState[];
  tick: number;
};

const sessions = new Map<string, Session>();
const rooms = new Map<string, Room>();

console.log('🎮 Battle Royal 2D Server');
console.log('========================');
console.log(`Max Players: ${DEFAULT_GAME_CONFIG.maxPlayers}`);
console.log(`Map Size: ${DEFAULT_GAME_CONFIG.mapWidth}x${DEFAULT_GAME_CONFIG.mapHeight}`);
console.log(`Tick Rate: ${DEFAULT_GAME_CONFIG.tickRate} Hz`);
console.log(`Room Target Players: ${ROOM_TARGET_PLAYERS}`);
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
    roomCode: null,
  };

  sessions.set(playerId, session);
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 Client connected from ${clientIp} as ${playerId}`);

  send(socket, createMessage('WELCOME', {
    playerId,
    serverTime: Date.now(),
    tickRate: DEFAULT_GAME_CONFIG.tickRate,
  }));

  socket.on('message', (raw) => {
    const parsed = parseMessage(raw.toString());
    if (!parsed) return;
    handleMessage(session, parsed);
  });

  socket.on('close', () => {
    leaveRoom(session);
    sessions.delete(playerId);
    console.log(`🔌 Client disconnected: ${playerId}`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const tickTimer = setInterval(() => {
  for (const room of rooms.values()) {
    if (room.phase === 'playing') {
      stepRoomSimulation(room, TICK_INTERVAL);
    }
    broadcastSnapshot(room);
  }
}, TICK_INTERVAL);

function handleMessage(session: Session, message: NetworkMessage): void {
  switch (message.type) {
    case 'HELLO': {
      if (typeof message.payload === 'object' && message.payload) {
        const payload = message.payload as { name?: unknown };
        if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
          session.name = payload.name.trim().slice(0, 24);
        }
      }
      break;
    }
    case 'CREATE_ROOM': {
      leaveRoom(session);
      const room = createRoom(session);
      sendRoomJoined(session, room);
      break;
    }
    case 'JOIN_ROOM': {
      if (typeof message.payload !== 'object' || message.payload === null) {
        sendError(session, 'INVALID_JOIN_PAYLOAD', 'Invalid join payload');
        break;
      }

      const payload = message.payload as { inviteCode?: unknown; playerName?: unknown };
      if (typeof payload.playerName === 'string' && payload.playerName.trim().length > 0) {
        session.name = payload.playerName.trim().slice(0, 24);
      }

      if (typeof payload.inviteCode !== 'string') {
        sendError(session, 'MISSING_INVITE_CODE', 'Invite code is required');
        break;
      }

      const roomCode = payload.inviteCode.trim().toUpperCase();
      const room = rooms.get(roomCode);

      if (!room) {
        sendError(session, 'ROOM_NOT_FOUND', `Room ${roomCode} does not exist`);
        break;
      }

      if (room.phase !== 'waiting') {
        sendError(session, 'GAME_ALREADY_STARTED', 'Game already started in this room');
        break;
      }

      if (room.humans.size >= ROOM_TARGET_PLAYERS) {
        sendError(session, 'ROOM_FULL', `Room ${roomCode} is full`);
        break;
      }

      leaveRoom(session);
      room.humans.add(session.id);
      session.roomCode = room.code;
      reconcileBots(room);
      sendRoomJoined(session, room);
      break;
    }
    case 'GAME_START': {
      const room = getSessionRoom(session);
      if (!room) {
        sendError(session, 'NO_ROOM', 'Join or create a room first');
        break;
      }
      if (room.hostId !== session.id) {
        sendError(session, 'ONLY_HOST_CAN_START', 'Only host can start the game');
        break;
      }
      if (room.phase !== 'waiting') {
        sendError(session, 'ALREADY_STARTED', 'Game already started');
        break;
      }
      room.phase = 'playing';
      room.tick = 0;
      console.log(`🚀 Room started: ${room.code} host=${session.id}`);
      break;
    }
    case 'INPUT': {
      if (!session.roomCode) break;
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

function createRoom(host: Session): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    hostId: host.id,
    phase: 'waiting',
    humans: new Set([host.id]),
    bots: [],
    tick: 0,
  };

  host.roomCode = code;
  rooms.set(code, room);
  reconcileBots(room);
  console.log(`🏠 Room created: ${code} host=${host.id}`);
  return room;
}

function leaveRoom(session: Session): void {
  if (!session.roomCode) return;

  const room = rooms.get(session.roomCode);
  if (!room) {
    session.roomCode = null;
    return;
  }

  room.humans.delete(session.id);
  session.roomCode = null;
  session.input = emptyInput();

  if (room.hostId === session.id) {
    const nextHost = room.humans.values().next().value as string | undefined;
    if (nextHost) {
      room.hostId = nextHost;
    }
  }

  if (room.humans.size === 0) {
    rooms.delete(room.code);
    console.log(`🧹 Room removed: ${room.code}`);
    return;
  }

  reconcileBots(room);
}

function getSessionRoom(session: Session): Room | null {
  if (!session.roomCode) return null;
  return rooms.get(session.roomCode) ?? null;
}

function sendRoomJoined(session: Session, room: Room): void {
  send(session.socket, createMessage('ROOM_JOINED', {
    roomId: room.code,
    inviteCode: room.code,
    playerId: session.id,
    isHost: room.hostId === session.id,
    phase: room.phase,
    targetPlayers: ROOM_TARGET_PLAYERS,
    humanCount: room.humans.size,
    botCount: room.bots.length,
  }));
}

function sendError(session: Session, code: string, message: string): void {
  send(session.socket, createMessage('ERROR', { code, message }));
}

function stepRoomSimulation(room: Room, dtMs: number): void {
  const dtSec = dtMs / 1000;
  room.tick += 1;

  for (const humanId of room.humans) {
    const session = sessions.get(humanId);
    if (!session) continue;
    if (!session.isAlive) continue;

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

  updateBots(room, dtSec);
}

function updateBots(room: Room, dtSec: number): void {
  const now = Date.now();
  const humans = Array.from(room.humans)
    .map((id) => sessions.get(id))
    .filter((session): session is Session => session !== undefined)
    .filter((session) => session.isAlive);

  for (const bot of room.bots) {
    if (!bot.isAlive) continue;
    let nearestTarget: { session: Session; distance: number } | null = null;

    if (now >= bot.nextTurnAt) {
      nearestTarget = findClosestHuman(bot.x, bot.y, humans);
      if (nearestTarget && nearestTarget.distance <= BOT_CHASE_RANGE) {
        const dirX = nearestTarget.session.x - bot.x;
        const dirY = nearestTarget.session.y - bot.y;
        const len = Math.hypot(dirX, dirY) || 1;
        bot.moveX = (dirX / len) * 0.85;
        bot.moveY = (dirY / len) * 0.85;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const speedScale = 0.4 + Math.random() * 0.55;
        bot.moveX = Math.cos(angle) * speedScale;
        bot.moveY = Math.sin(angle) * speedScale;
      }

      bot.rotation = Math.atan2(bot.moveY, bot.moveX);
      bot.nextTurnAt = now + 350 + Math.floor(Math.random() * 850);
    }

    if (!nearestTarget) {
      nearestTarget = findClosestHuman(bot.x, bot.y, humans);
    }

    if (
      nearestTarget &&
      nearestTarget.distance <= BOT_ATTACK_RANGE &&
      now - bot.lastAttackAt >= BOT_ATTACK_COOLDOWN_MS
    ) {
      bot.lastAttackAt = now;
      nearestTarget.session.hp = Math.max(0, nearestTarget.session.hp - BOT_ATTACK_DAMAGE);
      if (nearestTarget.session.hp <= 0) {
        nearestTarget.session.isAlive = false;
        nearestTarget.session.input = emptyInput();
      }
    }

    bot.x += bot.moveX * PLAYER_CONFIG.moveSpeed * dtSec;
    bot.y += bot.moveY * PLAYER_CONFIG.moveSpeed * dtSec;

    if (bot.x <= 0 || bot.x >= DEFAULT_GAME_CONFIG.mapWidth) {
      bot.moveX *= -1;
      bot.x = clamp(bot.x, 0, DEFAULT_GAME_CONFIG.mapWidth);
    }

    if (bot.y <= 0 || bot.y >= DEFAULT_GAME_CONFIG.mapHeight) {
      bot.moveY *= -1;
      bot.y = clamp(bot.y, 0, DEFAULT_GAME_CONFIG.mapHeight);
    }

    bot.rotation = Math.atan2(bot.moveY, bot.moveX);
  }
}

function findClosestHuman(
  x: number,
  y: number,
  humans: Session[]
): { session: Session; distance: number } | null {
  let best: { session: Session; distance: number } | null = null;

  for (const session of humans) {
    const dx = session.x - x;
    const dy = session.y - y;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.distance) {
      best = { session, distance: dist };
    }
  }

  return best;
}

function reconcileBots(room: Room): void {
  const desired = Math.max(0, ROOM_TARGET_PLAYERS - room.humans.size);

  while (room.bots.length < desired) {
    room.bots.push(createBot(room));
  }

  if (room.bots.length > desired) {
    room.bots.splice(desired);
  }
}

function createBot(room: Room): BotState {
  const idx = room.bots.length + 1;
  const angle = Math.random() * Math.PI * 2;
  const spawn = randomSpawn();
  return {
    id: `bot-${room.code}-${idx}-${generateId().slice(0, 4)}`,
    name: `BOT ${idx}`,
    x: spawn.x,
    y: spawn.y,
    rotation: angle,
    hp: PLAYER_CONFIG.maxHp,
    isAlive: true,
    moveX: Math.cos(angle) * 0.5,
    moveY: Math.sin(angle) * 0.5,
    nextTurnAt: Date.now() + 500 + Math.floor(Math.random() * 1200),
    lastAttackAt: 0,
  };
}

function broadcastSnapshot(room: Room): void {
  const players = [
    ...Array.from(room.humans)
      .map((id) => sessions.get(id))
      .filter((session): session is Session => Boolean(session))
      .map((session) => ({
        id: session.id,
        name: session.name,
        x: session.x,
        y: session.y,
        rotation: session.rotation,
        hp: session.hp,
        isAlive: session.isAlive,
      })),
    ...room.bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      x: bot.x,
      y: bot.y,
      rotation: bot.rotation,
      hp: bot.hp,
      isAlive: bot.isAlive,
    })),
  ];

  const payload: SnapshotPayload = {
    serverTick: room.tick,
    lastProcessedSeq: Math.max(
      0,
      ...Array.from(room.humans).map((id) => sessions.get(id)?.lastInputSeq ?? 0)
    ),
    roomCode: room.code,
    phase: room.phase,
    targetPlayers: ROOM_TARGET_PLAYERS,
    humanCount: room.humans.size,
    botCount: room.bots.length,
    players,
  };

  const message = serializeMessage(createMessage('SNAPSHOT', payload));
  for (const humanId of room.humans) {
    const session = sessions.get(humanId);
    if (!session || session.socket.readyState !== 1) continue;
    session.socket.send(message);
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

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    isUnique = !rooms.has(code);
  }

  return code;
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  clearInterval(tickTimer);
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
