import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import App from './App.jsx';
import { AuthProvider } from './components/AuthProvider.jsx';
import { EmergencyProvider } from './components/EmergencyProvider.jsx';
import { HospitalProvider } from './components/HospitalProvider.jsx';
import { AmbulanceProvider } from './components/AmbulanceProvider.jsx';
import { HistoryProvider } from './components/HistoryProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
          <EmergencyProvider>
            <AmbulanceProvider>
              <HistoryProvider>
                <App />
              </HistoryProvider>
            </AmbulanceProvider>
          </EmergencyProvider>
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
