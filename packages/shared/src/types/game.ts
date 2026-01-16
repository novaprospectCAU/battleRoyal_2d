import type { Player } from './player.js';

/** 게임 상태 */
export type GamePhase = 'waiting' | 'countdown' | 'playing' | 'ended';

/** 게임 상태 */
export interface GameState {
  phase: GamePhase;
  tick: number;
  players: Map<string, Player>;
  zone: ZoneState;
  aliveCount: number;
}

/** 자기장 상태 */
export interface ZoneState {
  currentPhase: number;
  centerX: number;
  centerY: number;
  currentRadius: number;
  targetRadius: number;
  shrinkStartTime: number;
  shrinkDuration: number;
  damagePerTick: number;
}

/** 게임 설정 */
export interface GameConfig {
  maxPlayers: number;
  mapWidth: number;
  mapHeight: number;
  tickRate: number;
}
