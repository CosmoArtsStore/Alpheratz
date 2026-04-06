import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../index.css';
import '../App.light.css';
import '../App.dark.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find #root in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
