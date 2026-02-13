import { WebSocketServer, type WebSocket } from 'ws';
import {
  DEFAULT_GAME_CONFIG,
  PLAYER_CONFIG,
  TICK_INTERVAL,
  ZONE_CONFIG,
  ZONE_PHASES,
  TILE_PROPERTIES,
  TileType,
  createTestMap,
  worldToTile,
  createMessage,
  parseMessage,
  serializeMessage,
  type GamePhase,
  type InputPayload,
  type NetworkMessage,
  type SnapshotPayload,
  type SnapshotZonePayload,
} from '@battle-royal/shared';

const PORT = Number(process.env.PORT ?? 3000);
const ROOM_TARGET_PLAYERS = 20;
const ROOM_CODE_LENGTH = 6;
const BOT_CHASE_RANGE = 360;
const BOT_ATTACK_RANGE = 220;
const BOT_ATTACK_DAMAGE = 8;
const BOT_ATTACK_COOLDOWN_MS = 450;
const PLAYER_ATTACK_RANGE = 460;
const PLAYER_ATTACK_DAMAGE = 22;
const PLAYER_ATTACK_COOLDOWN_MS = 140;
const PLAYER_ATTACK_ANGLE_RAD = Math.PI / 9;
const SERVER_MAP = createTestMap();

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
  lastAttackAt: number;
  lastInteractAt: number;
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
  worldSeed: number;
  zone: ServerZoneState;
  pendingBotShots: { id: string; fromX: number; fromY: number; toX: number; toY: number }[];
  openDoors: Set<string>;
  humans: Set<string>;
  bots: BotState[];
  tick: number;
};

type ServerZoneState = {
  currentPhase: number;
  state: 'waiting' | 'shrinking' | 'finished';
  phaseElapsedMs: number;
  damagePerSecond: number;
  currentCenterX: number;
  currentCenterY: number;
  currentRadius: number;
  targetCenterX: number;
  targetCenterY: number;
  targetRadius: number;
  startCenterX: number;
  startCenterY: number;
  startRadius: number;
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
    lastAttackAt: 0,
    lastInteractAt: 0,
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
        // 중복 시작 요청은 에러로 취급하지 않고 무시 (idempotent)
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
  const worldSeed = Math.floor(Math.random() * 0x7fffffff);
  const room: Room = {
    code,
    hostId: host.id,
    phase: 'waiting',
    worldSeed,
    zone: createInitialZoneState(),
    pendingBotShots: [],
    openDoors: new Set<string>(),
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
    worldSeed: room.worldSeed,
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

    const nextX = session.x + moveX * PLAYER_CONFIG.moveSpeed * dtSec;
    const nextY = session.y + moveY * PLAYER_CONFIG.moveSpeed * dtSec;
    const resolved = resolveMoveWithCollision(room, nextX, nextY, session.x, session.y);
    session.x = resolved.x;
    session.y = resolved.y;
    session.rotation = input.rotation;

    session.x = clamp(session.x, 0, DEFAULT_GAME_CONFIG.mapWidth);
    session.y = clamp(session.y, 0, DEFAULT_GAME_CONFIG.mapHeight);

    const now = Date.now();
    if (input.interact && now - session.lastInteractAt >= 180) {
      session.lastInteractAt = now;
      toggleNearbyDoor(room, session.x, session.y);
    }
    if (input.fire && now - session.lastAttackAt >= PLAYER_ATTACK_COOLDOWN_MS) {
      session.lastAttackAt = now;
      resolvePlayerAttack(room, session);
    }
  }

  updateBots(room, dtSec);
  updateZone(room.zone, dtMs);
  applyZoneDamage(room, dtSec);
}

