# 🕸️ SpiderBook - 네트워크 및 멀티플레이 설계서

> **최초 작성일**: 2026-01-14  
> **마지막 수정**: 2026-01-14  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 게임의 **네트워크 아키텍처, 서버 구조, 멀티플레이 시스템**을 정의합니다.  
실시간 동기화, 접속 방식, 프로토콜, 보안 등 게임 외적이지만 멀티플레이에 필수적인 요소들을 다룹니다.

---

## 🏗️ 아키텍처 개요

### 호스트 기반 P2P-Server 하이브리드 모델

```
┌─────────────────────────────────────────────────────────────────┐
│                         호스트 (Host)                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ 게임 클라이언트 │ + │ 게임 서버    │ + │ 시그널링/릴레이 서버 │  │
│  │ (자신도 플레이) │   │ (권위적 서버) │   │ (연결 중개)          │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
    WebSocket            WebSocket            WebSocket
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Client 1   │      │  Client 2   │      │  Client N   │
│ (게스트)     │      │ (게스트)     │      │ (게스트)     │
└─────────────┘      └─────────────┘      └─────────────┘
```

### 역할 정의

| 역할 | 설명 |
|------|------|
| **호스트 (Host)** | 게임방 생성, 서버 역할 수행, 관리자 권한, 본인도 플레이어로 참여 |
| **게스트 (Guest)** | 초대 코드로 접속, 클라이언트 역할만 수행 |
| **AI 봇** | 호스트의 서버에서 직접 시뮬레이션, 네트워크 통신 불필요 |

### 왜 이 구조인가?

| 장점 | 설명 |
|------|------|
| **별도 서버 불필요** | 호스트가 서버 역할, 인프라 비용 없음 |
| **간단한 접속** | 초대 코드만으로 연결 |
| **호스트 제어권** | 게임 시작, 설정 등 완전한 제어 |

| 단점/고려사항 | 대응 |
|---------------|------|
| 호스트 이탈 시 게임 종료 | 명확히 안내, 추후 마이그레이션 고려 |
| 호스트 PC 성능 의존 | 최소 사양 안내 |
| NAT 통과 문제 | STUN/TURN 서버 또는 릴레이 서버 필요 |

---

## 🔌 접속 흐름

### 1. 방 생성 (호스트)

```
호스트가 "방 만들기" 클릭
        │
        ▼
┌─────────────────────┐
│ 로컬 게임 서버 시작   │
│ - WebSocket 서버     │
│ - 게임 상태 초기화    │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ 초대 코드 생성        │
│ - 형식: XXXX-XXXX    │
│ - 유효기간: 방 존재시  │
└─────────────────────┘
        │
        ▼
    호스트에게 표시
    (복사/공유 가능)
```

### 2. 방 참가 (게스트)

```
게스트가 초대 코드 입력
        │
        ▼
┌─────────────────────┐
│ 코드 검증 & 연결 시도 │
│ (시그널링 서버 경유)  │
└─────────────────────┘
        │
        ├── 성공 ──▶ 방 입장, 로비 화면
        │
        └── 실패 ──▶ 에러 메시지
                    - 잘못된 코드
                    - 방이 가득 참
                    - 이미 게임 진행 중
                    - 연결 실패
```

### 3. 게임 시작

```
호스트가 설정 완료
        │
        ▼
┌─────────────────────┐
│ 호스트: 게임 시작 버튼 │
│ - 총 인원 설정        │
│ - AI 수 자동 계산     │
└─────────────────────┘
        │
        ▼
모든 클라이언트에 게임 시작 신호
        │
        ▼
    게임 진행
```

---

## 📡 통신 프로토콜

### WebSocket 기반 실시간 통신

```
[선택 이유]
- 양방향 실시간 통신
- 브라우저 네이티브 지원
- 낮은 오버헤드
- 이벤트 기반 처리 용이
```

### 메시지 형식

