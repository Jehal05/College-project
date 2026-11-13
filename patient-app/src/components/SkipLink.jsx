// "Skip to content": the first thing a keyboard user can reach. It moves focus straight to the page content.
import { useTranslation } from 'react-i18next';

export default function SkipLink() {
  const { t } = useTranslation();
  const skip = (event) => {
    event.preventDefault();
    const main = document.getElementById('main');
    if (main) main.focus();
  };
  return (
    <a href="#main" onClick={skip}
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-blue-800 focus:shadow-lg focus:ring-2 focus:ring-blue-700">
      {t('a11y.skip')}
    </a>
  );
}
