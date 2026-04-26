import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import './style/global.css'
import { SiteContentProvider } from './context/SiteContentContext.jsx'
import { I18nProvider } from './context/I18nContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <SiteContentProvider>
              <App />
            </SiteContentProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </HelmetProvider>
  </StrictMode>,
)