```typescript
interface GameMessage {
  type: MessageType;      // 메시지 종류
  timestamp: number;      // 서버 기준 타임스탬프
  payload: any;           // 실제 데이터
  seq?: number;           // 시퀀스 번호 (순서 보장용)
}

enum MessageType {
  // 연결 관련
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  
  // 로비 관련
  PLAYER_JOIN = 'player_join',
  PLAYER_LEAVE = 'player_leave',
  LOBBY_UPDATE = 'lobby_update',
  GAME_START = 'game_start',
  
  // 게임 상태
  GAME_STATE = 'game_state',           // 전체 상태 동기화
  GAME_STATE_DELTA = 'game_state_delta', // 부분 상태 업데이트
  
  // 플레이어 입력
  PLAYER_INPUT = 'player_input',
  
  // 게임 이벤트
  PLAYER_DAMAGE = 'player_damage',
  PLAYER_DEATH = 'player_death',
  ITEM_PICKUP = 'item_pickup',
  ITEM_USE = 'item_use',
  ZONE_UPDATE = 'zone_update',
  
  // 게임 종료
  GAME_END = 'game_end',
}
```

### 주요 메시지 상세

#### 플레이어 입력 (Client → Server)
```typescript
interface PlayerInput {
  type: 'PLAYER_INPUT';
  payload: {
    playerId: string;
    seq: number;              // 입력 시퀀스 (예측용)
    movement: {
      x: number;              // -1 ~ 1
      y: number;              // -1 ~ 1
      sprint: boolean;
    };
    aim: {
      angle: number;          // 조준 각도 (라디안)
    };
    actions: {
      fire: boolean;
      reload: boolean;
      interact: boolean;
      useItem: number | null; // 사용할 아이템 슬롯
    };
  };
}
```

#### 게임 상태 (Server → Client)
```typescript
interface GameState {
  type: 'GAME_STATE';
  timestamp: number;
  payload: {
    tick: number;             // 서버 틱
    players: PlayerState[];   // 모든 플레이어 상태
    items: ItemState[];       // 맵 아이템 상태
    projectiles: Projectile[]; // 투사체
    zone: ZoneState;          // 자기장 상태
    events: GameEvent[];      // 이번 틱 이벤트들
  };
}

interface PlayerState {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  rotation: number;
  hp: number;
  shield: number;            // 방어구 시스템 채택 시
  isAlive: boolean;
  weapon: WeaponState;
  inventory: InventoryState;
}
```

---

## 🔄 동기화 전략

### 서버 권위 모델 (Server Authoritative)

```
┌─────────────────────────────────────────────────────────┐
│                    서버 (호스트)                         │
│  - 모든 게임 로직 처리                                   │
│  - 입력 검증                                            │
│  - 충돌/데미지 판정                                      │
│  - 유일한 "진실의 원천" (Source of Truth)                │
└─────────────────────────────────────────────────────────┘
```

### 클라이언트 예측 (Client-Side Prediction)

```
[문제]
- 클라이언트 입력 → 서버 처리 → 결과 수신
- 이 과정에서 레이턴시만큼 지연 발생
- 조작감이 답답해짐

[해결: 클라이언트 예측]
1. 클라이언트: 입력 즉시 로컬에서 결과 시뮬레이션 (예측)
2. 클라이언트: 동시에 서버로 입력 전송
3. 서버: 입력 처리 후 결과 전송
4. 클라이언트: 서버 결과와 예측 비교/보정
```

```
시간 ────────────────────────────────────────────▶

클라이언트:  [입력] ──▶ [예측 이동] ─────────────▶ [서버 결과 수신] ──▶ [보정]
                 │                                      ▲
                 │          네트워크 레이턴시              │
                 ▼                                      │
서버:            [입력 수신] ──▶ [처리] ──▶ [결과 전송] ──┘
```

### 서버 조정 (Server Reconciliation)

