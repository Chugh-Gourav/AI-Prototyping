/**
 * ==============================================================================
 * PM-AI-AGENT: Frontend Mount Point (main.jsx)
 * ==============================================================================
 * PRODUCT ROLE:
 *   Bootstraps the React 19 application, loads global Skyscanner styles, and
 *   mounts the root App component onto the DOM.
 * ==============================================================================
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
