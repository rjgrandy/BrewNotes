// Backend stores absolute filesystem paths (e.g. /data/uploads/beans/a.jpg or a Windows
// path in dev) but serves the upload dir at /uploads. Derive a browser URL from the path
// by taking everything after the last "uploads/" segment.
export const mediaUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  const normalized = path.replace(/\\/g, '/');
  const marker = 'uploads/';
  const idx = normalized.toLowerCase().lastIndexOf(marker);
  if (idx === -1) return undefined;
  return `/uploads/${normalized.slice(idx + marker.length)}`;
};
