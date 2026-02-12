import styles from './MainMenu.module.css';

interface MainMenuProps {
  onStartSinglePlayer: () => void;
  onStartMultiplayerHost: () => void;
  onStartMultiplayerJoin: () => void;
}

export function MainMenu({
  onStartSinglePlayer,
  onStartMultiplayerHost,
  onStartMultiplayerJoin,
}: MainMenuProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          <span className={styles.titleMain}>BATTLE ROYAL</span>
          <span className={styles.titleSub}>2D</span>
        </h1>
        
        <p className={styles.subtitle}>
          32인 배틀로얄 웹게임
        </p>

        <div className={styles.buttons}>
          <button 
            className="btn btn-primary"
            onClick={onStartSinglePlayer}
          >
            🎮 게임 시작
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={onStartMultiplayerHost}
          >
            🌐 멀티 호스트
          </button>

          <button
            className="btn btn-secondary"
            onClick={onStartMultiplayerJoin}
          >
            🔑 방 코드로 참가
          </button>
        </div>

        <div className={styles.info}>
          <p>조작: WASD 이동 / 마우스 조준 / 클릭 발사</p>
          <p className={styles.version}>v0.1.0 - 디버그 모드</p>
        </div>
      </div>
    </div>
  );
}