function updateBots(room: Room, dtSec: number): void {
  const now = Date.now();
  const humans = Array.from(room.humans)
    .map((id) => sessions.get(id))
    .filter((session): session is Session => session !== undefined)
    .filter((session) => session.isAlive);

  for (const bot of room.bots) {
    if (!bot.isAlive) continue;
    let nearestTarget: BotTarget | null = null;

    if (now >= bot.nextTurnAt) {
      nearestTarget = findClosestTarget(bot, humans, room.bots);
      if (nearestTarget && nearestTarget.distance <= BOT_CHASE_RANGE) {
        const dirX = nearestTarget.x - bot.x;
        const dirY = nearestTarget.y - bot.y;
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
      nearestTarget = findClosestTarget(bot, humans, room.bots);
    }

    if (
      nearestTarget &&
      nearestTarget.distance <= BOT_ATTACK_RANGE &&
      now - bot.lastAttackAt >= BOT_ATTACK_COOLDOWN_MS
    ) {
      bot.lastAttackAt = now;
      room.pendingBotShots.push({
        id: `${bot.id}-${now}`,
        fromX: bot.x,
        fromY: bot.y,
        toX: nearestTarget.x,
        toY: nearestTarget.y,
      });
      nearestTarget.hpRef.hp = Math.max(0, nearestTarget.hpRef.hp - BOT_ATTACK_DAMAGE);
      if (nearestTarget.hpRef.hp <= 0) {
        nearestTarget.hpRef.isAlive = false;
        if (nearestTarget.hpRef.input) {
          nearestTarget.hpRef.input = emptyInput();
        }
      }
    }

    const nextX = bot.x + bot.moveX * PLAYER_CONFIG.moveSpeed * dtSec;
    const nextY = bot.y + bot.moveY * PLAYER_CONFIG.moveSpeed * dtSec;
    const resolved = resolveMoveWithCollision(room, nextX, nextY, bot.x, bot.y);
    bot.x = resolved.x;
    bot.y = resolved.y;

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

type BotTarget = {
  x: number;
  y: number;
  distance: number;
  hpRef: { hp: number; isAlive: boolean; input?: InputPayload };
};

function findClosestTarget(
  sourceBot: BotState,
  humans: Session[],
  bots: BotState[]
): BotTarget | null {
  let best: BotTarget | null = null;

  for (const session of humans) {
    const dx = session.x - sourceBot.x;
    const dy = session.y - sourceBot.y;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.distance) {
      best = {
        x: session.x,
        y: session.y,
        distance: dist,
        hpRef: session,
      };
    }
  }

  for (const bot of bots) {
    if (!bot.isAlive || bot.id === sourceBot.id) continue;
    const dx = bot.x - sourceBot.x;
    const dy = bot.y - sourceBot.y;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.distance) {
      best = {
        x: bot.x,
        y: bot.y,
        distance: dist,
        hpRef: bot,
      };
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

function createInitialZoneState(): ServerZoneState {
  const centerX = DEFAULT_GAME_CONFIG.mapWidth / 2;
  const centerY = DEFAULT_GAME_CONFIG.mapHeight / 2;
  const radius = Math.max(DEFAULT_GAME_CONFIG.mapWidth, DEFAULT_GAME_CONFIG.mapHeight) * ZONE_CONFIG.initialSizeRatio;

  const zone: ServerZoneState = {
    currentPhase: 0,
    state: 'waiting',
    phaseElapsedMs: 0,
    damagePerSecond: ZONE_PHASES[0]?.damagePerSecond ?? 0,
    currentCenterX: centerX,
    currentCenterY: centerY,
    currentRadius: radius,
    targetCenterX: centerX,
    targetCenterY: centerY,
    targetRadius: radius,
    startCenterX: centerX,
    startCenterY: centerY,
    startRadius: radius,
  };

  configureZoneTarget(zone, 0);
  return zone;
}

function configureZoneTarget(zone: ServerZoneState, phaseIndex: number): void {
  if (phaseIndex >= ZONE_PHASES.length) {
    zone.state = 'finished';
    return;
  }

  zone.currentPhase = phaseIndex;
  zone.state = 'waiting';
  zone.phaseElapsedMs = 0;
  zone.damagePerSecond = ZONE_PHASES[phaseIndex].damagePerSecond;

  const baseRadius = Math.max(DEFAULT_GAME_CONFIG.mapWidth, DEFAULT_GAME_CONFIG.mapHeight);
  const newRadius = baseRadius * ZONE_PHASES[phaseIndex].sizeRatio;
  const maxOffset = Math.max(0, zone.currentRadius - newRadius);
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * maxOffset * 0.7;

  let newCenterX = zone.currentCenterX + Math.cos(angle) * distance;
  let newCenterY = zone.currentCenterY + Math.sin(angle) * distance;
  newCenterX = clamp(newCenterX, newRadius, DEFAULT_GAME_CONFIG.mapWidth - newRadius);
  newCenterY = clamp(newCenterY, newRadius, DEFAULT_GAME_CONFIG.mapHeight - newRadius);

  zone.targetCenterX = newCenterX;
  zone.targetCenterY = newCenterY;
  zone.targetRadius = newRadius;
}

function updateZone(zone: ServerZoneState, dtMs: number): void {
  if (zone.state === 'finished') return;

  zone.phaseElapsedMs += dtMs;
  const phase = ZONE_PHASES[zone.currentPhase];
  if (!phase) return;

  if (zone.state === 'waiting') {
    if (zone.phaseElapsedMs >= phase.waitTime) {
      zone.state = 'shrinking';
      zone.phaseElapsedMs = 0;
      zone.startCenterX = zone.currentCenterX;
      zone.startCenterY = zone.currentCenterY;
      zone.startRadius = zone.currentRadius;
    }
    return;
  }

  const progress = Math.min(1, zone.phaseElapsedMs / phase.shrinkTime);
  zone.currentCenterX = zone.startCenterX + (zone.targetCenterX - zone.startCenterX) * progress;
  zone.currentCenterY = zone.startCenterY + (zone.targetCenterY - zone.startCenterY) * progress;
  zone.currentRadius = zone.startRadius + (zone.targetRadius - zone.startRadius) * progress;

  if (progress >= 1) {
    zone.currentCenterX = zone.targetCenterX;
    zone.currentCenterY = zone.targetCenterY;
    zone.currentRadius = zone.targetRadius;
    configureZoneTarget(zone, zone.currentPhase + 1);
  }
}

function applyZoneDamage(room: Room, dtSec: number): void {
  const dps = room.zone.damagePerSecond;
  if (dps <= 0 || room.zone.state === 'finished') return;
  const damage = dps * dtSec;

  for (const humanId of room.humans) {
    const session = sessions.get(humanId);
    if (!session || !session.isAlive) continue;
    if (isSafe(room.zone, session.x, session.y)) continue;
    session.hp = Math.max(0, session.hp - damage);
    if (session.hp <= 0) {
      session.isAlive = false;
      session.input = emptyInput();
    }
  }

  for (const bot of room.bots) {
    if (!bot.isAlive) continue;
    if (isSafe(room.zone, bot.x, bot.y)) continue;
    bot.hp = Math.max(0, bot.hp - damage);
    if (bot.hp <= 0) {
      bot.isAlive = false;
    }
  }
}

function isSafe(zone: ServerZoneState, x: number, y: number): boolean {
  const dx = x - zone.currentCenterX;
  const dy = y - zone.currentCenterY;
  return dx * dx + dy * dy <= zone.currentRadius * zone.currentRadius;
}

function toggleNearbyDoor(room: Room, worldX: number, worldY: number): void {
  const { x: cx, y: cy } = worldToTile(worldX, worldY, SERVER_MAP.tileSize);
  const maxDistSq = 48 * 48;
  let best: { x: number; y: number; d2: number } | null = null;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx < 0 || tx >= SERVER_MAP.width || ty < 0 || ty >= SERVER_MAP.height) continue;
      if (SERVER_MAP.tiles[ty][tx] !== TileType.DOOR) continue;
      const doorCenterX = tx * SERVER_MAP.tileSize + SERVER_MAP.tileSize / 2;
      const doorCenterY = ty * SERVER_MAP.tileSize + SERVER_MAP.tileSize / 2;
      const ddx = doorCenterX - worldX;
      const ddy = doorCenterY - worldY;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 > maxDistSq) continue;
      if (!best || d2 < best.d2) {
        best = { x: tx, y: ty, d2 };
      }
    }
  }

  if (!best) return;
  const key = `${best.x},${best.y}`;
  if (room.openDoors.has(key)) {
    room.openDoors.delete(key);
  } else {
    room.openDoors.add(key);
  }
}

