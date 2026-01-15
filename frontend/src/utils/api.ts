export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed ${res.status}`);
  }
  return res.json();
};

export const apiSend = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    throw new Error(`Failed ${res.status}`);
  }
  return res.json();
};

export const uploadFile = async <T>(path: string, file: File): Promise<T> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(path, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`Failed ${res.status}`);
  }
  return res.json();
};
