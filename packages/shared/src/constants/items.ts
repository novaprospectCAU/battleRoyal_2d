import { ThrowableType, type ThrowableDef } from '../types/item.js';

/** 투척 무기 정의 */
export const THROWABLES: Record<string, ThrowableDef> = {
  'grenade': {
    id: 'grenade',
    name: '수류탄',
    type: ThrowableType.GRENADE,
    damage: 100,
    explosionRadius: 96,
    projectileSpeed: 500,
    fuseTime: 3000,
    maxStack: 3,
    color: '#44aa44',
  },
  'smoke_grenade': {
    id: 'smoke_grenade',
    name: '연막탄',
    type: ThrowableType.SMOKE_GRENADE,
    damage: 0,
    explosionRadius: 128,
    projectileSpeed: 450,
    fuseTime: 2000,
    maxStack: 2,
    color: '#888888',
  },
};

/** 아이템 스폰 설정 */
export const ITEM_SPAWN_CONFIG = {
  /** FLOOR 타일당 스폰 확률 (실내: 벽 인접) */
  spawnChance: 0.18,
  /** 실외 FLOOR 타일 스폰 확률 배율 (거의 안 뜸) */
  outdoorMultiplier: 0.03,
  /** 아이템 줍기 반경 (px) */
  pickupRadius: 48,
} as const;

/** 스폰 가중치 (합계 100) */
export const SPAWN_WEIGHTS = {
  weapon: 30,
  ammo: 35,
  healing: 25,
  throwable: 10,
} as const;

/** 스폰 무기 풀 (전체 23종) */
export const SPAWN_WEAPON_POOL: string[] = [
  'pistol_proto', 'pistol_silenced', 'pistol_magnum', 'pistol_machine', 'pistol_auto',
  'shotgun_double', 'shotgun_bullpup', 'shotgun_pump', 'shotgun_short',
  'smg_micro', 'smg_pipe', 'smg_mechanical',
  'rifle_carbine', 'rifle_assault', 'rifle_auto', 'rifle_bullpup', 'rifle_dmr',
  'mg_medium', 'mg_support', 'mg_auto',
  'sr_bolt', 'sr_antimaterial', 'sr_hunting',
];

/** 탄약별 드랍 수량 범위 [min, max] */
export const SPAWN_AMMO_RANGES: Record<string, [number, number]> = {
  '4mm': [8, 20],
  '5mm': [15, 30],
  '7mm': [10, 20],
  '9mm': [20, 40],
  'shotgun': [4, 10],
};