function resolvePlayerAttack(room: Room, attacker: Session): void {
  if (!attacker.isAlive) return;

  const candidates: Array<{
    x: number;
    y: number;
    hpRef: { hp: number; isAlive: boolean; input?: InputPayload };
    distance: number;
    angleDelta: number;
  }> = [];

  for (const humanId of room.humans) {
    const target = sessions.get(humanId);
    if (!target || !target.isAlive || target.id === attacker.id) continue;
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const distance = Math.hypot(dx, dy);
    if (distance > PLAYER_ATTACK_RANGE) continue;
    const angleToTarget = Math.atan2(dy, dx);
    const angleDelta = Math.abs(normalizeAngle(angleToTarget - attacker.rotation));
    if (angleDelta > PLAYER_ATTACK_ANGLE_RAD) continue;
    candidates.push({ x: target.x, y: target.y, hpRef: target, distance, angleDelta });
  }

  for (const bot of room.bots) {
    if (!bot.isAlive) continue;
    const dx = bot.x - attacker.x;
    const dy = bot.y - attacker.y;
    const distance = Math.hypot(dx, dy);
    if (distance > PLAYER_ATTACK_RANGE) continue;
    const angleToTarget = Math.atan2(dy, dx);
    const angleDelta = Math.abs(normalizeAngle(angleToTarget - attacker.rotation));
    if (angleDelta > PLAYER_ATTACK_ANGLE_RAD) continue;
    candidates.push({ x: bot.x, y: bot.y, hpRef: bot, distance, angleDelta });
  }

  if (candidates.length === 0) return;
  candidates.sort((a, b) => (a.angleDelta - b.angleDelta) || (a.distance - b.distance));

  const target = candidates.find((candidate) =>
    hasLineOfSight(room, attacker.x, attacker.y, candidate.x, candidate.y)
  );
  if (!target) return;

  room.pendingBotShots.push({
    id: `${attacker.id}-${Date.now()}`,
    fromX: attacker.x,
    fromY: attacker.y,
    toX: target.x,
    toY: target.y,
  });
  target.hpRef.hp = Math.max(0, target.hpRef.hp - PLAYER_ATTACK_DAMAGE);
  if (target.hpRef.hp <= 0) {
    target.hpRef.isAlive = false;
    if (target.hpRef.input) {
      target.hpRef.input = emptyInput();
    }
  }
}

