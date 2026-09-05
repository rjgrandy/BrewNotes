export const imageUrl = (path?: string | null) => {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  const uploadsIndex = normalized.lastIndexOf('/uploads/');
  return uploadsIndex >= 0 ? normalized.slice(uploadsIndex) : `/uploads/${normalized.replace(/^\/+/, '')}`;
};
