// The app's pages for the sidebar (desktop) and the bottom bar (phone).
// `themed` pages use the dark/light HealthTwin look; all others are shown on a light surface.
export const NAV = [
  { key: 'home', to: '/', icon: 'home', end: true },
  { key: 'hospitals', to: '/hospitals', icon: 'hospital', themed: true },
  { key: 'passport', to: '/passport', icon: 'qr' },
  { key: 'consent', to: '/consent', icon: 'shield' },
  { key: 'contacts', to: '/contacts', icon: 'users' },
  { key: 'settings', to: '/profile', icon: 'user' },
];
// Phone bottom bar: Home, Hospitals, Passport, Profile.
export const BOTTOM = ['home', 'hospitals', 'passport', 'settings'];
export const BOTTOM_TO = {};
export const THEMED_ROUTES = ['/hospitals'];
export const isThemed = (pathname) => THEMED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
