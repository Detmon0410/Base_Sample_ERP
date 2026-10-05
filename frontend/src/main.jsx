import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './i18n'
import App from './App.jsx'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          // While a detail sheet is open (it publishes its width as --sheet-offset) the messages appear to the left of it
          // instead of on top of its buttons. On a narrow window the offset is capped so they stay on screen.
          offset={{ top: 16, right: "calc(min(var(--sheet-offset, 0px), 100vw - 24rem) + 16px)" }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
