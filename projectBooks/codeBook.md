# 💻 CodeBook - 코드 구조 및 설계서

> **최초 작성일**: 2026-01-14  
> **마지막 수정**: 2026-01-14  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 **코드 아키텍처, 모듈 구조, 디자인 패턴, 핵심 클래스 설계**를 정의합니다.

---

## 🏗️ 아키텍처 개요

### 계층 구조

```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                       │
│  (React Components, Canvas Renderer, UI)                 │
├─────────────────────────────────────────────────────────┤
│                   Game Layer                             │
│  (Game Loop, Entities, Systems, Input)                   │
├─────────────────────────────────────────────────────────┤
│                 Network Layer                            │
│  (WebSocket Client/Server, Sync, Messages)               │
├─────────────────────────────────────────────────────────┤
│                  Shared Layer                            │
│  (Types, Constants, Utils, Protocol)                     │
└─────────────────────────────────────────────────────────┘
```

### 클라이언트/서버 코드 분리

```
┌─────────────────┐         ┌─────────────────┐
│     Client      │         │     Server      │
│  (브라우저)      │         │  (Node.js)      │
├─────────────────┤         ├─────────────────┤
│ - 렌더링        │         │ - 게임 로직     │
│ - 입력 처리     │         │ - 권위적 상태   │
│ - 예측/보간     │         │ - AI 봇         │
│ - UI           │         │ - 입력 검증     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │   Shared    │
              │  (공용 코드)  │
              ├─────────────┤
              │ - 타입 정의  │
              │ - 상수      │
              │ - 유틸리티  │
              │ - 프로토콜  │
              └─────────────┘
```

---

## 📁 모듈 구조

### Client (packages/client)

```
src/
├── main.tsx                    # 엔트리포인트
├── App.tsx                     # 루트 컴포넌트
│
├── components/                 # React 컴포넌트
│   ├── screens/                # 화면 단위
│   │   ├── MainMenu.tsx
│   │   ├── Lobby.tsx
│   │   ├── GameScreen.tsx
│   │   └── ResultScreen.tsx
│   │
│   ├── hud/                    # 게임 내 HUD
│   │   ├── HealthBar.tsx
│   │   ├── WeaponSlots.tsx
│   │   ├── MiniMap.tsx
│   │   ├── KillFeed.tsx
│   │   └── ZoneTimer.tsx
│   │
│   └── ui/                     # 공용 UI
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Input.tsx
│
├── game/                       # 게임 코어
│   ├── core/
│   │   ├── Game.ts             # 게임 메인 클래스
│   │   ├── GameLoop.ts         # 게임 루프
│   │   └── Renderer.ts         # Canvas 렌더러
│   │
│   ├── entities/               # 엔티티
│   │   ├── Entity.ts           # 베이스 엔티티
│   │   ├── Player.ts
│   │   ├── Projectile.ts
│   │   ├── Item.ts
│   │   └── Zone.ts
│   │
│   ├── systems/                # 시스템 (ECS 스타일)
│   │   ├── MovementSystem.ts
│   │   ├── CollisionSystem.ts
│   │   ├── RenderSystem.ts
│   │   └── InputSystem.ts
│   │
│   ├── input/
│   │   ├── InputManager.ts
│   │   └── KeyBindings.ts
│   │
│   └── world/
│       ├── Map.ts
│       └── Camera.ts
│
├── network/
│   ├── NetworkClient.ts        # WebSocket 클라이언트
│   ├── MessageHandler.ts       # 메시지 처리
│   └── Prediction.ts           # 클라이언트 예측
│
├── store/                      # Zustand 스토어
│   ├── gameStore.ts
│   ├── uiStore.ts
│   └── settingsStore.ts
│
├── assets/                     # 에셋 관리
│   ├── AssetManager.ts
│   └── AssetManifest.ts
│
└── utils/
    └── helpers.ts
```

### Server (packages/server)

