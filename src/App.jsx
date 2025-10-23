import React from 'react';
import JourneyCanvas from './components/JourneyCanvas.jsx';

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>Journey Canvas</h1>
          </div>
        </div>
      </header>
      <div className="canvas-container">
        <JourneyCanvas />
      </div>
    </div>
  );
}

export default App;
