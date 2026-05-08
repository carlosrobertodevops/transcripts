export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.message || j.error || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

export const apiGet = <T = any>(p: string) => api<T>(p);
export const apiPost = <T = any>(p: string, body?: any) =>
  api<T>(p, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
export const apiPatch = <T = any>(p: string, body?: any) =>
  api<T>(p, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
export const apiDelete = <T = any>(p: string) =>
  api<T>(p, { method: "DELETE" });
