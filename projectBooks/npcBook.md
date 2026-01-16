# 🤖 NpcBook - AI 플레이어 설계서

> **최초 작성일**: 2026-01-14  
> **마지막 수정**: 2026-01-14  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 **AI 봇 플레이어의 행동 패턴, 의사결정 로직, 난이도 체계**를 정의합니다.

---

## 🎯 봇 시스템 개요

### 목적
- 플레이어 부족 시 자리 채우기
- 솔로 연습/테스트 환경 제공
- 게임 밸런스 및 긴장감 유지

### 기본 원칙
```
1. 봇은 서버에서만 시뮬레이션 (네트워크 부하 없음)
2. 사람처럼 보이되, 너무 강하지 않게
3. 단순한 규칙 기반으로 시작, 차후 고도화
```

---

## 🧠 봇 행동 시스템

### 상태 머신 (State Machine)

```
┌─────────────────────────────────────────────────────────┐
│                      Bot States                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│    ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     │
│    │ Idle │ ──► │ Loot │ ──► │ Move │ ──► │Combat│     │
│    └──────┘     └──────┘     └──────┘     └──────┘     │
│        │            │            │            │          │
│        └────────────┴────────────┴────────────┘          │
│                         │                                │
│                    ┌────▼────┐                          │
│                    │  Dead   │                          │
│                    └─────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 상태별 행동

| 상태 | 조건 | 행동 |
|------|------|------|
| **Idle** | 게임 시작 직후 | 주변 탐색, 루팅 위치 파악 |
| **Loot** | 근처에 아이템 | 아이템으로 이동, 줍기 |
| **Move** | 자기장 이동 필요 / 탐색 | 안전 구역으로 이동 |
| **Combat** | 적 발견 | 교전, 사격, 엄폐 |
| **Dead** | HP 0 | 비활성화 |

---

## 👁️ 감지 시스템

### 시야 (Vision)

```typescript
interface BotVision {
  range: number;           // 시야 거리 (예: 300px)
  fov: number;             // 시야각 (예: 120도)
  direction: number;       // 바라보는 방향
}

function canSeePlayer(bot: Bot, target: Player): boolean {
  // 1. 거리 체크
  const distance = Vector2.distance(bot.position, target.position);
  if (distance > bot.vision.range) return false;
  
  // 2. 시야각 체크
  const angle = Vector2.angle(bot.position, target.position);
  const angleDiff = Math.abs(angle - bot.vision.direction);
  if (angleDiff > bot.vision.fov / 2) return false;
  
  // 3. 장애물 체크 (레이캐스트)
  if (hasObstacleBetween(bot.position, target.position)) return false;
  
  return true;
}
```

### 소음 감지 (ruleBook/audioBook 연계)

```typescript
interface NoiseEvent {
  position: Vector2;
  radius: number;        // 들리는 거리
  type: 'gunshot' | 'footstep' | 'explosion' | 'door';
}

function onNoiseDetected(bot: Bot, noise: NoiseEvent): void {
  const distance = Vector2.distance(bot.position, noise.position);
  
  if (distance <= noise.radius) {
    // 소음 방향 인지
    bot.alertDirection = Vector2.angle(bot.position, noise.position);
    bot.alertLevel += getAlertIncrease(noise.type);
    
    // 상태 전환 고려
    if (bot.alertLevel > ALERT_THRESHOLD) {
      bot.setState('investigate');
    }
  }
}
```

### 거리별 반응 (ruleBook에서 정의)

| 거리 | 감지 조건 | 반응 |
|------|----------|------|
| **원거리** (200px+) | 시야 내 | 천천히 조준 → 사격 |
| **중거리** (100-200px) | 시야 or 소음 | 해당 방향 확인 → 빠르게 조준 → 사격 |
| **근거리** (0-100px) | 시야 내 | 즉시 조준 → 사격 |

---

## 🎯 전투 AI

### 조준 시스템

```typescript
interface AimBehavior {
  aimSpeed: number;        // 조준 속도 (도/초)
  accuracy: number;        // 정확도 (0-1)
  reactionTime: number;    // 반응 시간 (ms)
}

class BotCombat {
  private currentAim: number = 0;
  private targetAim: number = 0;
  
  // 타겟 방향으로 천천히 조준
  updateAim(dt: number, target: Player): void {
    this.targetAim = Vector2.angle(this.bot.position, target.position);
    
    // 조준 속도에 따라 보간
    const diff = this.targetAim - this.currentAim;
    const maxTurn = this.aimSpeed * dt;
    
    if (Math.abs(diff) < maxTurn) {
      this.currentAim = this.targetAim;
    } else {
      this.currentAim += Math.sign(diff) * maxTurn;
    }
  }
  
