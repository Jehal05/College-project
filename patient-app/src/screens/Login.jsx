// Login screen. Fake login against the mock API; returns a token and a role.
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../services/api';
import { takeNotice } from '../services/auth';
import { allowedHere, homeFor } from '../utils/roles';
import useAuth from '../hooks/useAuth';
import FormField from '../components/FormField';
import ErrorMessage from '../components/ErrorMessage';
import LanguageSelect from '../components/LanguageSelect';
import Icon, { LogoMark } from '../components/icons';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { InlineNotice } from '../components/ui/Feedback';
import { DEMO_ENABLED } from '../config/demo';

export default function Login() {
  const { t } = useTranslation();
  const { isLoggedIn, session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice] = useState(takeNotice); // 'expired' when the server ended the session

  if (isLoggedIn) return <Navigate to={session ? homeFor(session.role) : '/'} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!allowedHere(result.role)) setError(t('login.wrongRole'));
      else {
        signIn(result);
        navigate(homeFor(result.role), { replace: true });
      }
    } catch (err) {
      setError(err.code === 'NETWORK' || err.code === 'TIMEOUT' ? t('login.networkError') : t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="pt-2">
      <div className="mb-6 flex flex-col items-center text-center">
        <LogoMark size={72} />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-900">{t('app.title')}</h1>
        <h2 className="mt-1 text-lg text-slate-700">{t('login.title')}</h2>
      </div>
      {notice === 'expired' && !error && <div className="mb-3"><InlineNotice tone="warning" role="status">{t('login.expired')}</InlineNotice></div>}
      <ErrorMessage>{error}</ErrorMessage>
      <Card className="mt-3">
        <FormField label={t('login.email')} type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <FormField label={t('login.password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        <Button type="submit" full large disabled={loading} icon="lock">{loading ? t('login.loading') : t('login.submit')}</Button>
      </Card>
      <div className="mt-4"><LanguageSelect /></div>
      {DEMO_ENABLED && <p className="mt-2 text-sm text-slate-600">{t('login.demoHint')}</p>}
      <Link to="/volunteer" className="mt-2 flex min-h-[44px] items-center justify-center font-semibold text-brand-900 underline">{t('login.volunteer')}</Link>
      <a href="tel:112" className="mt-4 flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white font-bold text-slate-900"><Icon name="phone" />{t('emergency.call')}</a>
    </form>
  );
}
