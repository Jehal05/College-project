// The app's pages for the sidebar (desktop) and the bottom bar (phone). `themed` pages use the dark/light HealthTwin look;
// all others are the older screens, shown on a light surface until they are redesigned.
export const NAV = [
  { key: 'overview', to: '/overview', icon: 'home', themed: true },
  { key: 'twin', to: '/twin', icon: 'user', themed: true },
  { key: 'diseases', to: '/diseases', icon: 'activity', themed: true },
  { key: 'monitor', to: '/monitor', icon: 'heart', themed: true },
  { key: 'emergency', to: '/emergency-center', icon: 'alert', themed: true },
  { key: 'reports', to: '/report-intelligence', icon: 'file', themed: true },
  { key: 'copilot', to: '/copilot', icon: 'info', themed: true },
  { key: 'simulator', to: '/simulator', icon: 'bolt', themed: true },
  { key: 'medications', to: '/reminders', icon: 'pill' },
  { key: 'care', to: '/care-circle', icon: 'users', themed: true },
  { key: 'hospitals', to: '/hospitals', icon: 'hospital', themed: true },
  { key: 'settings', to: '/profile', icon: 'shield' },
];
// Phone bottom bar: Home, Twin, Monitor, Reports, Profile.
export const BOTTOM = ['overview', 'twin', 'monitor', 'reports', 'settings'];
export const BOTTOM_TO = { overview: '/' }; // on the phone, Home is the original home screen
export const THEMED_ROUTES = ['/overview', '/twin', '/diseases', '/monitor', '/emergency-center', '/report-intelligence', '/simulator', '/about', '/copilot', '/care-circle', '/hospitals', '/design'];
export const isThemed = (pathname) => THEMED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
