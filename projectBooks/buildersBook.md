# 🏗️ BuildersBook - 빌드 및 개발 환경 설계서

> **최초 작성일**: 2026-01-16  
> **마지막 수정**: 2026-01-16  
> **버전**: 0.1.0

---

## 📌 이 문서의 목적

이 문서는 **프로젝트 구조, 빌드 시스템, 개발 환경, 의존성 관리, 배포 구성**을 정의합니다.

---

## 🗂️ 프로젝트 구조

### 모노레포 구조

```
battleRoyal_2d/
│
├── 📚 projectBooks/              # 설계 문서
│   ├── blueprint.md
│   ├── guideBook.md
│   ├── ruleBook.md
│   ├── placeBook.md
│   ├── spiderBook.md
│   ├── specBook.md
│   ├── artBook.md
│   ├── audioBook.md
│   ├── codeBook.md
│   ├── npcBook.md
│   ├── animationBook.md
│   ├── testBook.md
│   ├── buildersBook.md        # 이 문서
│   ├── futureBook.md
│   └── ...
│
├── 📦 packages/                  # 모노레포 패키지
│   ├── client/                   # 프론트엔드
│   ├── server/                   # 백엔드
│   └── shared/                   # 공유 코드
│
├── 📄 package.json               # 루트 워크스페이스 설정
├── 📄 pnpm-workspace.yaml        # pnpm 워크스페이스
├── 📄 tsconfig.json              # 공용 TypeScript 설정
├── 📄 .gitignore
├── 📄 .eslintrc.js
├── 📄 .prettierrc
└── 📄 README.md
```

### 패키지별 구조

#### Client (packages/client)

