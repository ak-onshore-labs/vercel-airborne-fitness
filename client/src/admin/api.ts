/**
 * Admin API client. Sends JWT in Authorization header; server authorizes if user.userRole === "ADMIN".
 */
export async function adminApiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; ok: true } | { data: null; ok: false; status: number; message: string }> {
  const token = (await import("@/lib/api")).getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get("content-type");
    const isJson = contentType?.includes("application/json");
    if (!isJson) {
      const text = await res.text();
      return {
        ok: false,
        data: null,
        status: res.status,
        message: res.ok ? "Invalid response" : text.slice(0, 200) || res.statusText,
      };
    }
    const data = (await res.json()) as T;
    if (!res.ok) {
      const msg = (data as { message?: string })?.message || res.statusText;
      return { ok: false, data: null, status: res.status, message: msg };
    }
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, data: null, status: 0, message };
  }
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}
