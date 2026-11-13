// Login screen. Fake login against the mock API; returns a token and a role.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../services/api';
import useAuth from '../hooks/useAuth';
import FormField from '../components/FormField';
import ErrorMessage from '../components/ErrorMessage';

export default function Login() {
  const { t } = useTranslation();
  const { isLoggedIn, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err.code === 'NETWORK' ? t('login.networkError') : t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="mb-1 text-2xl font-bold">{t('app.title')}</h1>
      <h2 className="mb-4 text-lg text-slate-700">{t('login.title')}</h2>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="mt-3">
        <FormField label={t('login.email')} type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <FormField label={t('login.password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
      </div>
      <button type="submit" disabled={loading} className="min-h-[48px] w-full rounded-lg bg-blue-700 px-4 text-lg font-bold text-white disabled:opacity-60">
        {loading ? t('login.loading') : t('login.submit')}
      </button>
      <p className="mt-4 text-sm text-slate-600">{t('login.demoHint')}</p>
    </form>
  );
}
