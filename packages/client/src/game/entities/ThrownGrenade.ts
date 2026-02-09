import type { ThrowableDef } from '@battle-royal/shared';

let nextGrenadeId = 0;

export function generateGrenadeId(): string {
  return `grenade-${nextGrenadeId++}`;
}

/**
 * 투척된 수류탄/연막탄 엔티티
 * 직선 이동 + 마찰 감속, fuseTime 후 폭발
 */
export class ThrownGrenade {
  id: string;
  ownerId: string;
  def: ThrowableDef;

  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;

  private spawnTime: number;
  private stopped = false;

  private static readonly FRICTION = 0.97;

  constructor(
    id: string,
    ownerId: string,
    def: ThrowableDef,
    x: number,
    y: number,
    angle: number
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this.def = def;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = Math.cos(angle) * def.projectileSpeed;
    this.vy = Math.sin(angle) * def.projectileSpeed;
    this.spawnTime = performance.now();
  }

  /** 벽 충돌 시 정지 */
  stop(): void {
    this.stopped = true;
    this.vx = 0;
    this.vy = 0;
  }

  /** 퓨즈 타이머 만료 여부 */
  shouldExplode(): boolean {
    return performance.now() - this.spawnTime >= this.def.fuseTime;
  }

  /** 퓨즈 진행률 (0~1) */
  getFuseProgress(): number {
    return Math.min(1, (performance.now() - this.spawnTime) / this.def.fuseTime);
  }

  /** 업데이트 (dt: ms) */
  update(dt: number): void {
    if (this.stopped) return;

    const dtSec = dt / 1000;
    this.prevX = this.x;
    this.prevY = this.y;

    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    // 마찰 감속
    this.vx *= ThrownGrenade.FRICTION;
    this.vy *= ThrownGrenade.FRICTION;

    // 거의 멈추면 완전 정지
    if (Math.abs(this.vx) < 1 && Math.abs(this.vy) < 1) {
      this.vx = 0;
      this.vy = 0;
    }
  }

  /** 보간 위치 */
  getInterpolatedPosition(alpha: number): { x: number; y: number } {
    return {
      x: this.prevX + (this.x - this.prevX) * alpha,
      y: this.prevY + (this.y - this.prevY) * alpha,
    };
  }
}