function hasLineOfSight(room: Room, fromX: number, fromY: number, toX: number, toY: number): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0) return true;
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = fromX + dx * t;
    const y = fromY + dy * t;
    if (!isWalkableAt(room, x, y)) return false;
  }
  return true;
}

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function resolveMoveWithCollision(room: Room, nextX: number, nextY: number, prevX: number, prevY: number): { x: number; y: number } {
  const xOnly = { x: nextX, y: prevY };
  const yOnly = { x: prevX, y: nextY };
  const both = { x: nextX, y: nextY };

  if (isCircleWalkableAt(room, both.x, both.y, PLAYER_CONFIG.radius)) return both;
  if (isCircleWalkableAt(room, xOnly.x, xOnly.y, PLAYER_CONFIG.radius)) return xOnly;
  if (isCircleWalkableAt(room, yOnly.x, yOnly.y, PLAYER_CONFIG.radius)) return yOnly;
  return { x: prevX, y: prevY };
}

function isCircleWalkableAt(room: Room, centerX: number, centerY: number, radius: number): boolean {
  const points = [
    { x: centerX, y: centerY },
    { x: centerX - radius, y: centerY },
    { x: centerX + radius, y: centerY },
    { x: centerX, y: centerY - radius },
    { x: centerX, y: centerY + radius },
    { x: centerX - radius * 0.7, y: centerY - radius * 0.7 },
    { x: centerX + radius * 0.7, y: centerY - radius * 0.7 },
    { x: centerX - radius * 0.7, y: centerY + radius * 0.7 },
    { x: centerX + radius * 0.7, y: centerY + radius * 0.7 },
  ];

  for (const point of points) {
    if (!isWalkableAt(room, point.x, point.y)) return false;
  }
  return true;
}

function isWalkableAt(room: Room, worldX: number, worldY: number): boolean {
  const { x, y } = worldToTile(worldX, worldY, SERVER_MAP.tileSize);
  if (x < 0 || x >= SERVER_MAP.width || y < 0 || y >= SERVER_MAP.height) return false;
  const tile = SERVER_MAP.tiles[y][x];
  if (tile === TileType.DOOR) return room.openDoors.has(`${x},${y}`);
  return TILE_PROPERTIES[tile].collision === 0;
}

function toSnapshotZone(zone: ServerZoneState): SnapshotZonePayload {
  const phase = ZONE_PHASES[zone.currentPhase];
  const total = zone.state === 'waiting' ? (phase?.waitTime ?? 0) : (phase?.shrinkTime ?? 0);
  const remaining = Math.max(0, total - zone.phaseElapsedMs);

  return {
    currentPhase: zone.currentPhase,
    state: zone.state,
    timeRemaining: remaining,
    damagePerSecond: zone.damagePerSecond,
    current: {
      x: zone.currentCenterX,
      y: zone.currentCenterY,
      radius: zone.currentRadius,
    },
    target: {
      x: zone.targetCenterX,
      y: zone.targetCenterY,
      radius: zone.targetRadius,
    },
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
    worldSeed: room.worldSeed,
    targetPlayers: ROOM_TARGET_PLAYERS,
    humanCount: room.humans.size,
    botCount: room.bots.length,
    zone: toSnapshotZone(room.zone),
    botShots: room.pendingBotShots,
    openDoors: Array.from(room.openDoors),
    players,
  };

  room.pendingBotShots = [];

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
  return { seq: 0, moveX: 0, moveY: 0, rotation: 0, fire: false, reload: false, interact: false };
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
    typeof value.reload === 'boolean' &&
    typeof value.interact === 'boolean'
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
