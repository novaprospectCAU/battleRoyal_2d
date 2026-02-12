import {
  BotState,
  BotDifficulty,
  BOT_DIFFICULTY_CONFIGS,
  AI_CONFIG,
  PLAYER_CONFIG,
  WEAPONS,
  ITEM_SPAWN_CONFIG,
  ARMOR_ITEMS,
  ARMOR_TIERS,
  type WeaponDef,
  type GroundItem,
  type Armor,
} from '@battle-royal/shared';
import { Player } from '../entities/Player';
import { TileMap } from '../world/TileMap';

/**
 * 봇 AI 컨트롤러
 * 각 봇 플레이어에 연결되어 AI 로직을 처리
 * 인벤토리 관리, 아이템 루팅, 회복, 탄약 관리 포함
 */
export class BotAI {
  private player: Player;
  private difficulty: BotDifficulty;
  private state: BotState = BotState.IDLE;

  // 타이밍
  private lastStateUpdate = 0;
  private lastFireTime = 0;
  private burstCount = 0;
  private lastBurstTime = 0;

  // 타겟
  private targetPlayer: Player | null = null;

  // 순찰
  private patrolTargetX = 0;
  private patrolTargetY = 0;
  private idleEndTime = 0;

  // 자기장 정보
  private zoneCenter = { x: 0, y: 0 };
  private zoneRadius = 0;

  // 끼임 감지
  private lastPositionX = 0;
  private lastPositionY = 0;
  private stuckTimer = 0;
  private stuckEscapeAngle = 0;

  // === 봇 인벤토리 ===
  private weapon: WeaponDef | null = null;
  private ammoInMagazine = 0;
  private ammoReserve: Map<string, number> = new Map();
  private healingItems = 0;

  // 방어구
  private helmet: Armor | null = null;
  private vest: Armor | null = null;
  private boots: Armor | null = null;

  // 재장전
  private isReloading = false;
  private reloadEndTime = 0;

  // 회복
  private isHealing = false;
  private healEndTime = 0;

  // 루팅 대상
  private lootTarget: GroundItem | null = null;

  constructor(player: Player, difficulty: BotDifficulty = BotDifficulty.NORMAL) {
    this.player = player;
    this.player.isBot = true;
    this.difficulty = difficulty;

    const diffLabel = difficulty === BotDifficulty.EASY ? '[E]' :
                      difficulty === BotDifficulty.HARD ? '[H]' : '';
    this.player.name = `Bot${diffLabel} ${player.id.slice(0, 4)}`;
  }

  /** 설정 가져오기 */
  private get config() {
    return BOT_DIFFICULTY_CONFIGS[this.difficulty];
  }

  /** 자기장 정보 업데이트 */
  updateZoneInfo(centerX: number, centerY: number, radius: number, _isShrinking: boolean): void {
    this.zoneCenter.x = centerX;
    this.zoneCenter.y = centerY;
    this.zoneRadius = radius;
  }

  /** 메인 업데이트 (매 게임 틱 호출) */
  update(
    dt: number,
    tileMap: TileMap,
    players: Map<string, Player>,
    localPlayer: Player,
    groundItems: GroundItem[]
  ): { wantsFire: boolean; targetAngle: number } {
    if (!this.player.isAlive) {
      return { wantsFire: false, targetAngle: 0 };
    }

    const now = performance.now();

    // 재장전 완료 체크
    if (this.isReloading && now >= this.reloadEndTime) {
      this.completeReload();
    }

    // 회복 업데이트
    this.updateHeal();

    // 탄창 비면 자동 재장전
    if (this.weapon && !this.isReloading && this.ammoInMagazine <= 0) {
      this.tryReload();
    }

    // 상태 업데이트 (일정 간격마다)
    if (now - this.lastStateUpdate >= AI_CONFIG.stateUpdateInterval) {
      this.updateState(players, localPlayer, tileMap, groundItems);
      this.lastStateUpdate = now;
    }

    // 행동 실행
    return this.executeState(dt, tileMap, players, localPlayer, now);
  }

