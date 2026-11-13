// Login screen. Fake login against the mock API; returns a token and a role.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../services/api';
import { takeNotice } from '../services/auth';
import useAuth from '../hooks/useAuth';
import FormField from '../components/FormField';
import ErrorMessage from '../components/ErrorMessage';
import LanguageSelect from '../components/LanguageSelect';

export default function Login() {
  const { t } = useTranslation();
  const { isLoggedIn, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice] = useState(takeNotice); // 'expired' when the server ended the session

  if (isLoggedIn) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.role !== 'PATIENT') setError(t('login.wrongRole'));
      else {
        signIn(result);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.code === 'NETWORK' || err.code === 'TIMEOUT' ? t('login.networkError') : t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <LanguageSelect />
      <h1 className="mb-1 text-2xl font-bold">{t('app.title')}</h1>
      <h2 className="mb-4 text-lg text-slate-700">{t('login.title')}</h2>
      {notice === 'expired' && !error && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 font-semibold text-amber-900">{t('login.expired')}</p>}
      <ErrorMessage>{error}</ErrorMessage>
      <div className="mt-3">
        <FormField label={t('login.email')} type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <FormField label={t('login.password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
      </div>
      <button type="submit" disabled={loading} className="min-h-[48px] w-full rounded-lg bg-blue-700 px-4 text-lg font-bold text-white disabled:opacity-60">
        {loading ? t('login.loading') : t('login.submit')}
      </button>
      <p className="mt-4 text-sm text-slate-600">{t('login.demoHint')}</p>
      <a href="tel:112" className="mt-4 flex min-h-[48px] items-center justify-center rounded-lg border-2 border-red-700 font-bold text-red-800">{t('emergency.call')}</a>
    </form>
  );
}
