# Deployment Guide

## Recommended Setup

- Client: Vercel
- Server (WebSocket): Render

This project is a monorepo. The multiplayer mode requires both services:

- Frontend app (`packages/client`)
- WebSocket game server (`packages/server`)

## 1. Deploy Server on Render

Use the included `render.yaml` from repository root.

Render service behavior:

- Build: `npm install && npm run build`
- Start: `npm run start -w @battle-royal/server`
- Port: `process.env.PORT` (fallback `3000`)

After deployment, copy the public URL. Example:

- `wss://battle-royal-2d-server.onrender.com`

## 2. Deploy Client on Vercel

Create a Vercel project from this repository and configure:

- Framework preset: `Vite`
- Root directory: `packages/client`
- Build command: `npm run build -w @battle-royal/client`
- Output directory: `packages/client/dist`

Environment variable:

- `VITE_SERVER_URL=wss://<your-render-domain>`

Example:

- `VITE_SERVER_URL=wss://battle-royal-2d-server.onrender.com`

## 3. Post-Deploy Verification

1. Open client URL.
2. Create multiplayer host room.
3. Open second browser/tab and join by invite code.
4. Start game from host.
5. Confirm:
   - phase changes from `WAITING` to `PLAYING`
   - human/bot counts update
   - movement and combat events sync

## 4. Troubleshooting

- `WebSocket disconnected code=1006`:
  - ensure server is running
  - verify `VITE_SERVER_URL` starts with `wss://` in production
  - confirm no reverse-proxy/WebSocket upgrade blocking

- Room creates but peers cannot join:
  - ensure both users hit the same client deployment
  - verify client env points to the same server URL