  // 사격 결정
  shouldFire(): boolean {
    const aimError = Math.abs(this.targetAim - this.currentAim);
    return aimError < this.getAccuracyThreshold();
  }
  
  // 정확도에 따른 랜덤 오차
  getFireDirection(): number {
    const spread = (1 - this.accuracy) * 0.2;  // 라디안
    return this.currentAim + (Math.random() - 0.5) * spread;
  }
}
```

### 사격 패턴

| 무기 종류 | 봇 사용 패턴 |
|-----------|-------------|
| 권총 | 단발, 정확히 조준 후 |
| SMG | 짧은 점사 (3-5발) |
| 소총 | 상황에 따라 단발/점사 |
| 샷건 | 근접 시 즉시 발사 |
| SR | 완전 조준 후 단발 |
| MG | 연사, 억제 사격 |

### 엄폐 행동

```typescript
function seekCover(bot: Bot, threatDirection: number): Vector2 | null {
  // 1. 주변 엄폐물 탐색
  const covers = findNearbyCover(bot.position, 100);
  
  // 2. 위협 방향 반대편의 엄폐물 선호
  const safeCover = covers.find(cover => {
    const coverAngle = Vector2.angle(cover.position, bot.position);
    return isAngleSafe(coverAngle, threatDirection);
  });
  
  return safeCover?.position || null;
}
```

---

## 🚶 이동 AI

### 경로 탐색

```typescript
// 단순 경로 탐색 (A* 또는 직선)
interface PathNode {
  position: Vector2;
  cost: number;
}

class BotNavigation {
  private path: Vector2[] = [];
  private currentIndex: number = 0;
  
  // 목적지 설정
  setDestination(target: Vector2): void {
    // 간단 버전: 직선 경로 + 장애물 회피
    this.path = this.calculatePath(this.bot.position, target);
    this.currentIndex = 0;
  }
  
  // 경로 따라 이동
  update(dt: number): void {
    if (this.currentIndex >= this.path.length) return;
    
    const target = this.path[this.currentIndex];
    const direction = Vector2.angle(this.bot.position, target);
    
    this.bot.move(direction);
    
    // 도착 체크
    if (Vector2.distance(this.bot.position, target) < 5) {
      this.currentIndex++;
    }
  }
}
```

### 자기장 대응

```typescript
function handleZone(bot: Bot, zone: Zone): void {
  const distanceToSafe = getDistanceToSafeZone(bot.position, zone);
  
  if (distanceToSafe > 0) {
    // 자기장 밖에 있음 → 즉시 이동
    const safePoint = getClosestSafePoint(bot.position, zone);
    bot.navigation.setDestination(safePoint);
    bot.setState('move');
  } else if (zone.isAboutToShrink && distanceToEdge < BUFFER) {
    // 곧 축소 예정 → 미리 이동
    const nextSafePoint = getPointInNextZone(bot.position, zone);
    bot.navigation.setDestination(nextSafePoint);
  }
}
```

---

## 📦 루팅 AI

### 아이템 우선순위

| 우선순위 | 아이템 | 조건 |
|----------|--------|------|
| 1 | 무기 (주무기 없을 때) | 주무기 슬롯 비어있음 |
| 2 | 탄약 (현재 무기용) | 탄약 50% 이하 |
| 3 | 방어구 (업그레이드) | 더 좋은 등급 |
| 4 | 회복 아이템 | HP < 70% |
| 5 | 부착물 | 장착 가능한 것 |
| 6 | 추가 무기 | 부무기 슬롯 비어있음 |

### 루팅 행동

```typescript
function decideLoot(bot: Bot, nearbyItems: Item[]): Item | null {
  // 우선순위에 따라 정렬
  const prioritized = nearbyItems
    .map(item => ({
      item,
      priority: calculatePriority(bot, item)
    }))
    .filter(x => x.priority > 0)
    .sort((a, b) => b.priority - a.priority);
  
  return prioritized[0]?.item || null;
}

