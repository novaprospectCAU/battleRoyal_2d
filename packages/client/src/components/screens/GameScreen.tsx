import { useEffect, useRef, useState } from 'react';
import { Game } from '@/game/core/Game';
import { NetworkClient, type RoomJoinMode } from '@/game/network/NetworkClient';
import type { GamePhase } from '@battle-royal/shared';
import styles from './GameScreen.module.css';

interface GameScreenProps {
  onBack: () => void;
  mode: 'single' | 'multiplayer';
  multiplayer: {
    role: 'host' | 'join';
    playerName: string;
    inviteCode: string;
  };
}

type NetInputState = {
  moveX: number;
  moveY: number;
  rotation: number;
};

export function GameScreen({ onBack, mode, multiplayer }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const networkRef = useRef<NetworkClient | null>(null);
  const inputRef = useRef<NetInputState>({ moveX: 0, moveY: 0, rotation: 0 });
  const [networkState, setNetworkState] = useState<'idle' | 'connecting' | 'connected' | 'closed' | 'error'>('idle');
  const [playerId, setPlayerId] = useState<string>('-');
  const [roomCode, setRoomCode] = useState<string>('-');
  const [humanCount, setHumanCount] = useState(1);
  const [botCount, setBotCount] = useState(0);
  const [targetPlayers, setTargetPlayers] = useState(20);
  const [isHost, setIsHost] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [serverTick, setServerTick] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 게임 인스턴스 생성
    const game = new Game(canvas, { multiplayer: mode === 'multiplayer' });
    gameRef.current = game;

    // 게임 시작
    game.start();

    // 클린업
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [mode]);

  // 캔버스 리사이즈 핸들링
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (mode !== 'multiplayer') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = resolveServerUrl();
    const joinMode: RoomJoinMode = multiplayer.role === 'host'
      ? { kind: 'host' }
      : { kind: 'join', inviteCode: multiplayer.inviteCode };

    const networkClient = new NetworkClient(url, {
      onStateChange: setNetworkState,
      onWelcome: (id) => {
        setPlayerId(id);
        gameRef.current?.setLocalServerPlayer(id);
      },
      onRoomJoined: (payload) => {
        setNetworkError(null);
        setRoomCode(payload.inviteCode);
        setIsHost(payload.isHost);
        setPhase(payload.phase);
        setHumanCount(payload.humanCount);
        setBotCount(payload.botCount);
        setTargetPlayers(payload.targetPlayers);
      },
      onSnapshot: (snapshot) => {
        setNetworkError(null);
        setServerTick(snapshot.serverTick);
        setRoomCode(snapshot.roomCode);
        setPhase(snapshot.phase);
        setHumanCount(snapshot.humanCount);
        setBotCount(snapshot.botCount);
        setTargetPlayers(snapshot.targetPlayers);
        gameRef.current?.applyMultiplayerSnapshot(snapshot);
      },
      onError: (message) => {
        setNetworkError(message);
      },
    });
    networkRef.current = networkClient;
    networkClient.connect(multiplayer.playerName, joinMode);

    const pressed = new Set<string>();

    const updateMoveInput = () => {
      inputRef.current.moveX = (pressed.has('d') ? 1 : 0) + (pressed.has('a') ? -1 : 0);
      inputRef.current.moveY = (pressed.has('s') ? 1 : 0) + (pressed.has('w') ? -1 : 0);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;
      pressed.add(key);
      updateMoveInput();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) return;
      pressed.delete(key);
      updateMoveInput();
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const game = gameRef.current;
      if (!game) return;
      inputRef.current.rotation = game.getAimRotationFromScreen(mx, my);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);

    const inputTimer = window.setInterval(() => {
      const input = inputRef.current;
      networkClient.sendInput({
        moveX: input.moveX,
        moveY: input.moveY,
        rotation: input.rotation,
        fire: false,
        reload: false,
      });
    }, 50);

    const pingTimer = window.setInterval(() => {
      networkClient.ping();
    }, 2000);

    return () => {
      window.clearInterval(inputTimer);
      window.clearInterval(pingTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      networkClient.disconnect();
      networkRef.current = null;
      setNetworkState('idle');
      setPlayerId('-');
      setRoomCode('-');
      setHumanCount(1);
      setBotCount(0);
      setTargetPlayers(20);
      setIsHost(false);
      setPhase('waiting');
      setServerTick(0);
      setNetworkError(null);
    };
  }, [mode, multiplayer]);

  const handleCopyRoomCode = async () => {
    if (roomCode === '-') return;
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      setNetworkError('클립보드 복사에 실패했습니다. 코드 수동 복사 부탁드립니다.');
    }
  };

  const handleStartGame = () => {
    if (!isHost) return;
    networkRef.current?.startGame();
  };

  return (
    <div className={styles.container}>
      <canvas 
        ref={canvasRef} 
        className={styles.canvas}
        tabIndex={0}
      />
      
      {/* HUD */}
      <div className={styles.hud}>
        <div className={styles.topLeft}>
          <button 
            className={styles.backButton}
            onClick={onBack}
          >
            ← 나가기
          </button>
        </div>
        
        <div className={styles.bottomCenter}>
          <div className={styles.controls}>
            {mode === 'multiplayer'
              ? '멀티: 방 코드 공유 후 참가 / 부족 인원 BOT 자동 채움'
              : 'WASD: 이동 | 마우스: 조준'}
          </div>
        </div>

        {mode === 'multiplayer' && (
          <div className={styles.networkPanel}>
            <div>MODE: {isHost ? 'HOST' : 'GUEST'}</div>
            <div>WS: {networkState}</div>
            <div>YOU: {playerId}</div>
            <div>ROOM: {roomCode}</div>
            <div>PHASE: {phase.toUpperCase()}</div>
            <div>HUMAN: {humanCount}</div>
            <div>BOT: {botCount}</div>
            <div>TOTAL: {humanCount + botCount}/{targetPlayers}</div>
            <div>TICK: {serverTick}</div>

            <div className={styles.networkActions}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={handleCopyRoomCode}
              >
                방 코드 복사
              </button>
              {isHost && phase === 'waiting' && (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleStartGame}
                >
                  게임 시작
                </button>
              )}
            </div>

            {networkError && (
              <div className={styles.networkError}>
                {networkError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function resolveServerUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL;
  if (configured && configured.length > 0) {
    return configured;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:3000`;
}
