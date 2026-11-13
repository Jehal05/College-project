// Shown after the user cancels a false alarm.
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '../components/icons';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Cancelled() {
  const { t } = useTranslation();
  const id = useLocation().state?.id; // the alert that was cancelled, so its record can be opened
  return (
    <Card as="div" role="status" className="mt-4 text-center">
      <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-800"><Icon name="check" size={36} strokeWidth={3} /></span>
      <h1 className="mb-2 text-2xl font-extrabold text-green-900">{t('cancelled.title')}</h1>
      <p className="mb-5 text-slate-700">{t('cancelled.text')}</p>
      {id && <Button variant="secondary" full to={'/summary/' + id} icon="file" className="mb-3">{t('emergency.viewSummary')}</Button>}
      <Button full to="/" icon="home">{t('cancelled.home')}</Button>
    </Card>
  );
}
