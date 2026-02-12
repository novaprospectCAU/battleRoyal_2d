import { useState } from 'react';
import { GameScreen } from './components/screens/GameScreen';
import { MainMenu } from './components/screens/MainMenu';

type Screen = 'menu' | 'game';
type GameMode = 'single' | 'multiplayer';
type MultiplayerConfig = {
  role: 'host' | 'join';
  playerName: string;
  inviteCode: string;
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig>({
    role: 'host',
    playerName: 'Player',
    inviteCode: '',
  });

  const handleStartSinglePlayer = () => {
    setGameMode('single');
    setCurrentScreen('game');
  };

  const handleStartMultiplayerHost = () => {
    const playerName = window.prompt('호스트 이름을 입력하세요', 'Host')?.trim();
    if (!playerName) return;

    setMultiplayerConfig({
      role: 'host',
      playerName,
      inviteCode: '',
    });
    setGameMode('multiplayer');
    setCurrentScreen('game');
  };

  const handleStartMultiplayerJoin = () => {
    const inviteCode = window.prompt('초대 코드를 입력하세요')?.trim().toUpperCase();
    if (!inviteCode) return;

    const playerName = window.prompt('플레이어 이름을 입력하세요', 'Guest')?.trim();
    if (!playerName) return;

    setMultiplayerConfig({
      role: 'join',
      playerName,
      inviteCode,
    });
    setGameMode('multiplayer');
    setCurrentScreen('game');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  return (
    <div className="app">
      {currentScreen === 'menu' && (
        <MainMenu
          onStartSinglePlayer={handleStartSinglePlayer}
          onStartMultiplayerHost={handleStartMultiplayerHost}
          onStartMultiplayerJoin={handleStartMultiplayerJoin}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen onBack={handleBackToMenu} mode={gameMode} multiplayer={multiplayerConfig} />
      )}
    </div>
  );
}

export default App;