  /** 상태 결정 */
  private updateState(
    players: Map<string, Player>,
    localPlayer: Player,
    tileMap: TileMap,
    groundItems: GroundItem[]
  ): void {
    const prevState = this.state;

    // 1. 자기장 체크 (최우선)
    if (this.shouldFleeZone()) {
      if (this.isHealing) this.cancelHeal();
      this.lootTarget = null;
      this.state = BotState.ZONE_FLEE;
      if (prevState !== this.state) this.onStateChange(prevState, this.state);
      return;
    }

    // 2. 회복 중이면 계속 유지 (적 근접 시 중단)
    if (this.isHealing) {
      const nearEnemy = this.findVisibleEnemy(players, localPlayer, tileMap);
      if (nearEnemy && this.distanceTo(nearEnemy.x, nearEnemy.y) < 200) {
        this.cancelHeal();
        this.targetPlayer = nearEnemy;
        this.state = BotState.FLEE;
      } else {
        this.state = BotState.HEAL;
      }
      if (prevState !== this.state) this.onStateChange(prevState, this.state);
      return;
    }

    // 3. 무기 없음 → 루팅 필수
    if (!this.weapon) {
      this.lootTarget = this.findBestLootTarget(groundItems);
      this.state = this.lootTarget ? BotState.LOOT : BotState.PATROL;
      if (prevState !== this.state) this.onStateChange(prevState, this.state);
      return;
    }

    // 4. 적 탐지
    const visibleEnemy = this.findVisibleEnemy(players, localPlayer, tileMap);
    const totalAmmo = this.ammoInMagazine + (this.ammoReserve.get(this.weapon.ammoType) ?? 0);

    if (visibleEnemy) {
      this.targetPlayer = visibleEnemy;
      const dist = this.distanceTo(visibleEnemy.x, visibleEnemy.y);

      // 체력 낮으면 도주
      const healthRatio = this.player.hp / this.player.maxHp;
      if (healthRatio <= this.config.fleeHealthRatio) {
        this.state = BotState.FLEE;
        if (prevState !== this.state) this.onStateChange(prevState, this.state);
        return;
      }

      if (totalAmmo > 0) {
        // 탄약 있음 → 전투
        if (dist <= AI_CONFIG.combat.maxFireDistance && dist >= AI_CONFIG.combat.minFireDistance) {
          this.state = BotState.ATTACK;
        } else if (dist < AI_CONFIG.combat.minFireDistance) {
          this.state = BotState.FLEE;
        } else {
          this.state = BotState.CHASE;
        }
      } else {
        // 탄약 없음 → 근접이면 도주, 아니면 루팅
        if (dist < 200) {
          this.state = BotState.FLEE;
        } else {
          this.lootTarget = this.findBestLootTarget(groundItems);
          this.state = this.lootTarget ? BotState.LOOT : BotState.FLEE;
        }
      }
    } else {
      // 적 없음
      this.targetPlayer = null;

      // 체력 낮고 치료 아이템 있으면 → 회복
      const healthRatio = this.player.hp / this.player.maxHp;
      if (healthRatio < 0.6 && this.healingItems > 0) {
        this.state = BotState.HEAL;
        if (prevState !== this.state) this.onStateChange(prevState, this.state);
        return;
      }

      // 루팅 필요하면 → 루팅
      if (this.needsLoot()) {
        this.lootTarget = this.findBestLootTarget(groundItems);
        if (this.lootTarget) {
          this.state = BotState.LOOT;
          if (prevState !== this.state) this.onStateChange(prevState, this.state);
          return;
        }
      }

      // 기본: 순찰/대기
      if (this.state === BotState.CHASE || this.state === BotState.ATTACK || this.state === BotState.LOOT) {
        this.state = BotState.IDLE;
      } else if (this.state === BotState.IDLE && performance.now() > this.idleEndTime) {
        this.state = BotState.PATROL;
      }
    }

    if (prevState !== this.state) {
      this.onStateChange(prevState, this.state);
    }
  }

  /** 상태 변경 시 초기화 */
  private onStateChange(_from: BotState, to: BotState): void {
    if (to === BotState.IDLE) {
      const { idleTimeMin, idleTimeMax } = AI_CONFIG.patrol;
      const idleTime = idleTimeMin + Math.random() * (idleTimeMax - idleTimeMin);
      this.idleEndTime = performance.now() + idleTime;
    } else if (to === BotState.PATROL) {
      this.setRandomPatrolTarget();
    }
  }

