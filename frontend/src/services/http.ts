export type HttpError = {
  status: number;
  message: string;
  errors?: Array<{ path?: string; msg: string }>;
};

function getTokenFromStorage() {
  return localStorage.getItem('sellit_token');
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  // JSON by default when sending a plain object body.
  if (!headers.has('content-type') && init?.body && typeof init.body === 'string') {
    headers.set('content-type', 'application/json');
  }

  const token = getTokenFromStorage();
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...init,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

  if (!res.ok) {
    const err: HttpError = {
      status: res.status,
      message:
        (data && typeof data === 'object' && 'message' in data && typeof (data as any).message === 'string'
          ? (data as any).message
          : 'Request failed') as string,
      errors:
        data && typeof data === 'object' && 'errors' in data && Array.isArray((data as any).errors)
          ? ((data as any).errors as HttpError['errors'])
          : undefined
    };
    throw err;
  }

  return data as T;
}

