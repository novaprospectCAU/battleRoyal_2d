import type { GamePhase } from './game.js';
import type { Player } from './player.js';

/** 네트워크 메시지 타입 */
export type MessageType =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'ROOM_STATE'
  | 'PLAYER_JOIN'
  | 'PLAYER_LEAVE'
  | 'PLAYER_INPUT'
  | 'GAME_START'
  | 'GAME_STATE'
  | 'GAME_END'
  | 'PLAYER_DAMAGE'
  | 'PLAYER_DEATH'
  | 'ZONE_UPDATE'
  | 'HELLO'
  | 'CREATE_ROOM'
  | 'WELCOME'
  | 'INPUT'
  | 'ROOM_JOINED'
  | 'SNAPSHOT'
  | 'PING'
  | 'PONG'
  | 'ERROR';

/** 기본 메시지 구조 */
export interface NetworkMessage<T = unknown> {
  type: MessageType;
  timestamp: number;
  payload: T;
}

/** 연결 응답 */
export interface ConnectPayload {
  playerId: string;
  serverTime: number;
}

/** 방 참가 요청 */
export interface JoinRoomPayload {
  inviteCode: string;
  playerName: string;
}

/** 방 상태 */
export interface RoomStatePayload {
  roomId: string;
  inviteCode: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
}

/** 게임 상태 업데이트 (틱마다 전송) */
export interface GameStatePayload {
  tick: number;
  lastProcessedSeq: number;
  players: Player[];
  zone: {
    centerX: number;
    centerY: number;
    currentRadius: number;
    targetRadius: number;
  };
}

/** 클라이언트 초기 핸드셰이크 */
export interface HelloPayload {
  name: string;
  version: string;
}

/** 서버 환영 메시지 */
export interface WelcomePayload {
  playerId: string;
  serverTime: number;
  tickRate: number;
}

/** 방 입장 완료 */
export interface RoomJoinedPayload {
  roomId: string;
  inviteCode: string;
  playerId: string;
  isHost: boolean;
  phase: GamePhase;
  worldSeed: number;
  targetPlayers: number;
  humanCount: number;
  botCount: number;
}

export interface SnapshotZonePayload {
  currentPhase: number;
  state: 'waiting' | 'shrinking' | 'finished';
  timeRemaining: number;
  damagePerSecond: number;
  current: {
    x: number;
    y: number;
    radius: number;
  };
  target: {
    x: number;
    y: number;
    radius: number;
  };
}

/** 클라이언트 입력 */
export interface InputPayload {
  seq: number;
  moveX: number;
  moveY: number;
  rotation: number;
  fire: boolean;
  reload: boolean;
}

/** 스냅샷 내 플레이어 상태 */
export interface SnapshotPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  hp: number;
  isAlive: boolean;
}

/** 서버 스냅샷 */
export interface SnapshotPayload {
  serverTick: number;
  lastProcessedSeq: number;
  roomCode: string;
  phase: GamePhase;
  worldSeed: number;
  targetPlayers: number;
  humanCount: number;
  botCount: number;
  zone: SnapshotZonePayload;
  players: SnapshotPlayer[];
}

/** RTT 측정 */
export interface PingPayload {
  clientTime: number;
}

/** 에러 응답 */
export interface ErrorPayload {
  code: string;
  message: string;
}
