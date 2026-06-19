import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { logger } from './services/debug';

// Inizializza il logger di debug globale
logger.init();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);