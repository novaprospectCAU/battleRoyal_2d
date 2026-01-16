# 🧪 TestBook - 테스트 명세서

> **최초 작성일**: 2026-01-14  
> **마지막 수정**: 2026-01-14  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 **테스트 전략, 테스트 종류, 테스트 케이스, QA 체크리스트**를 정의합니다.

---

## 🎯 테스트 전략 개요

### 테스트 피라미드

```
          ╱╲
         ╱  ╲         E2E (소수)
        ╱────╲        - 전체 흐름 테스트
       ╱      ╲
      ╱────────╲      통합 테스트 (중간)
     ╱          ╲     - 모듈 간 연동
    ╱────────────╲
   ╱              ╲   단위 테스트 (다수)
  ╱────────────────╲  - 개별 함수/클래스
```

### 테스트 도구

| 종류 | 도구 | 용도 |
|------|------|------|
| **단위/통합** | Vitest | 빠른 실행, Vite 통합 |
| **E2E** | Playwright (차후) | 브라우저 자동화 |
| **수동** | 체크리스트 | QA 검증 |

---

## 🔬 단위 테스트

### 대상

| 모듈 | 테스트 대상 | 우선순위 |
|------|------------|----------|
| **shared/utils** | Vector2, 수학 함수 | 높음 |
| **shared/utils** | 충돌 계산 | 높음 |
| **shared/utils** | 데미지 계산 | 높음 |
| **shared/constants** | 무기/아이템 데이터 유효성 | 중간 |
| **game/entities** | Entity 생성/상태 | 중간 |
| **network** | 메시지 직렬화 | 높음 |

### 예시: Vector2

```typescript
// packages/shared/src/utils/__tests__/math.test.ts

import { describe, it, expect } from 'vitest';
import { Vector2 } from '../math';

describe('Vector2', () => {
  describe('distance', () => {
    it('should calculate correct distance', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(3, 4);
      expect(Vector2.distance(a, b)).toBe(5);
    });
    
    it('should return 0 for same point', () => {
      const a = new Vector2(5, 5);
      expect(Vector2.distance(a, a)).toBe(0);
    });
  });
  
  describe('normalize', () => {
    it('should normalize vector', () => {
      const v = new Vector2(3, 4);
      const n = v.normalize();
      expect(n.length()).toBeCloseTo(1, 5);
    });
    
    it('should handle zero vector', () => {
      const v = new Vector2(0, 0);
      const n = v.normalize();
      expect(n.x).toBe(0);
      expect(n.y).toBe(0);
    });
  });
  
  describe('lerp', () => {
    it('should interpolate correctly', () => {
      const a = new Vector2(0, 0);
      const b = new Vector2(10, 10);
      const mid = Vector2.lerp(a, b, 0.5);
      expect(mid.x).toBe(5);
      expect(mid.y).toBe(5);
    });
  });
});
```

### 예시: 충돌 계산

```typescript
// packages/shared/src/utils/__tests__/collision.test.ts

import { describe, it, expect } from 'vitest';
import { circleCircle, rectRect, lineRect } from '../collision';

describe('Collision', () => {
  describe('circleCircle', () => {
    it('should detect overlapping circles', () => {
      expect(circleCircle(0, 0, 10, 15, 0, 10)).toBe(true);
    });
    
    it('should not detect separate circles', () => {
      expect(circleCircle(0, 0, 10, 30, 0, 10)).toBe(false);
    });
    
    it('should detect touching circles', () => {
      expect(circleCircle(0, 0, 10, 20, 0, 10)).toBe(true);
    });
  });
  
  describe('rectRect', () => {
    it('should detect overlapping rectangles', () => {
      expect(rectRect(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true);
    });
    
    it('should not detect separate rectangles', () => {
      expect(rectRect(0, 0, 10, 10, 20, 20, 10, 10)).toBe(false);
    });
  });
  
  describe('lineRect (raycast)', () => {
    it('should detect line hitting rect', () => {
      const result = lineRect(0, 5, 20, 5, 5, 0, 10, 10);
      expect(result.hit).toBe(true);
    });
    
    it('should return hit point', () => {
      const result = lineRect(0, 5, 20, 5, 10, 0, 10, 10);
      expect(result.point?.x).toBe(10);
    });
  });
});
```

