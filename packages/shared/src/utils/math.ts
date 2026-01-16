/** 2D 벡터 클래스 */
export class Vector2 {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  /** 복제 */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** 더하기 */
  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  /** 빼기 */
  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  /** 스칼라 곱 */
  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  /** 길이 */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 길이의 제곱 (성능 최적화용) */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** 정규화 */
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return this.scale(1 / len);
  }

  /** 값 설정 */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** 선형 보간 */
  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return new Vector2(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }

  /** 두 점 사이 거리 */
  static distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 두 점 사이 거리의 제곱 */
  static distanceSquared(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  /** 두 점 사이 각도 (라디안) */
  static angle(from: Vector2, to: Vector2): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }
}

/** 값 클램핑 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 각도 정규화 (0 ~ 2PI) */
export function normalizeAngle(angle: number): number {
  const TWO_PI = Math.PI * 2;
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/** 랜덤 정수 (min 이상 max 미만) */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/** 랜덤 실수 (min 이상 max 미만) */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