```typescript
// 클라이언트 측 로직 (의사 코드)
class ClientPrediction {
  pendingInputs: PlayerInput[] = [];  // 아직 서버 확인 안된 입력들
  
  // 입력 발생 시
  onInput(input: PlayerInput) {
    // 1. 로컬 예측 적용
    this.applyInputLocally(input);
    
    // 2. 서버로 전송
    this.sendToServer(input);
    
    // 3. 대기 목록에 추가
    this.pendingInputs.push(input);
  }
  
  // 서버 상태 수신 시
  onServerState(serverState: GameState) {
    // 1. 서버 상태로 되돌리기
    this.applyServerState(serverState);
    
    // 2. 확인된 입력 제거
    this.pendingInputs = this.pendingInputs.filter(
      input => input.seq > serverState.lastProcessedSeq
    );
    
    // 3. 남은 입력 다시 적용 (re-predict)
    for (const input of this.pendingInputs) {
      this.applyInputLocally(input);
    }
  }
}
```

### 엔티티 보간 (Entity Interpolation)

```
[문제]
- 다른 플레이어의 위치는 서버에서만 받음
- 매 패킷마다 순간이동처럼 보임

[해결: 보간]
- 수신한 위치들 사이를 부드럽게 보간
- 약간의 지연(interpolation delay) 발생하지만 부드러움
```

```typescript
// 다른 플레이어 위치 보간 (의사 코드)
class EntityInterpolation {
  positionBuffer: PositionSnapshot[] = [];
  interpolationDelay = 100; // ms
  
  onPositionReceived(snapshot: PositionSnapshot) {
    this.positionBuffer.push(snapshot);
    // 오래된 것 제거
    this.cleanOldSnapshots();
  }
  
  getInterpolatedPosition(currentTime: number): Position {
    const renderTime = currentTime - this.interpolationDelay;
    
    // renderTime 기준 앞뒤 스냅샷 찾기
    const [before, after] = this.findSurroundingSnapshots(renderTime);
    
    // 선형 보간
    const t = (renderTime - before.time) / (after.time - before.time);
    return {
      x: before.x + (after.x - before.x) * t,
      y: before.y + (after.y - before.y) * t,
    };
  }
}
```

---

## 📊 틱 레이트 및 업데이트 주기

### 서버 틱 레이트

| 구분 | 값 | 설명 |
|------|-----|------|
| **서버 틱** | 20 Hz (50ms) | 게임 로직 업데이트 주기 `[논의 필요]` |
| **상태 전송** | 20 Hz | 클라이언트로 상태 브로드캐스트 |
| **입력 수집** | 60 Hz | 클라이언트 입력 샘플링 |

### 클라이언트 프레임

| 구분 | 값 | 설명 |
|------|-----|------|
| **렌더링** | 60 FPS | 화면 갱신 |
| **입력 전송** | 20~60 Hz | 서버 틱에 맞춰 조절 가능 |
| **보간 딜레이** | 100ms | 다른 플레이어 렌더링 지연 |

---

## 🔐 NAT 통과 및 연결

### 문제: NAT (Network Address Translation)

```
대부분의 가정/회사 네트워크는 NAT 뒤에 있음
→ 직접 P2P 연결이 어려움
→ 호스트의 서버에 게스트가 직접 접속 불가능할 수 있음
```

### 해결 방안

#### 옵션 1: 릴레이 서버 (TURN)
```
┌─────────┐         ┌─────────────┐         ┌─────────┐
│  호스트  │◄──────►│ 릴레이 서버  │◄──────►│  게스트  │
└─────────┘         └─────────────┘         └─────────┘

장점: 거의 항상 연결 가능
단점: 릴레이 서버 필요, 레이턴시 증가, 서버 비용
```

#### 옵션 2: STUN + 홀펀칭
```
┌─────────┐         ┌─────────────┐         ┌─────────┐
│  호스트  │──────►│ STUN 서버    │◄────────│  게스트  │
└─────────┘         └─────────────┘         └─────────┘
     │                                           │
     └──────────── 직접 연결 시도 ────────────────┘

장점: 직접 연결 시 레이턴시 최소
단점: 일부 NAT에서 실패 가능 (Symmetric NAT)
```

#### 현실적 접근: 하이브리드
```
1. STUN으로 직접 연결 시도
2. 실패 시 TURN 릴레이로 폴백
```

### 초대 코드 시스템

```typescript
interface InviteCode {
  code: string;           // "ABCD-1234" 형식
  hostId: string;         // 호스트 식별자
  createdAt: number;      // 생성 시각
  connectionInfo: {
    // 직접 연결용 (STUN 성공 시)
    publicIp?: string;
    publicPort?: number;
    // 릴레이 연결용
    relayServer?: string;
    relayToken?: string;
  };
}
```

