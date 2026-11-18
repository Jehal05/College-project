import { useCallback, useMemo, useState } from 'react';
import { START_TILES, nextTiles, tilesDown } from '../services/mapHealth.js';

/** Watches the base-map tiles of one map. Pass `handlers` to <TileLayer eventHandlers>; show a notice when `down`. */
export function useTileHealth() {
  const [tiles, setTiles] = useState(START_TILES);
  const onLoad = useCallback(() => setTiles((s) => nextTiles(s, 'load')), []);
  const onError = useCallback(() => setTiles((s) => nextTiles(s, 'error')), []);
  const handlers = useMemo(() => ({ tileload: onLoad, tileerror: onError }), [onLoad, onError]);
  return { down: tilesDown(tiles), handlers };
}
