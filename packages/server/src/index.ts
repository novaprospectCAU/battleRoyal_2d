import { WebSocketServer } from 'ws';
import { DEFAULT_GAME_CONFIG } from '@battle-royal/shared';

const PORT = 3000;

console.log('🎮 Battle Royal 2D Server');
console.log('========================');
console.log(`Max Players: ${DEFAULT_GAME_CONFIG.maxPlayers}`);
console.log(`Map Size: ${DEFAULT_GAME_CONFIG.mapWidth}x${DEFAULT_GAME_CONFIG.mapHeight}`);
console.log(`Tick Rate: ${DEFAULT_GAME_CONFIG.tickRate} Hz`);
console.log('');

// WebSocket 서버 생성
const wss = new WebSocketServer({ port: PORT });

console.log(`✅ Server listening on ws://localhost:${PORT}`);

wss.on('connection', (socket, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 Client connected from ${clientIp}`);
  
  // 환영 메시지 전송
  socket.send(JSON.stringify({
    type: 'CONNECT',
    timestamp: Date.now(),
    payload: {
      playerId: generateId(),
      serverTime: Date.now(),
    },
  }));
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received:', message.type);
      // TODO: 메시지 핸들링
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });
  
  socket.on('close', () => {
    console.log(`🔌 Client disconnected: ${clientIp}`);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// 간단한 ID 생성
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