### 시그널링 서버 역할

```
[시그널링 서버가 필요한 이유]
- 초대 코드 → 연결 정보 매핑
- STUN/TURN 과정 중개
- 연결 상태 추적

[최소 구현]
- 초대 코드 등록/조회 API
- WebSocket으로 연결 협상 중개
```

---

## 🚨 네트워크 이슈 처리

### 레이턴시 (Latency)

| 상태 | 레이턴시 | 대응 |
|------|---------|------|
| 양호 | < 50ms | 정상 플레이 |
| 보통 | 50-150ms | 클라이언트 예측으로 커버 |
| 나쁨 | 150-300ms | 경고 표시, 게임 가능 |
| 심각 | > 300ms | 강한 경고, 끊김 발생 가능 |

### 패킷 손실 (Packet Loss)

```
[WebSocket은 TCP 기반 → 재전송 보장]
- 하지만 재전송으로 인한 지연 발생 가능
- 순서 보장되지만 밀림 현상

[대응]
- 중요 메시지: 확인 응답(ACK) 필수
- 상태 업데이트: 최신 것만 사용 (오래된 것 버림)
- 입력: 시퀀스 번호로 순서 관리
```

### 연결 끊김

#### 게스트 연결 끊김
```
1. 서버에서 타임아웃 감지 (예: 5초간 응답 없음)
2. 해당 플레이어 사망 처리 또는 AI로 전환 `[논의 필요]`
3. 다른 플레이어들에게 알림
4. 재접속 허용 여부 `[논의 필요]`
```

#### 호스트 연결 끊김 / 이탈
```
⚠️ 호스트 = 서버이므로 게임 종료

1. 모든 클라이언트에 "호스트 이탈" 알림
2. 게임 강제 종료
3. 결과 화면으로 이동 (현재 상태 기준 순위?)

[추후 고려]
- 호스트 마이그레이션 (다른 플레이어가 호스트 승계)
- 게임 상태 저장/복구
```

### Ping/Heartbeat

```typescript
// 연결 상태 확인
const PING_INTERVAL = 1000;   // 1초마다 핑
const TIMEOUT = 5000;         // 5초간 응답 없으면 연결 끊김 간주

// 클라이언트
setInterval(() => {
  send({ type: 'PING', timestamp: Date.now() });
}, PING_INTERVAL);

// 서버
onMessage('PING', (msg, client) => {
  send(client, { type: 'PONG', timestamp: msg.timestamp });
  client.lastSeen = Date.now();
});

// 타임아웃 체크
setInterval(() => {
  for (const client of clients) {
    if (Date.now() - client.lastSeen > TIMEOUT) {
      handleDisconnect(client);
    }
  }
}, 1000);
```

---

## 🎮 게임 이벤트 동기화

### 중요 이벤트 목록

| 이벤트 | 권한 | 브로드캐스트 |
|--------|------|-------------|
| 플레이어 이동 | 클라이언트 입력, 서버 검증 | 모든 클라이언트 |
| 무기 발사 | 클라이언트 입력, 서버 검증 | 모든 클라이언트 |
| 데미지 판정 | 서버 전용 | 관련 클라이언트 |
| 사망 | 서버 전용 | 모든 클라이언트 |
| 아이템 획득 | 클라이언트 요청, 서버 승인 | 모든 클라이언트 |
| 자기장 업데이트 | 서버 전용 | 모든 클라이언트 |

### 히트 판정 (Hit Detection)

```
[옵션 A: 서버 측 판정 (권장)]
- 클라이언트: 발사 입력만 전송
- 서버: 발사 위치, 각도, 대상 위치로 판정
- 장점: 치팅 방지
- 단점: 레이턴시로 인한 "내가 쐈는데 안 맞음" 느낌

[옵션 B: 클라이언트 측 판정 + 서버 검증]
- 클라이언트: "나는 Player X를 맞췄다" 전송
- 서버: 타당성 검증 후 승인/거부
- 장점: 즉각적인 피드백
- 단점: 검증 로직 복잡, 치팅 가능성

[선택: 옵션 A] `[논의 필요]`
- 간단한 2D 게임이므로 서버 판정으로 충분
- 레이턴시 보정으로 완화
```

