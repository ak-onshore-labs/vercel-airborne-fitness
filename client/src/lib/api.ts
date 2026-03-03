const TOKEN_KEY = "airborne_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Safe API client for fetching JSON. Adds Authorization: Bearer <token> when token is present.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; ok: true } | { data: null; ok: false; status: number; message: string }> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    if (!isJson) {
      const text = await res.text();
      return {
        ok: false,
        data: null,
        status: res.status,
        message: res.ok
          ? "Invalid response from server"
          : text.slice(0, 200) || res.statusText || "Request failed",
      };
    }

    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      return {
        ok: false,
        data: null,
        status: res.status,
        message: "Invalid JSON response",
      };
    }

    if (!res.ok) {
      const errMessage =
        (data as { message?: string })?.message || res.statusText || "Request failed";
      return { ok: false, data: null, status: res.status, message: errMessage };
    }

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, data: null, status: 0, message };
  }
}
