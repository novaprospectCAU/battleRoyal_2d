/**
 * 사용 아이템 타입
 */
export enum UsableItemType {
  /** 즉시 체력 회복 */
  HEALTH_KIT = 'health_kit',
  /** 지속 회복 게이지 충전 */
  HEAL_OVER_TIME = 'heal_over_time',
}

/**
 * 사용 아이템 정의
 */
export interface UsableItemDef {
  id: string;
  name: string;
  type: UsableItemType;
  
  /** 사용 시간 (ms) */
  useTime: number;
  
  /** 효과량 */
  amount: number;
  
  /** 최대 보유 수량 */
  maxStack: number;
  
  /** 아이콘 색상 (디버그용) */
  color: string;
}

/** 사용 아이템 데이터 */
export const USABLE_ITEMS: Record<string, UsableItemDef> = {
  'health_kit': {
    id: 'health_kit',
    name: '구급상자',
    type: UsableItemType.HEALTH_KIT,
    useTime: 3000, // 3초
    amount: 50, // 50 HP 회복
    maxStack: 3,
    color: '#ff6666', // 붉은색
  },
  'heal_over_time': {
    id: 'heal_over_time',
    name: '진통제',
    type: UsableItemType.HEAL_OVER_TIME,
    useTime: 4000, // 4초
    amount: 50, // 지속회복 50 충전
    maxStack: 3,
    color: '#ffee88', // 밝은 노란색
  },
};

// === 투척 무기 ===

export enum ThrowableType {
  GRENADE = 'grenade',
  SMOKE_GRENADE = 'smoke_grenade',
}

export interface ThrowableDef {
  id: string;
  name: string;
  type: ThrowableType;
  /** 수류탄 데미지 */
  damage: number;
  /** 폭발 반경 (px) */
  explosionRadius: number;
  /** 투사체 속도 (px/s) */
  projectileSpeed: number;
  /** 퓨즈 시간 (ms, 투척 후 폭발까지) */
  fuseTime: number;
  /** 최대 스택 */
  maxStack: number;
  /** 아이콘 색상 */
  color: string;
}

// === 바닥 아이템 ===

export type GroundItemKind = 'weapon' | 'ammo' | 'healing' | 'throwable' | 'armor';

export interface GroundItem {
  id: string;
  x: number;
  y: number;
  kind: GroundItemKind;
  /** weapon ID / ammo type / item ID / throwable ID */
  itemId: string;
  quantity: number;
  isActive: boolean;
}

/** 지속 회복 설정 */
export const HEAL_OVER_TIME_CONFIG = {
  /** 최대 게이지 */
  maxGauge: 100,
  /** 초당 회복량 */
  healPerSecond: 2,
  /** 초당 게이지 소모량 */
  gaugePerSecond: 4,
} as const;
