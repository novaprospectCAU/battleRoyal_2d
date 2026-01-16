import { useEffect, useRef, useState } from 'react';
import { Game } from '@/game/core/Game';
import styles from './GameScreen.module.css';

interface GameScreenProps {
  onBack: () => void;
}

export function GameScreen({ onBack }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 게임 인스턴스 생성
    const game = new Game(canvas);
    gameRef.current = game;

    // FPS 표시 업데이트
    const fpsInterval = setInterval(() => {
      setFps(game.getFps());
    }, 500);

    // 게임 시작
    game.start();

    // 클린업
    return () => {
      clearInterval(fpsInterval);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

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
        
        <div className={styles.topRight}>
          <div className={styles.fpsCounter}>
            FPS: {fps}
          </div>
        </div>
        
        <div className={styles.bottomCenter}>
          <div className={styles.controls}>
            WASD: 이동 | 마우스: 조준
          </div>
        </div>
      </div>
    </div>
  );
}
