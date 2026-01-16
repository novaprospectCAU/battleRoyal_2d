import { useState } from 'react';
import { GameScreen } from './components/screens/GameScreen';
import { MainMenu } from './components/screens/MainMenu';

type Screen = 'menu' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');

  const handleStartGame = () => {
    setCurrentScreen('game');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  return (
    <div className="app">
      {currentScreen === 'menu' && (
        <MainMenu onStartGame={handleStartGame} />
      )}
      {currentScreen === 'game' && (
        <GameScreen onBack={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
