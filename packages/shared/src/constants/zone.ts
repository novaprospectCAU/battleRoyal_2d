/**
 * 자기장 페이즈 정의
 */
export interface ZonePhase {
  /** 페이즈 번호 (0부터) */
  phase: number;
  /** 대기 시간 (ms) */
  waitTime: number;
  /** 축소 시간 (ms) */
  shrinkTime: number;
  /** 축소 후 맵 크기 비율 (0~1) */
  sizeRatio: number;
  /** 구역 밖 데미지/초 */
  damagePerSecond: number;
}

/** 자기장 페이즈 데이터 (128×128 대형 맵 기준) */
export const ZONE_PHASES: ZonePhase[] = [
  { phase: 0, waitTime: 40000, shrinkTime: 12000, sizeRatio: 0.75, damagePerSecond: 0.5 },
  { phase: 1, waitTime: 30000, shrinkTime: 10000, sizeRatio: 0.55, damagePerSecond: 1.0 },
  { phase: 2, waitTime: 25000, shrinkTime: 8000,  sizeRatio: 0.38, damagePerSecond: 1.8 },
  { phase: 3, waitTime: 20000, shrinkTime: 7000,  sizeRatio: 0.25, damagePerSecond: 2.8 },
  { phase: 4, waitTime: 16000, shrinkTime: 6000,  sizeRatio: 0.16, damagePerSecond: 4.0 },
  { phase: 5, waitTime: 12000, shrinkTime: 5000,  sizeRatio: 0.10, damagePerSecond: 6.0 },
  { phase: 6, waitTime: 10000, shrinkTime: 4000,  sizeRatio: 0.06, damagePerSecond: 8.5 },
  { phase: 7, waitTime: 8000,  shrinkTime: 3000,  sizeRatio: 0.04, damagePerSecond: 12.0 },
  { phase: 8, waitTime: 6000,  shrinkTime: 2000,  sizeRatio: 0.02, damagePerSecond: 16.0 },
  { phase: 9, waitTime: 4000,  shrinkTime: 1500,  sizeRatio: 0.01, damagePerSecond: 22.0 },
];

/** 자기장 설정 */
export const ZONE_CONFIG = {
  /** 초기 안전 구역 크기 비율 */
  initialSizeRatio: 1.0,
  /** 자기장 테두리 두께 */
  borderWidth: 4,
  /** 자기장 색상 */
  zoneColor: 'rgba(255, 80, 80, 0.3)',
  zoneBorderColor: '#ff4444',
  /** 안전 구역 테두리 색상 */
  safeZoneColor: 'rgba(255, 255, 255, 0.1)',
  safeZoneBorderColor: '#ffffff',
  /** 다음 구역 색상 */
  nextZoneColor: 'rgba(255, 255, 255, 0.05)',
  nextZoneBorderColor: 'rgba(255, 255, 255, 0.5)',
} as const;