```
packages/client/
├── src/
│   ├── main.tsx                  # 엔트리포인트
│   ├── App.tsx                   # 루트 컴포넌트
│   │
│   ├── components/               # React 컴포넌트
│   │   ├── screens/              # 화면 단위
│   │   │   ├── MainMenu/
│   │   │   │   ├── MainMenu.tsx
│   │   │   │   └── MainMenu.module.css
│   │   │   ├── Lobby/
│   │   │   ├── GameScreen/
│   │   │   └── ResultScreen/
│   │   │
│   │   ├── hud/                  # 게임 내 HUD
│   │   │   ├── HealthBar/
│   │   │   ├── WeaponSlots/
│   │   │   ├── MiniMap/
│   │   │   ├── KillFeed/
│   │   │   └── ZoneTimer/
│   │   │
│   │   └── ui/                   # 공용 UI
│   │       ├── Button/
│   │       ├── Modal/
│   │       └── Input/
│   │
│   ├── game/                     # 게임 코어
│   │   ├── core/
│   │   │   ├── Game.ts
│   │   │   ├── GameLoop.ts
│   │   │   └── Renderer.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── Entity.ts
│   │   │   ├── Player.ts
│   │   │   ├── Projectile.ts
│   │   │   ├── Item.ts
│   │   │   └── Zone.ts
│   │   │
│   │   ├── systems/
│   │   │   ├── MovementSystem.ts
│   │   │   ├── CollisionSystem.ts
│   │   │   ├── RenderSystem.ts
│   │   │   └── InputSystem.ts
│   │   │
│   │   ├── input/
│   │   │   ├── InputManager.ts
│   │   │   └── KeyBindings.ts
│   │   │
│   │   └── world/
│   │       ├── Map.ts
│   │       └── Camera.ts
│   │
│   ├── network/
│   │   ├── NetworkClient.ts
│   │   ├── MessageHandler.ts
│   │   └── Prediction.ts
│   │
│   ├── store/                    # Zustand 스토어
│   │   ├── gameStore.ts
│   │   ├── uiStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── assets/                   # 에셋 관리
│   │   ├── AssetManager.ts
│   │   └── AssetManifest.ts
│   │
│   ├── styles/                   # 전역 스타일
│   │   ├── global.css
│   │   └── variables.css
│   │
│   └── utils/
│       └── helpers.ts
│
├── public/
│   ├── index.html
│   └── assets/                   # 정적 에셋
│       ├── sprites/
│       ├── audio/
│       └── ui/
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

#### Server (packages/server)

```
packages/server/
├── src/
│   ├── index.ts                  # 엔트리포인트
│   │
│   ├── network/
│   │   ├── WebSocketServer.ts
│   │   ├── ConnectionManager.ts
│   │   └── MessageHandler.ts
│   │
│   ├── game/
│   │   ├── GameRoom.ts
│   │   ├── GameLoop.ts
│   │   ├── GameState.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── ServerPlayer.ts
│   │   │   ├── ServerProjectile.ts
│   │   │   └── ServerItem.ts
│   │   │
│   │   └── systems/
│   │       ├── MovementSystem.ts
│   │       ├── CombatSystem.ts
│   │       ├── ZoneSystem.ts
│   │       └── ItemSystem.ts
│   │
│   ├── ai/
│   │   ├── BotController.ts
│   │   ├── BotBehavior.ts
│   │   └── BotPathfinding.ts
│   │
│   └── utils/
│       └── helpers.ts
│
├── tsconfig.json
└── package.json
```

#### Shared (packages/shared)

```
packages/shared/
├── src/
│   ├── index.ts                  # 배럴 익스포트
│   │
│   ├── types/
│   │   ├── game.ts
│   │   ├── network.ts
│   │   ├── player.ts
│   │   ├── weapon.ts
│   │   └── item.ts
│   │
│   ├── constants/
│   │   ├── game.ts
│   │   ├── weapons.ts
│   │   ├── items.ts
│   │   └── zone.ts
│   │
│   ├── protocol/
│   │   ├── messages.ts
│   │   └── serialization.ts
│   │
│   └── utils/
│       ├── math.ts
│       ├── collision.ts
│       └── damage.ts
│
├── tsconfig.json
└── package.json
```

---

## ⚙️ 빌드 시스템

### 패키지 매니저: pnpm

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

### 루트 package.json

```json
{
  "name": "battle-royal-2d",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --parallel dev",
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev",
    "build": "pnpm --parallel build",
    "build:client": "pnpm --filter client build",
    "build:server": "pnpm --filter server build",
    "test": "pnpm --parallel test",
    "test:watch": "pnpm --parallel test:watch",
    "test:coverage": "pnpm --parallel test:coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "clean": "pnpm --parallel clean",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### Client package.json

```json
{
  "name": "client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "clean": "rm -rf dist node_modules"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zustand": "^4.0.0",
    "shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Server package.json

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist node_modules"
  },
  "dependencies": {
    "ws": "^8.0.0",
    "shared": "workspace:*"
  },
  "devDependencies": {
    "@types/ws": "^8.0.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Shared package.json

```json
{
  "name": "shared",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist node_modules"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

---

## 🔧 TypeScript 설정

### 루트 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Client tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@game/*": ["src/game/*"],
      "@network/*": ["src/network/*"],
      "@store/*": ["src/store/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

### Server tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

---

## 🎨 Vite 설정

### vite.config.ts (Client)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@game': path.resolve(__dirname, './src/game'),
      '@network': path.resolve(__dirname, './src/network'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173,
    host: true,  // LAN 접속 허용
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

## 🧹 Linting & Formatting

### .eslintrc.js

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', '*.config.js'],
};
```

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### lint-staged 설정 (package.json)

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

## 🔄 개발 워크플로우

### 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. 개발 서버 시작 (클라이언트 + 서버)
pnpm dev

# 또는 개별 시작
pnpm dev:client   # localhost:5173
pnpm dev:server   # localhost:3000
```

### 테스트

```bash
# 전체 테스트
pnpm test

# 워치 모드
pnpm test:watch

# 커버리지
pnpm test:coverage
```

### 빌드

```bash
# 전체 빌드
pnpm build

# 개별 빌드
pnpm build:client
pnpm build:server
```

---

## 📦 의존성 관리

### 의존성 추가

```bash
# 클라이언트에 추가
pnpm --filter client add <package>

# 서버에 추가
pnpm --filter server add <package>

# 공유에 추가
pnpm --filter shared add <package>

# 개발 의존성
pnpm --filter client add -D <package>

# 루트에 추가 (워크스페이스 전체)
pnpm add -w -D <package>
```

### 내부 패키지 참조

```json
// packages/client/package.json
{
  "dependencies": {
    "shared": "workspace:*"
  }
}
```

---

## 🌐 환경 변수

### 구조

```
packages/client/
├── .env                  # 기본 (gitignore)
├── .env.local            # 로컬 오버라이드 (gitignore)
├── .env.development      # 개발 환경
└── .env.production       # 프로덕션 환경

packages/server/
├── .env
├── .env.local
├── .env.development
└── .env.production
```

### Client 환경 변수

```bash
# .env.development
VITE_WS_URL=ws://localhost:3000
VITE_DEBUG_MODE=true
VITE_ASSET_MODE=debug

# .env.production
VITE_WS_URL=wss://your-server.com
VITE_DEBUG_MODE=false
VITE_ASSET_MODE=production
```

### Server 환경 변수

```bash
# .env.development
PORT=3000
NODE_ENV=development

# .env.production
PORT=3000
NODE_ENV=production
```

### 사용

```typescript
// 클라이언트 (Vite)
const wsUrl = import.meta.env.VITE_WS_URL;
const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';

// 서버
const port = process.env.PORT || 3000;
```

---

## 🚀 배포 (차후)

### 클라이언트 배포

```bash
# 빌드
pnpm build:client

# dist/ 폴더를 정적 호스팅에 배포
# - Vercel
# - Netlify
# - GitHub Pages
# - 자체 서버
```

### 서버 배포

```bash
# 빌드
pnpm build:server

# Node.js 서버에서 실행
node packages/server/dist/index.js

# 또는 pm2 사용
pm2 start packages/server/dist/index.js --name "game-server"
```

### Docker (선택)

```dockerfile
# Dockerfile.server
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

RUN pnpm build:server

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
```

---

## 📊 스크립트 요약

| 명령어 | 설명 |
|--------|------|
| `pnpm install` | 모든 의존성 설치 |
| `pnpm dev` | 개발 서버 (클라이언트 + 서버) |
| `pnpm dev:client` | 클라이언트 개발 서버 |
| `pnpm dev:server` | 서버 개발 모드 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm test` | 전체 테스트 |
| `pnpm test:watch` | 테스트 워치 모드 |
| `pnpm lint` | ESLint 검사 |
| `pnpm lint:fix` | ESLint 자동 수정 |
| `pnpm format` | Prettier 포맷팅 |
| `pnpm clean` | 빌드 결과물 삭제 |

---

## ⚠️ 미결정 사항 요약

### 우선순위 높음
- [ ] 초기 프로젝트 설정 스크립트
- [ ] 개발 환경 자동화

### 우선순위 중간
- [ ] Docker 구성 상세
- [ ] CI/CD 파이프라인 (GitHub Actions)

### 우선순위 낮음
- [ ] 프로덕션 배포 환경 확정
- [ ] 모니터링/로깅 설정

---

## 📚 관련 문서

- 기술 스택 → `specBook.md`
- 코드 구조 → `codeBook.md`
- 테스트 → `testBook.md`

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-01-16 | 0.1.0 | 최초 작성, 빌드 시스템 초안 | - |
