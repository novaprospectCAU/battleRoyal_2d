import { ZONE_PHASES, ZONE_CONFIG, type ZonePhase } from '@battle-royal/shared';
import type { SnapshotZonePayload } from '@battle-royal/shared';

/** 자기장 상태 */
export type ZoneState = 'waiting' | 'shrinking' | 'finished';

/**
 * 자기장 시스템
 * 시간에 따라 안전 구역이 축소됩니다.
 */
export class Zone {
  // 맵 크기
  private mapWidth: number;
  private mapHeight: number;
  
  // 현재 자기장 (원형)
  private currentCenterX: number;
  private currentCenterY: number;
  private currentRadius: number;
  
  // 목표 자기장
  private targetCenterX: number;
  private targetCenterY: number;
  private targetRadius: number;
  
  // 축소 전 자기장 (보간용)
  private startCenterX: number;
  private startCenterY: number;
  private startRadius: number;
  
  // 페이즈 상태
  private currentPhase = 0;
  private state: ZoneState = 'waiting';
  private phaseStartTime = 0;
  
  // 현재 데미지
  private damagePerSecond = 0;
  private networkTimeRemainingMs: number | null = null;

  constructor(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    
    // 초기 자기장: 맵 전체
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    const radius = Math.max(mapWidth, mapHeight) * ZONE_CONFIG.initialSizeRatio;
    
    this.currentCenterX = centerX;
    this.currentCenterY = centerY;
    this.currentRadius = radius;
    
    this.targetCenterX = centerX;
    this.targetCenterY = centerY;
    this.targetRadius = radius;
    
    this.startCenterX = centerX;
    this.startCenterY = centerY;
    this.startRadius = radius;
    
    // 첫 페이즈 시작
    this.startPhase(0);
  }

  /** 페이즈 시작 */
  private startPhase(phaseIndex: number): void {
    if (phaseIndex >= ZONE_PHASES.length) {
      this.state = 'finished';
      return;
    }
    
    this.currentPhase = phaseIndex;
    this.state = 'waiting';
    this.phaseStartTime = performance.now();
    
    const phase = ZONE_PHASES[phaseIndex];
    this.damagePerSecond = phase.damagePerSecond;
    
    // 다음 목표 자기장 계산
    this.calculateNextTarget(phase);
  }

  /** 다음 목표 자기장 계산 */
  private calculateNextTarget(phase: ZonePhase): void {
    // 새 반지름 계산
    const baseRadius = Math.max(this.mapWidth, this.mapHeight);
    const newRadius = baseRadius * phase.sizeRatio;
    
    // 새 중심점 계산 (현재 원 안에서 랜덤)
    // 새 원이 현재 원 안에 들어가도록
    const maxOffset = Math.max(0, this.currentRadius - newRadius);
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * maxOffset * 0.7; // 70% 범위 내
    
    let newCenterX = this.currentCenterX + Math.cos(angle) * distance;
    let newCenterY = this.currentCenterY + Math.sin(angle) * distance;
    
    // 맵 경계 클램프
    newCenterX = Math.max(newRadius, Math.min(this.mapWidth - newRadius, newCenterX));
    newCenterY = Math.max(newRadius, Math.min(this.mapHeight - newRadius, newCenterY));
    
    this.targetCenterX = newCenterX;
    this.targetCenterY = newCenterY;
    this.targetRadius = newRadius;
  }

  /** 축소 시작 */
  private startShrinking(): void {
    this.state = 'shrinking';
    this.phaseStartTime = performance.now();
    
    // 현재 위치 저장 (보간용)
    this.startCenterX = this.currentCenterX;
    this.startCenterY = this.currentCenterY;
    this.startRadius = this.currentRadius;
  }

  /** 업데이트 */
  update(): void {
    this.networkTimeRemainingMs = null;
    if (this.state === 'finished') return;
    
    const now = performance.now();
    const phase = ZONE_PHASES[this.currentPhase];
    const elapsed = now - this.phaseStartTime;
    
    if (this.state === 'waiting') {
      // 대기 시간 끝나면 축소 시작
      if (elapsed >= phase.waitTime) {
        this.startShrinking();
      }
    } else if (this.state === 'shrinking') {
      // 축소 진행
      const progress = Math.min(1, elapsed / phase.shrinkTime);
      
      this.currentCenterX = this.startCenterX + (this.targetCenterX - this.startCenterX) * progress;
      this.currentCenterY = this.startCenterY + (this.targetCenterY - this.startCenterY) * progress;
      this.currentRadius = this.startRadius + (this.targetRadius - this.startRadius) * progress;
      
      // 축소 완료
      if (progress >= 1) {
        this.currentCenterX = this.targetCenterX;
        this.currentCenterY = this.targetCenterY;
        this.currentRadius = this.targetRadius;
        
        // 다음 페이즈
        this.startPhase(this.currentPhase + 1);
      }
    }
  }

  /** 서버 권위 자기장 상태 동기화 (멀티플레이) */
  syncFromNetwork(snapshot: SnapshotZonePayload): void {
    this.currentPhase = snapshot.currentPhase;
    this.state = snapshot.state;
    this.currentCenterX = snapshot.current.x;
    this.currentCenterY = snapshot.current.y;
    this.currentRadius = snapshot.current.radius;
    this.targetCenterX = snapshot.target.x;
    this.targetCenterY = snapshot.target.y;
    this.targetRadius = snapshot.target.radius;
    this.damagePerSecond = snapshot.damagePerSecond;
    this.networkTimeRemainingMs = Math.max(0, snapshot.timeRemaining);
  }

  /** 서버 동기화 타이머 감소 */
  tickNetworkTime(dt: number): void {
    if (this.networkTimeRemainingMs === null) return;
    this.networkTimeRemainingMs = Math.max(0, this.networkTimeRemainingMs - dt);
  }

  /** 위치가 안전 구역 안인지 체크 */
  isInSafeZone(x: number, y: number): boolean {
    const dx = x - this.currentCenterX;
    const dy = y - this.currentCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.currentRadius;
  }

  /** 현재 데미지/초 */
  getDamagePerSecond(): number {
    return this.damagePerSecond;
  }

  /** 현재 자기장 정보 */
  getCurrentZone(): { x: number; y: number; radius: number } {
    return {
      x: this.currentCenterX,
      y: this.currentCenterY,
      radius: this.currentRadius,
    };
  }

  /** 목표 자기장 정보 */
  getTargetZone(): { x: number; y: number; radius: number } {
    return {
      x: this.targetCenterX,
      y: this.targetCenterY,
      radius: this.targetRadius,
    };
  }

  /** 현재 페이즈 */
  getCurrentPhase(): number {
    return this.currentPhase;
  }

  /** 현재 상태 */
  getState(): ZoneState {
    return this.state;
  }

  /** 다음 상태까지 남은 시간 (ms) */
  getTimeRemaining(): number {
    if (this.networkTimeRemainingMs !== null) {
      return this.networkTimeRemainingMs;
    }
    if (this.state === 'finished') return 0;
    
    const phase = ZONE_PHASES[this.currentPhase];
    const elapsed = performance.now() - this.phaseStartTime;
    
    if (this.state === 'waiting') {
      return Math.max(0, phase.waitTime - elapsed);
    } else {
      return Math.max(0, phase.shrinkTime - elapsed);
    }
  }
}
