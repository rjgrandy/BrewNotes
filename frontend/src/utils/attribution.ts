const RECENT_KEY = 'recentNames';
const DEFAULT_NAME_KEY = 'defaultName';

export const getDefaultName = () => {
  const stored = window.localStorage.getItem(DEFAULT_NAME_KEY);
  if (stored) {
    return stored;
  }
  window.localStorage.setItem(DEFAULT_NAME_KEY, 'Ryan');
  return 'Ryan';
};

export const setDefaultName = (name: string) => {
  window.localStorage.setItem(DEFAULT_NAME_KEY, name);
};

export const getRecentNames = (): string[] => {
  const stored = window.localStorage.getItem(RECENT_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const addRecentName = (name: string) => {
  if (!name) return;
  const existing = getRecentNames();
  const updated = [name, ...existing.filter((n) => n !== name)].slice(0, 6);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
};
