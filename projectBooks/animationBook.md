# 🎬 AnimationBook - 애니메이션 설계서

> **최초 작성일**: 2026-01-14  
> **마지막 수정**: 2026-01-14  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 **게임 내 모든 애니메이션의 종류, 프레임 구성, 전환 규칙, 구현 방식**을 정의합니다.

---

## 🎯 애니메이션 시스템 개요

### 기본 원칙
```
1. 스프라이트 기반 프레임 애니메이션
2. 상태 머신으로 애니메이션 전환 관리
3. 디버그 모드에서는 애니메이션 생략 (정적 도형)
4. 부드러운 전환을 위한 블렌딩
```

### 애니메이션 카테고리

| 카테고리 | 대상 | 예시 |
|----------|------|------|
| **캐릭터** | 플레이어, 봇 | 이동, 공격, 피격 |
| **무기** | 총기 | 발사, 재장전 |
| **이펙트** | VFX | 폭발, 머즐플래시 |
| **환경** | 맵 오브젝트 | 문 열림, 깃발 |
| **UI** | 인터페이스 | 버튼 호버, 전환 |

---

## 👤 캐릭터 애니메이션

### 상태 목록

| 상태 | 프레임 수 | FPS | 루프 | 설명 |
|------|----------|-----|------|------|
| **idle** | 4 | 4 | ✅ | 대기 상태 |
| **walk** | 6 | 8 | ✅ | 걷기 |
| **run** | 6 | 12 | ✅ | 달리기 |
| **attack** | 3 | 15 | ❌ | 공격/사격 |
| **reload** | 4-8 | 10 | ❌ | 재장전 |
| **hit** | 2 | 10 | ❌ | 피격 |
| **death** | 6 | 8 | ❌ | 사망 |
| **vault** | 4 | 10 | ❌ | 창문/담 넘기 |
| **roll** | 6 | 15 | ❌ | 구르기 (차후) |

### 방향 (8방향)

```
        N (0°)
    NW  │  NE
      ╲ │ ╱
  W ───┼─── E
      ╱ │ ╲
    SW  │  SE
        S (180°)
```

각 상태마다 8방향 스프라이트 필요  
(또는 4방향 + 좌우 반전)

### 상태 머신

```typescript
// 애니메이션 상태 머신
class CharacterAnimator {
  private currentState: AnimationState = 'idle';
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private direction: Direction = 'S';
  
  // 상태 전환
  setState(newState: AnimationState): void {
    if (this.currentState === newState) return;
    if (!this.canTransition(this.currentState, newState)) return;
    
    this.currentState = newState;
    this.currentFrame = 0;
    this.frameTimer = 0;
  }
  
  // 전환 가능 여부
  private canTransition(from: AnimationState, to: AnimationState): boolean {
    // 사망 상태에서는 전환 불가
    if (from === 'death') return false;
    
    // 특정 애니메이션은 완료까지 대기
    if (this.isLocked()) return false;
    
    return true;
  }
  
  // 락 상태 (완료까지 대기)
  private isLocked(): boolean {
    const lockedStates = ['attack', 'reload', 'vault', 'roll'];
    return lockedStates.includes(this.currentState) && 
           !this.isAnimationComplete();
  }
  
  // 프레임 업데이트
  update(dt: number): void {
    const anim = ANIMATIONS[this.currentState];
    this.frameTimer += dt;
    
    const frameDuration = 1000 / anim.fps;
    if (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.currentFrame++;
      
      if (this.currentFrame >= anim.frameCount) {
        if (anim.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = anim.frameCount - 1;
          this.onAnimationEnd();
        }
      }
    }
  }
  
  // 현재 스프라이트 가져오기
  getCurrentSprite(): SpriteFrame {
    return {
      state: this.currentState,
      direction: this.direction,
      frame: this.currentFrame
    };
  }
}
```

### 전환 규칙

```
[우선순위]
death > hit > vault/roll > reload > attack > run > walk > idle

[자동 전환]
- 이동 중 → walk/run
- 이동 멈춤 → idle
- 공격 완료 → 이전 상태
- 재장전 완료 → 이전 상태
```

---

## 🔫 무기 애니메이션

### 발사 애니메이션

