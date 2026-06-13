import { Routes, Route, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Coffee, Bean, GlassWater, BarChart3, Sun, Moon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Beans from './pages/Beans';
import BeanDetail from './pages/BeanDetail';
import Drinks from './pages/Drinks';
import DrinkDetail from './pages/DrinkDetail';
import Analytics from './pages/Analytics';
import { ToastProvider } from './components/ui/Toast';
import { cn } from './components/ui/cn';

const getStored = (key: string, fallback: string) => window.localStorage.getItem(key) || fallback;

const NAV = [
  { to: '/', label: 'Log', icon: Coffee, end: true },
  { to: '/beans', label: 'Beans', icon: Bean, end: false },
  { to: '/drinks', label: 'Drinks', icon: GlassWater, end: false },
  { to: '/analytics', label: 'Stats', icon: BarChart3, end: false }
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
        <Coffee size={18} />
      </span>
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight">BrewNotes</div>
        <div className="text-[0.7rem] text-muted">KF7 dial-in journal</div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(getStored('theme', 'light'));
  const unit = 'oz';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const ThemeButton = ({ className }: { className?: string }) => (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      className={cn('btn btn-ghost !min-h-0 px-2.5 py-2', className)}
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
          <Brand />
          <nav className="mt-7 flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive ? 'bg-accent text-white' : 'text-muted hover:bg-surface-muted hover:text-text'
                  )
                }
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted">Theme</span>
            <ThemeButton />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
            <Brand />
            <ThemeButton />
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
            <Routes>
              <Route path="/" element={<Dashboard unit={unit} />} />
              <Route path="/beans" element={<Beans unit={unit} />} />
              <Route path="/beans/:beanId" element={<BeanDetail unit={unit} />} />
              <Route path="/drinks" element={<Drinks unit={unit} />} />
              <Route path="/drinks/:drinkId" element={<DrinkDetail unit={unit} />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[0.68rem] font-semibold transition-colors',
                  isActive ? 'text-accent' : 'text-muted'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 0 : 1.9} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
