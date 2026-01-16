import { 
  type Projectile as ProjectileData,
  type WeaponDef,
  PROJECTILE_CONFIG,
} from '@battle-royal/shared';

/**
 * 투사체 엔티티
 */
export class Projectile implements ProjectileData {
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
  
  distanceTraveled: number;
  maxRange: number;
  
  isActive: boolean;

  // 이전 위치 (보간용)
  private prevX: number;
  private prevY: number;

  constructor(
    id: string,
    ownerId: string,
    weapon: WeaponDef,
    x: number,
    y: number,
    angle: number,
    spreadOffset: number = 0
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this.weaponId = weapon.id;
    
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    
    // 스프레드 적용
    const finalAngle = angle + spreadOffset;
    this.rotation = finalAngle;
    
    this.speed = weapon.projectileSpeed;
    this.velocityX = Math.cos(finalAngle) * this.speed;
    this.velocityY = Math.sin(finalAngle) * this.speed;
    
    this.damage = weapon.baseDamage;
    this.penetration = weapon.penetration;
    this.maxRange = weapon.maxRange;
    this.distanceTraveled = 0;
    
    this.isActive = true;
  }

  /** 상태 저장 (보간용) */
  saveState(): void {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  /** 업데이트 */
  update(dt: number): void {
    if (!this.isActive) return;
    
    this.saveState();
    
    // 이동
    const dtSec = dt / 1000;
    const dx = this.velocityX * dtSec;
    const dy = this.velocityY * dtSec;
    
    this.x += dx;
    this.y += dy;
    
    // 이동 거리 누적 (데미지 계산용, 범위 제한 없음 - 벽 충돌시에만 소멸)
    this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
  }

  /** 보간된 위치 */
  getInterpolatedPosition(alpha: number): { x: number; y: number } {
    return {
      x: this.prevX + (this.x - this.prevX) * alpha,
      y: this.prevY + (this.y - this.prevY) * alpha,
    };
  }

  /** 비활성화 */
  deactivate(): void {
    this.isActive = false;
  }

  /** 현재 거리 기반 데미지 배율 계산 */
  getDamageMultiplier(weapon: WeaponDef): number {
    const distance = this.distanceTraveled;
    
    if (distance < weapon.minRange) {
      return weapon.closeRangeMultiplier;
    }
    if (distance >= weapon.sweetSpotStart && distance <= weapon.sweetSpotEnd) {
      return 1.0; // 스윗스팟
    }
    if (distance > weapon.sweetSpotEnd && distance <= weapon.maxRange) {
      const falloff = (distance - weapon.sweetSpotEnd) / (weapon.maxRange - weapon.sweetSpotEnd);
      return Math.max(weapon.minDamageMultiplier, 1.0 - falloff * weapon.falloffRate);
    }
    return weapon.minDamageMultiplier;
  }
}

/** 투사체 ID 생성 */
let projectileIdCounter = 0;
export function generateProjectileId(): string {
  return `proj_${Date.now()}_${projectileIdCounter++}`;
}
