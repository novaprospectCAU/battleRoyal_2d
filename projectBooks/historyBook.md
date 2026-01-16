# 📜 HistoryBook - 개발 변경 이력

> **최초 작성일**: 2026-01-16  
> **마지막 수정**: 2026-01-16  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 **개발 변경 이력, 밸런스 조정, 패치 노트, 중요 결정 기록**을 관리합니다.

---

## 📊 버전 이력

### v0.1.0 (2026-01-16) - 최초 개발 환경 구축

#### 🎯 주요 변경사항

| 카테고리 | 내용 |
|---------|------|
| **프로젝트 구조** | npm workspaces 기반 모노레포 구축 (client/server/shared) |
| **클라이언트** | React 18 + Vite 5 + TypeScript 기반 게임 클라이언트 |
| **게임 코어** | Canvas 2D 렌더러, 게임 루프 (20Hz/60fps), 입력 시스템 |
| **서버** | WebSocket 서버 기본 구조 (Node.js + ws) |

#### 📁 생성된 파일

```
battleRoyal_2d/
├── package.json                    # npm workspaces 루트
├── tsconfig.json                   # TypeScript 공용 설정
├── .gitignore
├── README.md
│
├── packages/
│   ├── shared/                     # 공유 코드
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/              # 타입 정의 (game, player, network)
│   │       ├── constants/          # 게임 상수 (설정, 색상)
│   │       ├── utils/              # 유틸리티 (Vector2, 충돌)
│   │       └── protocol/           # 네트워크 프로토콜
│   │
│   ├── client/                     # React 클라이언트
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── vite-env.d.ts
│   │       ├── styles/global.css
│   │       ├── components/screens/ # MainMenu, GameScreen
│   │       └── game/
│   │           ├── core/           # Game, GameLoop, Renderer
│   │           ├── entities/       # Player
│   │           ├── input/          # InputManager
│   │           └── world/          # Camera
│   │
│   └── server/                     # 게임 서버
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts            # WebSocket 서버
```

#### 🎮 구현된 기능

| 기능 | 설명 |
|------|------|
| 게임 루프 | 20Hz 고정 업데이트 + 60fps 렌더링 + 보간 |
| 플레이어 이동 | WASD/화살표 키 8방향 이동 |
| 마우스 조준 | 마우스 위치로 플레이어 회전 |
| 카메라 | 플레이어 추적 + 부드러운 이동 (lerp) |
| 디버그 렌더링 | 원형 플레이어, 그리드, 맵 경계 |
| 맵 경계 | 2000x2000px 맵, 경계 충돌 |

#### 🔧 기술 스택

| 구분 | 선택 |
|------|------|
| 클라이언트 | React 18, Vite 5, TypeScript 5, Zustand |
| 렌더링 | HTML5 Canvas 2D |
| 서버 | Node.js 20+, ws (WebSocket) |
| 빌드 | npm workspaces (모노레포) |

#### 🐛 수정된 이슈

| 이슈 | 해결 |
|------|------|
| 카메라 떨림 | 렌더링 단계에서 보간된 위치 따라가도록 수정 |

---

## 📝 커밋 이력

| 날짜 | 버전 | 커밋 메시지 |
|------|------|------------|
| 2026-01-16 | v0.1.0 | 최초 개발 환경 구축 |

---

## 🔮 다음 예정

- 충돌 시스템 (벽/장애물)
- 무기 발사 + 투사체
- 멀티플레이어 연동

---

## 📚 관련 문서

- 전체 로드맵 → `blueprint.md`
- 미결정 사항 → `futureBook.md`
- 코드 구조 → `codeBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-16 | 0.1.0 | 최초 작성, v0.1.0 기록 | - |