  /** 행동 실행 */
  private executeState(
    _dt: number,
    tileMap: TileMap,
    _players: Map<string, Player>,
    _localPlayer: Player,
    now: number
  ): { wantsFire: boolean; targetAngle: number } {
    let wantsFire = false;
    let targetAngle = this.player.rotation;

    switch (this.state) {
      case BotState.IDLE:
        this.player.setMovement(0, 0);
        targetAngle = this.player.rotation + 0.02;
        break;

      case BotState.PATROL:
        this.moveToward(this.patrolTargetX, this.patrolTargetY, tileMap);
        targetAngle = Math.atan2(
          this.patrolTargetY - this.player.y,
          this.patrolTargetX - this.player.x
        );
        if (this.distanceTo(this.patrolTargetX, this.patrolTargetY) < AI_CONFIG.patrol.arrivalDistance) {
          this.state = BotState.IDLE;
          this.onStateChange(BotState.PATROL, BotState.IDLE);
        }
        break;

      case BotState.CHASE:
        if (this.targetPlayer && this.targetPlayer.isAlive) {
          this.moveToward(this.targetPlayer.x, this.targetPlayer.y, tileMap);
          targetAngle = Math.atan2(
            this.targetPlayer.y - this.player.y,
            this.targetPlayer.x - this.player.x
          );
        } else {
          this.state = BotState.IDLE;
        }
        break;

      case BotState.ATTACK:
        if (this.targetPlayer && this.targetPlayer.isAlive) {
          const aimAngle = Math.atan2(
            this.targetPlayer.y - this.player.y,
            this.targetPlayer.x - this.player.x
          );
          const inaccuracy = (1 - this.config.aimAccuracy) * 0.3;
          targetAngle = aimAngle + (Math.random() - 0.5) * inaccuracy;

          const hasLoS = this.hasLineOfSight(
            this.player.x, this.player.y,
            this.targetPlayer.x, this.targetPlayer.y,
            tileMap
          );

          if (hasLoS) {
            wantsFire = this.shouldFire(now);
          } else {
            this.state = BotState.CHASE;
          }

          // 회피 동작
          const strafeDir = Math.sin(now / 500) * 0.5;
          const perpAngle = aimAngle + Math.PI / 2;
          this.player.setMovement(
            Math.cos(perpAngle) * strafeDir,
            Math.sin(perpAngle) * strafeDir
          );
        } else {
          this.state = BotState.IDLE;
        }
        break;

      case BotState.FLEE:
        if (this.targetPlayer) {
          const fleeAngle = Math.atan2(
            this.player.y - this.targetPlayer.y,
            this.player.x - this.targetPlayer.x
          );
          this.moveInDirection(fleeAngle, tileMap);
        } else {
          this.state = BotState.IDLE;
        }
        break;

      case BotState.ZONE_FLEE:
        this.moveToward(this.zoneCenter.x, this.zoneCenter.y, tileMap);
        if (!this.shouldFleeZone()) {
          this.state = BotState.IDLE;
        }
        break;

      case BotState.LOOT:
        if (this.lootTarget && this.lootTarget.isActive) {
          const dist = this.distanceTo(this.lootTarget.x, this.lootTarget.y);
          if (dist < ITEM_SPAWN_CONFIG.pickupRadius) {
            this.pickupGroundItem(this.lootTarget);
            this.lootTarget = null;
          } else {
            this.moveToward(this.lootTarget.x, this.lootTarget.y, tileMap);
            targetAngle = Math.atan2(
              this.lootTarget.y - this.player.y,
              this.lootTarget.x - this.player.x
            );
          }
        } else {
          this.lootTarget = null;
          this.state = BotState.IDLE;
        }
        break;

      case BotState.HEAL:
        this.player.setMovement(0, 0);
        if (!this.isHealing) {
          this.startHeal();
        }
        break;
    }

    // 회전 적용
    this.player.rotation = targetAngle;

    return { wantsFire, targetAngle };
  }

  // ==================== 사격 / 탄약 ====================

