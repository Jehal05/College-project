// Catches a crash inside a screen and shows a calm page instead of a blank one.
// The 112 call link is plain HTML and the texts have English defaults, so this page works even if translations broke.
import { Component } from 'react';
import i18n from '../i18n';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = (key, fallback) => i18n.t(key, { defaultValue: fallback });
    return (
      <div role="alert">
        <h1 tabIndex={-1} className="mb-2 text-2xl font-extrabold">{t('error.title', 'Something went wrong')}</h1>
        <p className="mb-4 text-slate-700">{t('error.text', 'The app had a problem. If this is an emergency, call now.')}</p>
        <a href="tel:112" className="mb-3 flex min-h-[64px] w-full items-center justify-center rounded-xl bg-red-700 text-xl font-bold text-white">
          {t('emergency.call', 'Call 112 / 108')}
        </a>
        <button type="button" onClick={() => window.location.reload()} className="min-h-[48px] w-full rounded-xl bg-brand-700 hover:bg-brand-800 font-bold text-white">
          {t('error.reload', 'Reload the app')}
        </button>
      </div>
    );
  }
}
