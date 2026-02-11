import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './animations.css'
import "@arcgis/core/assets/esri/themes/light/main.css";
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/auth/AuthProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