  /** 사격 여부 결정 (탄약 관리 포함) */
  private shouldFire(now: number): boolean {
    if (!this.weapon) return false;
    if (!this.targetPlayer || !this.targetPlayer.isAlive) return false;
    if (this.isReloading || this.isHealing) return false;

    // 탄창 비었으면 재장전 시도
    if (this.ammoInMagazine <= 0) {
      this.tryReload();
      return false;
    }

    // 버스트 쿨다운
    if (this.burstCount >= AI_CONFIG.combat.burstCount) {
      if (now - this.lastBurstTime < AI_CONFIG.combat.burstCooldown) {
        return false;
      }
      this.burstCount = 0;
    }

    // 발사 간격 (무기 RPM 기반)
    const baseInterval = 60000 / this.weapon.fireRate;
    const fireInterval = baseInterval * this.config.fireRateMultiplier;
    if (now - this.lastFireTime >= fireInterval) {
      this.lastFireTime = now;
      this.burstCount++;
      if (this.burstCount >= AI_CONFIG.combat.burstCount) {
        this.lastBurstTime = now;
      }
      // 탄약 소모
      this.ammoInMagazine--;
      return true;
    }

    return false;
  }

  /** 재장전 시작 */
  private tryReload(): void {
    if (this.isReloading || !this.weapon) return;
    const reserve = this.ammoReserve.get(this.weapon.ammoType) ?? 0;
    if (reserve <= 0) return;

    this.isReloading = true;
    this.reloadEndTime = performance.now() + (this.weapon.reloadTime ?? 1500);
  }

  /** 재장전 완료 */
  private completeReload(): void {
    if (!this.weapon) { this.isReloading = false; return; }
    this.isReloading = false;
    const reserve = this.ammoReserve.get(this.weapon.ammoType) ?? 0;
    const needed = this.weapon.magazineSize - this.ammoInMagazine;
    const toLoad = Math.min(needed, reserve);
    this.ammoInMagazine += toLoad;
    this.ammoReserve.set(this.weapon.ammoType, reserve - toLoad);
  }

  // ==================== 회복 ====================

  /** 회복 시작 */
  private startHeal(): void {
    if (this.isHealing || this.healingItems <= 0) return;
    if (this.player.hp >= this.player.maxHp) return;
    this.isHealing = true;
    this.healEndTime = performance.now() + 3000; // 구급상자 3초
    this.healingItems--;
  }

  /** 회복 업데이트 */
  private updateHeal(): void {
    if (!this.isHealing) return;
    if (performance.now() >= this.healEndTime) {
      this.isHealing = false;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
    }
  }

  /** 회복 취소 */
  private cancelHeal(): void {
    if (!this.isHealing) return;
    this.isHealing = false;
    // 취소 시 아이템 반환 (사용 안 된 것으로)
    this.healingItems++;
  }

  // ==================== 루팅 ====================

  /** 루팅 필요 여부 */
  private needsLoot(): boolean {
    if (!this.weapon) return true;
    const totalAmmo = this.ammoInMagazine + (this.ammoReserve.get(this.weapon.ammoType) ?? 0);
    if (totalAmmo < this.weapon.magazineSize * 2) return true;
    const healthRatio = this.player.hp / this.player.maxHp;
    if (healthRatio < 0.7 && this.healingItems < 2) return true;
    if (!this.helmet || !this.vest || !this.boots) return true;
    return false;
  }

