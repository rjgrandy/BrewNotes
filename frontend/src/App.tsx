import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Beans from './pages/Beans';
import BeanDetail from './pages/BeanDetail';
import Drinks from './pages/Drinks';
import DrinkDetail from './pages/DrinkDetail';
import Analytics from './pages/Analytics';
import { useEffect, useState } from 'react';

const getStored = (key: string, fallback: string) =>
  window.localStorage.getItem(key) || fallback;

export default function App() {
  const [theme, setTheme] = useState(getStored('theme', 'light'));
  const [unit, setUnit] = useState(getStored('unit', 'ml'));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('unit', unit);
  }, [unit]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>BrewNotes</h1>
          <p>Fast dial-in logging for your KitchenAid KF7.</p>
        </div>
        <div className="toggles">
          <button onClick={() => setUnit(unit === 'ml' ? 'oz' : 'ml')}>
            {unit.toUpperCase()}
          </button>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>
      <nav className="main-nav">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/beans">Beans</NavLink>
        <NavLink to="/drinks">Drinks</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
      </nav>
      <main>
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
  );
}
