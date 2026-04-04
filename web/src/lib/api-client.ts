import { API_BASE } from "./constants";
import { cacheApiResponse, getCachedResponse } from "./offline-store";

const CACHEABLE_PATHS = ["/org-entities", "/categories", "/equipment"];

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const method = options.method?.toUpperCase() ?? "GET";

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error ?? "Request failed",
          response.status,
          data.details
        );
      }

      // Cache successful GET responses for cacheable paths
      if (
        method === "GET" &&
        CACHEABLE_PATHS.some((p) => path.startsWith(p))
      ) {
        cacheApiResponse(path, data).catch(() => {});
      }

      return data as T;
    } catch (err) {
      // Offline fallback for GET requests
      if (method === "GET" && !navigator.onLine) {
        const cached = await getCachedResponse<T>(path).catch(() => null);
        if (cached) {
          return cached.data;
        }
      }
      throw err;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient();
