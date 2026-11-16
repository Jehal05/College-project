/** Tailwind setup (Phase 8 design system). Brand = teal. Red stays ONLY for the emergency flow. Slate for surfaces and text. */
import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: colors.teal,
        // HealthTwin design tokens (Phase 0). Values live in src/index.css as CSS variables, so dark and light themes swap them.
        ht: Object.fromEntries(['bg', 'bg2', 'navy', 'sidebar', 'card', 'line', 'accent', 'accent2', 'warning', 'emergency', 'emergencytext', 'text', 'muted', 'onaccent']
          .map((n) => [n, 'rgb(var(--ht-' + n + ') / <alpha-value>)'])),
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Gujarati"', 'sans-serif'] },
      borderRadius: { card: '1rem' },
      transitionDuration: { ht: '200ms' },
      boxShadow: { card: '0 1px 2px rgb(15 23 42 / 0.06), 0 2px 8px rgb(15 23 42 / 0.05)', lift: '0 4px 16px rgb(15 23 42 / 0.12)', glow: '0 0 0 1px rgb(var(--ht-accent) / 0.35), 0 0 24px rgb(var(--ht-accent) / 0.25)' },
    },
  },
  plugins: [],
};
