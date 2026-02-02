export type HttpError = {
  status: number;
  message: string;
  errors?: Array<{ path?: string; msg: string }>;
};

function getTokenFromStorage() {
  return localStorage.getItem('sellit_token');
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function pickMessage(data: unknown) {
  if (!isRecord(data)) return null;
  const msg = data.message;
  return typeof msg === 'string' ? msg : null;
}

function pickErrors(data: unknown): HttpError['errors'] | undefined {
  if (!isRecord(data)) return undefined;
  const errs = data.errors;
  if (!Array.isArray(errs)) return undefined;

  const normalized: Array<{ path?: string; msg: string }> = [];
  for (const item of errs) {
    if (!isRecord(item)) continue;
    const msg = item.msg;
    if (typeof msg !== 'string') continue;
    const path = typeof item.path === 'string' ? item.path : undefined;
    normalized.push({ path, msg });
  }
  return normalized.length ? normalized : undefined;
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
      message: pickMessage(data) ?? 'Request failed',
      errors: pickErrors(data)
    };
    throw err;
  }

  return data as T;
}

