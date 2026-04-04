import { api } from "./api-client";

/**
 * Critical paths to pre-fetch after login so the app works offline
 * even if the user hasn't visited every page yet.
 */
const CRITICAL_PATHS = [
  "/org-entities",
  "/categories",
  "/equipment",
  "/technicians",
];

/**
 * Pre-warms the IndexedDB cache with essential data.
 * Fires requests in parallel — the api-client automatically caches
 * every successful GET response.
 */
export async function primeOfflineCache(): Promise<void> {
  const promises = CRITICAL_PATHS.map((path) =>
    api.get(path).catch(() => {}) // Silently ignore individual failures
  );
  await Promise.allSettled(promises);

  // Also prime the dashboard for the current quarter
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  api.get(`/dashboard/summary?year=${year}&quarter=${quarter}`).catch(() => {});
}