### 예시: 데미지 계산

```typescript
// packages/shared/src/utils/__tests__/damage.test.ts

import { describe, it, expect } from 'vitest';
import { calculateDamage, getDistanceMultiplier } from '../damage';
import { WEAPONS } from '../../constants/weapons';

describe('Damage Calculation', () => {
  const rifle = WEAPONS.ASSAULT_RIFLE;
  
  describe('getDistanceMultiplier', () => {
    it('should return 1.0 in sweet spot range', () => {
      const mult = getDistanceMultiplier(rifle, 100);  // 스윗스팟 내
      expect(mult).toBe(1.0);
    });
    
    it('should reduce damage at close range', () => {
      const mult = getDistanceMultiplier(rifle, 10);  // 너무 가까움
      expect(mult).toBeLessThan(1.0);
    });
    
    it('should reduce damage at long range', () => {
      const mult = getDistanceMultiplier(rifle, 300);  // 너무 멀음
      expect(mult).toBeLessThan(1.0);
    });
  });
  
  describe('calculateDamage with cover', () => {
    it('should reduce damage through soft cover', () => {
      const base = calculateDamage(rifle, 100, null);
      const withCover = calculateDamage(rifle, 100, { type: 'soft' });
      expect(withCover).toBeLessThan(base);
    });
    
    it('should block damage through solid cover', () => {
      const damage = calculateDamage(rifle, 100, { type: 'solid' });
      expect(damage).toBe(0);
    });
  });
});
```

---

## 🔗 통합 테스트

### 대상

| 모듈 조합 | 테스트 내용 | 우선순위 |
|-----------|------------|----------|
| **Network + GameState** | 메시지 처리 → 상태 변경 | 높음 |
| **Input + Player** | 입력 → 플레이어 이동 | 높음 |
| **Combat System** | 발사 → 히트 → 데미지 | 높음 |
| **Item System** | 줍기 → 인벤토리 → 사용 | 중간 |
| **Zone System** | 시간 → 축소 → 데미지 | 중간 |

### 예시: 전투 시스템

```typescript
// packages/server/src/game/__tests__/combat.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../GameState';
import { Player } from '../entities/ServerPlayer';
import { CombatSystem } from '../systems/CombatSystem';

describe('Combat System Integration', () => {
  let gameState: GameState;
  let attacker: Player;
  let target: Player;
  let combat: CombatSystem;
  
  beforeEach(() => {
    gameState = new GameState();
    attacker = new Player('attacker', 0, 0);
    target = new Player('target', 100, 0);  // 100px 거리
    gameState.addPlayer(attacker);
    gameState.addPlayer(target);
    combat = new CombatSystem(gameState);
    
    // 공격자에게 무기 지급
    attacker.equipWeapon(WEAPONS.ASSAULT_RIFLE);
  });
  
  it('should damage target when hit', () => {
    const initialHp = target.hp;
    
    // 발사
    combat.fire(attacker, { angle: 0 });  // 오른쪽 (target 방향)
    
    // 투사체 이동 시뮬레이션
    gameState.update(100);  // 100ms
    
    expect(target.hp).toBeLessThan(initialHp);
  });
  
  it('should apply armor reduction', () => {
    target.equipArmor({ type: 'vest', tier: 1 });
    
    const damageWithoutArmor = target.hp;
    combat.fire(attacker, { angle: 0 });
    gameState.update(100);
    const damageWithArmor = damageWithoutArmor - target.hp;
    
    // 방어구가 데미지를 줄여야 함
    expect(damageWithArmor).toBeLessThan(35);  // 기본 데미지
  });
  
  it('should kill target when hp reaches 0', () => {
    target.hp = 10;  // 낮은 HP
    
    combat.fire(attacker, { angle: 0 });
    gameState.update(100);
    
    expect(target.isAlive).toBe(false);
  });
});
```

