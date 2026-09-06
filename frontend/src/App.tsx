import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Coffee, Bean, GlassWater, BarChart3, Sun, Moon } from 'lucide-react';
import LoadState from './components/LoadState';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Beans = lazy(() => import('./pages/Beans'));
const BeanDetail = lazy(() => import('./pages/BeanDetail'));
const Drinks = lazy(() => import('./pages/Drinks'));
const DrinkDetail = lazy(() => import('./pages/DrinkDetail'));
const DrinkTypeDetail = lazy(() => import('./pages/DrinkTypeDetail'));
const Analytics = lazy(() => import('./pages/Analytics'));
import { ToastProvider } from './components/ui/Toast';
import { cn } from './components/ui/cn';

const getStored = (key: string, fallback: string) => window.localStorage.getItem(key) || fallback;

const NAV = [
  { to: '/', label: 'Brew', icon: Coffee, end: true },
  { to: '/beans', label: 'Beans', icon: Bean, end: false },
  { to: '/drinks', label: 'Drinks', icon: GlassWater, end: false },
  { to: '/analytics', label: 'Insights', icon: BarChart3, end: false }
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-10 w-10 place-items-center rounded-2xl text-white"
        style={{ background: 'linear-gradient(135deg, var(--accent-strong), var(--gold))', boxShadow: 'var(--shadow-soft)' }}
      >
        <Coffee size={20} strokeWidth={2.2} />
      </span>
      <div className="leading-tight">
        <div className="text-lg font-extrabold tracking-tight">
          Brew<span className="text-accent">Notes</span>
        </div>
        <div className="text-[0.66rem] font-semibold uppercase tracking-[0.13em] text-muted">Your coffee journal</div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(getStored('theme', 'light'));
  const [unit, setUnit] = useState(getStored('unit', 'oz'));
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { window.localStorage.setItem('unit', unit); }, [unit]);

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
      <a href="#main-content" className="skip-link">Skip to content</a>
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
          <div className="mt-auto rounded-2xl bg-surface-muted p-4"><p className="eyebrow">Made for your KF7</p><p className="mt-2 text-sm text-muted">A few notes today. A better coffee tomorrow.</p><a className="mt-4 inline-block text-xs font-semibold text-accent" href="/api/export.zip">Download backup ↗</a></div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <select aria-label="Volume units" className="input !w-auto" value={unit} onChange={e => setUnit(e.target.value)}><option value="oz">oz</option><option value="ml">ml</option></select>
            <span className="text-xs text-muted">Theme</span>
            <ThemeButton />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
            <Brand />
            <div className="flex items-center gap-1"><select aria-label="Volume units" className="input !w-auto !px-2" value={unit} onChange={e => setUnit(e.target.value)}><option value="oz">oz</option><option value="ml">ml</option></select><ThemeButton /></div>
          </header>

          <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
            <Suspense fallback={<LoadState loading />}><Routes>
              <Route path="/" element={<Dashboard unit={unit} />} />
              <Route path="/beans" element={<Beans unit={unit} />} />
              <Route path="/beans/:beanId" element={<BeanDetail key={location.pathname} unit={unit} />} />
              <Route path="/drinks" element={<Drinks unit={unit} />} />
              <Route path="/drinks/type/:drinkType" element={<DrinkTypeDetail unit={unit} />} />
              <Route path="/drinks/:drinkId" element={<DrinkDetail key={location.pathname} unit={unit} />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<div className="card empty-state"><h1>That page isn’t in your journal.</h1><p>Head back to your coffee collection.</p><Link className="btn btn-primary" to="/beans">Explore beans</Link></div>} />
            </Routes></Suspense>
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
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.9} />
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
