import {
  Vector2,
  PLAYER_CONFIG,
  ARMOR_TIERS,
  ARMOR_DISTANCE_WEIGHTS,
  getDistanceCategory,
  type Armor,
} from '@battle-royal/shared';

/**
 * 플레이어 엔티티
 */
export class Player {
  id: string;
  name: string;
  
  // 위치/속도
  x: number;
  y: number;
  velocityX = 0;
  velocityY = 0;
  rotation = 0;
  
  // 이전 상태 (보간용)
  private prevX: number;
  private prevY: number;
  private prevRotation = 0;
  
  // 상태
  hp: number;
  maxHp: number;
  isAlive = true;
  isLocalPlayer: boolean;
  isBot = false;

  // 방어구
  helmet: Armor | null = null;
  vest: Armor | null = null;
  boots: Armor | null = null;

  // 이동
  private moveX = 0;
  private moveY = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    isLocal: boolean = false
  ) {
    this.id = id;
    this.name = isLocal ? 'You' : `Player ${id.slice(0, 4)}`;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.hp = PLAYER_CONFIG.maxHp;
    this.maxHp = PLAYER_CONFIG.maxHp;
    this.isLocalPlayer = isLocal;
  }

  /** 이동 방향 설정 */
  setMovement(x: number, y: number): void {
    this.moveX = x;
    this.moveY = y;
  }

  /** 특정 위치를 바라보기 */
  lookAt(targetX: number, targetY: number): void {
    this.rotation = Math.atan2(targetY - this.y, targetX - this.x);
  }

  /** 상태 저장 (보간 전) */
  private saveState(): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevRotation = this.rotation;
  }

  /** 업데이트 (매 틱) */
  update(dt: number): void {
    if (!this.isAlive) return;
    
    // 이전 상태 저장
    this.saveState();
    
    // 이동 속도 계산
    const speed = PLAYER_CONFIG.moveSpeed;
    
    // 방향 정규화
    let dirX = this.moveX;
    let dirY = this.moveY;
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    
    if (length > 0) {
      dirX /= length;
      dirY /= length;
    }
    
    // 속도 설정
    this.velocityX = dirX * speed;
    this.velocityY = dirY * speed;
    
    // 위치 업데이트 (dt는 ms 단위)
    this.x += this.velocityX * (dt / 1000);
    this.y += this.velocityY * (dt / 1000);
  }

  /** 보간된 위치 가져오기 */
  getInterpolatedPosition(alpha: number): Vector2 {
    // 죽은 플레이어는 보간 없이 현재 위치 반환
    if (!this.isAlive) {
      return new Vector2(this.x, this.y);
    }
    return new Vector2(
      this.prevX + (this.x - this.prevX) * alpha,
      this.prevY + (this.y - this.prevY) * alpha
    );
  }

  /** 보간된 회전 가져오기 */
  getInterpolatedRotation(alpha: number): number {
    // 죽은 플레이어는 보간 없이 현재 회전 반환
    if (!this.isAlive) {
      return this.rotation;
    }
    
    // 각도 보간 (최단 경로)
    let diff = this.rotation - this.prevRotation;
    
    // -PI ~ PI 범위로 정규화
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    return this.prevRotation + diff * alpha;
  }

  /** 아머 적용 데미지 (총/수류탄용) */
  takeDamageWithArmor(rawDamage: number, distance: number = 0): number {
    const category = getDistanceCategory(distance);
    let totalReduction = 0;

    const slots: (Armor | null)[] = [this.helmet, this.vest, this.boots];
    for (const armor of slots) {
      if (!armor || armor.durability <= 0) continue;
      const tierConfig = ARMOR_TIERS[armor.tier];
      const weight = ARMOR_DISTANCE_WEIGHTS[armor.type][category];
      totalReduction += tierConfig.damageReduction * weight / 3;

      // 내구도 차감
      const durDmg = rawDamage * tierConfig.durabilityDamageRate;
      armor.durability = Math.max(0, armor.durability - durDmg);
    }

    // 파괴된 아머 제거
    if (this.helmet && this.helmet.durability <= 0) this.helmet = null;
    if (this.vest && this.vest.durability <= 0) this.vest = null;
    if (this.boots && this.boots.durability <= 0) this.boots = null;

    const finalDamage = Math.floor(rawDamage * (1 - totalReduction));
    this.takeDamage(finalDamage);
    return finalDamage;
  }

  /** 데미지 받기 */
  takeDamage(damage: number): void {
    this.hp = Math.max(0, this.hp - damage);
    
    if (this.hp === 0) {
      this.die();
    }
  }

  /** 사망 처리 */
  private die(): void {
    this.isAlive = false;
    this.velocityX = 0;
    this.velocityY = 0;
  }
}
