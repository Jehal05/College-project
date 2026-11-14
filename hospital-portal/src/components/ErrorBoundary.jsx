// Catches a render error so the whole portal does not go blank (needs a class component; hooks cannot do this).
// The message follows the chosen language. "Reload" reloads the page; "Try again" only redraws this screen.
import { Component } from 'react';
import { getLang } from '../i18n/index.js';
import { translate } from '../i18n/translate.js';
import { NO_ERROR, stateFromError } from '../services/errorBoundary.js';

export default class ErrorBoundary extends Component {
  state = NO_ERROR;

  static getDerivedStateFromError(error) {
    return stateFromError(error);
  }

  componentDidCatch(error) {
    // Message only: never log a token or the request.
    console.error('Screen error:', stateFromError(error).detail);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = (key) => translate(getLang(), key);
    return (
      <div role="alert" data-testid="error-boundary" className="mx-auto my-10 max-w-lg rounded-2xl border-2 border-red-300 bg-white p-8 text-center shadow">
        <h1 className="text-2xl font-bold text-red-700">{t('error.title')}</h1>
        <p className="mt-2 text-lg text-slate-700">{t('error.body')}</p>
        {this.state.detail && <p data-testid="error-detail" className="mt-2 break-words text-sm text-slate-500">{this.state.detail}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button data-testid="error-reload" onClick={() => window.location.reload()} className="rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700">
            {t('error.reload')}
          </button>
          <button data-testid="error-retry" onClick={() => this.setState(NO_ERROR)} className="rounded-lg bg-slate-200 px-5 py-2.5 text-lg font-semibold">
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }
}