| 무기 종류 | 프레임 | FPS | 특징 |
|-----------|--------|-----|------|
| 권총 | 2 | 30 | 빠른 반동 |
| SMG | 2 | 60 | 매우 빠른 반복 |
| 소총 | 3 | 30 | 중간 반동 |
| 샷건 | 3 | 20 | 큰 반동 |
| SR | 4 | 15 | 느린 볼트 액션 |
| MG | 2 | 40 | 연속 반동 |

### 재장전 애니메이션

| 무기 종류 | 프레임 | 총 시간 | 특징 |
|-----------|--------|--------|------|
| 권총 | 4 | 1.0초 | 탄창 교체 |
| SMG | 6 | 1.5초 | 탄창 + 코킹 |
| 소총 | 8 | 2.0초 | 탄창 + 볼트 |
| 샷건 (펌프) | N개 | N × 0.5초 | 탄 하나씩 |
| MG | 10 | 3.0초 | 벨트/박스 교체 |
| SR | 6 | 2.0초 | 볼트 + 탄 |

### 머즐 플래시

```typescript
interface MuzzleFlash {
  frames: 3;
  duration: 50;  // ms
  offset: Vector2;  // 무기 끝 위치
  scale: number;    // 무기별 크기
}
```

---

## 💥 이펙트 애니메이션

### 이펙트 목록

| 이펙트 | 프레임 | 크기 | 지속시간 |
|--------|--------|------|----------|
| **머즐플래시** | 3 | 16×16 | 50ms |
| **피격 스파크** | 3 | 16×16 | 100ms |
| **피 튀김** | 4 | 24×24 | 150ms |
| **폭발 (소)** | 6 | 32×32 | 300ms |
| **폭발 (대)** | 8 | 64×64 | 400ms |
| **연막** | 루프 | 128×128 | 10초 |
| **착탄 먼지** | 4 | 16×16 | 200ms |
| **문 열림** | 4 | 32×32 | 300ms |

### 이펙트 스포너

```typescript
class EffectManager {
  private activeEffects: Effect[] = [];
  
  spawn(type: EffectType, position: Vector2, rotation?: number): void {
    const effect = new Effect(type, position, rotation);
    this.activeEffects.push(effect);
  }
  
  update(dt: number): void {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.update(dt);
      
      if (effect.isComplete()) {
        this.activeEffects.splice(i, 1);
      }
    }
  }
  
  render(renderer: Renderer): void {
    for (const effect of this.activeEffects) {
      effect.render(renderer);
    }
  }
}
```

---

## 🚪 환경 애니메이션

### 문

```typescript
interface DoorAnimation {
  state: 'closed' | 'opening' | 'open' | 'closing';
  progress: number;  // 0-1
  duration: 300;     // ms
}

// 문 열림/닫힘은 90도 회전
function renderDoor(door: Door, renderer: Renderer): void {
  const angle = door.progress * (Math.PI / 2);  // 0 ~ 90도
  renderer.drawRotatedSprite('door', door.position, angle);
}
```

### 창문/반벽 넘기

```
플레이어가 창문/반벽 넘을 때:
1. vault 애니메이션 시작
2. 이동/공격 불가
3. 4프레임 (약 400ms)
4. 반대편으로 위치 이동
5. 원래 상태로 복귀
```

---

## 🖥️ UI 애니메이션

### 트랜지션

| 요소 | 애니메이션 | 시간 |
|------|-----------|------|
| 화면 전환 | 페이드 인/아웃 | 300ms |
| 모달 열기 | 스케일 업 + 페이드 | 200ms |
| 모달 닫기 | 스케일 다운 + 페이드 | 150ms |
| 버튼 호버 | 스케일 1.05 | 100ms |
| 버튼 클릭 | 스케일 0.95 → 1.0 | 100ms |

### HUD 애니메이션

| 요소 | 트리거 | 애니메이션 |
|------|--------|-----------|
| 체력바 | 데미지 | 흔들림 + 깜빡임 |
| 탄약 | 발사 | 숫자 펄스 |
| 킬피드 | 킬 발생 | 슬라이드 인 → 페이드 아웃 |
| 생존자 수 | 변경 | 숫자 펄스 |

### CSS 애니메이션 예시

