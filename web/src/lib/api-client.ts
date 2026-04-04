import { API_BASE } from "./constants";
import { cacheApiResponse, getCachedResponse } from "./offline-store";

// Paths to never cache (auth tokens, ephemeral searches)
const SKIP_CACHE_PATHS = ["/auth/", "/search"];

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
    const isCacheableGet =
      method === "GET" && !SKIP_CACHE_PATHS.some((p) => path.startsWith(p));

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

      // Cache all successful GET responses (except auth/search)
      if (isCacheableGet) {
        cacheApiResponse(path, data).catch(() => {});
      }

      return data as T;
    } catch (err) {
      // Aggressive offline fallback: try cache for any failed GET request.
      // navigator.onLine is unreliable on some networks, so we attempt
      // cache retrieval on ANY fetch failure, not just when offline.
      if (isCacheableGet) {
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