```
src/
├── index.ts                    # 엔트리포인트
│
├── network/
│   ├── WebSocketServer.ts      # WS 서버
│   ├── ConnectionManager.ts    # 연결 관리
│   └── MessageHandler.ts       # 메시지 처리
│
├── game/
│   ├── GameRoom.ts             # 게임 룸 (방 하나)
│   ├── GameLoop.ts             # 서버 게임 루프
│   ├── GameState.ts            # 게임 상태 관리
│   │
│   ├── entities/
│   │   ├── ServerPlayer.ts
│   │   ├── ServerProjectile.ts
│   │   └── ServerItem.ts
│   │
│   └── systems/
│       ├── MovementSystem.ts
│       ├── CombatSystem.ts
│       ├── ZoneSystem.ts
│       └── ItemSystem.ts
│
├── ai/
│   ├── BotController.ts        # AI 봇 컨트롤러
│   ├── BotBehavior.ts          # 행동 로직
│   └── BotPathfinding.ts       # 경로 탐색
│
└── utils/
    └── helpers.ts
```

### Shared (packages/shared)

```
src/
├── types/
│   ├── game.ts                 # 게임 관련 타입
│   ├── network.ts              # 네트워크 메시지 타입
│   ├── player.ts               # 플레이어 타입
│   ├── weapon.ts               # 무기 타입
│   └── item.ts                 # 아이템 타입
│
├── constants/
│   ├── game.ts                 # 게임 상수
│   ├── weapons.ts              # 무기 데이터
│   ├── items.ts                # 아이템 데이터
│   └── zone.ts                 # 자기장 설정
│
├── protocol/
│   ├── messages.ts             # 메시지 정의
│   └── serialization.ts        # 직렬화
│
└── utils/
    ├── math.ts                 # 수학 유틸
    ├── collision.ts            # 충돌 계산
    └── damage.ts               # 데미지 계산
```

---

## 🎮 핵심 클래스 설계

### Game (클라이언트 메인)

```typescript
// packages/client/src/game/core/Game.ts

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private gameLoop: GameLoop;
  private networkClient: NetworkClient;
  private inputManager: InputManager;
  private assetManager: AssetManager;
  
  // 게임 상태
  private gameState: GameState;
  private localPlayer: Player | null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));
    // ...
  }
  
  // 서버 연결
  async connect(inviteCode: string): Promise<void> { }
  
  // 게임 시작
  start(): void {
    this.gameLoop.start();
  }
  
  // 매 틱 업데이트 (고정 시간)
  private update(dt: number): void {
    this.inputManager.update();
    this.processLocalInput();
    this.interpolateEntities();
    // ...
  }
  
  // 매 프레임 렌더링 (가변 시간)
  private render(alpha: number): void {
    this.renderer.clear();
    this.renderer.renderWorld(this.gameState, alpha);
    this.renderer.renderUI();
  }
  
  // 정리
  destroy(): void {
    this.gameLoop.stop();
    this.networkClient.disconnect();
  }
}
```

### GameLoop

```typescript
// packages/client/src/game/core/GameLoop.ts

class GameLoop {
  private readonly TICK_RATE = 1000 / 20;  // 20 Hz
  private running: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  
  private updateFn: (dt: number) => void;
  private renderFn: (alpha: number) => void;
  
  constructor(update: (dt: number) => void, render: (alpha: number) => void) {
    this.updateFn = update;
    this.renderFn = render;
  }
  
  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }
  
  stop(): void {
    this.running = false;
  }
  
  private loop(currentTime: number): void {
    if (!this.running) return;
    
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;
    
    // 고정 시간 업데이트
    while (this.accumulator >= this.TICK_RATE) {
      this.updateFn(this.TICK_RATE);
      this.accumulator -= this.TICK_RATE;
    }
    
    // 보간된 렌더링
    const alpha = this.accumulator / this.TICK_RATE;
    this.renderFn(alpha);
    
    requestAnimationFrame(this.loop.bind(this));
  }
}
```

### Entity (베이스)

```typescript
// packages/client/src/game/entities/Entity.ts

abstract class Entity {
  id: string;
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  
  // 렌더링용 이전 상태 (보간)
  previousPosition: Vector2;
  previousRotation: number;
  
  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.rotation = 0;
    this.previousPosition = this.position.clone();
    this.previousRotation = 0;
  }
  
  // 상태 저장 (보간 전)
  saveState(): void {
    this.previousPosition = this.position.clone();
    this.previousRotation = this.rotation;
  }
  
  // 보간된 위치
  getInterpolatedPosition(alpha: number): Vector2 {
    return Vector2.lerp(this.previousPosition, this.position, alpha);
  }
  
  abstract update(dt: number): void;
  abstract render(renderer: Renderer, alpha: number): void;
}
```

