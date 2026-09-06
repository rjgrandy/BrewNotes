async function responseData<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail)
      ? detail.map((item: { loc?: string[]; msg?: string }) => `${item.loc?.slice(1).join(' ') || 'Value'}: ${item.msg}`).join('; ')
      : res.status === 404 ? 'This item could not be found.' : 'Unable to load or save your data. Please try again.';
    throw new Error(message);
  }
  return res.json();
}

export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(path);
  return responseData<T>(res);
};

export const apiSend = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return responseData<T>(res);
};

export const uploadFile = async <T>(path: string, file: File): Promise<T> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(path, { method: 'POST', body: form });
  return responseData<T>(res);
};
