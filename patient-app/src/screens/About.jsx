// About and credits: where the 3D body comes from, its licence, and what this prototype is not.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Panel from '../components/ui/Panel';

const ext = 'font-semibold text-ht-accent underline';

export default function About() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header><h1 className="text-2xl font-extrabold">{t('about.title')}</h1><p className="text-ht-muted">{t('about.intro')}</p></header>
      <Panel aria-labelledby="about-model">
        <h2 id="about-model" className="mb-2 text-lg font-bold">{t('about.modelTitle')}</h2>
        <p className="mb-2">{t('about.attribution')}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{t('about.licence')} <a className={ext} href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></li>
          <li>{t('about.paper')} <a className={ext} href="https://doi.org/10.1093/nar/gkn613" target="_blank" rel="noreferrer">doi:10.1093/nar/gkn613</a></li>
          <li>{t('about.database')} <a className={ext} href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">BodyParts3D</a></li>
          <li>{t('about.packaging')} <a className={ext} href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">human-atlas</a></li>
          <li>{t('about.changes')}</li>
          <li>{t('about.lungs')}</li>
        </ul>
      </Panel>
      <Panel aria-labelledby="about-limits">
        <h2 id="about-limits" className="mb-2 text-lg font-bold">{t('about.limitsTitle')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{t('about.generic')}</li>
          <li>{t('about.notDiagnosis')}</li>
          <li>{t('about.simulated')}</li>
        </ul>
      </Panel>
      <p><Link to="/twin" className={ext}>{t('about.back')}</Link></p>
    </div>
  );
}