### Player

```typescript
// packages/client/src/game/entities/Player.ts

class Player extends Entity {
  // 상태
  hp: number;
  maxHp: number;
  isAlive: boolean;
  
  // 방어구
  helmet: Armor | null;
  vest: Armor | null;
  boots: Armor | null;
  
  // 무기
  primaryWeapons: Weapon[];  // 2개
  secondaryWeapon: Weapon | null;  // 1개
  currentWeaponIndex: number;
  
  // 인벤토리
  inventory: InventoryItem[];
  ammo: Map<AmmoType, number>;
  
  // 이동 상태
  isMoving: boolean;
  isRunning: boolean;
  movementDirection: Vector2;
  
  // 플레이어 타입
  isLocalPlayer: boolean;
  isBot: boolean;
  
  constructor(id: string, x: number, y: number, isLocal: boolean = false) {
    super(id, x, y);
    this.hp = 100;
    this.maxHp = 100;
    this.isAlive = true;
    this.isLocalPlayer = isLocal;
    // ...
  }
  
  update(dt: number): void {
    if (!this.isAlive) return;
    
    // 이동 적용
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }
  
  render(renderer: Renderer, alpha: number): void {
    const pos = this.getInterpolatedPosition(alpha);
    
    if (renderer.isDebugMode()) {
      // 디버그: 원으로 표시
      const color = this.isLocalPlayer ? 'blue' : 'red';
      renderer.drawCircle(pos.x, pos.y, 16, color);
    } else {
      // 프로덕션: 스프라이트
      renderer.drawSprite('player', pos.x, pos.y, this.rotation);
    }
    
    // 체력바
    this.renderHealthBar(renderer, pos);
  }
  
  takeDamage(damage: number, source: DamageSource): number {
    // 방어구 적용
    const finalDamage = this.calculateDamageWithArmor(damage, source);
    this.hp = Math.max(0, this.hp - finalDamage);
    
    if (this.hp === 0) {
      this.die();
    }
    
    return finalDamage;
  }
  
  private die(): void {
    this.isAlive = false;
    // 아이템 드랍 등
  }
}
```

### Renderer

```typescript
// packages/client/src/game/core/Renderer.ts

class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private debugMode: boolean;
  private assetManager: AssetManager;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.debugMode = true;  // 기본은 디버그
  }
  
  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }
  
  isDebugMode(): boolean {
    return this.debugMode;
  }
  
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  // 카메라 변환 적용
  beginWorldRender(): void {
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
  }
  
  endWorldRender(): void {
    this.ctx.restore();
  }
  
  // 디버그 도형
  drawCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }
  
  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
  
  // 스프라이트
  drawSprite(name: string, x: number, y: number, rotation: number): void {
    const sprite = this.assetManager.getSprite(name);
    if (!sprite) return;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    this.ctx.restore();
  }
  
  // 자기장
  renderZone(zone: Zone): void {
    // 자기장 외부 어둡게
    // 경계선 붉은색
  }
}
```

---

## 🌐 네트워크 클래스

### NetworkClient (클라이언트)

```typescript
// packages/client/src/network/NetworkClient.ts

class NetworkClient {
  private socket: WebSocket | null = null;
  private messageHandler: MessageHandler;
  private pendingInputs: PlayerInput[] = [];
  private lastProcessedSeq: number = 0;
  
  constructor(messageHandler: MessageHandler) {
    this.messageHandler = messageHandler;
  }
  
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => resolve();
      this.socket.onerror = (e) => reject(e);
      this.socket.onmessage = (e) => this.onMessage(e);
      this.socket.onclose = () => this.onClose();
    });
  }
  
  disconnect(): void {
    this.socket?.close();
  }
  
  send(message: NetworkMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
  
  sendInput(input: PlayerInput): void {
    this.pendingInputs.push(input);
    this.send({
      type: 'PLAYER_INPUT',
      timestamp: Date.now(),
      payload: input
    });
  }
  
  private onMessage(event: MessageEvent): void {
    const message = JSON.parse(event.data) as NetworkMessage;
    this.messageHandler.handle(message);
    
    // 서버 상태 수신 시 예측 조정
    if (message.type === 'GAME_STATE') {
      this.reconcile(message.payload);
    }
  }
  
  // 서버 조정 (예측 보정)
  private reconcile(serverState: GameState): void {
    this.lastProcessedSeq = serverState.lastProcessedSeq;
    
    // 확인된 입력 제거
    this.pendingInputs = this.pendingInputs.filter(
      input => input.seq > this.lastProcessedSeq
    );
  }
}
```

