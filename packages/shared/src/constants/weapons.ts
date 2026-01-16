import type { WeaponDef } from '../types/weapon.js';

/** 기본 무기 정의 (테스트용 간단 버전) */
export const WEAPONS: Record<string, WeaponDef> = {
  // === 부무기 (권총) ===
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
    
    fireRate: 300,  // RPM
    fireMode: ['single'],
    magazineSize: 8,
    reloadTime: 1500,
    
    projectileSpeed: 800,
    projectileCount: 1,
    spreadAngle: 0.02,
    
    penetration: 1,
  },

  // === 주무기 (소총) ===
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
    fireMode: ['single', 'auto'],
    magazineSize: 30,
    reloadTime: 2000,
    
    projectileSpeed: 1000,
    projectileCount: 1,
    spreadAngle: 0.03,
    
    penetration: 2,
  },

  // === 주무기 (샷건) ===
  'shotgun_pump': {
    id: 'shotgun_pump',
    name: '펌프 샷건',
    category: 'shotgun',
    slot: 'primary',
    ammoType: 'shotgun',
    
    baseDamage: 15,  // 탄환당 (8발 = 120)
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
    reloadTime: 500,  // 탄 하나당
    
    projectileSpeed: 700,
    projectileCount: 8,
    spreadAngle: 0.15,
    
    penetration: 0,
  },
};

/** 기본 무기 ID */
export const DEFAULT_WEAPON_ID = 'pistol_proto';

/** 투사체 설정 */
export const PROJECTILE_CONFIG = {
  /** 투사체 크기 (반지름) */
  radius: 4,
  /** 투사체 색상 (디버그) */
  color: '#ffcc00',
  /** 최대 투사체 수 */
  maxProjectiles: 200,
} as const;
