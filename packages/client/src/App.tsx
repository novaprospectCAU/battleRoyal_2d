import { useState } from 'react';
import { GameScreen } from './components/screens/GameScreen';
import { MainMenu } from './components/screens/MainMenu';

type Screen = 'menu' | 'game';
type GameMode = 'single' | 'multiplayer';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('single');

  const handleStartSinglePlayer = () => {
    setGameMode('single');
    setCurrentScreen('game');
  };

  const handleStartMultiplayer = () => {
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
          onStartMultiplayer={handleStartMultiplayer}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen onBack={handleBackToMenu} mode={gameMode} />
      )}
    </div>
  );
}

export default App;
