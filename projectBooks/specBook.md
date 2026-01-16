# 🔧 SpecBook - 기술 스택 및 스펙 정의서

> **최초 작성일**: 2026-01-14  
> **마지막 수정**: 2026-01-14  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 프로젝트의 **기술 스택, 라이브러리, 시스템 요구사항, 성능 목표**를 정의합니다.

---

## 🎯 기술 요구사항 요약

| 항목 | 요구사항 |
|------|----------|
| **플랫폼** | 웹 브라우저 |
| **프레임워크** | React |
| **최대 동시 접속** | 32명 |
| **네트워크** | 실시간 (WebSocket) |
| **렌더링** | 2D 쿼터뷰 |
| **에셋 전략** | 디버그 모드 (도형) / 프로덕션 모드 (실제 에셋) |

---

## 🏗️ 기술 스택

### 프론트엔드 (클라이언트)

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **UI 프레임워크** | React | 18+ | UI 컴포넌트, 상태 관리 |
| **언어** | TypeScript | 5+ | 타입 안정성 |
| **빌드 도구** | Vite | 5+ | 빠른 개발 서버, 번들링 |
| **렌더링** | HTML5 Canvas | - | 2D 게임 렌더링 |
| **상태 관리** | Zustand | 4+ | 가벼운 전역 상태 관리 |
| **스타일링** | CSS Modules / Tailwind | - | UI 스타일링 |

### 백엔드 (서버)

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **런타임** | Node.js | 20+ | 서버 실행 환경 |
| **언어** | TypeScript | 5+ | 타입 안정성 |
| **WebSocket** | ws | 8+ | 실시간 통신 |
| **HTTP 서버** | Express (선택) | 4+ | 시그널링, API (필요 시) |

### 공유 (Shared)

| 분류 | 기술 | 용도 |
|------|------|------|
| **타입 정의** | TypeScript Interfaces | 클라이언트/서버 공용 타입 |
| **상수** | Shared Constants | 게임 규칙, 밸런스 수치 |
| **유틸리티** | Shared Utils | 공용 함수 (충돌 계산 등) |

---

## 🎨 렌더링 시스템

### 선택: HTML5 Canvas 2D

```
[선택 이유]
✅ 브라우저 네이티브 지원
✅ React와 통합 용이
✅ 2D 게임에 충분한 성능
✅ 학습 곡선 낮음
✅ 디버그 모드 구현 쉬움 (도형 그리기)

[대안 비교]
- WebGL/PixiJS: 더 높은 성능, 복잡도 증가
- Phaser: 게임 엔진 포함, 번들 크기 증가
- DOM/CSS: 성능 한계, 복잡한 게임에 부적합
```

### 렌더링 아키텍처

```
React App
    │
    ├── UI Layer (React Components)
    │   - 메뉴, HUD, 인벤토리
    │   - DOM 기반 렌더링
    │
    └── Game Layer (Canvas)
        - 게임 월드, 플레이어, 아이템
        - requestAnimationFrame 기반
        - React와 분리된 게임 루프
```

### Canvas 설정

```typescript
// 예상 설정
const CANVAS_CONFIG = {
  // 기본 해상도 (논리적)
  logicalWidth: 1920,
  logicalHeight: 1080,
  
  // 실제 렌더링 (디바이스에 맞춤)
  scale: window.devicePixelRatio,
  
  // 뷰포트 (플레이어 시야)
  viewportWidth: 800,  // 픽셀
  viewportHeight: 600,
  
  // 타일 크기
  tileSize: 32,  // 플레이어 가로 x 2
};
```

---

## 🎮 게임 루프

### 구조

```typescript
class GameLoop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly TICK_RATE = 1000 / 20;  // 20 Hz (50ms)
  
  start() {
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private loop(currentTime: number) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;
    
    // 고정 시간 업데이트 (물리, 로직)
    while (this.accumulator >= this.TICK_RATE) {
      this.fixedUpdate(this.TICK_RATE);
      this.accumulator -= this.TICK_RATE;
    }
    
    // 가변 시간 렌더링 (보간 적용)
    const alpha = this.accumulator / this.TICK_RATE;
    this.render(alpha);
    
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private fixedUpdate(dt: number) {
    // 입력 처리
    // 물리 시뮬레이션
    // 게임 로직
    // 네트워크 동기화
  }
  
  private render(alpha: number) {
    // 보간된 위치로 렌더링
    // Canvas 그리기
  }
}
```

### 틱 레이트

