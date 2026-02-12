import type { Armor } from '../types/player.js';

/** 아머 부위 타입 */
export type ArmorType = Armor['type'];

/** 티어별 설정 */
export const ARMOR_TIERS: Record<1 | 2 | 3, {
  damageReduction: number;
  durabilityDamageRate: number;
  maxDurability: number;
}> = {
  1: { damageReduction: 0.50, durabilityDamageRate: 0.05, maxDurability: 100 },
  2: { damageReduction: 0.33, durabilityDamageRate: 0.10, maxDurability: 80 },
  3: { damageReduction: 0.20, durabilityDamageRate: 0.20, maxDurability: 60 },
};

/** 거리 구간 (px) */
export const ARMOR_DISTANCE_THRESHOLDS = {
  close: 200,
  medium: 500,
  long: 900,
} as const;

/** 거리 카테고리 */
export type DistanceCategory = 'close' | 'medium' | 'long' | 'veryLong';

/** 부위별 거리 가중치 — 높을수록 해당 거리에서 보호 효과가 큼 */
export const ARMOR_DISTANCE_WEIGHTS: Record<ArmorType, Record<DistanceCategory, number>> = {
  helmet: { close: 0.25, medium: 0.25, long: 0.90, veryLong: 1.00 },
  vest:   { close: 0.90, medium: 0.80, long: 0.75, veryLong: 0.50 },
  boots:  { close: 0.60, medium: 0.60, long: 0.50, veryLong: 0.60 },
};

/** 아머 아이템 정의 */
export interface ArmorItemDef {
  type: ArmorType;
  tier: 1 | 2 | 3;
  name: string;
}

/** 아머 아이템 풀 (9종 = 3부위 × 3티어) */
export const ARMOR_ITEMS: Record<string, ArmorItemDef> = {
  'helmet_t1': { type: 'helmet', tier: 1, name: '1급 헬멧' },
  'helmet_t2': { type: 'helmet', tier: 2, name: '2급 헬멧' },
  'helmet_t3': { type: 'helmet', tier: 3, name: '3급 헬멧' },
  'vest_t1':   { type: 'vest',   tier: 1, name: '1급 방탄복' },
  'vest_t2':   { type: 'vest',   tier: 2, name: '2급 방탄복' },
  'vest_t3':   { type: 'vest',   tier: 3, name: '3급 방탄복' },
  'boots_t1':  { type: 'boots',  tier: 1, name: '1급 방탄화' },
  'boots_t2':  { type: 'boots',  tier: 2, name: '2급 방탄화' },
  'boots_t3':  { type: 'boots',  tier: 3, name: '3급 방탄화' },
};

/** 티어 스폰 가중치 */
export const ARMOR_TIER_WEIGHTS: Record<1 | 2 | 3, number> = { 1: 50, 2: 35, 3: 15 };

/** 거리 → 카테고리 변환 */
export function getDistanceCategory(distance: number): DistanceCategory {
  if (distance < ARMOR_DISTANCE_THRESHOLDS.close) return 'close';
  if (distance < ARMOR_DISTANCE_THRESHOLDS.medium) return 'medium';
  if (distance < ARMOR_DISTANCE_THRESHOLDS.long) return 'long';
  return 'veryLong';
}