### GameRoom (서버)

```typescript
// packages/server/src/game/GameRoom.ts

class GameRoom {
  id: string;
  inviteCode: string;
  
  // 연결된 플레이어
  private players: Map<string, ServerPlayer>;
  private connections: Map<string, WebSocket>;
  
  // 게임 상태
  private gameState: GameState;
  private gameLoop: GameLoop;
  private isRunning: boolean;
  
  // 설정
  private maxPlayers: number;
  private botCount: number;
  
  constructor(hostId: string, maxPlayers: number = 32) {
    this.id = generateId();
    this.inviteCode = generateInviteCode();
    this.maxPlayers = maxPlayers;
    this.players = new Map();
    this.connections = new Map();
    this.gameState = new GameState();
    this.isRunning = false;
  }
  
  // 플레이어 참가
  addPlayer(playerId: string, socket: WebSocket): void {
    const player = new ServerPlayer(playerId);
    this.players.set(playerId, player);
    this.connections.set(playerId, socket);
    
    this.broadcast({
      type: 'PLAYER_JOIN',
      payload: { playerId }
    });
  }
  
  // 게임 시작
  startGame(): void {
    this.spawnPlayers();
    this.spawnBots(this.maxPlayers - this.players.size);
    this.spawnItems();
    
    this.isRunning = true;
    this.gameLoop = new GameLoop(this.update.bind(this));
    this.gameLoop.start();
    
    this.broadcast({ type: 'GAME_START' });
  }
  
  // 매 틱 업데이트
  private update(dt: number): void {
    // 입력 처리
    this.processInputs();
    
    // 시스템 업데이트
    this.gameState.update(dt);
    
    // 봇 AI
    this.updateBots(dt);
    
    // 자기장
    this.updateZone(dt);
    
    // 상태 브로드캐스트
    this.broadcastState();
    
    // 게임 종료 체크
    this.checkGameEnd();
  }
  
  // 상태 전송
  private broadcastState(): void {
    const state = this.gameState.serialize();
    this.broadcast({
      type: 'GAME_STATE',
      timestamp: Date.now(),
      payload: state
    });
  }
  
  // 전체 전송
  private broadcast(message: NetworkMessage): void {
    const data = JSON.stringify(message);
    for (const socket of this.connections.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}
```

---

## 🧩 디자인 패턴

### 1. Entity-Component 스타일

```typescript
// 완전한 ECS는 아니지만, 컴포넌트 기반 설계

interface HealthComponent {
  hp: number;
  maxHp: number;
}

interface PositionComponent {
  x: number;
  y: number;
}

interface WeaponComponent {
  weapons: Weapon[];
  currentIndex: number;
}

// Player는 여러 컴포넌트의 조합
class Player implements HealthComponent, PositionComponent, WeaponComponent {
  // ...
}
```

### 2. Observer 패턴 (이벤트)

```typescript
// 게임 이벤트 시스템

type GameEventType = 
  | 'PLAYER_DAMAGE'
  | 'PLAYER_DEATH'
  | 'ITEM_PICKUP'
  | 'ZONE_SHRINK';

interface GameEvent {
  type: GameEventType;
  payload: unknown;
}

class EventEmitter {
  private listeners: Map<GameEventType, Function[]> = new Map();
  
  on(type: GameEventType, callback: Function): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }
  
  emit(event: GameEvent): void {
    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach(cb => cb(event.payload));
  }
}
```

### 3. State 패턴 (게임 상태)

