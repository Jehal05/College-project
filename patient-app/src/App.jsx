// App shell: phone-width column with the simulated banner, page content and bottom navigation.
import SimulatedBanner from './components/SimulatedBanner';
import BottomNav from './components/BottomNav';
import AppRoutes from './routes';
import useAuth from './hooks/useAuth';

export default function App() {
  const { isLoggedIn } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white shadow-lg">
      <SimulatedBanner />
      <main className="flex-1 p-4">
        <AppRoutes />
      </main>
      {isLoggedIn && <BottomNav />}
    </div>
  );
}
