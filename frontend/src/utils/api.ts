const errorFromResponse = async (res: Response): Promise<Error> => {
  let detail = '';
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') {
      detail = data.detail;
    } else if (Array.isArray(data?.detail)) {
      detail = data.detail
        .map((item: { loc?: (string | number)[]; msg?: string }) => {
          const field = item.loc?.slice(1).join('.') ?? '';
          return field ? `${field}: ${item.msg}` : item.msg;
        })
        .filter(Boolean)
        .join('; ');
    }
  } catch {
    // Non-JSON error body; fall through to the status message.
  }
  return new Error(detail || `Request failed (${res.status})`);
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) {
    throw await errorFromResponse(res);
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
    throw await errorFromResponse(res);
  }
  return res.json();
};

export const uploadFile = async <T>(path: string, file: Blob, filename = 'photo.jpg'): Promise<T> => {
  const form = new FormData();
  form.append('file', file, filename);
  const res = await fetch(path, { method: 'POST', body: form });
  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  return res.json();
};
