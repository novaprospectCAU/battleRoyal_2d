import type { WeaponDef } from '../types/weapon.js';

/** 전체 무기 정의 (23종) */
export const WEAPONS: Record<string, WeaponDef> = {
  // ==========================================
  // === 권총 (5종, 4mm, secondary) ===
  // ==========================================
  'pistol_proto': {
    id: 'pistol_proto',
    name: '프로토타입',
    category: 'pistol',
    slot: 'secondary',
    ammoType: '4mm',

    baseDamage: 25,
    minRange: 0,
    sweetSpotStart: 30,
    sweetSpotEnd: 80,
    maxRange: 200,

    closeRangeMultiplier: 0.9,
    falloffRate: 0.4,
    minDamageMultiplier: 0.5,

    fireRate: 300,
    fireMode: ['single'],
    magazineSize: 8,
    reloadTime: 1500,

    projectileSpeed: 800,
    projectileCount: 1,
    spreadAngle: 0.02,

    penetration: 1,
  },

  'pistol_silenced': {
    id: 'pistol_silenced',
    name: '소음 권총',
    category: 'pistol',
    slot: 'secondary',
    ammoType: '4mm',

    baseDamage: 22,
    minRange: 0,
    sweetSpotStart: 30,
    sweetSpotEnd: 90,
    maxRange: 220,

    closeRangeMultiplier: 0.9,
    falloffRate: 0.35,
    minDamageMultiplier: 0.5,

    fireRate: 240,
    fireMode: ['single'],
    magazineSize: 12,
    reloadTime: 1800,

    projectileSpeed: 780,
    projectileCount: 1,
    spreadAngle: 0.015,

    penetration: 1,
  },

  'pistol_magnum': {
    id: 'pistol_magnum',
    name: '매그넘',
    category: 'pistol',
    slot: 'secondary',
    ammoType: '4mm',

    baseDamage: 55,
    minRange: 0,
    sweetSpotStart: 20,
    sweetSpotEnd: 60,
    maxRange: 160,

    closeRangeMultiplier: 0.95,
    falloffRate: 0.5,
    minDamageMultiplier: 0.4,

    fireRate: 120,
    fireMode: ['single'],
    magazineSize: 6,
    reloadTime: 2500,

    projectileSpeed: 850,
    projectileCount: 1,
    spreadAngle: 0.01,

    penetration: 2,
  },

  'pistol_machine': {
    id: 'pistol_machine',
    name: '기관 권총',
    category: 'pistol',
    slot: 'secondary',
    ammoType: '4mm',

    baseDamage: 12,
    minRange: 0,
    sweetSpotStart: 10,
    sweetSpotEnd: 40,
    maxRange: 120,

    closeRangeMultiplier: 1.0,
    falloffRate: 0.6,
    minDamageMultiplier: 0.3,

    fireRate: 900,
    fireMode: ['auto'],
    magazineSize: 12,
    reloadTime: 1200,

    projectileSpeed: 750,
    projectileCount: 1,
    spreadAngle: 0.08,

    penetration: 0,
  },

  'pistol_auto': {
    id: 'pistol_auto',
    name: '자동 권총',
    category: 'pistol',
    slot: 'secondary',
    ammoType: '4mm',

    baseDamage: 18,
    minRange: 0,
    sweetSpotStart: 15,
    sweetSpotEnd: 50,
    maxRange: 140,

    closeRangeMultiplier: 0.95,
    falloffRate: 0.5,
    minDamageMultiplier: 0.4,

    fireRate: 600,
    fireMode: ['burst', 'auto'],
    magazineSize: 12,
    reloadTime: 1500,

    projectileSpeed: 780,
    projectileCount: 1,
    spreadAngle: 0.05,

    penetration: 1,
    burstCount: 3,
    burstInterval: 75,
  },

  // ==========================================
  // === 샷건 (4종, shotgun) ===
  // ==========================================
  'shotgun_double': {
    id: 'shotgun_double',
    name: '더블배럴',
    category: 'shotgun',
    slot: 'primary',
    ammoType: 'shotgun',

    baseDamage: 20,
    minRange: 0,
    sweetSpotStart: 0,
    sweetSpotEnd: 40,
    maxRange: 120,

    closeRangeMultiplier: 1.0,
    falloffRate: 0.7,
    minDamageMultiplier: 0.2,

    fireRate: 80,
    fireMode: ['single'],
    magazineSize: 2,
    reloadTime: 2200,

    projectileSpeed: 650,
    projectileCount: 6,
    spreadAngle: 0.18,

    penetration: 0,
  },

  'shotgun_bullpup': {
    id: 'shotgun_bullpup',
    name: '불펍 샷건',
    category: 'shotgun',
    slot: 'primary',
    ammoType: 'shotgun',

    baseDamage: 12,
    minRange: 0,
    sweetSpotStart: 0,
    sweetSpotEnd: 60,
    maxRange: 160,

    closeRangeMultiplier: 1.0,
    falloffRate: 0.5,
    minDamageMultiplier: 0.25,

    fireRate: 150,
    fireMode: ['single'],
    magazineSize: 12,
    reloadTime: 2500,

    projectileSpeed: 680,
    projectileCount: 6,
    spreadAngle: 0.20,

    penetration: 0,
  },

  'shotgun_pump': {
    id: 'shotgun_pump',
    name: '펌프 샷건',
    category: 'shotgun',
    slot: 'primary',
    ammoType: 'shotgun',

    baseDamage: 15,
    minRange: 0,
    sweetSpotStart: 0,
    sweetSpotEnd: 50,
    maxRange: 150,

    closeRangeMultiplier: 1.0,
    falloffRate: 0.6,
    minDamageMultiplier: 0.2,

    fireRate: 60,
    fireMode: ['single'],
    magazineSize: 6,
    reloadTime: 500,

    projectileSpeed: 700,
    projectileCount: 8,
    spreadAngle: 0.15,

    penetration: 0,
  },

  'shotgun_short': {
    id: 'shotgun_short',
    name: '숏배럴',
    category: 'shotgun',
    slot: 'secondary',
    ammoType: 'shotgun',

    baseDamage: 10,
    minRange: 0,
    sweetSpotStart: 0,
    sweetSpotEnd: 30,
    maxRange: 100,

    closeRangeMultiplier: 1.0,
    falloffRate: 0.8,
    minDamageMultiplier: 0.2,

    fireRate: 180,
    fireMode: ['single'],
    magazineSize: 2,
    reloadTime: 800,

    projectileSpeed: 600,
    projectileCount: 4,
    spreadAngle: 0.25,

    penetration: 0,
  },

  // ==========================================
  // === SMG (3종) ===
  // ==========================================
  'smg_micro': {
    id: 'smg_micro',
    name: '마이크로 SMG',
    category: 'smg',
    slot: 'primary',
    ammoType: '5mm',

    baseDamage: 14,
    minRange: 0,
    sweetSpotStart: 20,
    sweetSpotEnd: 80,
    maxRange: 200,

    closeRangeMultiplier: 1.0,
    falloffRate: 0.5,
    minDamageMultiplier: 0.3,

    fireRate: 900,
    fireMode: ['auto'],
    magazineSize: 20,
    reloadTime: 1200,

    projectileSpeed: 900,
    projectileCount: 1,
    spreadAngle: 0.06,

    penetration: 1,
  },

  'smg_pipe': {
    id: 'smg_pipe',
    name: '파이프 SMG',
    category: 'smg',
    slot: 'primary',
    ammoType: '5mm',

    baseDamage: 18,
    minRange: 0,
    sweetSpotStart: 20,
    sweetSpotEnd: 100,
    maxRange: 240,

    closeRangeMultiplier: 0.95,
    falloffRate: 0.4,
    minDamageMultiplier: 0.35,

    fireRate: 700,
    fireMode: ['auto'],
    magazineSize: 30,
    reloadTime: 1800,

    projectileSpeed: 850,
    projectileCount: 1,
    spreadAngle: 0.04,

    penetration: 1,
  },

  'smg_mechanical': {
    id: 'smg_mechanical',
    name: '기계식 SMG',
    category: 'smg',
    slot: 'primary',
    ammoType: '7mm',

    baseDamage: 22,
    minRange: 0,
    sweetSpotStart: 30,
    sweetSpotEnd: 120,
    maxRange: 280,

    closeRangeMultiplier: 0.9,
    falloffRate: 0.35,
    minDamageMultiplier: 0.4,

    fireRate: 550,
    fireMode: ['auto'],
    magazineSize: 16,
    reloadTime: 1400,

    projectileSpeed: 800,
    projectileCount: 1,
    spreadAngle: 0.05,

    penetration: 1,
  },

  // ==========================================
  // === 라이플 (5종) ===
  // ==========================================
  'rifle_carbine': {
    id: 'rifle_carbine',
    name: '카빈',
    category: 'rifle',
    slot: 'primary',
    ammoType: '5mm',

    baseDamage: 38,
    minRange: 0,
    sweetSpotStart: 60,
    sweetSpotEnd: 160,
    maxRange: 350,

    closeRangeMultiplier: 0.8,
    falloffRate: 0.3,
    minDamageMultiplier: 0.4,

    fireRate: 240,
    fireMode: ['single'],
    magazineSize: 12,
    reloadTime: 1800,

    projectileSpeed: 950,
    projectileCount: 1,
    spreadAngle: 0.015,

    penetration: 2,
  },

  'rifle_assault': {
    id: 'rifle_assault',
    name: '돌격 소총',
    category: 'rifle',
    slot: 'primary',
    ammoType: '9mm',

    baseDamage: 35,
    minRange: 0,
    sweetSpotStart: 80,
    sweetSpotEnd: 180,
    maxRange: 400,

    closeRangeMultiplier: 0.8,
    falloffRate: 0.3,
    minDamageMultiplier: 0.4,

    fireRate: 600,
    fireMode: ['single', 'burst'],
    magazineSize: 30,
    reloadTime: 2000,

    projectileSpeed: 1000,
    projectileCount: 1,
    spreadAngle: 0.03,

    penetration: 2,
    burstCount: 3,
    burstInterval: 75,
  },

  'rifle_auto': {
    id: 'rifle_auto',
    name: '자동 소총',
    category: 'rifle',
    slot: 'primary',
    ammoType: '7mm',

    baseDamage: 32,
    minRange: 0,
    sweetSpotStart: 100,
    sweetSpotEnd: 220,
    maxRange: 450,

    closeRangeMultiplier: 0.75,
    falloffRate: 0.25,
    minDamageMultiplier: 0.4,

    fireRate: 650,
    fireMode: ['single', 'auto'],
    magazineSize: 28,
    reloadTime: 2000,

    projectileSpeed: 950,
    projectileCount: 1,
    spreadAngle: 0.035,

    penetration: 2,
  },

  'rifle_bullpup': {
    id: 'rifle_bullpup',
    name: '불펍 라이플',
    category: 'rifle',
    slot: 'primary',
    ammoType: '7mm',

    baseDamage: 34,
    minRange: 0,
    sweetSpotStart: 60,
    sweetSpotEnd: 160,
    maxRange: 360,

    closeRangeMultiplier: 0.85,
    falloffRate: 0.3,
    minDamageMultiplier: 0.4,

    fireRate: 500,
    fireMode: ['single', 'burst'],
    magazineSize: 28,
    reloadTime: 1600,

    projectileSpeed: 950,
    projectileCount: 1,
    spreadAngle: 0.025,

    penetration: 2,
    burstCount: 3,
    burstInterval: 75,
  },

  'rifle_dmr': {
    id: 'rifle_dmr',
    name: 'DMR',
    category: 'rifle',
    slot: 'primary',
    ammoType: '5mm',

    baseDamage: 40,
    minRange: 0,
    sweetSpotStart: 120,
    sweetSpotEnd: 260,
    maxRange: 500,

    closeRangeMultiplier: 0.7,
    falloffRate: 0.2,
    minDamageMultiplier: 0.45,

    fireRate: 300,
    fireMode: ['single', 'auto'],
    magazineSize: 34,
    reloadTime: 2500,

    projectileSpeed: 1000,
    projectileCount: 1,
    spreadAngle: 0.012,

    penetration: 2,
  },

  // ==========================================
  // === 기관총 (3종) ===
  // ==========================================
  'mg_medium': {
    id: 'mg_medium',
    name: '중기관총',
    category: 'mg',
    slot: 'primary',
    ammoType: '7mm',

    baseDamage: 28,
    minRange: 0,
    sweetSpotStart: 60,
    sweetSpotEnd: 180,
    maxRange: 380,

    closeRangeMultiplier: 0.85,
    falloffRate: 0.3,
    minDamageMultiplier: 0.35,

    fireRate: 750,
    fireMode: ['auto'],
    magazineSize: 80,
    reloadTime: 4500,

    projectileSpeed: 900,
    projectileCount: 1,
    spreadAngle: 0.05,

    penetration: 2,
  },

  'mg_support': {
    id: 'mg_support',
    name: '지원기관총',
    category: 'mg',
    slot: 'primary',
    ammoType: '9mm',

    baseDamage: 30,
    minRange: 0,
    sweetSpotStart: 80,
    sweetSpotEnd: 200,
    maxRange: 420,

    closeRangeMultiplier: 0.8,
    falloffRate: 0.25,
    minDamageMultiplier: 0.4,

    fireRate: 600,
    fireMode: ['auto'],
    magazineSize: 48,
    reloadTime: 3000,

    projectileSpeed: 920,
    projectileCount: 1,
    spreadAngle: 0.04,

    penetration: 2,
  },

  'mg_auto': {
    id: 'mg_auto',
    name: '자동기관총',
    category: 'mg',
    slot: 'primary',
    ammoType: '5mm',

    baseDamage: 26,
    minRange: 0,
    sweetSpotStart: 40,
    sweetSpotEnd: 150,
    maxRange: 320,

    closeRangeMultiplier: 0.9,
    falloffRate: 0.35,
    minDamageMultiplier: 0.3,

    fireRate: 850,
    fireMode: ['burst', 'auto'],
    magazineSize: 120,
    reloadTime: 5000,

    projectileSpeed: 880,
    projectileCount: 1,
    spreadAngle: 0.06,

    penetration: 2,
    burstCount: 4,
    burstInterval: 70,
  },

  // ==========================================
  // === 저격총 (3종) ===
  // ==========================================
  'sr_bolt': {
    id: 'sr_bolt',
    name: '볼트액션',
    category: 'sr',
    slot: 'primary',
    ammoType: '9mm',

    baseDamage: 90,
    minRange: 0,
    sweetSpotStart: 150,
    sweetSpotEnd: 300,
    maxRange: 600,

    closeRangeMultiplier: 0.6,
    falloffRate: 0.15,
    minDamageMultiplier: 0.5,

    fireRate: 30,
    fireMode: ['single'],
    magazineSize: 5,
    reloadTime: 3500,

    projectileSpeed: 1200,
    projectileCount: 1,
    spreadAngle: 0.005,

    penetration: 3,
  },

  'sr_antimaterial': {
    id: 'sr_antimaterial',
    name: '대물 저격총',
    category: 'sr',
    slot: 'primary',
    ammoType: '9mm',

    baseDamage: 130,
    minRange: 0,
    sweetSpotStart: 200,
    sweetSpotEnd: 400,
    maxRange: 700,

    closeRangeMultiplier: 0.5,
    falloffRate: 0.1,
    minDamageMultiplier: 0.5,

    fireRate: 15,
    fireMode: ['single'],
    magazineSize: 1,
    reloadTime: 4000,

    projectileSpeed: 1300,
    projectileCount: 1,
    spreadAngle: 0.003,

    penetration: 3,
  },

  'sr_hunting': {
    id: 'sr_hunting',
    name: '사냥 소총',
    category: 'sr',
    slot: 'primary',
    ammoType: '7mm',

    baseDamage: 65,
    minRange: 0,
    sweetSpotStart: 120,
    sweetSpotEnd: 250,
    maxRange: 500,

    closeRangeMultiplier: 0.65,
    falloffRate: 0.2,
    minDamageMultiplier: 0.45,

    fireRate: 50,
    fireMode: ['single'],
    magazineSize: 6,
    reloadTime: 2000,

    projectileSpeed: 1100,
    projectileCount: 1,
    spreadAngle: 0.008,

    penetration: 3,
  },
};

/** 기본 무기 ID */
export const DEFAULT_WEAPON_ID = 'pistol_proto';

/** 난이도별 봇 무기 풀 */
export const BOT_WEAPON_POOLS: Record<string, string[]> = {
  easy: ['pistol_proto', 'smg_micro', 'shotgun_pump'],
  normal: ['rifle_assault', 'smg_pipe', 'shotgun_bullpup', 'sr_hunting'],
  hard: ['rifle_dmr', 'sr_bolt', 'mg_support', 'rifle_bullpup'],
};

/** 투사체 설정 */
export const PROJECTILE_CONFIG = {
  /** 투사체 크기 (반지름) */
  radius: 4,
  /** 투사체 색상 (디버그) */
  color: '#ffcc00',
  /** 최대 투사체 수 */
  maxProjectiles: 200,
} as const;
