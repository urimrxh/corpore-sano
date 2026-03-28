import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './style/global.css'
import { SiteContentProvider } from './context/SiteContentContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <SiteContentProvider>
        <App />
      </SiteContentProvider>
    </ThemeProvider>
  </StrictMode>,
)