### 예시: 네트워크 동기화

```typescript
// packages/shared/__tests__/network-sync.test.ts

import { describe, it, expect } from 'vitest';
import { GameState } from '../types/game';
import { serializeState, deserializeState } from '../protocol/serialization';

describe('Network Synchronization', () => {
  it('should serialize and deserialize game state', () => {
    const original: GameState = {
      tick: 100,
      players: [
        { id: 'p1', x: 100, y: 200, hp: 80 },
        { id: 'p2', x: 300, y: 400, hp: 100 }
      ],
      zone: { phase: 2, radius: 500, center: { x: 0, y: 0 } }
    };
    
    const serialized = serializeState(original);
    const deserialized = deserializeState(serialized);
    
    expect(deserialized).toEqual(original);
  });
  
  it('should handle player input message', () => {
    const input = {
      type: 'PLAYER_INPUT',
      payload: {
        playerId: 'p1',
        seq: 42,
        movement: { x: 1, y: 0 },
        actions: { fire: true }
      }
    };
    
    const serialized = JSON.stringify(input);
    const parsed = JSON.parse(serialized);
    
    expect(parsed.payload.playerId).toBe('p1');
    expect(parsed.payload.actions.fire).toBe(true);
  });
});
```

---

## 🌐 E2E 테스트 (차후)

### 시나리오

| 시나리오 | 설명 | 우선순위 |
|----------|------|----------|
| **로비 → 게임 시작** | 방 생성, 참가, 시작 | 높음 |
| **기본 게임플레이** | 이동, 루팅, 사격 | 높음 |
| **전체 게임 흐름** | 시작 → 플레이 → 승리 | 중간 |
| **네트워크 재연결** | 끊김 → 재접속 | 낮음 |

### 예시 (Playwright)

```typescript
// e2e/game-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('host can create and start game', async ({ page }) => {
    await page.goto('/');
    
    // 방 만들기
    await page.click('[data-testid="create-room"]');
    
    // 초대 코드 표시 확인
    const inviteCode = await page.textContent('[data-testid="invite-code"]');
    expect(inviteCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    
    // 게임 시작
    await page.click('[data-testid="start-game"]');
    
    // 게임 화면 전환 확인
    await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible();
  });
  
  test('player can move', async ({ page }) => {
    // 게임 상태 설정
    await setupGameState(page);
    
    // 이동 키 입력
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');
    
    // 위치 변경 확인 (디버그 오버레이 활용)
    const position = await page.evaluate(() => window.game.player.position);
    expect(position.y).toBeLessThan(initialY);
  });
});
```

---

## 📋 수동 테스트 체크리스트

### 게임 시작

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| 메인 메뉴 표시 | 메뉴 UI가 정상 표시되는가 | ☐ |
| 방 생성 | 방이 생성되고 초대 코드가 표시되는가 | ☐ |
| 방 참가 | 초대 코드로 방에 참가 가능한가 | ☐ |
| 게임 시작 | 호스트가 게임 시작할 수 있는가 | ☐ |
| 스폰 | 플레이어가 맵에 스폰되는가 | ☐ |

### 이동/조작

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| WASD 이동 | 8방향 이동이 정상 작동하는가 | ☐ |
| 달리기 | Shift로 달리기가 작동하는가 | ☐ |
| 마우스 조준 | 마우스 방향으로 조준되는가 | ☐ |
| 무기 발사 | 좌클릭으로 발사되는가 | ☐ |
| 재장전 | R키로 재장전되는가 | ☐ |
| 무기 전환 | 1,2,3 또는 스크롤로 전환되는가 | ☐ |

