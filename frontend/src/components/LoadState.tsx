import { AlertCircle, Coffee } from 'lucide-react';

export default function LoadState({ loading, error, retry }: { loading?: boolean; error?: string; retry?: () => void }) {
  if (loading) return <div className="card flex items-center gap-3 p-6 text-muted" role="status"><Coffee size={20} className="animate-pulse" /> Loading your journal…</div>;
  if (!error) return null;
  return <div className="card flex flex-wrap items-center gap-3 p-5" role="alert"><AlertCircle size={20} className="text-danger" /><p className="flex-1 text-sm">{error}</p>{retry && <button className="btn" onClick={retry}>Try again</button>}</div>;
}
