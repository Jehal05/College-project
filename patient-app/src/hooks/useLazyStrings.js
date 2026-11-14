// Texts that belong to one screen live in their own small files (not part of the offline install).
// useLazyStrings({ en: () => import(...), hi: ..., gu: ... }) loads English and the current language and says when they are ready.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function useLazyStrings(loaders) {
  const { i18n } = useTranslation();
  const lang = loaders[i18n.language] ? i18n.language : 'en';
  const [loaded, setLoaded] = useState('');
  useEffect(() => {
    let on = true;
    Promise.all([loaders.en(), loaders[lang]()]).then(([en, cur]) => {
      i18n.addResourceBundle('en', 'translation', en.default, true, true);
      i18n.addResourceBundle(lang, 'translation', cur.default, true, true);
      if (on) setLoaded(lang);
    }).catch(() => { if (on) setLoaded(lang); }); // without the file the screen still works, with key names
    return () => { on = false; };
  }, [i18n, lang, loaders]);
  return loaded === lang;
}
