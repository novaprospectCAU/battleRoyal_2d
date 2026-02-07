import { describe, it, expect } from 'vitest';
import { Vector2, clamp, normalizeAngle, randomInt, randomFloat } from '../math.js';

describe('Vector2', () => {
  describe('constructor', () => {
    it('defaults to (0, 0)', () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('accepts x, y', () => {
      const v = new Vector2(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('clone', () => {
    it('returns a new vector with same values', () => {
      const v = new Vector2(1, 2);
      const c = v.clone();
      expect(c.x).toBe(1);
      expect(c.y).toBe(2);
      expect(c).not.toBe(v);
    });
  });

  describe('add', () => {
    it('adds two vectors', () => {
      const a = new Vector2(1, 2);
      const b = new Vector2(3, 4);
      const result = a.add(b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });
  });

  describe('sub', () => {
    it('subtracts two vectors', () => {
      const a = new Vector2(5, 7);
      const b = new Vector2(2, 3);
      const result = a.sub(b);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });
  });

  describe('scale', () => {
    it('multiplies by scalar', () => {
      const v = new Vector2(3, 4);
      const result = v.scale(2);
      expect(result.x).toBe(6);
      expect(result.y).toBe(8);
    });
  });

  describe('length', () => {
    it('returns magnitude', () => {
      const v = new Vector2(3, 4);
      expect(v.length()).toBe(5);
    });

    it('returns 0 for zero vector', () => {
      const v = new Vector2(0, 0);
      expect(v.length()).toBe(0);
    });
  });

  describe('lengthSquared', () => {
    it('returns squared magnitude', () => {
      const v = new Vector2(3, 4);
      expect(v.lengthSquared()).toBe(25);
    });
  });

  describe('normalize', () => {
    it('returns unit vector', () => {
      const v = new Vector2(3, 4);
      const n = v.normalize();
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
      expect(n.length()).toBeCloseTo(1);
    });

    it('returns zero vector for zero input', () => {
      const v = new Vector2(0, 0);
      const n = v.normalize();
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
    });
  });

  describe('set', () => {
    it('updates x and y in place', () => {
      const v = new Vector2(0, 0);
      const result = v.set(5, 10);
      expect(v.x).toBe(5);
      expect(v.y).toBe(10);
      expect(result).toBe(v);
    });
  });

  describe('static lerp', () => {
    it('interpolates between two vectors', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(10, 20);
      const mid = Vector2.lerp(a, b, 0.5);
      expect(mid.x).toBe(5);
      expect(mid.y).toBe(10);
    });

    it('returns start at t=0', () => {
      const a = new Vector2(1, 2);
      const b = new Vector2(10, 20);
      const result = Vector2.lerp(a, b, 0);
      expect(result.x).toBe(1);
      expect(result.y).toBe(2);
    });

    it('returns end at t=1', () => {
      const a = new Vector2(1, 2);
      const b = new Vector2(10, 20);
      const result = Vector2.lerp(a, b, 1);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });
  });

  describe('static distance', () => {
    it('calculates distance between two points', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(3, 4);
      expect(Vector2.distance(a, b)).toBe(5);
    });

    it('returns 0 for same point', () => {
      const a = new Vector2(5, 5);
      expect(Vector2.distance(a, a)).toBe(0);
    });
  });

  describe('static distanceSquared', () => {
    it('calculates squared distance', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(3, 4);
      expect(Vector2.distanceSquared(a, b)).toBe(25);
    });
  });

  describe('static angle', () => {
    it('returns angle in radians', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(1, 0);
      expect(Vector2.angle(a, b)).toBe(0);
    });

    it('returns PI/2 for straight up', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(0, 1);
      expect(Vector2.angle(a, b)).toBeCloseTo(Math.PI / 2);
    });
  });
});

describe('clamp', () => {
  it('clamps value below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps value above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('normalizeAngle', () => {
  it('returns angle within [0, 2PI)', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
  });

  it('wraps negative angles', () => {
    const result = normalizeAngle(-Math.PI / 2);
    expect(result).toBeCloseTo(3 * Math.PI / 2);
  });

  it('wraps angles above 2PI', () => {
    const result = normalizeAngle(3 * Math.PI);
    expect(result).toBeCloseTo(Math.PI);
  });
});

describe('randomInt', () => {
  it('returns integer within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(0, 10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});

describe('randomFloat', () => {
  it('returns float within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomFloat(1.0, 5.0);
      expect(val).toBeGreaterThanOrEqual(1.0);
      expect(val).toBeLessThan(5.0);
    }
  });
});