  /** 최적 루팅 대상 찾기 */
  private findBestLootTarget(groundItems: GroundItem[]): GroundItem | null {
    const searchRadius = !this.weapon ? 500 : 300;
    let bestItem: GroundItem | null = null;
    let bestScore = -1;

    for (const item of groundItems) {
      if (!item.isActive) continue;
      const dist = this.distanceTo(item.x, item.y);
      if (dist > searchRadius) continue;

      let priority = 0;

      switch (item.kind) {
        case 'weapon': {
          if (!this.weapon) {
            priority = 100; // 무기 없음 → 최우선
          } else {
            const totalAmmo = this.ammoInMagazine + (this.ammoReserve.get(this.weapon.ammoType) ?? 0);
            if (totalAmmo <= 0) {
              // 현재 무기 탄약 0 → 다른 무기라도 줍기
              const otherWeapon = WEAPONS[item.itemId];
              if (otherWeapon) {
                const otherAmmo = this.ammoReserve.get(otherWeapon.ammoType) ?? 0;
                priority = otherAmmo > 0 ? 80 : 50; // 해당 탄약 있으면 우선
              }
            }
          }
          break;
        }
        case 'ammo': {
          if (this.weapon && item.itemId === this.weapon.ammoType) {
            const totalAmmo = this.ammoInMagazine + (this.ammoReserve.get(this.weapon.ammoType) ?? 0);
            if (totalAmmo <= 0) {
              priority = 95; // 탄약 0 → 매칭 탄약 최우선
            } else if (totalAmmo < this.weapon.magazineSize * 3) {
              priority = 70; // 탄약 부족 → 추가 확보
            }
          }
          break;
        }
        case 'healing': {
          const healthRatio = this.player.hp / this.player.maxHp;
          if (healthRatio < 0.7 && this.healingItems < 3) {
            priority = 50;
          }
          break;
        }
        case 'armor': {
          const armorDef = ARMOR_ITEMS[item.itemId];
          if (!armorDef) break;
          const slotKey = armorDef.type as 'helmet' | 'vest' | 'boots';
          const current = this[slotKey];
          if (!current) {
            priority = 60; // 빈 슬롯
          } else if (armorDef.tier < current.tier) {
            priority = 45; // 상위 티어
          }
          break;
        }
      }

      if (priority <= 0) continue;

      // 점수 = 우선도 - 거리 패널티
      const score = priority - dist / 10;
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestItem;
  }

  /** 바닥 아이템 줍기 */
  private pickupGroundItem(item: GroundItem): void {
    switch (item.kind) {
      case 'weapon': {
        const weaponDef = WEAPONS[item.itemId];
        if (!weaponDef) return;
        this.weapon = weaponDef;
        this.ammoInMagazine = 0; // 새 무기는 탄창 비어있음
        this.isReloading = false;
        // 보유 탄약으로 즉시 재장전 시도
        this.tryReload();
        break;
      }
      case 'ammo': {
        const current = this.ammoReserve.get(item.itemId) ?? 0;
        this.ammoReserve.set(item.itemId, current + item.quantity);
        // 탄창 비어있으면 자동 재장전
        if (this.weapon && this.weapon.ammoType === item.itemId && this.ammoInMagazine <= 0 && !this.isReloading) {
          this.tryReload();
        }
        break;
      }
      case 'healing': {
        this.healingItems = Math.min(this.healingItems + item.quantity, 3);
        break;
      }
      case 'armor': {
        const armorDef = ARMOR_ITEMS[item.itemId];
        if (!armorDef) return;
        const tierConfig = ARMOR_TIERS[armorDef.tier];
        const newArmor: Armor = {
          type: armorDef.type,
          tier: armorDef.tier,
          durability: tierConfig.maxDurability,
          maxDurability: tierConfig.maxDurability,
        };
        const slotKey = armorDef.type as 'helmet' | 'vest' | 'boots';
        const current = this[slotKey];
        if (!current || armorDef.tier < current.tier) {
          this[slotKey] = newArmor;
          // Player 엔티티에도 동기화 (데미지 계산에 필요)
          this.player[slotKey] = newArmor;
        }
        break;
      }
    }
    item.isActive = false;
  }

  // ==================== 이동 / 탐지 ====================

  /** 자기장 회피 필요 여부 */
  private shouldFleeZone(): boolean {
    const distToCenter = this.distanceTo(this.zoneCenter.x, this.zoneCenter.y);
    const safeRadius = this.zoneRadius - AI_CONFIG.zone.safeMargin;
    return distToCenter > safeRadius;
  }

  /** 두 점 사이에 시야가 있는지 확인 (벽 체크) */
  private hasLineOfSight(
    fromX: number, fromY: number,
    toX: number, toY: number,
    tileMap: TileMap
  ): boolean {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return true;

    const stepSize = 8;
    const steps = Math.ceil(distance / stepSize);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = fromX + stepX * i;
      const checkY = fromY + stepY * i;
      if (tileMap.blocksVision(checkX, checkY)) {
        return false;
      }
    }
    return true;
  }

