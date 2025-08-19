import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode> temporarily disabled to prevent Socket.IO reconnection issues in development
  <AuthProvider>
    <App />
  </AuthProvider>
  // </React.StrictMode>
);
