import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import SimulatedBadge from './SimulatedBadge.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/map', label: 'Map' },
  { to: '/fleet', label: 'Fleet' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/admin', label: 'Admin', adminOnly: true },
];

export default function NavBar() {
  const { session, role, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 text-white">
      <div className="flex flex-wrap items-center gap-4 px-6 py-3">
        <span className="text-xl font-bold">HealthTwin AI · Hospital Portal</span>
        <SimulatedBadge text="Simulated prototype" />
        <nav className="flex gap-1 ml-4">
          {links
            .filter((l) => !l.adminOnly || role === 'admin')
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 font-medium ${isActive ? 'bg-white text-slate-900' : 'hover:bg-slate-700'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-slate-300">
            {session?.name} ({role})
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-lg bg-slate-700 px-3 py-1.5 hover:bg-slate-600"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
