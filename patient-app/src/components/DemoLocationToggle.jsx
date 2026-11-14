// Checkbox that forces the demo location instead of the device GPS (kept in sessionStorage).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUseDemo, setUseDemo } from '../services/geo';

export default function DemoLocationToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState(getUseDemo());
  const change = (e) => { setOn(e.target.checked); setUseDemo(e.target.checked); };
  return (
    <label className="flex min-h-[44px] items-center gap-3">
      <input type="checkbox" className="h-6 w-6" checked={on} onChange={change} />
      <span>{t('symptoms.demoLocation')}</span>
    </label>
  );
}
