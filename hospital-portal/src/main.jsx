import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './components/AuthProvider.jsx';
import { EmergencyProvider } from './components/EmergencyProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EmergencyProvider>
          <App />
        </EmergencyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
