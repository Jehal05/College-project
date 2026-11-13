// All pages. Profile and Home need a login; everything else redirects to /login.
import { Navigate, Route, Routes } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Login from './screens/Login';
import Home from './screens/Home';
import Profile from './screens/Profile';
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
