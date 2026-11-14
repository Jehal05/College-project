// Scrolling ECG-like trace on a canvas, drawn from the heart rate. SIMULATED: the screen around it says so.
// With reduced motion it draws one still frame and redraws only when the heart rate changes.
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ecgAt } from '../../utils/ecg';
import { prefersReducedMotion } from '../../utils/webgl';

const SECONDS = 4; // width of the screen in seconds
const color = (name, alpha = 1) => 'rgb(' + getComputedStyle(document.documentElement).getPropertyValue('--ht-' + name).trim().replace(/ /g, ',') + ',' + alpha + ')';

export default function EcgStrip({ bpm, theme }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const live = useRef(bpm);
  live.current = bpm;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const still = prefersReducedMotion();
    let raf = 0;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth; const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color('line', 0.6); ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= w; x += w / 16) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += h / 5) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      const now = still ? 0 : performance.now() / 1000;
      ctx.strokeStyle = color('accent2'); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const v = ecgAt(now - SECONDS * (1 - x / w), live.current);
        const y = h * 0.7 - v * h * 0.55;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (!still && !document.hidden) raf = requestAnimationFrame(draw);
      else if (!still) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [theme, bpm]); // eslint-disable-line react-hooks/exhaustive-deps -- the loop reads the newest rate from `live`

  return <canvas ref={ref} role="img" aria-label={t('mon.ecg.label', { bpm: bpm ?? '--' })} className="h-40 w-full rounded-xl bg-ht-bg" />;
}
