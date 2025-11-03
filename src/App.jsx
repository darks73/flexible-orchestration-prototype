import React, { useState, useCallback } from 'react';
import JourneyCanvas from './components/JourneyCanvas.jsx';

function App() {
  const [exportHandler, setExportHandler] = useState(null);
  const [importHandler, setImportHandler] = useState(null);
  
  // Stabilize the setter callbacks to prevent unnecessary re-renders
  const handleExportReady = useCallback((handler) => {
    // Store handler directly - React won't call it
    setExportHandler(() => handler);
  }, []);
  
  const handleImportReady = useCallback((handler) => {
    // Store handler directly - React won't call it
    setImportHandler(() => handler);
  }, []);
  
  const handleExport = () => {
    console.log('Export button clicked, handler:', exportHandler);
    // exportHandler is a function that returns the actual handler (wrapper)
    // We need to call it to get the wrapper, then call the wrapper
    if (exportHandler && typeof exportHandler === 'function') {
      const wrapper = exportHandler();
      if (wrapper && typeof wrapper === 'function') {
        wrapper();
      }
    }
  };

  const handleImport = () => {
    console.log('Import button clicked, handler:', importHandler);
    // importHandler is a function that returns the actual handler (wrapper)
    // We need to call it to get the wrapper, then call the wrapper
    if (importHandler && typeof importHandler === 'function') {
      const wrapper = importHandler();
      if (wrapper && typeof wrapper === 'function') {
        wrapper();
      }
    }
  };

  // Debug: Log when handlers are set
  React.useEffect(() => {
    if (exportHandler) {
      console.log('Export handler set:', exportHandler);
    }
  }, [exportHandler]);

  React.useEffect(() => {
    if (importHandler) {
      console.log('Import handler set:', importHandler);
    }
  }, [importHandler]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>Journey Canvas</h1>
          </div>
          <div className="header-actions">
            <button className="header-btn" onClick={handleExport} title="Export Journey">
              <span className="material-icons">download</span>
              <span>Export</span>
            </button>
            <button className="header-btn" onClick={handleImport} title="Import Journey">
              <span className="material-icons">upload</span>
              <span>Import</span>
            </button>
          </div>
        </div>
      </header>
      <div className="canvas-container">
        <JourneyCanvas 
          onExportReady={handleExportReady}
          onImportReady={handleImportReady}
        />
      </div>
    </div>
  );
}

export default App;
