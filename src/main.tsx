import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './AuthContext';
import { HydroRegistryProvider } from './HydroRegistryContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HydroRegistryProvider>
          <App />
        </HydroRegistryProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