### 레이턴시 보정 (Lag Compensation)

```
[문제 상황]
- 플레이어 A가 플레이어 B를 조준하고 발사
- 그 사이 B는 이미 이동함 (네트워크 지연)
- 서버 기준으로는 B가 없는 곳을 쐈음

[해결: 서버 되감기 (Rewinding)]
1. 클라이언트가 발사 입력 + 로컬 타임스탬프 전송
2. 서버는 해당 시점의 게임 상태를 재구성
3. 그 시점 기준으로 히트 판정
4. 결과 적용
```

---

## 📦 대역폭 최적화

### 상태 압축

```typescript
// 전체 상태 대신 델타만 전송
interface StateDelta {
  tick: number;
  changes: {
    playerId?: string;
    field: string;      // "position", "hp", etc.
    value: any;
  }[];
}

// 예: 위치만 변경된 경우
{
  tick: 1234,
  changes: [
    { playerId: "p1", field: "position", value: { x: 100, y: 200 } }
  ]
}
```

### 관심 영역 (Area of Interest)

```
[32명 전원의 상태를 항상 전송? → 비효율적]

최적화:
- 시야 내 플레이어: 상세 정보 (위치, 무기, 애니메이션)
- 시야 외 플레이어: 대략적 정보 또는 생략
- 미니맵용: 모든 플레이어 위치만 (축약)
```

### 예상 대역폭

| 구분 | 크기 | 빈도 | 대역폭 |
|------|------|------|--------|
| 플레이어 입력 (업로드) | ~50 bytes | 20 Hz | ~1 KB/s |
| 게임 상태 (다운로드) | ~2 KB | 20 Hz | ~40 KB/s |
| **총 (32인 기준)** | - | - | **~50 KB/s** |

---

## 🔒 보안 고려사항

### 당장은 최소한만 구현

| 항목 | 당장 | 추후 |
|------|------|------|
| 입력 검증 | ✅ 기본 검증 | 고도화 |
| 속도 핵 방지 | ✅ 서버 측 이동 계산 | - |
| 에임 핵 방지 | ⏳ | 통계 기반 탐지 |
| 패킷 변조 | ⏳ | 암호화/서명 |
| DDoS | ⏳ | Rate limiting |

### 기본 입력 검증

```typescript
// 서버 측 검증 예시
function validateInput(input: PlayerInput, player: Player): boolean {
  // 이동 속도 제한
  const maxSpeed = player.isSprinting ? MAX_SPRINT_SPEED : MAX_WALK_SPEED;
  const inputSpeed = Math.sqrt(input.movement.x ** 2 + input.movement.y ** 2);
  if (inputSpeed > 1.1) return false; // 약간의 여유
  
  // 발사 속도 제한 (연사 핵)
  if (input.actions.fire) {
    const timeSinceLastFire = Date.now() - player.lastFireTime;
    if (timeSinceLastFire < player.weapon.fireRate * 0.9) return false;
  }
  
  return true;
}
```

---

## ⚠️ 미결정 사항 요약

### 우선순위 높음
- [ ] 시그널링/릴레이 서버 구성 방법
- [ ] NAT 통과 전략 최종 결정
- [ ] 서버 틱 레이트 확정

### 우선순위 중간
- [ ] 연결 끊김 시 처리 (사망 vs AI 전환 vs 재접속)
- [ ] 히트 판정 방식 최종 확정
- [ ] 레이턴시 보정 범위

### 우선순위 낮음
- [ ] 호스트 마이그레이션
- [ ] 고급 보안 기능
- [ ] 대역폭 최적화 고도화

---

## 📚 관련 문서

- 전체 구조 → `blueprint.md`
- 기술 스택 → `specBook.md`
- 코드 구조 → `codeBook.md`
- 테스트 → `testBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-14 | 0.1.0 | 최초 작성, 호스트 기반 아키텍처 정의 | - |
