import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from './api';
import { useToast } from '../components/ui/Toast';

export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(undefined); setLoading(true); setError('');
    apiGet<T>(path).then(value => { if (active) setData(value); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, revision]);
  return { data, error, loading, retry: () => setRevision(value => value + 1) };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const toast = useToast();
  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await action(); }
    catch (err) { toast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error'); }
    finally { locked.current = false; setBusy(false); }
  }, [toast]);
  return { busy, run };
}
