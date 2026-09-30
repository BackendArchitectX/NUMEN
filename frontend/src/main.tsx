import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { AppErrorBoundary } from './app/AppErrorBoundary'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('NUMEN root element is missing')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>
)
