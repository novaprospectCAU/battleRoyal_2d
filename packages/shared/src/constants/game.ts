import type { GameConfig } from '../types/game.js';

import { MAP_WIDTH_PX, MAP_HEIGHT_PX } from './map.js';

/** 기본 게임 설정 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayers: 32,
  mapWidth: MAP_WIDTH_PX,  // 64 * 32 = 2048
  mapHeight: MAP_HEIGHT_PX,
  tickRate: 20, // 20 Hz
};

/** 틱 간격 (ms) */
export const TICK_INTERVAL = 1000 / DEFAULT_GAME_CONFIG.tickRate; // 50ms

/** 플레이어 설정 */
export const PLAYER_CONFIG = {
  /** 기본 이동 속도 (px/s) */
  moveSpeed: 150,
  /** 달리기 속도 배율 */
  runSpeedMultiplier: 1.5,
  /** 플레이어 크기 (반지름) */
  radius: 16,
  /** 기본 최대 체력 */
  maxHp: 100,
} as const;

/** 렌더링 설정 */
export const RENDER_CONFIG = {
  /** 뷰포트 너비 */
  viewportWidth: 800,
  /** 뷰포트 높이 */
  viewportHeight: 600,
  /** 타겟 FPS */
  targetFPS: 60,
} as const;

/** 색상 상수 (디버그 모드) */
export const DEBUG_COLORS = {
  localPlayer: '#4488ff',
  otherPlayer: '#ff4444',
  deadPlayer: '#666666',
  background: '#1a1a2e',
  grid: '#2a2a3e',
  wall: '#444466',
  zone: 'rgba(255, 0, 0, 0.3)',
  zoneBorder: '#ff0000',
} as const;

/** 시야(FOV) 설정 */
export const FOV_CONFIG = {
  /** 시야각 (라디안) - 60도 = π/3 */
  fovAngle: Math.PI / 3,
  /** 시야 거리 (픽셀) */
  viewDistance: 500,
  /** 레이 개수 (시야 해상도) */
  rayCount: 120,
  /** 시야 밖 영역 어둡기 (0~1) */
  shadowOpacity: 0.5,
} as const;
