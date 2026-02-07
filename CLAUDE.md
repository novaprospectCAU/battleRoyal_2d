# Battle Royal 2D

2D 배틀로얄 게임 — TypeScript 모노레포 (npm workspaces)

## Quick Reference

```bash
npm install              # 의존성 설치
npm run dev:client       # 클라이언트 개발 서버 (Vite, port 5173)
npm run dev:server       # 게임 서버 (tsx watch)
npm run build            # 전체 빌드
npm run lint             # ESLint (전체)
npm run test             # Vitest (shared 패키지)
```

## 아키텍처

```
packages/
├── client/    # React + Canvas 2D 클라이언트 (Vite)
├── server/    # WebSocket 게임 서버 (ws + tsx)
└── shared/    # 타입, 상수, 유틸, 프로토콜 (공유 라이브러리)
```

### client (`packages/client/`)
- `src/components/screens/` — React UI (MainMenu, GameScreen)
- `src/game/core/` — Game.ts (진입점), GameLoop.ts, Renderer.ts (Canvas)
- `src/game/entities/` — Player.ts, Projectile.ts
- `src/game/ai/` — BotAI.ts (AI 봇 로직)
- `src/game/input/` — InputManager.ts (키보드/마우스)
- `src/game/world/` — Camera.ts, TileMap.ts, Zone.ts (자기장)

### server (`packages/server/`)
- `src/index.ts` — WebSocket 서버 엔트리포인트

### shared (`packages/shared/`)
- `src/types/` — 게임 타입 정의 (player, weapon, item, map, network, game)
- `src/constants/` — 게임 상수 (game, weapons, map, zone, ai)
- `src/utils/` — 수학(Vector2, clamp), 충돌(circleCircle, rectRect 등)
- `src/protocol/` — 클라이언트-서버 메시지 프로토콜

## 핵심 패턴

- **Game loop과 React 분리**: React는 UI만 담당, 게임 로직은 Canvas + requestAnimationFrame
- **ESM `.js` 확장자**: import 경로에 `.js` 확장자 필수 (TypeScript ESM 규칙)
- **상수는 shared에**: 게임 밸런스 값은 `packages/shared/src/constants/`에 정의
- **타입은 shared에**: 모든 인터페이스/타입은 `packages/shared/src/types/`에 정의
- **zustand**: 클라이언트 상태 관리

## 중요 컨벤션

- **각도**: 라디안 사용 (0 = 오른쪽, PI/2 = 아래)
- **좌표계**: Canvas 좌표 (Y축 아래가 양수)
- **서버 틱**: 20Hz (50ms 간격)
- **충돌**: 원형 충돌 기반 (`circleCircle`)
- **모듈**: `"type": "module"` (ESM), 설정 파일은 `.cjs`

## 자주 하는 작업

### 무기 추가
1. `packages/shared/src/types/weapon.ts` — WeaponType enum에 추가
2. `packages/shared/src/constants/weapons.ts` — 무기 스탯 정의
3. `packages/client/src/game/entities/Player.ts` — 렌더링/발사 로직

### 밸런스 수정
- `packages/shared/src/constants/` 하위 파일 수정
- game.ts (이동속도, 체력), weapons.ts (데미지, 사거리), zone.ts (자기장)

### 타입 추가
1. `packages/shared/src/types/` 에 정의
2. `packages/shared/src/types/index.ts` 에서 export
3. 필요시 `packages/shared/src/index.ts` 에서도 re-export

## 설계 문서

`projectBooks/` 디렉토리에 상세 기획서:
- `blueprint.md` — 프로젝트 총괄 설계
- `codeBook.md` — 코드 아키텍처
- `ruleBook.md` — 게임 규칙/메카닉
- `specBook.md` — 기술 스펙
- `npcBook.md` — NPC/AI 설계
- `placeBook.md` — 맵 설계
- `buildersBook.md` — 빌드/개발 가이드

## 현재 상태 (v0.8.2)

**구현 완료**: 싱글플레이 (봇 대전), 타일맵, 자기장, 무기 시스템, AI 봇, 시야(LOS), 미니맵, 킬로그, FPS 표시
**미구현**: 멀티플레이 네트워킹, 아이템 루팅, 사운드, 애니메이션
