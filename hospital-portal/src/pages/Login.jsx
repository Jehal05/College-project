import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { USE_MOCK } from '../services/config.js';
import { LOGIN_FIELD } from '../services/auth.js';
import { takeExpiredNotice } from '../services/sessionExpiry.js';
import { useT } from '../i18n/index.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

export default function Login() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const [email, setEmail] = useState(USE_MOCK ? 'staff@demo' : 'staff1');
  const [password, setPassword] = useState(USE_MOCK ? 'demo123' : 'demo-password');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired] = useState(() => takeExpiredNotice()); // shown once after a 401

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
      <a href="#login-form" data-testid="skip-login" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-slate-900">{t('a11y.skipLogin')}</a>
      <form id="login-form" onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-xl">
        <div>
          <div className="mb-2 flex justify-end"><LanguageSwitcher /></div>
          <h1 className="text-3xl font-bold">{t('login.title')}</h1>
          <p className="text-slate-600">{t('login.subtitle')}</p>
          <SimulatedBadge text={t('login.simulated')} className="mt-3" />
        </div>

        <label className="block">
          <span className="font-medium" data-testid="login-label">{LOGIN_FIELD === 'username' ? t('login.username') : t('login.email')}</span>
          {LOGIN_FIELD === 'username' && <span className="ml-2 text-sm text-slate-500">{t('login.usernameHint')}</span>}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg"
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="font-medium">{t('login.password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg"
            autoComplete="current-password"
          />
        </label>

        {expired && !error && <p role="status" data-testid="login-expired" className="rounded-lg bg-amber-100 p-3 font-medium text-amber-900">{t('login.expired')}</p>}
        {error && <p role="alert" data-testid="login-error" className="rounded-lg bg-red-100 p-3 font-medium text-red-700">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-3 text-lg font-bold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {busy ? t('login.busy') : t('login.submit')}
        </button>

        {USE_MOCK && (
          <p className="text-sm text-slate-500">{t('login.demoAccounts')}</p>
        )}
      </form>
    </div>
  );
}
