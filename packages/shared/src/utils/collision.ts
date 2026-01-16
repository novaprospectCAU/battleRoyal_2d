import { Vector2 } from './math.js';

/** 원-원 충돌 */
export function circleCircle(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distSq < radiusSum * radiusSum;
}

/** 사각형-사각형 충돌 (AABB) */
export function rectRect(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return (
    x1 < x2 + w2 &&
    x1 + w1 > x2 &&
    y1 < y2 + h2 &&
    y1 + h1 > y2
  );
}

/** 원-사각형 충돌 */
export function circleRect(
  cx: number, cy: number, radius: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  // 원의 중심에서 가장 가까운 사각형 위의 점 찾기
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  
  const dx = cx - closestX;
  const dy = cy - closestY;
  
  return (dx * dx + dy * dy) < (radius * radius);
}

/** 점이 원 안에 있는지 */
export function pointInCircle(
  px: number, py: number,
  cx: number, cy: number, radius: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return (dx * dx + dy * dy) < (radius * radius);
}

/** 점이 사각형 안에 있는지 */
export function pointInRect(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}

/** 원-원 충돌 후 밀어내기 벡터 계산 */
export function resolveCircleCircle(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): Vector2 | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  
  if (distSq >= radiusSum * radiusSum) {
    return null; // 충돌 없음
  }
  
  const dist = Math.sqrt(distSq);
  if (dist === 0) {
    // 같은 위치: 임의 방향으로 밀어내기
    return new Vector2(radiusSum, 0);
  }
  
  const overlap = radiusSum - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  
  return new Vector2(nx * overlap, ny * overlap);
}
