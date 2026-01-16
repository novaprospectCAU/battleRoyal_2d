import {
  BotState,
  BotDifficulty,
  BOT_DIFFICULTY_CONFIGS,
  AI_CONFIG,
  PLAYER_CONFIG,
} from '@battle-royal/shared';
import { Player } from '../entities/Player';
import { TileMap } from '../world/TileMap';

/**
 * 봇 AI 컨트롤러
 * 각 봇 플레이어에 연결되어 AI 로직을 처리
 */
export class BotAI {
  private player: Player;
  private difficulty: BotDifficulty;
  private state: BotState = BotState.IDLE;
  
  // 타이밍
  private lastStateUpdate = 0;
  private stateStartTime = 0;
  private lastFireTime = 0;
  private burstCount = 0;
  private lastBurstTime = 0;
  
  // 타겟
  private targetPlayer: Player | null = null;
  private targetX = 0;
  private targetY = 0;
  
  // 순찰
  private patrolTargetX = 0;
  private patrolTargetY = 0;
  private idleEndTime = 0;
  
  // 자기장 정보 (외부에서 업데이트)
  private zoneCenter = { x: 0, y: 0 };
  private zoneRadius = 0;
  private isZoneShrinking = false;
  
  constructor(player: Player, difficulty: BotDifficulty = BotDifficulty.NORMAL) {
    this.player = player;
    this.player.isBot = true;
    this.difficulty = difficulty;
    
    // 봇 이름 설정
    const diffLabel = difficulty === BotDifficulty.EASY ? '[E]' : 
                      difficulty === BotDifficulty.HARD ? '[H]' : '';
    this.player.name = `Bot${diffLabel} ${player.id.slice(0, 4)}`;
  }
  
  /** 설정 가져오기 */
  private get config() {
    return BOT_DIFFICULTY_CONFIGS[this.difficulty];
  }
  
  /** 자기장 정보 업데이트 */
  updateZoneInfo(centerX: number, centerY: number, radius: number, isShrinking: boolean): void {
    this.zoneCenter.x = centerX;
    this.zoneCenter.y = centerY;
    this.zoneRadius = radius;
    this.isZoneShrinking = isShrinking;
  }
  
  /** 메인 업데이트 (매 게임 틱 호출) */
  update(
    dt: number,
    tileMap: TileMap,
    players: Map<string, Player>,
    localPlayer: Player
  ): { wantsFire: boolean; targetAngle: number } {
    if (!this.player.isAlive) {
      return { wantsFire: false, targetAngle: 0 };
    }
    
    const now = performance.now();
    
    // 상태 업데이트 (일정 간격마다)
    if (now - this.lastStateUpdate >= AI_CONFIG.stateUpdateInterval) {
      this.updateState(players, localPlayer, tileMap);
      this.lastStateUpdate = now;
    }
    
    // 행동 실행
    return this.executeState(dt, tileMap, players, localPlayer, now);
  }
  
  /** 상태 결정 */
  private updateState(
    players: Map<string, Player>,
    localPlayer: Player,
    tileMap: TileMap
  ): void {
    const prevState = this.state;

    // 1. 자기장 체크 (최우선)
    if (this.shouldFleeZone()) {
      this.state = BotState.ZONE_FLEE;
      if (prevState !== BotState.ZONE_FLEE) {
        this.onStateChange(prevState, this.state);
      }
      return;
    }

    // 2. 도주 체크 (체력 낮음)
    const healthRatio = this.player.hp / this.player.maxHp;
    if (healthRatio <= this.config.fleeHealthRatio && this.targetPlayer) {
      this.state = BotState.FLEE;
      if (prevState !== BotState.FLEE) {
        this.onStateChange(prevState, this.state);
      }
      return;
    }

    // 3. 적 탐지
    const visibleEnemy = this.findVisibleEnemy(players, localPlayer, tileMap);
    
    if (visibleEnemy) {
      this.targetPlayer = visibleEnemy;
      const dist = this.distanceTo(visibleEnemy.x, visibleEnemy.y);
      
      if (dist <= AI_CONFIG.combat.maxFireDistance && dist >= AI_CONFIG.combat.minFireDistance) {
        this.state = BotState.ATTACK;
      } else if (dist < AI_CONFIG.combat.minFireDistance) {
        // 너무 가까우면 뒤로 물러남
        this.state = BotState.FLEE;
      } else {
        this.state = BotState.CHASE;
      }
    } else {
      // 적 없음 - 순찰 또는 대기
      this.targetPlayer = null;
      
      if (this.state === BotState.CHASE || this.state === BotState.ATTACK) {
        // 추적/공격 중이었다면 대기로 전환
        this.state = BotState.IDLE;
      } else if (this.state === BotState.IDLE && performance.now() > this.idleEndTime) {
        // 대기 시간 끝 - 순찰로 전환
        this.state = BotState.PATROL;
      }
    }
    
    if (prevState !== this.state) {
      this.onStateChange(prevState, this.state);
    }
  }
  
