import { useT } from '../i18n/index.js';

/** Shown over/under a map when the base-map tiles cannot load (offline or blocked). Markers and routes still work. */
export default function TileNotice({ down }) {
  const t = useT();
  if (!down) return null;
  return (
    <p role="status" data-testid="tile-notice" className="rounded-lg bg-amber-100 p-2 text-sm font-semibold text-amber-900">
      {t('map.tilesDown')}
    </p>
  );
}