| 구분 | 값 | 용도 |
|------|-----|------|
| **게임 로직** | 20 Hz (50ms) | 물리, 상태 업데이트 |
| **렌더링** | 60 FPS | 화면 갱신 |
| **입력 샘플링** | 60 Hz | 사용자 입력 |
| **네트워크 전송** | 20 Hz | 서버 동기화 |

---

## 🌐 네트워크

### WebSocket 라이브러리

| 환경 | 라이브러리 | 이유 |
|------|-----------|------|
| **서버** | `ws` | 경량, 순수 WebSocket |
| **클라이언트** | 네이티브 WebSocket | 브라우저 내장 |

```
[Socket.io 미채택 이유]
- 오버헤드 (폴백, 자동 재연결 등 불필요한 기능)
- 커스텀 프로토콜로 충분
- 게임에서는 세밀한 제어 필요
```

### 메시지 직렬화

```typescript
// JSON 사용 (단순, 디버깅 용이)
// 차후 성능 이슈 시 MessagePack/Protobuf 고려

interface NetworkMessage {
  type: string;
  timestamp: number;
  payload: unknown;
}

// 전송
socket.send(JSON.stringify(message));

// 수신
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
};
```

---

## 🗄️ 상태 관리

### Zustand 선택

```
[선택 이유]
✅ 가볍고 빠름 (Redux 대비)
✅ 보일러플레이트 최소
✅ React 외부에서도 접근 가능 (게임 루프에서)
✅ TypeScript 지원 우수
```

### 상태 구조

```typescript
// UI 상태 (React)
interface UIState {
  currentScreen: 'menu' | 'lobby' | 'game' | 'result';
  isInventoryOpen: boolean;
  isMiniMapExpanded: boolean;
  settings: GameSettings;
}

// 게임 상태 (게임 루프)
interface GameState {
  players: Map<string, Player>;
  items: Map<string, Item>;
  projectiles: Projectile[];
  zone: ZoneState;
  tick: number;
}

// 분리 이유:
// - UI 상태: React 리렌더링 트리거
// - 게임 상태: 고빈도 업데이트, React 외부 관리
```

---

## 📁 프로젝트 구조

```
battleRoyal_2d/
│
├── projectBooks/              # 설계 문서
│
├── packages/                  # 모노레포 구조
│   │
│   ├── client/                # 프론트엔드
│   │   ├── src/
│   │   │   ├── components/    # React 컴포넌트
│   │   │   │   ├── ui/        # 일반 UI (버튼, 모달)
│   │   │   │   ├── hud/       # 게임 내 HUD
│   │   │   │   └── screens/   # 화면 (메뉴, 로비)
│   │   │   │
│   │   │   ├── game/          # 게임 로직
│   │   │   │   ├── core/      # 게임 루프, 렌더러
│   │   │   │   ├── entities/  # 플레이어, 아이템, 투사체
│   │   │   │   ├── systems/   # 물리, 충돌, 전투
│   │   │   │   └── input/     # 입력 처리
│   │   │   │
│   │   │   ├── network/       # 네트워크 클라이언트
│   │   │   ├── store/         # Zustand 스토어
│   │   │   ├── assets/        # 에셋 (이미지, 사운드)
│   │   │   └── utils/         # 유틸리티
│   │   │
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── server/                # 백엔드
│   │   ├── src/
│   │   │   ├── game/          # 서버 측 게임 로직
│   │   │   │   ├── GameRoom.ts
│   │   │   │   ├── GameLoop.ts
│   │   │   │   └── systems/
│   │   │   │
│   │   │   ├── network/       # WebSocket 서버
│   │   │   │   ├── WebSocketServer.ts
│   │   │   │   └── MessageHandler.ts
│   │   │   │
│   │   │   ├── ai/            # AI 봇 로직
│   │   │   └── utils/
│   │   │
│   │   └── package.json
│   │
│   └── shared/                # 공유 코드
│       ├── src/
│       │   ├── types/         # 공용 타입
│       │   ├── constants/     # 게임 상수
│       │   ├── protocol/      # 네트워크 프로토콜
│       │   └── utils/         # 공용 유틸리티
│       │
│       └── package.json
│
├── package.json               # 루트 (워크스페이스)
├── tsconfig.json              # 공용 TS 설정
└── README.md
```

---

## ⚙️ 개발 환경

### 필수 도구

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 20+ | 런타임 |
| pnpm | 8+ | 패키지 관리 (모노레포) |
| TypeScript | 5+ | 언어 |
| VS Code / Cursor | - | IDE |

