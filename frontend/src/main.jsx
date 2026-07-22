import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
          },
        }}
      />
    </Router>
  </StrictMode>,
)