function calculatePriority(bot: Bot, item: Item): number {
  if (item.type === 'weapon' && !bot.hasPrimaryWeapon()) {
    return 100;  // 최우선
  }
  if (item.type === 'ammo' && bot.needsAmmo(item.ammoType)) {
    return 80;
  }
  // ...
}
```

---

## 📊 난이도 체계

### 난이도 레벨

| 레벨 | 조준 속도 | 정확도 | 반응 시간 | 특징 |
|------|----------|--------|----------|------|
| **Easy** | 느림 | 40% | 800ms | 자주 빗나감, 느린 반응 |
| **Normal** | 보통 | 60% | 500ms | 평균적인 플레이어 수준 |
| **Hard** | 빠름 | 80% | 300ms | 빠른 조준, 높은 명중률 |
| **Expert** | 매우 빠름 | 95% | 150ms | 거의 즉시 반응 |

### 난이도 설정

```typescript
interface BotDifficulty {
  aimSpeed: number;        // 도/초
  accuracy: number;        // 0-1
  reactionTime: number;    // ms
  predictionLevel: number; // 이동 예측 능력
  coverUsage: number;      // 엄폐 활용도
}

const DIFFICULTIES: Record<string, BotDifficulty> = {
  easy: {
    aimSpeed: 90,
    accuracy: 0.4,
    reactionTime: 800,
    predictionLevel: 0,
    coverUsage: 0.3
  },
  normal: {
    aimSpeed: 180,
    accuracy: 0.6,
    reactionTime: 500,
    predictionLevel: 0.3,
    coverUsage: 0.5
  },
  hard: {
    aimSpeed: 360,
    accuracy: 0.8,
    reactionTime: 300,
    predictionLevel: 0.6,
    coverUsage: 0.7
  }
};
```

---

## 🔄 봇 생명주기

### 생성

```typescript
function spawnBot(room: GameRoom, difficulty: string): Bot {
  const bot = new Bot({
    id: generateBotId(),
    name: generateBotName(),  // 랜덤 이름/번호
    difficulty: DIFFICULTIES[difficulty],
    spawnPosition: getRandomSpawnPoint()
  });
  
  room.addBot(bot);
  return bot;
}
```

### 매 틱 업데이트

```typescript
class Bot {
  update(dt: number, gameState: GameState): void {
    if (!this.isAlive) return;
    
    // 1. 감지
    this.updateVision(gameState.players);
    this.processNoises(gameState.recentNoises);
    
    // 2. 상태 전환 판단
    this.evaluateStateTransition();
    
    // 3. 현재 상태 행동
    this.currentState.execute(dt);
    
    // 4. 자기장 체크
    this.handleZone(gameState.zone);
  }
}
```

### 사망

```typescript
function onBotDeath(bot: Bot): void {
  bot.isAlive = false;
  bot.dropAllItems();
  
  // 킬 로그에 표시 (일반 플레이어처럼)
  broadcastKillFeed({
    killer: killerPlayer,
    victim: bot.name,
    weapon: weaponUsed
  });
}
```

---

## 🏷️ 봇 표시

### 이름 생성

```typescript
// 랜덤 번호 부여 (ruleBook에서 정의)
function generateBotName(): string {
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `Player${number}`;
}
```

### 구분

```
현재 결정:
- 봇 여부 표시 안 함 (일반 플레이어처럼 보임)
- 킬로그에 아이디 표시
- 차후 논의: 봇 마크 추가?
```

---

## 📐 서버 구현

### BotController

```typescript
// packages/server/src/ai/BotController.ts

class BotController {
  private bots: Map<string, Bot> = new Map();
  
  // 봇 추가
  addBot(difficulty: string = 'normal'): Bot {
    const bot = new Bot(difficulty);
    this.bots.set(bot.id, bot);
    return bot;
  }
  
  // 전체 봇 업데이트
  update(dt: number, gameState: GameState): void {
    for (const bot of this.bots.values()) {
      bot.update(dt, gameState);
    }
  }
  
  // 봇 입력 수집 (서버에서 처리)
  collectBotInputs(): Map<string, PlayerInput> {
    const inputs = new Map();
    
    for (const bot of this.bots.values()) {
      if (bot.isAlive) {
        inputs.set(bot.id, bot.getInput());
      }
    }
    
    return inputs;
  }
}
```

---

## ⚠️ 미결정 사항 요약

### 우선순위 높음
- [ ] 경로 탐색 알고리즘 선택 (A* vs 단순)
- [ ] 난이도별 수치 밸런싱

### 우선순위 중간
- [ ] 봇 이름 형식 최종 확정
- [ ] 팀 모드 봇 협동 로직 (차후)

### 우선순위 낮음
- [ ] 고급 AI (학습 기반)
- [ ] 봇 성격/플레이스타일 다양화

---

## 📚 관련 문서

- 게임 규칙 (봇 설정) → `ruleBook.md`
- 소음 시스템 → `audioBook.md`
- 코드 구조 → `codeBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-14 | 0.1.0 | 최초 작성, AI 설계 초안 | - |