### 개발 스크립트

```json
{
  "scripts": {
    "dev": "pnpm --parallel dev",
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev",
    "build": "pnpm --parallel build",
    "test": "pnpm --parallel test",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

### 권장 VS Code 확장

```
- ESLint
- Prettier
- TypeScript
```

---

## 🖥️ 브라우저 지원

### 지원 브라우저

| 브라우저 | 최소 버전 | 비고 |
|----------|----------|------|
| Chrome | 90+ | 주요 타겟 |
| Firefox | 90+ | 지원 |
| Safari | 15+ | 지원 |
| Edge | 90+ | Chrome 기반 |

### 필수 API

```
- WebSocket
- Canvas 2D
- requestAnimationFrame
- localStorage
- Pointer Events
```

---

## 📊 성능 목표

### 클라이언트

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **FPS** | 60 FPS (최소 30) | 렌더링 성능 |
| **입력 지연** | < 16ms | 입력 → 화면 반영 |
| **메모리** | < 500MB | 브라우저 메모리 |
| **초기 로드** | < 3초 | 첫 화면까지 |

### 서버 (호스트)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **틱 레이트** | 20 Hz 유지 | 50ms 내 처리 |
| **레이턴시** | < 100ms (LAN) | RTT |
| **CPU** | < 30% (1코어) | 32명 기준 |
| **메모리** | < 500MB | Node.js 힙 |

### 네트워크

| 지표 | 목표 |
|------|------|
| **대역폭 (다운)** | < 50 KB/s per client |
| **대역폭 (업)** | < 5 KB/s per client |
| **패킷 크기** | < 2 KB per tick |

---

## 🔌 외부 라이브러리

### 필수

| 라이브러리 | 용도 | 크기 |
|-----------|------|------|
| `react` | UI | ~40KB |
| `react-dom` | React 렌더링 | ~120KB |
| `zustand` | 상태 관리 | ~3KB |
| `ws` (서버) | WebSocket | ~50KB |

### 선택적

- 스타일은 일단은 CSS를 기본적으로 사용하고, 나중에 필요하다면 라이브러리로 바꿀 예정

| 라이브러리 | 용도 | 채택 여부 |
|-----------|------|----------|
| `howler.js` | 오디오 | 검토 중 |
| `matter-js` | 물리 엔진 | 미정 (자체 구현 우선) |
| `msgpack` | 메시지 직렬화 | 미정 (JSON 우선) |

---

## 🧪 테스트 전략

### 테스트 종류

| 종류 | 도구 | 대상 |
|------|------|------|
| **단위 테스트** | Vitest | 유틸리티, 순수 함수 |
| **통합 테스트** | Vitest | 시스템 간 연동 |
| **E2E 테스트** | Playwright (차후) | 전체 흐름 |

### 테스트 범위 (초기)

```
우선순위:
1. 공유 유틸리티 (충돌 계산, 데미지 계산)
2. 네트워크 메시지 직렬화
3. 게임 상태 관리
```

---

## 🚀 배포 전략

### 개발 단계

```
로컬 개발:
- 클라이언트: Vite dev server (localhost:5173)
- 서버: Node.js (localhost:3000)
- 같은 LAN에서 테스트
```

### 프로덕션 (차후)

```
[논의 필요: 배포 환경]

옵션:
- 정적 호스팅 (클라이언트) + VPS (서버)
- Vercel/Netlify + 별도 게임 서버
- 자체 호스팅
```

---

## ⚠️ 미결정 사항 요약

### 우선순위 높음
- [x] 렌더링 방식 → Canvas 2D
- [x] 상태 관리 → Zustand
- [x] 네트워크 → ws (순수 WebSocket)
- [ ] 물리 엔진 → 자체 구현 vs Matter.js : 만약 구현이 자체 구현보다 라이브러리가 더 좋다면 적극적으로 채용해도 된다.

### 우선순위 중간
- [ ] 오디오 라이브러리 (Howler.js?)
- [ ] 스타일링 (Tailwind vs CSS Modules) : 일단 CSS Modules로 해줘
- [ ] 메시지 직렬화 최적화

### 우선순위 낮음
- [ ] E2E 테스트 도구
- [ ] 프로덕션 배포 환경
- [ ] 모니터링/로깅

---

## 📚 관련 문서

- 네트워크 상세 → `spiderBook.md`
- 코드 구조 → `codeBook.md`
- 빌드/배포 → `buildersBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-14 | 0.1.0 | 최초 작성, 기술 스택 정의 | - |
