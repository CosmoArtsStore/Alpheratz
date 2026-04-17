import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../index.css';
import '../App.light.css';
import '../App.dark.css';

// React アプリをマウントする root 要素を取得する。
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find #root in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