```css
/* 데미지 효과 */
@keyframes damage-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.health-bar.damaged {
  animation: damage-shake 0.2s ease;
}

/* 킬피드 */
@keyframes killfeed-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.killfeed-item {
  animation: killfeed-in 0.3s ease;
}
```

---

## ⏱️ 타이밍

### 프레임 레이트

```
게임: 60 FPS
애니메이션: 개별 FPS (4-30)
보간: 렌더링 시 alpha 적용
```

### 동기화

```typescript
// 애니메이션과 게임 로직 동기화
class AnimationSync {
  // 재장전 완료 시점
  onReloadComplete(): void {
    this.player.weapon.reload();
    this.animator.setState('idle');
  }
  
  // 공격 타이밍 (프레임 이벤트)
  onAttackFrame(frame: number): void {
    if (frame === 1) {  // 발사 프레임
      this.player.fireWeapon();
    }
  }
}
```

---

## 📐 스프라이트 시트 구조

### 레이아웃

```
[player_default.png]

        F0  F1  F2  F3  F4  F5  ...
idle    ├───┼───┼───┼───┤
walk    ├───┼───┼───┼───┼───┼───┤
run     ├───┼───┼───┼───┼───┼───┤
attack  ├───┼───┼───┤
reload  ├───┼───┼───┼───┼───┼───┼───┼───┤
...

각 행: 상태
각 열: 프레임
8방향은 별도 시트 또는 행 확장
```

### 메타데이터

```json
{
  "texture": "player_default.png",
  "frameWidth": 16,
  "frameHeight": 24,
  "animations": {
    "idle": {
      "row": 0,
      "frames": 4,
      "fps": 4,
      "loop": true
    },
    "walk": {
      "row": 1,
      "frames": 6,
      "fps": 8,
      "loop": true
    },
    "attack": {
      "row": 3,
      "frames": 3,
      "fps": 15,
      "loop": false,
      "events": {
        "1": "fire"
      }
    }
  }
}
```

---

## 🔧 구현

### AnimationController

```typescript
class AnimationController {
  private animations: Map<string, Animation>;
  private current: Animation | null = null;
  private frame: number = 0;
  private timer: number = 0;
  
  load(manifest: AnimationManifest): void {
    // 스프라이트 시트 로드 및 파싱
  }
  
  play(name: string): void {
    if (this.current?.name === name) return;
    
    this.current = this.animations.get(name)!;
    this.frame = 0;
    this.timer = 0;
  }
  
  update(dt: number): void {
    if (!this.current) return;
    
    this.timer += dt;
    const frameDuration = 1000 / this.current.fps;
    
    while (this.timer >= frameDuration) {
      this.timer -= frameDuration;
      this.advanceFrame();
    }
  }
  
  private advanceFrame(): void {
    this.frame++;
    
    // 프레임 이벤트 체크
    const event = this.current.events?.[this.frame];
    if (event) this.triggerEvent(event);
    
    // 루프/완료 처리
    if (this.frame >= this.current.frameCount) {
      if (this.current.loop) {
        this.frame = 0;
      } else {
        this.frame = this.current.frameCount - 1;
        this.onComplete();
      }
    }
  }
  
  getSourceRect(): Rectangle {
    return {
      x: this.frame * this.current.frameWidth,
      y: this.current.row * this.current.frameHeight,
      width: this.current.frameWidth,
      height: this.current.frameHeight
    };
  }
}
```

---

## ⚠️ 미결정 사항 요약

- 일단 시야는 마우스로 결정하므로 360도 부드럽게 회전이 가능해야 함.

### 우선순위 높음
- [ ] 8방향 vs 4방향 최종 결정
- [ ] 프레임 수/FPS 확정

### 우선순위 중간
- [ ] 애니메이션 블렌딩 필요 여부
- [ ] 이펙트 파티클 시스템 도입

### 우선순위 낮음
- [ ] 스켈레탈 애니메이션 (고급)
- [ ] 절차적 애니메이션

---

## 📚 관련 문서

- 에셋 규격 → `artBook.md`
- 코드 구조 → `codeBook.md`
- 테스트 → `testBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-14 | 0.1.0 | 최초 작성, 애니메이션 설계 초안 | - |