  /** 시야 내 적 탐지 */
  private findVisibleEnemy(
    players: Map<string, Player>,
    localPlayer: Player,
    tileMap: TileMap
  ): Player | null {
    let closestEnemy: Player | null = null;
    let closestDist = this.config.visionRange;

    const allTargets = [localPlayer, ...players.values()];

    for (const target of allTargets) {
      if (target.id === this.player.id) continue;
      if (!target.isAlive) continue;

      const dist = this.distanceTo(target.x, target.y);
      if (dist > this.config.visionRange) continue;

      // 전투 중에는 시야각 적용
      if (this.state === BotState.CHASE || this.state === BotState.ATTACK) {
        const angleToTarget = Math.atan2(
          target.y - this.player.y,
          target.x - this.player.x
        );
        let angleDiff = Math.abs(angleToTarget - this.player.rotation);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        if (angleDiff > this.config.visionAngle / 2) continue;
      }

      if (!this.hasLineOfSight(this.player.x, this.player.y, target.x, target.y, tileMap)) {
        continue;
      }

      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = target;
      }
    }

    return closestEnemy;
  }

  /** 목표 지점으로 이동 */
  private moveToward(targetX: number, targetY: number, tileMap: TileMap): void {
    const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    this.moveInDirection(angle, tileMap);
  }

  /** 특정 방향으로 이동 (벽 회피 강화) */
  private moveInDirection(angle: number, tileMap: TileMap): void {
    const checkDist = PLAYER_CONFIG.radius + 20;

    // 끼임 감지
    const movedDist = Math.sqrt(
      (this.player.x - this.lastPositionX) ** 2 +
      (this.player.y - this.lastPositionY) ** 2
    );
    if (movedDist < 2) {
      this.stuckTimer++;
    } else {
      this.stuckTimer = 0;
    }
    this.lastPositionX = this.player.x;
    this.lastPositionY = this.player.y;

    // 심하게 끼인 경우: 랜덤 방향 탈출
    if (this.stuckTimer > 20) {
      if (this.stuckTimer % 20 === 1) {
        this.stuckEscapeAngle = Math.random() * Math.PI * 2;
      }
      const mx = Math.cos(this.stuckEscapeAngle) * this.config.moveSpeedMultiplier;
      const my = Math.sin(this.stuckEscapeAngle) * this.config.moveSpeedMultiplier;
      this.player.setMovement(mx, my);
      if (this.stuckTimer > 60) {
        this.stuckTimer = 0;
      }
      return;
    }

    // 직진 가능하면 그대로 이동
    const nextX = this.player.x + Math.cos(angle) * checkDist;
    const nextY = this.player.y + Math.sin(angle) * checkDist;

    if (tileMap.isWalkable(nextX, nextY)) {
      const mx = Math.cos(angle) * this.config.moveSpeedMultiplier;
      const my = Math.sin(angle) * this.config.moveSpeedMultiplier;
      this.player.setMovement(mx, my);
      return;
    }

    // 벽에 막힘 → 여러 각도 시도
    const offsets = [
      Math.PI / 6, -Math.PI / 6,
      Math.PI / 3, -Math.PI / 3,
      Math.PI / 2, -Math.PI / 2,
      Math.PI * 2 / 3, -Math.PI * 2 / 3,
      Math.PI * 5 / 6, -Math.PI * 5 / 6,
      Math.PI,
    ];

    for (const offset of offsets) {
      const tryAngle = angle + offset;
      const tx = this.player.x + Math.cos(tryAngle) * checkDist;
      const ty = this.player.y + Math.sin(tryAngle) * checkDist;
      if (tileMap.isWalkable(tx, ty)) {
        const mx = Math.cos(tryAngle) * this.config.moveSpeedMultiplier;
        const my = Math.sin(tryAngle) * this.config.moveSpeedMultiplier;
        this.player.setMovement(mx, my);
        return;
      }
    }

    // 모든 방향이 막힘 → 정지
    this.player.setMovement(0, 0);
  }

  /** 랜덤 순찰 목표 설정 */
  private setRandomPatrolTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * AI_CONFIG.patrol.patrolRadius;
    this.patrolTargetX = this.player.x + Math.cos(angle) * dist;
    this.patrolTargetY = this.player.y + Math.sin(angle) * dist;
  }

  /** 거리 계산 */
  private distanceTo(x: number, y: number): number {
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 현재 상태 가져오기 */
  getState(): BotState {
    return this.state;
  }

  /** 타겟 플레이어 가져오기 */
  getTarget(): Player | null {
    return this.targetPlayer;
  }

  /** 봇 무기 ID 가져오기 */
  getWeaponId(): string {
    return this.weapon?.id ?? '';
  }
}
