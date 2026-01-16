/** 탄약 종류 */
export type AmmoType = 'shotgun' | '4mm' | '5mm' | '7mm' | '9mm';

/** 무기 카테고리 */
export type WeaponCategory = 'shotgun' | 'smg' | 'rifle' | 'mg' | 'sr' | 'pistol';

/** 무기 슬롯 타입 */
export type WeaponSlot = 'primary' | 'secondary';

/** 발사 모드 */
export type FireMode = 'single' | 'burst' | 'auto';

/** 무기 정의 */
export interface WeaponDef {
  id: string;
  name: string;
  category: WeaponCategory;
  slot: WeaponSlot;
  ammoType: AmmoType;
  
  // 데미지
  baseDamage: number;
  
  // 사거리 (스윗스팟 시스템)
  minRange: number;
  sweetSpotStart: number;
  sweetSpotEnd: number;
  maxRange: number;
  
  // 배율
  closeRangeMultiplier: number;
  falloffRate: number;
  minDamageMultiplier: number;
  
  // 발사
  fireRate: number;  // 분당 발사 수 (RPM)
  fireMode: FireMode[];
  magazineSize: number;
  reloadTime: number;  // ms
  
  // 투사체
  projectileSpeed: number;  // px/s
  projectileCount: number;  // 샷건용
  spreadAngle: number;  // 라디안
  
  // 관통
  penetration: number;  // 0-3 (0: 없음, 1: 연질, 2: 중질, 3: 경질)
}

/** 투사체 */
export interface Projectile {
  id: string;
  ownerId: string;
  weaponId: string;
  
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  
  damage: number;
  penetration: number;
  speed: number;
  
  /** 이동한 거리 (스윗스팟 계산용) */
  distanceTraveled: number;
  /** 최대 사거리 */
  maxRange: number;
  
  /** 활성 상태 */
  isActive: boolean;
}
