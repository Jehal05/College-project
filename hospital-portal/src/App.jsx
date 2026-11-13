import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NavBar from './components/NavBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MapPage from './pages/Map.jsx';
import Fleet from './pages/Fleet.jsx';
import Analytics from './pages/Analytics.jsx';
import Admin from './pages/Admin.jsx';

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

const staff = ['staff', 'admin'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute roles={staff}><Shell><Dashboard /></Shell></ProtectedRoute>}
      />
      <Route
        path="/map"
        element={<ProtectedRoute roles={staff}><Shell><MapPage /></Shell></ProtectedRoute>}
      />
      <Route
        path="/fleet"
        element={<ProtectedRoute roles={staff}><Shell><Fleet /></Shell></ProtectedRoute>}
      />
      <Route
        path="/analytics"
        element={<ProtectedRoute roles={staff}><Shell><Analytics /></Shell></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute roles={['admin']}><Shell><Admin /></Shell></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
