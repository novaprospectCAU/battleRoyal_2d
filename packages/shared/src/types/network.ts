import type { GameState, GamePhase } from './game.js';
import type { Player, PlayerInput } from './player.js';

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
  | 'ZONE_UPDATE';

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
