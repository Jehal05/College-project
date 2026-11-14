import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeTheme } from '../utils/theme';

export default function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
