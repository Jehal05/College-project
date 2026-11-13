/** Tailwind setup (Phase 8 design system). Brand = teal. Red stays ONLY for the emergency flow. Slate for surfaces and text. */
import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { brand: colors.teal },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Gujarati"', 'sans-serif'] },
      borderRadius: { card: '1rem' },
      boxShadow: { card: '0 1px 2px rgb(15 23 42 / 0.06), 0 2px 8px rgb(15 23 42 / 0.05)', lift: '0 4px 16px rgb(15 23 42 / 0.12)' },
    },
  },
  plugins: [],
};