### 아이템

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| 아이템 줍기 | E/F로 아이템을 주울 수 있는가 | ☐ |
| 인벤토리 | Tab으로 인벤토리가 열리는가 | ☐ |
| 아이템 사용 | 회복 아이템 사용이 작동하는가 | ☐ |
| 아이템 버리기 | G로 아이템을 버릴 수 있는가 | ☐ |
| 부착물 장착 | 부착물이 무기에 장착되는가 | ☐ |

### 전투

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| 데미지 적용 | 피격 시 HP가 감소하는가 | ☐ |
| 방어구 효과 | 방어구가 데미지를 줄이는가 | ☐ |
| 엄폐물 관통 | 엄폐물 종류별 관통이 작동하는가 | ☐ |
| 스윗스팟 | 거리별 데미지가 적용되는가 | ☐ |
| 사망 처리 | HP 0 시 사망하는가 | ☐ |
| 아이템 드랍 | 사망 시 아이템이 드랍되는가 | ☐ |

### 자기장

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| 자기장 표시 | 미니맵에 자기장이 표시되는가 | ☐ |
| 축소 알림 | 축소 전 알림이 나오는가 | ☐ |
| 자기장 축소 | 시간에 따라 축소되는가 | ☐ |
| 데미지 | 자기장 밖에서 데미지를 받는가 | ☐ |
| 시각 효과 | 자기장 밖에서 화면이 붉어지는가 | ☐ |

### 네트워크

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| 다른 플레이어 표시 | 다른 플레이어가 보이는가 | ☐ |
| 이동 동기화 | 다른 플레이어 이동이 부드러운가 | ☐ |
| 사격 동기화 | 다른 플레이어 사격이 보이는가 | ☐ |
| 레이턴시 표시 | 핑이 표시되는가 | ☐ |
| 연결 끊김 | 끊김 시 알림이 나오는가 | ☐ |

### 승리/패배

| 항목 | 확인 내용 | Pass |
|------|----------|------|
| 승리 화면 | 마지막 생존 시 승리 화면 | ☐ |
| 통계 표시 | 킬/데미지 통계가 표시되는가 | ☐ |
| 관전 모드 | 사망 후 관전이 작동하는가 | ☐ |
| 재시작 | 로비로 돌아갈 수 있는가 | ☐ |

---

## 🐛 버그 리포트 템플릿

```markdown
## 버그 설명
[간단한 설명]

## 재현 단계
1. ...
2. ...
3. ...

## 예상 결과
[예상했던 동작]

## 실제 결과
[실제 발생한 동작]

## 환경
- 브라우저: 
- OS: 
- 버전: 

## 스크린샷/영상
[있으면 첨부]
```

---

## 📊 테스트 커버리지 목표

| 모듈 | 목표 커버리지 |
|------|--------------|
| shared/utils | 90%+ |
| shared/constants | 80%+ |
| game/systems | 70%+ |
| network | 60%+ |
| 전체 | 50%+ |

---

## 🔄 테스트 실행

### 명령어

```bash
# 전체 테스트
pnpm test

# 특정 패키지
pnpm --filter shared test
pnpm --filter client test
pnpm --filter server test

# 워치 모드
pnpm test:watch

# 커버리지
pnpm test:coverage
```

### CI 통합 (차후)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
```

---

## ⚠️ 미결정 사항 요약

### 우선순위 높음
- [ ] 테스트 커버리지 최소 기준 확정
- [ ] CI/CD 파이프라인 설정

### 우선순위 중간
- [ ] E2E 테스트 도입 시점
- [ ] 성능 테스트 기준

### 우선순위 낮음
- [ ] 자동화된 시각 회귀 테스트
- [ ] 부하 테스트 (동시 접속)

---

## 📚 관련 문서

- 코드 구조 → `codeBook.md`
- 기술 스펙 → `specBook.md`
- 시나리오 → `scenarioBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-14 | 0.1.0 | 최초 작성, 테스트 전략 초안 | - |
