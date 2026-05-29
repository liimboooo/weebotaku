import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

function isChunkError(reason) {
  const msg = reason?.message || reason?.reason || '';
  return (
    reason?.name === 'ChunkLoadError' ||
    /Loading chunk \d+ failed/i.test(msg)
  );
}

function handleChunkError(reason) {
  if (!isChunkError(reason)) return;
  const key = '__animewch_reload_count';
  const count = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (count >= 2) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, String(count + 1));
  window.location.reload();
}

window.addEventListener('unhandledrejection', (e) => handleChunkError(e.reason));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
