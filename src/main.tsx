import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { PoseProvider } from './contexts/PoseContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PoseProvider>
        <App />
      </PoseProvider>
    </AuthProvider>
  </StrictMode>
);