```typescript
// 게임 상태 머신

interface GameScreenState {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(): void;
}

class MenuState implements GameScreenState { }
class LobbyState implements GameScreenState { }
class PlayingState implements GameScreenState { }
class ResultState implements GameScreenState { }

class GameStateMachine {
  private currentState: GameScreenState;
  
  changeState(newState: GameScreenState): void {
    this.currentState?.exit();
    this.currentState = newState;
    this.currentState.enter();
  }
}
```

### 4. Factory 패턴

```typescript
// 무기/아이템 생성

class WeaponFactory {
  static create(type: WeaponType): Weapon {
    const data = WEAPON_DATA[type];
    return new Weapon(data);
  }
}

class ItemFactory {
  static create(type: ItemType): Item {
    switch (type) {
      case 'AMMO': return new AmmoItem(...);
      case 'HEAL': return new HealItem(...);
      case 'ARMOR': return new ArmorItem(...);
      // ...
    }
  }
}
```

---

## 📊 데이터 흐름

### 입력 → 렌더링 흐름

```
[입력]
   │
   ▼
┌─────────────────┐
│ InputManager    │ ─── 키/마우스 이벤트 캡처
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Local Prediction│ ─── 즉시 로컬 적용 (부드러운 반응)
└────────┬────────┘
         │
         ├──────────────────────────┐
         │                          ▼
         │                  ┌───────────────┐
         │                  │ NetworkClient │ ─── 서버로 전송
         │                  └───────┬───────┘
         │                          │
         │                          ▼
         │                  ┌───────────────┐
         │                  │    Server     │ ─── 검증 & 처리
         │                  └───────┬───────┘
         │                          │
         ▼                          ▼
┌─────────────────┐         ┌───────────────┐
│   Game State    │ ◄────── │ State Update  │ ─── 서버 상태 수신
└────────┬────────┘         └───────────────┘
         │
         ▼
┌─────────────────┐
│    Renderer     │ ─── 화면에 그리기
└─────────────────┘
```

### 상태 동기화 흐름

```
[서버]                              [클라이언트]
   │                                     │
   │ ──── GAME_STATE (20Hz) ──────────► │
   │                                     │
   │                              ┌──────▼──────┐
   │                              │ 상태 적용    │
   │                              │ 보간 준비    │
   │                              └──────┬──────┘
   │                                     │
   │                              ┌──────▼──────┐
   │                              │ 예측 조정    │
   │                              │ (Reconcile) │
   │                              └──────┬──────┘
   │                                     │
   │                              ┌──────▼──────┐
   │                              │ 렌더링      │
   │                              │ (보간 적용)  │
   │                              └─────────────┘
```

---

## 🔧 유틸리티

### Vector2

```typescript
// packages/shared/src/utils/math.ts

class Vector2 {
  constructor(public x: number, public y: number) {}
  
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
  
  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }
  
  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }
  
  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }
  
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return this.scale(1 / len);
  }
  
  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return new Vector2(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }
  
  static distance(a: Vector2, b: Vector2): number {
    return a.sub(b).length();
  }
  
  static angle(from: Vector2, to: Vector2): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }
}
```

### Collision

```typescript
// packages/shared/src/utils/collision.ts

function circleCircle(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < r1 + r2;
}

function rectRect(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return x1 < x2 + w2 &&
         x1 + w1 > x2 &&
         y1 < y2 + h2 &&
         y1 + h1 > y2;
}

function lineRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): { hit: boolean; point?: Vector2 } {
  // 레이캐스트 (총알 → 벽)
  // ...
}
```

---

## ⚠️ 미결정 사항 요약

### 우선순위 높음
- [ ] 충돌 시스템 상세 설계
- [ ] 무기 발사/히트 판정 구현 방식

### 우선순위 중간
- [ ] 에셋 로딩 전략 상세
- [ ] 에러 핸들링 전략

### 우선순위 낮음
- [ ] 성능 최적화 전략
- [ ] 디버깅 도구

---

## 📚 관련 문서

- 기술 스택 → `specBook.md`
- 네트워크 상세 → `spiderBook.md`
- 빌드/배포 → `buildersBook.md`
- 테스트 → `testBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-14 | 0.1.0 | 최초 작성, 코드 구조 초안 | - |
