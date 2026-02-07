import { describe, it, expect } from 'vitest';
import {
  circleCircle,
  rectRect,
  circleRect,
  pointInCircle,
  pointInRect,
  resolveCircleCircle,
} from '../collision.js';

describe('circleCircle', () => {
  it('detects overlapping circles', () => {
    expect(circleCircle(0, 0, 10, 15, 0, 10)).toBe(true);
  });

  it('detects non-overlapping circles', () => {
    expect(circleCircle(0, 0, 5, 20, 0, 5)).toBe(false);
  });

  it('returns false for touching circles (exclusive boundary)', () => {
    // distSq === radiusSum^2 → not less than, so false
    expect(circleCircle(0, 0, 5, 10, 0, 5)).toBe(false);
  });

  it('detects concentric circles', () => {
    expect(circleCircle(5, 5, 10, 5, 5, 3)).toBe(true);
  });
});

describe('rectRect', () => {
  it('detects overlapping rectangles', () => {
    expect(rectRect(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true);
  });

  it('detects non-overlapping rectangles', () => {
    expect(rectRect(0, 0, 10, 10, 20, 20, 10, 10)).toBe(false);
  });

  it('returns false for edge-touching rectangles', () => {
    // x1 + w1 === x2 → !(10 > 10) → false
    expect(rectRect(0, 0, 10, 10, 10, 0, 10, 10)).toBe(false);
  });

  it('detects contained rectangle', () => {
    expect(rectRect(0, 0, 20, 20, 5, 5, 5, 5)).toBe(true);
  });
});

describe('circleRect', () => {
  it('detects circle overlapping rectangle', () => {
    expect(circleRect(5, 5, 10, 0, 0, 10, 10)).toBe(true);
  });

  it('detects no overlap', () => {
    expect(circleRect(50, 50, 5, 0, 0, 10, 10)).toBe(false);
  });

  it('detects circle center inside rectangle', () => {
    expect(circleRect(5, 5, 1, 0, 0, 20, 20)).toBe(true);
  });

  it('detects circle near corner', () => {
    // Circle at (12, 12) with radius 5, rect at (0,0) size 10x10
    // Closest point on rect: (10, 10), distance = sqrt(8) ≈ 2.83 < 5
    expect(circleRect(12, 12, 5, 0, 0, 10, 10)).toBe(true);
  });

  it('rejects circle far from corner', () => {
    // Circle at (20, 20) with radius 3, rect at (0,0) size 10x10
    // Closest point on rect: (10, 10), distance = sqrt(200) ≈ 14.14 > 3
    expect(circleRect(20, 20, 3, 0, 0, 10, 10)).toBe(false);
  });
});

describe('pointInCircle', () => {
  it('detects point inside circle', () => {
    expect(pointInCircle(5, 5, 5, 5, 10)).toBe(true);
  });

  it('detects point outside circle', () => {
    expect(pointInCircle(20, 20, 5, 5, 5)).toBe(false);
  });

  it('returns false for point on boundary (exclusive)', () => {
    expect(pointInCircle(10, 0, 0, 0, 10)).toBe(false);
  });
});

describe('pointInRect', () => {
  it('detects point inside rectangle', () => {
    expect(pointInRect(5, 5, 0, 0, 10, 10)).toBe(true);
  });

  it('detects point outside rectangle', () => {
    expect(pointInRect(15, 15, 0, 0, 10, 10)).toBe(false);
  });

  it('includes left/top edge, excludes right/bottom edge', () => {
    expect(pointInRect(0, 0, 0, 0, 10, 10)).toBe(true);   // top-left corner
    expect(pointInRect(10, 10, 0, 0, 10, 10)).toBe(false); // bottom-right corner
  });
});

describe('resolveCircleCircle', () => {
  it('returns null when circles do not overlap', () => {
    expect(resolveCircleCircle(0, 0, 5, 20, 0, 5)).toBeNull();
  });

  it('returns push vector when circles overlap', () => {
    const result = resolveCircleCircle(0, 0, 10, 15, 0, 10);
    expect(result).not.toBeNull();
    expect(result!.x).toBeGreaterThan(0); // pushed in +x direction
    expect(result!.y).toBe(0); // no y displacement
  });

  it('handles coincident circles', () => {
    const result = resolveCircleCircle(5, 5, 3, 5, 5, 3);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(6); // radiusSum pushed in arbitrary +x direction
    expect(result!.y).toBe(0);
  });
});