  /** 상태 변경 시 초기화 */
  private onStateChange(from: BotState, to: BotState): void {
    this.stateStartTime = performance.now();
    
    if (to === BotState.IDLE) {
      // 대기 시간 설정
      const { idleTimeMin, idleTimeMax } = AI_CONFIG.patrol;
      const idleTime = idleTimeMin + Math.random() * (idleTimeMax - idleTimeMin);
      this.idleEndTime = performance.now() + idleTime;
    } else if (to === BotState.PATROL) {
      // 순찰 목표 설정
      this.setRandomPatrolTarget();
    }
  }
  
  /** 행동 실행 */
  private executeState(
    dt: number,
    tileMap: TileMap,
    players: Map<string, Player>,
    localPlayer: Player,
    now: number
  ): { wantsFire: boolean; targetAngle: number } {
    let wantsFire = false;
    let targetAngle = this.player.rotation;
    
    switch (this.state) {
      case BotState.IDLE:
        // 가만히 있으면서 주변 둘러보기
        this.player.setMovement(0, 0);
        // 천천히 회전 (주변 감시)
        targetAngle = this.player.rotation + 0.02;
        break;
        
      case BotState.PATROL:
        // 순찰 이동
        this.moveToward(this.patrolTargetX, this.patrolTargetY, tileMap);
        
        // 이동 방향 바라보기
        targetAngle = Math.atan2(
          this.patrolTargetY - this.player.y,
          this.patrolTargetX - this.player.x
        );
        
        // 목표 도달 확인
        if (this.distanceTo(this.patrolTargetX, this.patrolTargetY) < AI_CONFIG.patrol.arrivalDistance) {
          this.state = BotState.IDLE;
          this.onStateChange(BotState.PATROL, BotState.IDLE);
        }
        break;
        
      case BotState.CHASE:
        // 적 추적
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
        // 공격
        if (this.targetPlayer && this.targetPlayer.isAlive) {
          // 조준
          const aimAngle = Math.atan2(
            this.targetPlayer.y - this.player.y,
            this.targetPlayer.x - this.player.x
          );

          // 정확도에 따른 조준 오차
          const inaccuracy = (1 - this.config.aimAccuracy) * 0.3;
          targetAngle = aimAngle + (Math.random() - 0.5) * inaccuracy;

          // 사격 결정 (벽 뒤면 사격 안함)
          const hasLoS = this.hasLineOfSight(
            this.player.x,
            this.player.y,
            this.targetPlayer.x,
            this.targetPlayer.y,
            tileMap
          );

          if (hasLoS) {
            wantsFire = this.shouldFire(now);
          } else {
            // 시야가 막히면 추적 상태로 전환
            this.state = BotState.CHASE;
          }

          // 약간 움직이기 (회피 동작)
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
        // 도주 (적 반대 방향)
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
        // 자기장 회피 (안전 구역 중심으로)
        this.moveToward(this.zoneCenter.x, this.zoneCenter.y, tileMap);
        
        // 안전 구역 안이면 다른 상태로 전환
        if (!this.shouldFleeZone()) {
          this.state = BotState.IDLE;
        }
        break;
    }
    
    // 회전 적용
    this.player.rotation = targetAngle;
    
    return { wantsFire, targetAngle };
  }
  
  /** 사격 여부 결정 */
  private shouldFire(now: number): boolean {
    // 타겟이 없으면 사격 안함
    if (!this.targetPlayer || !this.targetPlayer.isAlive) {
      return false;
    }
    
    // 버스트 쿨다운 체크
    if (this.burstCount >= AI_CONFIG.combat.burstCount) {
      if (now - this.lastBurstTime < AI_CONFIG.combat.burstCooldown) {
        return false;
      }
      this.burstCount = 0;
    }
    
    // 사격 간격 (기본 무기 기준 약 300ms * 배율)
    const fireInterval = 300 * this.config.fireRateMultiplier;
    if (now - this.lastFireTime >= fireInterval) {
      this.lastFireTime = now;
      this.burstCount++;
      if (this.burstCount >= AI_CONFIG.combat.burstCount) {
        this.lastBurstTime = now;
      }
      return true;
    }
    
    return false;
  }
  
  /** 자기장 회피 필요 여부 */
  private shouldFleeZone(): boolean {
    const distToCenter = this.distanceTo(this.zoneCenter.x, this.zoneCenter.y);
    const safeRadius = this.zoneRadius - AI_CONFIG.zone.safeMargin;
    
    // 자기장 밖이거나 가장자리에 있으면 회피
    return distToCenter > safeRadius;
  }
  
  /** 두 점 사이에 시야가 있는지 확인 (벽 체크) */
  private hasLineOfSight(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    tileMap: TileMap
  ): boolean {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return true;

    // 8px 간격으로 레이캐스트
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

    // 모든 플레이어 체크 (localPlayer + 다른 봇들)
    const allTargets = [localPlayer, ...players.values()];

    for (const target of allTargets) {
      // 자기 자신, 죽은 플레이어 제외
      if (target.id === this.player.id) continue;
      if (!target.isAlive) continue;

      const dist = this.distanceTo(target.x, target.y);

      // 시야 범위 체크
      if (dist > this.config.visionRange) continue;

      // 시야각 체크 (IDLE/PATROL 상태에서는 360도 감지)
      if (this.state === BotState.CHASE || this.state === BotState.ATTACK) {
        const angleToTarget = Math.atan2(
          target.y - this.player.y,
          target.x - this.player.x
        );
        let angleDiff = Math.abs(angleToTarget - this.player.rotation);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // 전투 중에는 시야각 적용
        if (angleDiff > this.config.visionAngle / 2) continue;
      }
      // IDLE/PATROL에서는 360도 감지 (주변 인식)

      // 벽 뒤 적은 탐지 불가 (Line of Sight 체크)
      if (!this.hasLineOfSight(this.player.x, this.player.y, target.x, target.y, tileMap)) {
        continue;
      }

      // 가장 가까운 적 선택
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
  
  /** 특정 방향으로 이동 */
  private moveInDirection(angle: number, tileMap: TileMap): void {
    let moveX = Math.cos(angle);
    let moveY = Math.sin(angle);
    
    // 벽 회피 (간단한 방식)
    const checkDist = PLAYER_CONFIG.radius + 20;
    const nextX = this.player.x + moveX * checkDist;
    const nextY = this.player.y + moveY * checkDist;
    
    if (!tileMap.isWalkable(nextX, nextY)) {
      // 벽이 있으면 좌우로 회피 시도
      const leftAngle = angle - Math.PI / 4;
      const rightAngle = angle + Math.PI / 4;
      
      const leftX = this.player.x + Math.cos(leftAngle) * checkDist;
      const leftY = this.player.y + Math.sin(leftAngle) * checkDist;
      
      const rightX = this.player.x + Math.cos(rightAngle) * checkDist;
      const rightY = this.player.y + Math.sin(rightAngle) * checkDist;
      
      if (tileMap.isWalkable(leftX, leftY)) {
        moveX = Math.cos(leftAngle);
        moveY = Math.sin(leftAngle);
      } else if (tileMap.isWalkable(rightX, rightY)) {
        moveX = Math.cos(rightAngle);
        moveY = Math.sin(rightAngle);
      } else {
        // 둘 다 막혀있으면 정지
        moveX = 0;
        moveY = 0;
      }
    }
    
    // 난이도별 속도 조절
    moveX *= this.config.moveSpeedMultiplier;
    moveY *= this.config.moveSpeedMultiplier;
    
    this.player.setMovement(moveX, moveY);
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
  
  /** 현재 상태 가져오기 (디버그용) */
  getState(): BotState {
    return this.state;
  }
  
  /** 타겟 플레이어 가져오기 (디버그용) */
  getTarget(): Player | null {
    return this.targetPlayer;
  }
}
