// All pages. Everything except /login needs a login; unknown addresses show "not found".
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Login from './screens/Login';
import Home from './screens/Home';
import Profile from './screens/Profile';
import Symptoms from './screens/Symptoms';
import Emergency from './screens/Emergency';
import Cancelled from './screens/Cancelled';
import DemoTools from './screens/DemoTools';
import NotFound from './screens/NotFound';

function Protected({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/symptoms" element={<Protected><Symptoms /></Protected>} />
      <Route path="/emergency/:id" element={<Protected><Emergency /></Protected>} />
      <Route path="/cancelled" element={<Protected><Cancelled /></Protected>} />
      <Route path="/demo" element={<Protected><DemoTools /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
