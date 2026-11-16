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
import { CityProvider } from './components/CityProvider.jsx';
import { AmbulanceProvider } from './components/AmbulanceProvider.jsx';
import { HistoryProvider } from './components/HistoryProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
         <CityProvider>
          <EmergencyProvider>
            <AmbulanceProvider>
              <HistoryProvider>
                <App />
              </HistoryProvider>
            </AmbulanceProvider>
          </EmergencyProvider>
         </CityProvider>
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
