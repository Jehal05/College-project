import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { USE_MOCK } from '../services/api.js';

export default function Login() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('staff@demo');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-900 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold">Hospital Portal</h1>
          <p className="text-slate-600">HealthTwin AI · staff login</p>
          <SimulatedBadge text="Simulated prototype. No real hospital is contacted." className="mt-3" />
        </div>

        <label className="block">
          <span className="font-medium">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg"
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg"
            autoComplete="current-password"
          />
        </label>

        {error && <p className="rounded-lg bg-red-100 p-3 font-medium text-red-700">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-3 text-lg font-bold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        {USE_MOCK && (
          <p className="text-sm text-slate-500">
            Mock mode demo accounts: <b>staff@demo</b> or <b>admin@demo</b>, password <b>demo123</b>
          </p>
        )}
      </form>
    </div>
  );
}
