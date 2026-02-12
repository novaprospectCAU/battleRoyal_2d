# 🎮 Battle Royal 2D

React 기반 2D 쿼터뷰 배틀로얄 웹게임 (최대 32명 실시간 멀티플레이)

<img width="763" height="439" alt="image" src="https://github.com/user-attachments/assets/23e07d68-1aa2-49aa-957d-572da66b5765" />

## 🚀 빠른 시작

### 요구사항

- Node.js 20+

### 설치

```bash
# 의존성 설치
npm install

# 클라이언트 개발 서버 시작
npm run dev:client  # http://localhost:5173

# 게임 서버 시작 (별도 터미널)
npm run dev:server  # ws://localhost:3000
```

## 📁 프로젝트 구조

```
battleRoyal_2d/
├── projectBooks/       # 설계 문서
├── packages/
│   ├── client/         # React 클라이언트 (Vite)
│   ├── server/         # Node.js 게임 서버
│   └── shared/         # 공유 코드 (타입, 상수, 유틸)
└── package.json        # 루트 (모노레포)
```

## 🎮 조작법

- **WASD** / **화살표키**: 이동
- **마우스**: 조준
- **클릭**: 발사 (준비 중)

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| 클라이언트 | React 18, Vite, TypeScript, Zustand |
| 렌더링 | HTML5 Canvas 2D |
| 서버 | Node.js, WebSocket (ws) |
| 빌드 | pnpm workspace (모노레포) |

## 📚 문서

자세한 설계는 `projectBooks/` 폴더를 참조하세요:

- `blueprint.md` - 프로젝트 청사진
- `guideBook.md` - 문서 안내
- `ruleBook.md` - 게임 규칙
- `specBook.md` - 기술 스펙
- `DEPLOYMENT.md` - 배포 가이드 (Vercel + Render)

## 📝 개발 현황

- [x] Phase 0: 설계 문서 작성
- [x] Phase 1: 프로젝트 세팅
- [ ] Phase 1: 싱글 플레이어 프로토타입
- [ ] Phase 2: 멀티플레이어
- [ ] Phase 3: 핵심 게임플레이
- [ ] Phase 4: AI + 완성도

---

**버전**: 0.1.0 (디버그 모드)
